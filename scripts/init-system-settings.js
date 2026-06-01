#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
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
  const now = admin.firestore.FieldValue.serverTimestamp();

  const adminPortalConfig = {
    session: {
      idleTimeoutMinutes: 30,
      maxConcurrentSessions: 1
    },
    lockout: {
      maxAttempts: 5,
      lockoutMinutes: 15
    },
    audit: {
      retentionDays: 365
    },
    featureFlags: {
      invitationsV2: true,
      departmentManagementV2: true,
      userManagementV2: true,
      adminManagementV2: true
    },
    maintenanceMode: false,
    updatedAt: now,
    updatedBy: 'script:init-system-settings'
  };

  await db.collection('system_settings').doc('admin_portal_config').set(adminPortalConfig, { merge: true });

  const pagePermissions = {
    pages: {},
    departments: {},
    updatedAt: now,
    updatedBy: 'script:init-system-settings'
  };
  await db.collection('system_settings').doc('page_permissions').set(pagePermissions, { merge: true });

  console.log('Initialized system_settings/admin_portal_config and system_settings/page_permissions');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
