// Tests for utility callable functions (sendNotification minimal path)
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, notifications: {}, activity_logs: {} };
  global.__mockUtilsStore = mockStore;
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
      where: () => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) })
    };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!mockStore[name]) mockStore[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date(), arrayUnion: (v) => v };
  return {
    firestore: firestoreFn,
    messaging: () => ({ sendToDevice: jest.fn(async () => ({})) })
  };
});

const utilsModule = require('../src/utils');

describe('sendNotification', () => {
  beforeEach(() => {
      const store = global.__mockUtilsStore;
      store.users['admin_1'] = { role: 'admin', fcmTokens: [] };
      store.users['user_2'] = { role: 'viewer', fcmTokens: [] };
    });

  test('succeeds for admin sender', async () => {
    const request = { auth: { uid: 'admin_1' }, data: { userId: 'user_2', title: 'مرحبا', message: 'اختبار' } };
    const res = await utilsModule.sendNotification(request);
    expect(res.success).toBe(true);
    expect(res.data.notificationId).toBeDefined();
  });

  test('fails for non-privileged sender', async () => {
  global.__mockUtilsStore.users['viewer_1'] = { role: 'viewer' };
    const request = { auth: { uid: 'viewer_1' }, data: { userId: 'user_2', title: 'x', message: 'y' } };
    await expect(utilsModule.sendNotification(request)).rejects.toHaveProperty('code', 'permission-denied');
  });
});
