// Positive path tests for firestore callable functions
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

// Enhanced firebase-admin mock to support querying movements & documents
jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, documents: {}, file_movements: {}, counters: {} };
  global.__posFsStore = mockStore;
  function makeDoc(coll, id){
    return {
      id,
      get: jest.fn(async () => ({ exists: !!mockStore[coll][id], data: () => mockStore[coll][id] })),
      set: jest.fn(async (data) => { mockStore[coll][id] = data; }),
      update: jest.fn(async (data) => { mockStore[coll][id] = { ...(mockStore[coll][id]||{}), ...data }; })
    };
  }
  function makeCollection(coll){
    return {
      doc: (id) => makeDoc(coll, id),
      add: async (data) => { const id = `auto_${Object.keys(mockStore[coll]||{}).length+1}`; mockStore[coll][id] = data; return { id }; },
      where: (field, op, value) => ({
        orderBy: () => ({
          get: async () => ({
            docs: Object.entries(mockStore[coll]||{})
              .filter(([_, v]) => v && v[field] === value)
              .map(([id, v]) => ({ id, data: () => v }))
          })
        })
      })
    };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!mockStore[name]) mockStore[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => ({ toDate: () => new Date() }) };
  return { firestore: firestoreFn };
});

const firestoreModule = require('../src/firestore');

describe('Firestore callable functions (positive paths)', () => {
  beforeEach(() => {
    const store = global.__posFsStore;
    // reset
    Object.keys(store.documents).forEach(k => delete store.documents[k]);
    Object.keys(store.file_movements).forEach(k => delete store.file_movements[k]);
    Object.keys(store.counters).forEach(k => delete store.counters[k]);
    store.users['admin_1'] = { role: 'admin' };
    store.users['officer_1'] = { role: 'archive_officer' };
    store.users['viewer_1'] = { role: 'viewer' };
  });

  test('generateFileNumber returns formatted number', async () => {
    const req = { auth: { uid: 'admin_1' }, data: {} };
    const res = await firestoreModule.generateFileNumber(req);
    expect(res.success).toBe(true);
    expect(res.data.fileNumber).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{4}$/);
  });

  test('processDocumentUpload creates document and returns id & fileNumber', async () => {
    const req = { auth: { uid: 'viewer_1' }, data: { fileName: 'doc.pdf', fileSize: 1000, fileType: 'application/pdf', category: 'cat', department: 'dep', description: 'desc' } };
    const res = await firestoreModule.processDocumentUpload(req);
    expect(res.success).toBe(true);
    expect(res.data.documentId).toBeTruthy();
    expect(res.data.fileNumber).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{4}$/);
  });

  test('updateDocumentMetadata succeeds for owner', async () => {
    // seed document via upload
    const uploadRes = await firestoreModule.processDocumentUpload({ auth: { uid: 'viewer_1' }, data: { fileName: 'a.txt', fileSize: 10, fileType: 'text/plain' } });
    const docId = uploadRes.data.documentId;
    const res = await firestoreModule.updateDocumentMetadata({ auth: { uid: 'viewer_1' }, data: { documentId: docId, updates: { title: 'New Title' } } });
    expect(res.success).toBe(true);
  });

  test('deleteDocument soft-deletes document for owner', async () => {
    const uploadRes = await firestoreModule.processDocumentUpload({ auth: { uid: 'viewer_1' }, data: { fileName: 'b.txt', fileSize: 5, fileType: 'text/plain' } });
    const docId = uploadRes.data.documentId;
    const res = await firestoreModule.deleteDocument({ auth: { uid: 'viewer_1' }, data: { documentId: docId } });
    expect(res.success).toBe(true);
  });

  test('deleteDocument by admin on someone else document', async () => {
    const uploadRes = await firestoreModule.processDocumentUpload({ auth: { uid: 'viewer_1' }, data: { fileName: 'c.txt', fileSize: 5, fileType: 'text/plain' } });
    const docId = uploadRes.data.documentId;
    const res = await firestoreModule.deleteDocument({ auth: { uid: 'admin_1' }, data: { documentId: docId } });
    expect(res.success).toBe(true);
  });

  test('createFileMovement succeeds and returns movementId', async () => {
    const movementRes = await firestoreModule.createFileMovement({ auth: { uid: 'officer_1' }, data: { fileNumber: '2025-07-0001', fileName: 'doc.pdf', fromDepartment: 'A', toDepartment: 'B', action: 'transfer', priority: 'urgent', notes: 'Handle carefully' } });
    expect(movementRes.success).toBe(true);
    expect(movementRes.data.movementId).toBeTruthy();
  });

  test('getFileMovementHistory returns movements array', async () => {
    await firestoreModule.createFileMovement({ auth: { uid: 'officer_1' }, data: { fileNumber: '2025-07-0002', fromDepartment: 'A', toDepartment: 'B', action: 'transfer' } });
    await firestoreModule.createFileMovement({ auth: { uid: 'officer_1' }, data: { fileNumber: '2025-07-0002', fromDepartment: 'B', toDepartment: 'C', action: 'transfer' } });
    const historyRes = await firestoreModule.getFileMovementHistory({ auth: { uid: 'admin_1' }, data: { fileNumber: '2025-07-0002' } });
    expect(historyRes.success).toBe(true);
    expect(Array.isArray(historyRes.data.movements)).toBe(true);
    expect(historyRes.data.movements.length).toBeGreaterThanOrEqual(2);
  });
});
