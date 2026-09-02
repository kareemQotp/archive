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

  const allOperational = {
    super_admin: true,
    admin: true,
    department_admin: true,
    supervisor: true,
    archive_officer: true,
    employee: true,
    viewer: false
  };
  const readOnly = {
    super_admin: true,
    admin: true,
    department_admin: true,
    supervisor: true,
    archive_officer: true,
    employee: true,
    viewer: true
  };
  const superAdminOnly = {
    super_admin: true,
    admin: false,
    department_admin: false,
    supervisor: false,
    archive_officer: false,
    employee: false,
    viewer: false
  };

  const pagePermissions = {
    pages: {
      dashboard: { path: 'dashboard.html', permissions: readOnly },
      search: { path: 'search.html', permissions: readOnly },
      profile: { path: 'profile.html', permissions: readOnly },
      'file-tracking': { path: 'file-tracking.html', permissions: readOnly },
      upload: { path: 'upload.html', permissions: allOperational },
      scanner: { path: 'scanner.html', permissions: allOperational },
      'file-management': { path: 'file-management-dashboard.html', permissions: allOperational },
      'file-management-dashboard': { path: 'file-management-dashboard.html', permissions: allOperational },
      'qr-generator': { path: 'qr-generator.html', permissions: allOperational },
      'movement-reports': {
        path: 'movement-reports.html',
        permissions: { ...allOperational, archive_officer: false, employee: false, viewer: false }
      },
      'system-analytics': {
        path: 'system-analytics.html',
        permissions: { ...allOperational, supervisor: false, archive_officer: false, employee: false, viewer: false }
      },
      invitations: {
        path: 'invitations.html',
        permissions: { ...allOperational, supervisor: false, archive_officer: false, employee: false, viewer: false }
      },
      'department-management': {
        path: 'department-management.html',
        permissions: { ...superAdminOnly, admin: true }
      },
      'user-management': { path: 'user-management.html', permissions: superAdminOnly },
      'admin-management': { path: 'admin-management.html', permissions: superAdminOnly },
      'page-permissions': { path: 'page-permissions.html', permissions: superAdminOnly },
      'role-manager': { path: 'role-manager.html', permissions: superAdminOnly },
      'create-admin': { path: 'create-admin.html', permissions: superAdminOnly }
    },
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
