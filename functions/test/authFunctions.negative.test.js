// Negative path tests for authentication callable functions
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
  global.__negAuthStore = mockStore;
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
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
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

describe('Auth callable functions (negative paths)', () => {
  beforeEach(() => {
    const store = global.__negAuthStore;
    store.users['admin_1'] = { role: 'admin', isActive: true };
    store.users['viewer_1'] = { role: 'viewer', isActive: true };
  });

  test('deleteUserAccount denied for non-admin', async () => {
    global.__negAuthStore.users['target_x'] = { role: 'viewer' };
    const req = { auth: { uid: 'viewer_1' }, data: { userId: 'target_x' } };
    await expect(authModule.deleteUserAccount(req)).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('deleteUserAccount not-found user', async () => {
    const req = { auth: { uid: 'admin_1' }, data: { userId: 'ghost_user' } };
    await expect(authModule.deleteUserAccount(req)).rejects.toHaveProperty('code', 'not-found');
  });

  test('deleteUserAccount self-deletion blocked', async () => {
    // Ensure admin exists
    const req = { auth: { uid: 'admin_1' }, data: { userId: 'admin_1' } };
    await expect(authModule.deleteUserAccount(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });

  test('validateInvitation missing code invalid-argument', async () => {
    const req = { auth: { uid: 'viewer_1' }, data: { } };
    await expect(authModule.validateInvitation(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });

  test('validateInvitation code not found', async () => {
    const req = { auth: { uid: 'viewer_1' }, data: { code: 'ABC123' } };
    await expect(authModule.validateInvitation(req)).rejects.toHaveProperty('code', 'not-found');
  });

  test('sendPasswordResetEmail missing email', async () => {
    const req = { data: { }, auth: { uid: 'viewer_1' } };
    await expect(authModule.sendPasswordResetEmail(req)).rejects.toHaveProperty('code', 'invalid-argument');
  });

  test('sendPasswordResetEmail non-existing email returns success true', async () => {
    const req = { data: { email: 'nouser@example.com' } };
    const res = await authModule.sendPasswordResetEmail(req);
    expect(res.success).toBe(true); // silent success pattern
  });
});
