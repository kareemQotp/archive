// Tests for strict App Check enforced functions
// دوال تم تفعيل enforceAppCheck عليها

process.env.APP_CHECK_MODE = 'strict';
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

jest.mock('firebase-admin', () => {
  const store = { users: {}, counters: {}, file_movements: {} };
  global.__strictStore = store;
  function makeDoc(coll, id){
    return {
      id,
      get: jest.fn(async () => ({ exists: !!store[coll][id], data: () => store[coll][id] })),
      set: jest.fn(async (data) => { store[coll][id] = data; }),
      update: jest.fn(async (data) => { store[coll][id] = { ...(store[coll][id]||{}), ...data }; })
    };
  }
  function makeCollection(coll){
    return {
      doc: (id) => makeDoc(coll, id),
      add: async (data) => { const id = 'auto_' + Object.keys(store[coll]||{}).length; store[coll][id] = data; return { id }; },
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) })
    };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!store[name]) store[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date() };
  return { firestore: firestoreFn };
});

const firestoreModule = require('../src/firestore');

describe('App Check strict enforcement (selected callables)', () => {
  beforeEach(() => {
    const s = global.__strictStore;
    s.users['admin_1'] = { role: 'admin' };
  });

  test('generateFileNumber fails without App Check token (no request.app)', async () => {
    const req = { auth: { uid: 'admin_1' }, data: {} }; // no app property
    await expect(firestoreModule.generateFileNumber(req)).rejects.toHaveProperty('code', 'failed-precondition');
  });

  test('generateFileNumber succeeds when app token present', async () => {
    const req = { auth: { uid: 'admin_1' }, app: { appId: 'x' }, data: {} };
    const res = await firestoreModule.generateFileNumber(req);
    expect(res.success).toBe(true);
    expect(res.data.fileNumber).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{4}$/);
  });

  test('createFileMovement fails without App Check token', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { fileNumber: '2025-07-0001', fromDepartment: 'A', toDepartment: 'B', action: 'transfer' } };
    await expect(firestoreModule.createFileMovement(req)).rejects.toHaveProperty('code', 'failed-precondition');
  });

  test('createFileMovement succeeds with App Check token', async () => {
    const req = { auth: { uid: 'admin_1' }, app: { appId: 'x' }, data: { fileNumber: '2025-07-0001', fromDepartment: 'A', toDepartment: 'B', action: 'transfer' } };
    const res = await firestoreModule.createFileMovement(req);
    expect(res.success).toBe(true);
    expect(res.data.movementId).toBeTruthy();
  });
});
