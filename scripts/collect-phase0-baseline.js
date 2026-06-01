/*
 * Phase 0 baseline collector
 * Collects distinct role/department values, auth claims, and page permissions snapshots.
 *
 * Usage:
 *   node scripts/collect-phase0-baseline.js
 *
 * Requirements:
 * - archive-tech-firebase-adminsdk.json exists at repo root
 * - Node environment with firebase-admin installed in repo root
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'phase-0-live-snapshot.json');
const SERVICE_ACCOUNT_PATH = path.join(ROOT, 'archive-tech-firebase-adminsdk.json');

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function pushDistinct(set, value) {
  if (value === undefined || value === null || value === '') return;
  set.add(String(value));
}

async function listAllAuthUsers(auth) {
  const users = [];
  let nextPageToken = undefined;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return users;
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Missing service account file: ${SERVICE_ACCOUNT_PATH}`);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const roleSet = new Set();
  const departmentSet = new Set();
  const departmentIdSet = new Set();
  const statusSet = new Set();

  const usersSnapshot = await db.collection('users').get();
  usersSnapshot.forEach((doc) => {
    const data = doc.data() || {};
    pushDistinct(roleSet, data.role);
    pushDistinct(departmentSet, data.department);
    pushDistinct(departmentIdSet, data.departmentId);
    pushDistinct(statusSet, data.status);
  });

  const authUsers = await listAllAuthUsers(auth);
  const claimRoleSet = new Set();
  const claimDepartmentSet = new Set();

  authUsers.forEach((u) => {
    const claims = u.customClaims || {};
    pushDistinct(claimRoleSet, claims.role || claims.customRole || claims.roleName);
    pushDistinct(claimDepartmentSet, claims.department);
  });

  const pagePermissionsDoc = await db.collection('system_settings').doc('page_permissions').get();
  const userPagePermissionsSnapshot = await db.collection('user_page_permissions').get();

  const output = {
    generatedAt: new Date().toISOString(),
    firestore: {
      usersCount: usersSnapshot.size,
      distinctRoles: Array.from(roleSet).sort(),
      distinctDepartments: Array.from(departmentSet).sort(),
      distinctDepartmentIds: Array.from(departmentIdSet).sort(),
      distinctStatuses: Array.from(statusSet).sort()
    },
    auth: {
      authUsersCount: authUsers.length,
      distinctClaimRoles: Array.from(claimRoleSet).sort(),
      distinctClaimDepartments: Array.from(claimDepartmentSet).sort()
    },
    pagePermissions: {
      systemSettingsPagePermissionsExists: pagePermissionsDoc.exists,
      systemSettingsPagePermissionsKeys: pagePermissionsDoc.exists
        ? Object.keys(pagePermissionsDoc.data() || {}).sort()
        : [],
      userPagePermissionsCount: userPagePermissionsSnapshot.size,
      userPagePermissionsUsers: userPagePermissionsSnapshot.docs.map((d) => d.id).sort()
    },
    samples: {
      users: safeArray(usersSnapshot.docs.slice(0, 10).map((d) => ({ id: d.id, ...d.data() }))),
      authUsers: safeArray(authUsers.slice(0, 10).map((u) => ({
        uid: u.uid,
        email: u.email,
        customClaims: u.customClaims || {}
      })))
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Phase 0 live snapshot written to: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to collect Phase 0 baseline:', err.message || err);
  process.exit(1);
});
