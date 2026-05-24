// Tests for Firestore trigger functions to improve coverage
// تغطية التريجرات لرفع نسبة التغطية

jest.mock('firebase-functions', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

// Minimal mock for firebase-admin supporting collections, where chaining, batch, timestamps
jest.mock('firebase-admin', () => {
  const store = {
    users: {},
    activity_logs: {},
    notifications: {},
    documents: {},
    file_movements: {}
  };
  global.__triggersStore = store;

  function genId(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 10); }

  class QueryBuilder {
    constructor(collName){
      this.collName = collName;
      this.filters = [];
    }
    where(field, op, value){
      this.filters.push({ field, op, value });
      return this;
    }
    orderBy(){ return this; }
    async get(){
      const all = Object.entries(store[this.collName] || {})
        .map(([id, data]) => ({ id, data: () => data }));
      const filtered = all.filter(doc => this.filters.every(f => {
        if (f.op !== '==') return true; // simplify
        return doc.data()[f.field] === f.value;
      }));
      return { docs: filtered };
    }
  }

  function docFactory(collName, id) {
    const _id = id || genId('auto');
    return {
      id: _id,
      set: (data) => { store[collName][_id] = data; },
      get: async () => ({ exists: !!store[collName][_id], data: () => store[collName][_id] })
    };
  }

  function collection(name){
    if(!store[name]) store[name] = {};
    return {
      doc: (id) => docFactory(name, id),
      add: async (data) => { const id = genId('add'); store[name][id] = data; return { id }; },
      where: (f,o,v) => new QueryBuilder(name).where(f,o,v)
    };
  }

  function batch(){
    const ops = [];
    return {
      set: (ref, data) => ops.push({ ref, data }),
      commit: async () => { ops.forEach(op => op.ref.set(op.data)); }
    };
  }

  const firestore = () => ({ collection, batch });
  firestore.FieldValue = { serverTimestamp: () => ({ toDate: () => new Date() }) };

  return { firestore };
});

const firestoreModule = require('../src/firestore');

describe('Firestore triggers', () => {
  beforeEach(() => {
    const s = global.__triggersStore;
    // reset dynamic collections
    ['activity_logs','notifications','documents','file_movements','users'].forEach(c => { s[c] = {}; });
    // seed users
    s.users['admin_1'] = { role: 'admin', isActive: true };
    s.users['dept_user_1'] = { role: 'viewer', isActive: true, department: 'IT' };
    s.users['dept_user_2'] = { role: 'viewer', isActive: true, department: 'IT' };
  });

  test('onDocumentCreate logs activity and sends department notifications', async () => {
    const event = {
      params: { documentId: 'doc123' },
      data: { data: () => ({ fileName: 'a.pdf', fileNumber: '2025-07-0001', fileSize: 500, fileType: 'application/pdf', category: 'legal', department: 'IT', createdBy: 'admin_1' }) }
    };
    await firestoreModule.onDocumentCreate(event);
    const s = global.__triggersStore;
    expect(Object.values(s.activity_logs).length).toBe(1);
    expect(Object.values(s.notifications).length).toBeGreaterThanOrEqual(2);
  });

  test('onDocumentUpdate logs edit with changes', async () => {
    const event = {
      params: { documentId: 'doc456' },
      data: {
        before: { data: () => ({ fileName: 'old.txt', fileNumber: '2025-07-0002', category: 'gen' }) },
        after: { data: () => ({ fileName: 'new.txt', fileNumber: '2025-07-0002', category: 'gen', lastModifiedBy: 'admin_1' }) }
      }
    };
    await firestoreModule.onDocumentUpdate(event);
    const logs = Object.values(global.__triggersStore.activity_logs);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('edit');
    expect(logs[0].details.fileName).toBe('new.txt');
  });

  test('onDocumentDelete logs delete action', async () => {
    const event = {
      params: { documentId: 'doc789' },
      data: { data: () => ({ fileName: 'gone.docx', fileNumber: '2025-07-0003', deletedBy: 'admin_1', createdBy: 'admin_1' }) }
    };
    await firestoreModule.onDocumentDelete(event);
    const logs = Object.values(global.__triggersStore.activity_logs);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('delete');
  });

  test('onFileMovementCreate logs move and notifies target department', async () => {
    const event = {
      params: { movementId: 'move1' },
      data: { data: () => ({ fileNumber: '2025-07-0004', fileName: 'a.pdf', fromDepartment: 'HR', toDepartment: 'IT', action: 'transfer', priority: 'normal', createdBy: 'admin_1' }) }
    };
    await firestoreModule.onFileMovementCreate(event);
    const s = global.__triggersStore;
    expect(Object.values(s.activity_logs).length).toBe(1);
    expect(Object.values(s.notifications).length).toBeGreaterThanOrEqual(2);
  });

  test('onActivityLogCreate (security) creates admin notifications', async () => {
    const event = {
      params: { logId: 'logSec1' },
      data: { data: () => ({ category: 'security', action: 'missing_app_check', priority: 'critical' }) }
    };
    await firestoreModule.onActivityLogCreate(event);
    const notes = Object.values(global.__triggersStore.notifications);
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes[0].type).toBe('security_alert');
  });
});
