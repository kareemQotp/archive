#!/usr/bin/env node
/*
 * Migrate existing users to RBAC v1.
 * Usage:
 *   node scripts/migrate-rbac-v1.js --serviceAccount ./archive-tech-firebase-adminsdk.json
 *   node scripts/migrate-rbac-v1.js --serviceAccount ./archive-tech-firebase-adminsdk.json --dryRun
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const AuthConstants = require('../public/assets/js/auth-constants');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

function normalizeUser(data) {
  const originalRole = String(data.role || 'viewer').trim();
  const legacyDepartment = AuthConstants.departmentFromLegacyRole(originalRole);
  const nextRole = AuthConstants.normalizeRole(originalRole);
  const nextDepartment = AuthConstants.normalizeDepartment(
    data.departmentId || data.department || legacyDepartment || ''
  );

  return {
    originalRole,
    nextRole,
    nextDepartment
  };
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const dryRun = !!getArg('--dryRun', false);

  if (!serviceAccountPath) {
    console.error('Missing required arg: --serviceAccount');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({credential: admin.credential.cert(require(resolvedServiceAccount))});
  const db = admin.firestore();
  const auth = admin.auth();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const usersSnapshot = await db.collection('users').get();
  const results = [];
  let batch = db.batch();
  let batchOps = 0;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data() || {};
    const {originalRole, nextRole, nextDepartment} = normalizeUser(data);
    const changed = originalRole !== nextRole ||
      (data.departmentId || '') !== nextDepartment ||
      (data.department || '') !== nextDepartment;

    const row = {
      uid: doc.id,
      email: data.email || '',
      fromRole: originalRole,
      toRole: nextRole,
      departmentId: nextDepartment,
      changed
    };
    results.push(row);

    if (!changed || dryRun) continue;

    batch.set(doc.ref, {
      role: nextRole,
      department: nextDepartment,
      departmentId: nextDepartment,
      roleMigratedAt: now,
      roleMigratedFrom: originalRole,
      roleMigratedBy: 'script:migrate-rbac-v1',
      updatedAt: now
    }, {merge: true});
    batchOps += 1;

    await auth.setCustomUserClaims(doc.id, {
      role: nextRole,
      department: nextDepartment,
      departmentId: nextDepartment
    });

    if (batchOps >= 450) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0 && !dryRun) {
    await batch.commit();
  }

  const summary = {
    dryRun,
    scanned: results.length,
    changed: results.filter((row) => row.changed).length,
    generatedAt: new Date().toISOString(),
    results
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
