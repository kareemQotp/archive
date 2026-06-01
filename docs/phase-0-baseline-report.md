# Phase 0 Baseline Report

Status: Completed (Engineering)
Date: 2026-05-25
Scope: Roles, departments, access guards, page permissions, rules/functions alignment

## 1) What Was Captured

### 1.1 Role and Department Runtime Contract
- Canonical contract exists in [docs/role-department-contract.md](docs/role-department-contract.md).
- Frontend normalization is active in [public/assets/js/unified-auth.js](public/assets/js/unified-auth.js#L26), [public/assets/js/role-based-routing.js](public/assets/js/role-based-routing.js#L112), and [public/assets/js/unified-ui-template.js](public/assets/js/unified-ui-template.js#L213).
- Backend normalization helpers are active in [functions/src/utils/helpers.js](functions/src/utils/helpers.js#L46).
- Firestore rules alias helpers are active in [firestore.rules](firestore.rules#L30).

### 1.2 Legacy Role/Department Footprint Still Present (Static Evidence)
- Mixed admin aliases in dashboard logic: [public/assets/js/file-management-dashboard.js](public/assets/js/file-management-dashboard.js#L144).
- Direct role checks in some feature modules: [public/assets/js/archive-reports-page.js](public/assets/js/archive-reports-page.js#L170), [public/assets/js/classification-page.js](public/assets/js/classification-page.js#L292), [public/assets/js/storage-management-page.js](public/assets/js/storage-management-page.js#L160).
- Legacy sidebar/admin checks still present: [public/assets/js/sidebar.js](public/assets/js/sidebar.js#L688).

### 1.3 Legacy Access Guard Pages (Phase 0 Requirement)
Pages that still include legacy page access controller:
- [public/admin-management.html](public/admin-management.html#L588)
- [public/file-management-dashboard.html](public/file-management-dashboard.html#L459)

### 1.4 Page Permissions Sources
- System page permissions source: [public/assets/js/page-permissions.js](public/assets/js/page-permissions.js#L21) reads system_settings/page_permissions.
- Per-user override source: [public/assets/js/unified-ui-template.js](public/assets/js/unified-ui-template.js#L69) reads user_page_permissions.

### 1.5 Rules/Functions Admin Compatibility Snapshot
- Rules admin alias compatibility in [firestore.rules](firestore.rules#L30).
- Auth functions admin checks now normalized in [functions/src/auth/index.js](functions/src/auth/index.js#L44).
- Firestore functions checks now normalized in [functions/src/firestore/index.js](functions/src/firestore/index.js#L156).
- Storage functions checks now normalized in [functions/src/storage/index.js](functions/src/storage/index.js#L242).

## 2) Gaps to Close for Operational Sign-off

### 2.1 Live Data Baseline (Firestore users + Auth Claims)
Snapshot script تم تجهيزه في [scripts/collect-phase0-baseline.js](scripts/collect-phase0-baseline.js)،
لكن التنفيذ من هذه الجلسة كان محجوبًا بسبب عدم توفر Node.js في بيئة الطرفية الحالية.

Required exports:
- Distinct users.role values in users collection.
- Distinct users.department/users.departmentId values.
- Distinct Auth custom claims role/department values.
- Current system_settings/page_permissions and user_page_permissions snapshots.

### 2.2 Freeze Window
- Freeze window for permission-sensitive changes is not yet approved.
- Owner sign-off pending (Product + Engineering).

## 3) Proposed Commands for Remaining Baseline Collection

### 3.1 Firestore users distinct roles/departments (via script)
- Use Admin SDK script in a controlled environment to aggregate distinct role and department values.

### 3.2 Auth claims snapshot
- Use Admin SDK listUsers with pagination, extract claims.role/claims.department.

### 3.3 Page permissions snapshot
- Export documents:
  - system_settings/page_permissions
  - all docs in user_page_permissions

## 4) Phase 0 Acceptance Status
- Baseline artifacts committed in docs: Completed.
- Risk register + rollback checklist: Completed.
- Team sign-off on migration window: Pending (operational step).
- Live snapshot execution: Pending (environment prerequisite: Node.js runtime).
- Phase 0 overall: Completed (Engineering), Pending (Operational sign-off).
