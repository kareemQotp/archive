// Tests for verifyAppCheck helper (soft → strict modes)
// اختبارات دالة التحقق المرن من App Check

const { HttpsError } = require('firebase-functions/v2/https');

// Mock firebase-admin to capture security log writes
jest.mock('firebase-admin', () => {
  const activityLogs = [];
  const firestoreData = new Map();
  const makeDoc = (id) => ({
    id,
    get: jest.fn(async () => ({ exists: false })),
    set: jest.fn(async (data) => { firestoreData.set(id, data); }),
    update: jest.fn(async (data) => { const existing = firestoreData.get(id) || {}; firestoreData.set(id, { ...existing, ...data }); })
  });
  const collection = jest.fn((name) => {
    return {
      doc: (id) => makeDoc(`${name}/${id}`),
      add: jest.fn(async (doc) => { if (name === 'activity_logs') activityLogs.push(doc); return { id: `${name}_${activityLogs.length}` }; })
    };
  });
  return {
    _activityLogs: activityLogs,
    firestore: () => ({ collection, FieldValue: { serverTimestamp: () => new Date() } })
  };
});

// Import after mocks
const { verifyAppCheck } = require('../src/utils/helpers');
const admin = require('firebase-admin');

describe('verifyAppCheck', () => {
  const originalMode = process.env.APP_CHECK_MODE;

  afterEach(() => {
    process.env.APP_CHECK_MODE = originalMode;
    admin._activityLogs.length = 0; // clear
  });

  test('warn mode completes without throwing when missing token', async () => {
    process.env.APP_CHECK_MODE = 'warn';
    const request = { app: undefined }; // no app check token
    await expect(verifyAppCheck(request, 'fnA')).resolves.toBeUndefined();
    // (Optional) If admin mock captured logs, ensure at most one side-effect
    if (admin._activityLogs) {
      expect(admin._activityLogs.filter(l => l.action === 'missing_app_check').length).toBeLessThanOrEqual(1);
    }
  });

  test('strict mode rejects when missing token', async () => {
    process.env.APP_CHECK_MODE = 'strict';
    const request = { app: undefined };
    await expect(verifyAppCheck(request, 'fnB')).rejects.toBeInstanceOf(HttpsError);
    await expect(verifyAppCheck(request, 'fnB')).rejects.toHaveProperty('code', 'failed-precondition');
    expect(admin._activityLogs.length).toBe(0); // no log in strict path
  });

  test('passes when token present regardless of mode', async () => {
    process.env.APP_CHECK_MODE = 'strict';
    const request = { app: { token: 'xyz' } };
    await expect(verifyAppCheck(request, 'fnC')).resolves.toBeUndefined();
    process.env.APP_CHECK_MODE = 'warn';
    await expect(verifyAppCheck(request, 'fnC')).resolves.toBeUndefined();
  });
});
