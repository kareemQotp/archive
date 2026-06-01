#!/usr/bin/env node
const path = require('path');
const admin = require('firebase-admin');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/check-user-role.js <email>');
    process.exit(2);
  }

  const serviceAccountPath = path.resolve(__dirname, '..', 'archive-tech-firebase-adminsdk.json');
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'archive-tech'
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const user = await auth.getUserByEmail(email);
  const doc = await db.collection('users').doc(user.uid).get();

  console.log(`uid=${user.uid}`);
  console.log(`email=${user.email}`);
  console.log(`claimsRole=${(user.customClaims && user.customClaims.role) || ''}`);
  console.log(`docExists=${doc.exists}`);
  console.log(`docRole=${doc.exists ? (doc.data().role || '') : ''}`);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
