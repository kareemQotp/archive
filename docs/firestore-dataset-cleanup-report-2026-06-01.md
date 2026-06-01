# Firestore Dataset Cleanup Report (2026-06-01)

## Scope
- Requested implementation: review Firestore datasets and delete unused datasets.
- Environment executed: `Production` (`archive-tech`).
- Staging status: no staging alias/project configured in `.firebaserc` for this workspace.

## Baseline (Before Deletion)
Source: `docs/firestore-audit-production.json`

- Total root collections: **20**
- Candidate unused collections selected for deletion (after code/rules usage review):
  - `test`
  - `notification_settings`
  - `system`
  - `counters`
  - `daily_statistics`
  - `rate_limits`

## Backup
Local JSON backup completed before deletion:
- Folder: `backups/firestore-cleanup-20260601_123657/`
- Files:
  - `backups/firestore-cleanup-20260601_123657/test.json`
  - `backups/firestore-cleanup-20260601_123657/notification_settings.json`
  - `backups/firestore-cleanup-20260601_123657/system.json`
  - `backups/firestore-cleanup-20260601_123657/counters.json`
  - `backups/firestore-cleanup-20260601_123657/daily_statistics.json`
  - `backups/firestore-cleanup-20260601_123657/rate_limits.json`
  - `backups/firestore-cleanup-20260601_123657/_summary.json`

## Deletion Execution Evidence
Per-collection deletion results:
- `docs/cleanup-delete-test.json` (`beforeCount: 5`, `afterCount: 0`)
- `docs/cleanup-delete-notification_settings.json` (`beforeCount: 10`, `afterCount: 0`)
- `docs/cleanup-delete-system.json` (`beforeCount: 1`, `afterCount: 0`)
- `docs/cleanup-delete-counters.json` (`beforeCount: 1`, `afterCount: 0`)
- `daily_statistics` and `rate_limits` confirmed removed by final global audit result.

## Final State (After Deletion)
Source: `docs/firestore-audit-production-final.json`

- Total root collections: **14**
- Remaining collections:
  - `activity_logs`
  - `audit_logs`
  - `auth_logs`
  - `departments`
  - `documents`
  - `file_movements`
  - `invitations`
  - `notification_queue`
  - `notifications`
  - `sent_notifications`
  - `system_settings`
  - `user_page_permissions`
  - `user_preferences`
  - `users`

## Notes
- `audit_logs` and `auth_logs` were retained because they are referenced by runtime frontend code.
- No changes were made to Firestore rules in this operation.
- Utility scripts added for repeatable audit/backup/delete workflow:
  - `scripts/firestore-collection-audit.js`
  - `scripts/firestore-export-collections.js`
  - `scripts/firestore-delete-collections.js`
