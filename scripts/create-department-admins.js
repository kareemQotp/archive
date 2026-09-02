#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function strongPassword() {
  const raw = crypto.randomBytes(10).toString('hex');
  return `Aa1!${raw.slice(0, 10)}`;
}

async function upsertDepartmentAdmin(auth, db, departmentDoc, defaultPassword) {
  const data = departmentDoc.data() || {};
  const departmentId = departmentDoc.id;
  const email = String(data.adminEmail || '').trim().toLowerCase();
  if (!email) {
    return { departmentId, skipped: true, reason: 'missing adminEmail' };
  }

  const displayName = `Department Admin - ${departmentId}`;
  const password = defaultPassword || strongPassword();

  let user;
  let action = 'created';
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { displayName, password, disabled: false, emailVerified: true });
    action = 'updated';
  } catch (_) {
    user = await auth.createUser({ email, password, displayName, disabled: false, emailVerified: true });
  }

  await auth.setCustomUserClaims(user.uid, { role: 'department_admin', department: departmentId, departmentId });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email,
    displayName,
    role: 'department_admin',
    department: departmentId,
    departmentId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    roleAssignedAt: now,
    roleAssignedBy: 'script:create-department-admins',
    syncedFromAuth: true,
    syncedAt: now,
    syncedBy: 'script:create-department-admins'
  }, { merge: true });

  return {
    departmentId,
    email,
    uid: user.uid,
    role: 'department_admin',
    action,
    temporaryPassword: password
  };
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const outPath = getArg('--out');
  const defaultPassword = getArg('--password');

  if (!serviceAccountPath) {
    console.error('Missing required arg: --serviceAccount');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(require(resolvedServiceAccount)) });
  const db = admin.firestore();
  const auth = admin.auth();

  const departmentsSnapshot = await db.collection('departments').get();
  const results = [];

  for (const dep of departmentsSnapshot.docs) {
    const r = await upsertDepartmentAdmin(auth, db, dep, defaultPassword || null);
    results.push(r);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalDepartments: departmentsSnapshot.size,
    results
  };

  if (outPath) {
    const resolvedOut = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Wrote department admins info to: ${resolvedOut}`);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
