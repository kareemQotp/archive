// Tests for notification related callable functions
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

// firebase-admin mock
jest.mock('firebase-admin', () => {
  const mockStore = { users: {}, notifications: {}, activity_logs: {} };
  global.__mockNotificationsStore = mockStore;
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
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
        orderBy: (field2) => ({
          limit: (lim) => ({
            get: async () => {
              // simplistic retrieval for getUserNotifications chain
              const docs = Object.entries(mockStore.notifications)
                .filter(([_, n]) => n.userId === value)
                .sort((a,b) => (b[1].createdAt?.getTime?.()||0) - (a[1].createdAt?.getTime?.()||0))
                .slice(0, lim)
                .map(([id, data]) => ({ id, data: () => data }));
              return { docs };
            }
          })
        })
      })
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

const utils = require('../src/utils');

describe('Notification functions', () => {
  beforeEach(() => {
    const store = global.__mockNotificationsStore;
    store.users['admin_1'] = { role: 'admin', fcmTokens: [] };
    store.users['user_a'] = { role: 'viewer', fcmTokens: [] };
    // seed some notifications for user_a
    for(let i=0;i<3;i++) {
      store.notifications[`n_${i}`] = {
        userId: 'user_a',
        title: 't'+i,
        message: 'm'+i,
        isRead: i===0,
        createdAt: new Date(Date.now() - i*1000)
      };
    }
  });

  test('updateFcmToken adds new token', async () => {
    const res = await utils.updateFcmToken({ auth: { uid: 'admin_1' }, data: { token: 'tok1' } });
    expect(res.success).toBe(true);
    expect(global.__mockNotificationsStore.users['admin_1'].fcmTokens).toBeDefined();
  });

  test('markNotificationRead marks a notification', async () => {
    // create new unread notification for test
    const store = global.__mockNotificationsStore;
    store.notifications['target_n'] = { userId: 'user_a', title: 'x', message: 'y', isRead: false };
    const res = await utils.markNotificationRead({ auth: { uid: 'user_a' }, data: { notificationId: 'target_n' } });
    expect(res.success).toBe(true);
    expect(store.notifications['target_n'].isRead).toBe(true);
  });

  test('getUserNotifications returns list', async () => {
    const res = await utils.getUserNotifications({ auth: { uid: 'user_a' }, data: { limit: 2 } });
    expect(res.success).toBe(true);
    expect(res.data.notifications.length).toBeGreaterThan(0);
  });
});
