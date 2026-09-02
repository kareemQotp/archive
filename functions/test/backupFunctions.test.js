// Tests for backup system (manual + list)
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (spec, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

jest.mock('firebase-admin', () => {
  const store = { users: {}, system_backups: {}, documents: {}, file_movements: {}, activity_logs: {}, notifications: {} };
  global.__mockBackupStore = store;
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
      add: async (data) => { const id = coll+ '_' + Math.random().toString(36).slice(2); store[coll][id] = data; return { id }; },
      count: () => ({ get: async () => ({ data: () => ({ count: Object.keys(store[coll]).length }) }) }),
      orderBy: () => ({ limit: (n) => ({ get: async () => ({ docs: Object.entries(store[coll]).slice(0,n).map(([id,data]) => ({ id, data: () => data })) }) }) }),
      where: (field, op, value) => chainWhere(coll, [{ field, op, value }])
    };
  }
  function chainWhere(coll, conditions){
    return {
      limit: (n) => ({ get: async () => filterAndList(coll, conditions).slice(0,n) }),
      get: async () => filterAndList(coll, conditions)
    };
  }
  function filterAndList(coll, conditions){
    const entries = Object.entries(store[coll]).filter(([_, obj]) => conditions.every(c => {
      const val = obj[c.field];
      if(c.op === '<') return val < c.value; // retentionExpiry compare
      if(c.op === '==') return val === c.value;
      if(c.op === '<=') return val <= c.value;
      if(c.op === '>=') return val >= c.value;
      return true;
    }));
    return { docs: entries.map(([id,data]) => ({ id, data: () => data, ref: { id, delete: () => { delete store[coll][id]; } } })) };
  }
  const firestoreFn = () => ({
    collection: (name) => { if(!store[name]) store[name] = {}; return makeCollection(name); },
    batch: () => ({ ops: [], delete(ref){ this.ops.push(ref); }, commit: async function(){ this.ops.forEach(r => { delete store.system_backups[r.id]; }); } }),
    runTransaction: async (fn) => fn({ get: (r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) })
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date() };
  return { firestore: firestoreFn };
});

const utils = require('../src/utils');

describe('Backup functions', () => {
  beforeEach(() => {
    const s = global.__mockBackupStore;
    s.users['admin_1'] = { role: 'super_admin' };
    s.users['viewer_1'] = { role: 'viewer' };
    // Seed some documents for count stats
    for(let i=0;i<3;i++) s.documents['d'+i] = { createdAt: new Date() };
  });

  test('manual backup success', async () => {
    const res = await utils.backupDatabase({ auth: { uid: 'admin_1' }, data: {} });
    expect(res.success).toBe(true);
    expect(res.data.backupId).toBeDefined();
    expect(res.data.status).toBe('success');
    expect(res.data.stats.documents).toBeGreaterThanOrEqual(3);
  });

  test('manual backup denied for non-admin', async () => {
    await expect(utils.backupDatabase({ auth: { uid: 'viewer_1' }, data: {} })).rejects.toHaveProperty('code','permission-denied');
  });

  test('list backups returns items', async () => {
    await utils.backupDatabase({ auth: { uid: 'admin_1' }, data: {} });
    const list = await utils.listBackups({ auth: { uid: 'admin_1' }, data: { limit: 10 } });
    expect(list.success).toBe(true);
    expect(list.data.backups.length).toBeGreaterThan(0);
  });
});
