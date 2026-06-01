#!/usr/bin/env node
/*
 * Promote or update a Firebase Auth user role for testing.
 * Usage:
 *   node scripts/set-user-role.js --email someone@example.com --role super_admin
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[key] = val;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || '').trim().toLowerCase();
  const role = String(args.role || '').trim().toLowerCase();
  const department = String(args.department || '').trim();

  if (!email || !role) {
    console.error('Missing required args: --email and --role');
    process.exit(2);
  }

  const allowedRoles = new Set([
    'admin',
    'system_admin',
    'super_admin',
    'archive_officer',
    'department_admin',
    'manager',
    'employee',
    'viewer',
    'user'
  ]);

  if (!allowedRoles.has(role)) {
    console.error(`Role is not allowed: ${role}`);
    process.exit(2);
  }

  const serviceAccountPath = path.resolve(__dirname, '..', 'archive-tech-firebase-adminsdk.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found: ${serviceAccountPath}`);
    process.exit(2);
  }

  const serviceAccount = require(serviceAccountPath);
  const projectId = serviceAccount.project_id || 'archive-tech';

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  const user = await auth.getUserByEmail(email);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const claims = {
    ...(user.customClaims || {}),
    role
  };

  if (department) claims.department = department;

  await auth.setCustomUserClaims(user.uid, claims);

  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || '',
      role,
      department: department || '',
      isActive: true,
      updatedAt: now,
      roleAssignedAt: now,
      roleAssignedBy: 'script:set-user-role',
      syncedFromAuth: true,
      syncedAt: now,
      syncedBy: 'script:set-user-role'
    },
    { merge: true }
  );

  console.log('Role assignment completed successfully.');
  console.log(`uid=${user.uid}`);
  console.log(`email=${user.email}`);
  console.log(`role=${role}`);
  console.log(`projectId=${projectId}`);
}

main().catch((err) => {
  console.error('Failed to assign role.');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
