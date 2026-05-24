// Tests for authentication callable functions
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, activity_logs: {}, invitations: {} };
  const createdUsers = {};
  global.__mockStore = mockStore; // expose for tests
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
      where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) })
    };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!mockStore[name]) mockStore[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get: (r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date() };
  return {
    firestore: firestoreFn,
    auth: () => ({
      createUser: jest.fn(async ({ email }) => { const uid = `u_${Object.keys(createdUsers).length+1}`; createdUsers[uid] = { email }; return { uid, email }; }),
      setCustomUserClaims: jest.fn(async () => {}),
      deleteUser: jest.fn(async () => {}),
      getUserByEmail: jest.fn(async (email) => { const entry = Object.entries(createdUsers).find(([,v]) => v.email === email); if(!entry) throw new Error('not-found'); return { uid: entry[0], email }; }),
      generatePasswordResetLink: jest.fn(async (email) => `https://reset/${email}`)
    })
  };
});

// Import after mocks
const authModule = require('../src/auth');

describe('Auth callable functions', () => {
  beforeEach(() => {
      const store = global.__mockStore;
      store.users['admin_1'] = { role: 'admin', isActive: true };
    });

  test('createUserWithRole succeeds for admin caller', async () => {
    const request = {
      auth: { uid: 'admin_1' },
      data: { email: 'new@ex.com', password: 'pass1234', role: 'viewer', displayName: 'New User', department: 'dep1' }
    };
    const res = await authModule.createUserWithRole(request);
    expect(res.success).toBe(true);
    expect(res.data.uid).toBeDefined();
    expect(res.data.email).toBe('new@ex.com');
  });

  test('createUserWithRole denied for non-admin caller', async () => {
    global.__mockStore.users['user_1'] = { role: 'viewer' };
    const request = { auth: { uid: 'user_1' }, data: { email: 'x@x.com', password: 'p', role: 'viewer' } };
    await expect(authModule.createUserWithRole(request)).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('updateUserRole updates role when admin', async () => {
    global.__mockStore.users['target_1'] = { role: 'viewer', department: 'd1' };
    const request = { auth: { uid: 'admin_1' }, data: { userId: 'target_1', role: 'archive_officer', department: 'd2' } };
    const res = await authModule.updateUserRole(request);
    expect(res.success).toBe(true);
  expect(global.__mockStore.users['target_1'].role).toBe('archive_officer');
  });
});
