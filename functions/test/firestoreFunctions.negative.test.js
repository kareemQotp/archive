// Negative path tests for firestore callable functions
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, documents: {}, file_movements: {}, counters: {} };
  global.__negFsStore = mockStore;
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
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) })
    };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!mockStore[name]) mockStore[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date() };
  return { firestore: firestoreFn };
});

const firestoreModule = require('../src/firestore');

describe('Firestore callable functions (negative paths)', () => {
  beforeEach(() => {
    const store = global.__negFsStore;
    store.users['admin_1'] = { role: 'admin' };
    store.users['officer_1'] = { role: 'archive_officer' };
    store.users['viewer_1'] = { role: 'viewer' };
    // seed a document for permission tests
    store.documents['doc_1'] = { createdBy: 'viewer_1', status: 'active' };
  });

  test('processDocumentUpload missing required file info', async () => {
    const req = { auth: { uid: 'viewer_1' }, data: { fileName: '', fileSize: null, fileType: null } };
    await expect(firestoreModule.processDocumentUpload(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });

  test('updateDocumentMetadata not-found document', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { documentId: 'ghost', updates: { title: 'x' } } };
    await expect(firestoreModule.updateDocumentMetadata(req)).rejects.toHaveProperty('code', 'not-found');
  });

  test('updateDocumentMetadata permission-denied for non-owner viewer', async () => {
    const req = { auth: { uid: 'officer_1' }, data: { documentId: 'doc_1', updates: { title: 'x' } } };
    // officer has permission (archive_officer) so adjust to viewer_2 to fail
    global.__negFsStore.users['viewer_2'] = { role: 'viewer' };
    const req2 = { auth: { uid: 'viewer_2' }, data: { documentId: 'doc_1', updates: { title: 'x' } } };
    await expect(firestoreModule.updateDocumentMetadata(req2)).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('deleteDocument not-found', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { documentId: 'ghost' } };
    await expect(firestoreModule.deleteDocument(req)).rejects.toHaveProperty('code', 'not-found');
  });

  test('deleteDocument permission-denied for non-owner non-admin', async () => {
    // doc_1 created by viewer_1; viewer_2 tries delete
    global.__negFsStore.users['viewer_2'] = { role: 'viewer' };
    const req = { auth: { uid: 'viewer_2' }, data: { documentId: 'doc_1' } };
    await expect(firestoreModule.deleteDocument(req)).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('createFileMovement invalid-argument missing fields', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { fileNumber: '', fromDepartment: '', toDepartment: '', action: '' } };
    await expect(firestoreModule.createFileMovement(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });

  test('getFileMovementHistory invalid-argument missing fileNumber', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { } };
    await expect(firestoreModule.getFileMovementHistory(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });
});
