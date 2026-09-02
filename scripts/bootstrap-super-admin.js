#!/usr/bin/env node
/*
  Create/recreate bootstrap super admin in Auth + Firestore + custom claims.
  Usage:
    node scripts/bootstrap-super-admin.js --serviceAccount ./archive-tech-firebase-adminsdk.json --email kareemqotp@gmail.com --password "StrongPass!123" --displayName "System Owner"
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function generateTempPassword() {
  const seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const core = seed.slice(0, 10);
  return `Tmp!${core}9A`;
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const email = String(getArg('--email', '')).trim().toLowerCase();
  let password = String(getArg('--password', '')).trim();
  const displayName = String(getArg('--displayName', 'System Admin')).trim();
  const department = String(getArg('--department', 'admin')).trim();

  if (!serviceAccountPath || !email) {
    console.error('Missing required args: --serviceAccount, --email');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedServiceAccount))
  });

  const auth = admin.auth();
  const db = admin.firestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    userRecord = await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      disabled: false,
      emailVerified: true
    });
    console.log(`Updated existing auth user: ${userRecord.uid}`);
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') {
      if (!password) {
        password = generateTempPassword();
      }
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        disabled: false,
        emailVerified: true
      });
      console.log(`Created auth user: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  const claims = {
    role: 'super_admin',
    department,
    departmentId: department
  };
  await auth.setCustomUserClaims(userRecord.uid, claims);

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    displayName,
    role: 'super_admin',
    department,
    departmentId: department,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    roleAssignedAt: now,
    roleAssignedBy: 'script:bootstrap-super-admin',
    syncedFromAuth: true,
    syncedAt: now,
    syncedBy: 'script:bootstrap-super-admin'
  }, { merge: true });

  console.log(`Bootstrap super admin ready: ${email}`);
  console.log(`uid=${userRecord.uid}`);
  if (password) {
    console.log(`temporaryPassword=${password}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
