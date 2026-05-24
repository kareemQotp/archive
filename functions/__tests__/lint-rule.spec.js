const { ESLint } = require('eslint');
const path = require('path');

describe('Custom ESLint rule no-raw-firestore', () => {
  const makeESLint = () => new ESLint({
    cwd: path.join(__dirname, '..'),
    useEslintrc: false,
    overrideConfig: {
      parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
      env: { node: true },
      plugins: ['local-firestore'],
      rules: {
        'local-firestore/no-raw-firestore': 'error'
      }
    }
  });

  test('flags raw collection literal and raw serverTimestamp', async () => {
    const eslint = makeESLint();
    const code = "const admin = require('firebase-admin'); const db = admin.firestore(); function bad(){ db.collection('users').doc('x'); admin.firestore.FieldValue.serverTimestamp(); } module.exports = bad;";
    const results = await eslint.lintText(code, { filePath: 'src/temp-bad.js' });
    const messages = results[0].messages;
    // Debug output if fails
  // eslint-disable-next-line no-console
  console.log('Bad sample messages:', messages.map(m=>m.message));
    expect(messages.some(m => m.message.includes('Direct Firestore collection literal'))).toBe(true);
    expect(messages.some(m => m.message.includes('serverTS'))).toBe(true);
  });

  test('allows usage via COLLECTIONS constant and serverTS helper placeholder', async () => {
    const eslint = makeESLint();
    const code = "const admin = require('firebase-admin'); const COLLECTIONS={USERS:'users'}; function serverTS(){return Date.now();} const db=admin.firestore(); function good(){ db.collection(COLLECTIONS.USERS).doc('x'); serverTS(); } module.exports=good;";
    const results = await eslint.lintText(code, { filePath: 'src/temp-good.js' });
    const messages = results[0].messages;
  // eslint-disable-next-line no-console
  console.log('Good sample messages:', messages.map(m=>m.message));
    expect(messages.length).toBe(0);
  });
});
