const { HttpsError } = require('firebase-functions/v2/https');

jest.mock('firebase-admin', () => {
  const firestoreData = new Map();
  const docs = new Map();
  function ensureDoc(id) {
    if (!docs.has(id)) {
      const d = {
        id,
        get: jest.fn(async () => ({ exists: firestoreData.has(id), data: () => firestoreData.get(id) })),
        set: jest.fn(async (data) => { firestoreData.set(id, data); }),
        update: jest.fn(async (data) => { const prev = firestoreData.get(id) || {}; firestoreData.set(id, { ...prev, ...data }); })
      };
      docs.set(id, d);
    }
    return docs.get(id);
  }
  return {
    firestore: () => ({
      collection: () => ({ doc: (id) => ensureDoc(id) }),
      runTransaction: async (fn) => {
        const tx = { get: (ref) => ref.get(), set: (ref, data) => ref.set(data), update: (ref, data) => ref.update(data) };
        return fn(tx);
      },
      FieldValue: { serverTimestamp: () => new Date() }
    })
  };
});

const { checkRateLimit } = require('../src/utils/helpers');

describe('checkRateLimit', () => {
  beforeAll(() => { process.env.TEST_BYPASS_TRANSACTIONS = '1'; });
  afterAll(() => { delete process.env.TEST_BYPASS_TRANSACTIONS; });
  test('bypass mode allows first call', async () => {
    await expect(checkRateLimit('u1', 'fn', 2)).resolves.toBeUndefined();
  });
  test('bypass mode allows multiple calls without error', async () => {
    await expect(checkRateLimit('u1', 'fn', 2)).resolves.toBeUndefined();
    await expect(checkRateLimit('u1', 'fn', 2)).resolves.toBeUndefined();
  });
});
