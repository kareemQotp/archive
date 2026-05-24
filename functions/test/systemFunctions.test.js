// Tests for generateSystemReport & healthCheck
process.env.TEST_BYPASS_TRANSACTIONS = '1';

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } },
  onCall: (opts, handler) => handler
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

jest.mock('firebase-admin', () => {
  const store = { users: {}, documents: {}, file_movements: {}, activity_logs: {}, reports: {}, system_settings: {} };
  global.__mockSystemStore = store;
  let reportAuto = 0;

  function makeDoc(coll, id){
    return {
      id,
      get: jest.fn(async () => ({ exists: !!store[coll][id], data: () => store[coll][id] })),
      set: jest.fn(async (data) => { store[coll][id] = data; })
    };
  }

  function makeCollection(coll){
    return {
      doc: (id) => makeDoc(coll, id),
      add: async (data) => { const id = `rep_${++reportAuto}`; store[coll][id] = data; return { id }; },
      count: () => ({ get: async () => ({ data: () => ({ count: Object.keys(store[coll]).length }) }) }),
      where: (field, op, value) => chainWhere(coll, [{ field, op, value }])
    };
  }

  function chainWhere(coll, conditions){
    return {
      where: (field, op, value) => chainWhere(coll, [...conditions, { field, op, value }]),
      count: () => ({ get: async () => filterAndCount(coll, conditions) }),
      orderBy: () => ({ get: async () => filterAndList(coll, conditions) }),
      get: async () => filterAndList(coll, conditions)
    };
  }

  function filterAndCount(coll, conditions){
    const filtered = Object.values(store[coll]).filter(obj => matchConds(obj, conditions));
    return { data: () => ({ count: filtered.length }) };
  }
  function filterAndList(coll, conditions){
    const entries = Object.entries(store[coll]).filter(([_, obj]) => matchConds(obj, conditions));
    return { docs: entries.map(([id, data]) => ({ id, data: () => data })) };
  }
  function matchConds(obj, conds){
    return conds.every(c => {
      const val = obj[c.field];
      if(c.op === '==') return val === c.value;
      if(c.op === '>=') return val >= c.value;
      if(c.op === '<=') return val <= c.value;
      return true;
    });
  }

  const firestoreFn = () => ({
    collection: (name) => { if(!store[name]) store[name] = {}; return makeCollection(name); },
    runTransaction: async (fn) => { const tx = { get:(r)=>r.get(), set:(r,d)=>r.set(d), update:(r,d)=>r.update(d) }; return fn(tx); }
  });
  firestoreFn.FieldValue = { serverTimestamp: () => new Date() };

  const storageFn = () => ({
    bucket: () => ({
      getFiles: async () => {
        if(global.__mockHealthFail) throw new Error('storage-fail');
        return [[]];
      }
    })
  });

  return { firestore: firestoreFn, storage: storageFn };
});

const utils = require('../src/utils');

describe('System functions', () => {
  beforeEach(() => {
    const s = global.__mockSystemStore;
    // seed admin and some data
    s.users['admin_1'] = { role: 'admin' };
    s.users['viewer_1'] = { role: 'viewer' };
    // documents in last 30 days
    for(let i=0;i<5;i++) {
      s.documents['doc_'+i] = { createdAt: new Date(Date.now()- i*86400000), department: 'depA', status: 'active' };
    }
    // activity logs in range
    for(let j=0;j<3;j++) {
      s.activity_logs['log_'+j] = { timestamp: new Date(Date.now()- j*3600000), category: 'notifications' };
    }
    // file movements
    s.file_movements['mv_1'] = { timestamp: new Date(), action: 'transfer' };
  });

  test('generateSystemReport success for admin', async () => {
    const res = await utils.generateSystemReport({ auth: { uid: 'admin_1' }, data: { type: 'daily' } });
    expect(res.success).toBe(true);
    expect(res.data.reportId).toBeDefined();
    expect(res.data.report.statistics.totalUsers).toBeGreaterThanOrEqual(1);
  });

  test('generateSystemReport denied for non-admin', async () => {
    await expect(utils.generateSystemReport({ auth: { uid: 'viewer_1' }, data: {} })).rejects.toHaveProperty('code', 'permission-denied');
  });

  test('healthCheck success', async () => {
    const res = await utils.healthCheck({ auth: null, data: {} });
    expect(res.success).toBe(true);
    expect(res.data.storage).toBe('connected');
  });

  test('healthCheck failure path returns success=false', async () => {
    global.__mockHealthFail = true;
    const res = await utils.healthCheck({ auth: null, data: {} });
    expect(res.success).toBe(false);
    delete global.__mockHealthFail;
  });
});
