# Phase 0 Risk Register and Rollback Checklist

Status: Draft v1
Date: 2026-05-25

## 1) Risk Register

| ID | Risk | Severity | Likelihood | Trigger | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R-01 | Frontend role normalization diverges from backend enforcement | High | Medium | Access mismatch between UI and API | Keep shared alias contract in [docs/role-department-contract.md](docs/role-department-contract.md); validate with role x page matrix | Engineering |
| R-02 | Legacy guard conflict with unified guard | High | Medium | Unexpected redirects or unauthorized view | Remove legacy guard gradually; track pages still loading legacy controller | Engineering |
| R-03 | Rules allow broader role values than intended | High | Low | Unauthorized role write/update | Keep isAllowedRole controlled in [firestore.rules](firestore.rules#L62); enforce create/update checks | Engineering |
| R-04 | Claims/users role mismatch during migration | High | Medium | Admin lockout or broken routing | Phase 4 migration runbook + sampling verification | Engineering |
| R-05 | Department alias ambiguity (Arabic vs English values) | Medium | High | Users routed to wrong dashboard | Keep normalization map explicit and tested in router/auth | Engineering |
| R-06 | Page permissions override misconfiguration | Medium | Medium | User sees hidden page or loses expected access | Snapshot + diff system_settings/page_permissions and user_page_permissions before changes | Product + Engineering |

## 2) Rollback Triggers
- Unauthorized access detected on protected pages.
- Admin lockout or failed admin-only actions.
- Routing regression for dashboard landing pages.
- Rules denials spike after deploy.

## 3) Rollback Checklist

### Pre-deploy checkpoint
- Backup current docs/config snapshots:
  - users role/department distinct values.
  - Auth custom claims snapshot.
  - system_settings/page_permissions.
  - user_page_permissions collection snapshot.
- Record git commit/tag before permission changes.

### If rollback is triggered
1. Roll back frontend bundle to last stable release.
2. Roll back functions to last stable release.
3. Roll back Firestore rules to last stable release.
4. Re-apply previous page_permissions and user_page_permissions snapshots.
5. Re-validate admin login, dashboard routing, and protected pages.
6. Publish incident note with root cause and next safe patch.

### Post-rollback verification
- Admin can access [public/admin-management.html](public/admin-management.html).
- Non-admin users cannot access admin pages.
- Role-based routing lands users on expected dashboard.
- No abnormal permission-denied spikes in logs.
