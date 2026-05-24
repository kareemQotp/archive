// Tests for document restore and file movement receipt
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, documents: {}, file_movements: {} };
  global.__mockDocsStore = mockStore;
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

const utils = require('../src/utils');

describe('Document restore & movement receipt', () => {
  beforeEach(() => {
    const store = global.__mockDocsStore;
    store.users['admin_1'] = { role: 'admin', department: 'depA' };
    store.users['officer_1'] = { role: 'archive_officer', department: 'depB' };
    store.users['user_x'] = { role: 'viewer', department: 'depA' };

    store.documents['doc_deleted'] = { status: 'deleted', createdBy: 'user_x' };
    store.documents['doc_active'] = { status: 'active', createdBy: 'user_x' };

    store.file_movements['mv_1'] = { toDepartment: 'depB', createdBy: 'admin_1', action: 'transfer' };
  });

  test('restoreDeletedDocument restores when admin', async () => {
    const res = await utils.restoreDeletedDocument({ auth: { uid: 'admin_1' }, data: { documentId: 'doc_deleted' } });
    expect(res.success).toBe(true);
    expect(global.__mockDocsStore.documents['doc_deleted'].status).toBe('active');
  });

  test('restoreDeletedDocument denied for non-owner non-admin', async () => {
    await expect(utils.restoreDeletedDocument({ auth: { uid: 'officer_1' }, data: { documentId: 'doc_deleted' } })).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('receiveFileMovement updates status when recipient department user', async () => {
    const res = await utils.receiveFileMovement({ auth: { uid: 'officer_1' }, data: { movementId: 'mv_1' } });
    expect(res.success).toBe(true);
    // status updated
    expect(global.__mockDocsStore.file_movements['mv_1'].status).toBe('received');
  });
});
