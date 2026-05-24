const admin = require('firebase-admin');
jest.mock('firebase-admin', () => {
  const firestoreData = new Map();
  const doc = (id) => ({
    id,
    get: jest.fn(async () => ({ exists: false })),
    set: jest.fn(async (data) => { firestoreData.set(id, data); }),
    update: jest.fn(async (data) => {
      const existing = firestoreData.get(id) || {}; firestoreData.set(id, { ...existing, ...data });
    })
  });
  const collection = jest.fn(() => ({ doc }));
  const runTransaction = async (fn) => {
    const tx = { get: (ref) => ref.get(), set: (ref, data) => ref.set(data), update: (ref, data) => ref.update(data) };
    return fn(tx);
  };
  return {
    firestore: () => ({ collection, runTransaction, FieldValue: { serverTimestamp: () => new Date() } })
  };
});

const { buildResponse } = require('../src/utils/helpers');

describe('buildResponse', () => {
  test('returns success with data', () => {
    const res = buildResponse(true, { a: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ a: 1 });
    expect(res.error).toBeUndefined();
    expect(res.ts).toBeDefined();
  });

  test('returns error when provided', () => {
    const res = buildResponse(false, null, { code: 'x', message: 'err' });
    expect(res.success).toBe(false);
    expect(res.error).toEqual({ code: 'x', message: 'err' });
  });
});
