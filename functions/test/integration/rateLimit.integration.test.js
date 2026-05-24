/* Integration test for real rate limiting using Firestore emulator.
   Requires: firebase emulators:exec --only firestore
*/

const functionsTest = require('firebase-functions-test')();
const admin = require('firebase-admin');

let wrappedFunction;

beforeAll(async () => {
  // Initialize admin if not already
  try { admin.app(); } catch { admin.initializeApp(); }
  // Dynamically import compiled code (assumes build already ran or using plain JS src)
  const helpers = require('../../src/utils/helpers');
  wrappedFunction = helpers.checkRateLimit;
});

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

(emulatorHost ? describe : describe.skip)('Rate Limit Integration', () => {
  test('allows up to limit then blocks', async () => {
    const uid = 'user_int_1';
    const fn = 'integrationTestFn';
    // Fire 3 allowed then 4th should fail for limit=3
    await expect(wrappedFunction(uid, fn, 3)).resolves.toBeUndefined();
    await expect(wrappedFunction(uid, fn, 3)).resolves.toBeUndefined();
    await expect(wrappedFunction(uid, fn, 3)).resolves.toBeUndefined();
    await expect(wrappedFunction(uid, fn, 3)).rejects.toHaveProperty('code', 'resource-exhausted');
  });
});

afterAll(async () => {
  await Promise.all(admin.apps.map(app => app.delete()));
  functionsTest.cleanup();
});
