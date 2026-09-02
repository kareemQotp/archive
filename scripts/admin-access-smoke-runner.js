#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const AuthConstants = require('../public/assets/js/auth-constants');

const ROLES = ['super_admin', 'system_admin', 'admin', 'dept_admin', 'manager', 'employee', 'viewer'];
const PAGES = [
  { key: 'invitations', flag: 'invitationsV2', allowedRoles: ['admin', 'dept_admin'] },
  { key: 'department_management', flag: 'departmentManagementV2', allowedRoles: ['admin', 'super_admin', 'system_admin'] },
  { key: 'user_management', flag: 'userManagementV2', allowedRoles: ['super_admin', 'system_admin'] },
  { key: 'admin_management', flag: 'adminManagementV2', allowedRoles: ['super_admin', 'system_admin'] }
];

function normalizeRole(role) {
  return AuthConstants.normalizeRole(role);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--flags' && argv[i + 1]) {
      args.flagsPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--out' && argv[i + 1]) {
      args.outPrefix = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

function loadFlags(flagsPath) {
  if (!flagsPath) {
    return {
      invitationsV2: true,
      departmentManagementV2: true,
      userManagementV2: true,
      adminManagementV2: true
    };
  }

  const raw = fs.readFileSync(flagsPath, 'utf8');
  const parsed = JSON.parse(raw);
  const source = parsed.featureFlags || parsed.flags || parsed;

  return {
    invitationsV2: source.invitationsV2 !== false,
    departmentManagementV2: source.departmentManagementV2 !== false,
    userManagementV2: source.userManagementV2 !== false,
    adminManagementV2: source.adminManagementV2 !== false
  };
}

function evaluateRow(role, page, flags) {
  const normalizedRole = normalizeRole(role);
  const allowedRoles = page.allowedRoles.map(normalizeRole);
  const roleAllowed = allowedRoles.includes(normalizedRole);
  const moduleAllowed = !!flags[page.flag];
  return {
    role,
    normalizedRole,
    page: page.key,
    flag: page.flag,
    roleAllowed,
    moduleAllowed,
    finalAccess: roleAllowed && moduleAllowed
  };
}

function buildRows(flags) {
  const rows = [];
  for (const role of ROLES) {
    for (const page of PAGES) {
      rows.push(evaluateRow(role, page, flags));
    }
  }
  return rows;
}

function runPrivilegeEscalationChecks(rows) {
  const failures = [];

  const forbidden = [
    { role: 'admin', page: 'user_management' },
    { role: 'admin', page: 'admin_management' },
    { role: 'dept_admin', page: 'user_management' },
    { role: 'dept_admin', page: 'admin_management' },
    { role: 'employee', page: 'user_management' },
    { role: 'employee', page: 'admin_management' },
    { role: 'viewer', page: 'user_management' },
    { role: 'viewer', page: 'admin_management' }
  ];

  for (const check of forbidden) {
    const hit = rows.find(r => r.role === check.role && r.page === check.page);
    if (hit && hit.finalAccess) {
      failures.push(`Privilege escalation detected: role=${check.role}, page=${check.page}`);
    }
  }

  const required = [
    { role: 'super_admin', page: 'user_management' },
    { role: 'super_admin', page: 'admin_management' },
    { role: 'system_admin', page: 'user_management' },
    { role: 'system_admin', page: 'admin_management' }
  ];

  for (const check of required) {
    const hit = rows.find(r => r.role === check.role && r.page === check.page);
    if (!hit || !hit.finalAccess) {
      failures.push(`Expected access missing: role=${check.role}, page=${check.page}`);
    }
  }

  return failures;
}

function toCsv(rows) {
  const header = ['role', 'normalizedRole', 'page', 'flag', 'roleAllowed', 'moduleAllowed', 'finalAccess'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const values = [
      row.role,
      row.normalizedRole,
      row.page,
      row.flag,
      row.roleAllowed,
      row.moduleAllowed,
      row.finalAccess
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

function writeOutputs(basePath, payload, rows) {
  const jsonPath = `${basePath}.json`;
  const csvPath = `${basePath}.csv`;

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(csvPath, toCsv(rows), 'utf8');

  return { jsonPath, csvPath };
}

function main() {
  const args = parseArgs(process.argv);
  const flags = loadFlags(args.flagsPath);
  const rows = buildRows(flags);
  const failures = runPrivilegeEscalationChecks(rows);

  const summary = {
    total: rows.length,
    allow: rows.filter(r => r.finalAccess).length,
    deny: rows.filter(r => !r.finalAccess).length,
    failures: failures.length
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFlags: flags,
    summary,
    failures,
    rows
  };

  const repoRoot = path.resolve(__dirname, '..');
  const defaultPrefix = path.join(repoRoot, 'docs', 'admin-access-smoke-latest');
  const outputPrefix = args.outPrefix ? path.resolve(args.outPrefix) : defaultPrefix;
  const out = writeOutputs(outputPrefix, payload, rows);

  console.log('Admin Access Smoke Runner finished.');
  console.log(`JSON report: ${out.jsonPath}`);
  console.log(`CSV report:  ${out.csvPath}`);
  console.log(`Summary: total=${summary.total}, allow=${summary.allow}, deny=${summary.deny}, failures=${summary.failures}`);

  if (failures.length) {
    console.error('Security failures detected:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
