## Functions Consolidation Notes

Date: 2025-08-19

We consolidated duplicated source trees:

- Active code: `functions/src/**`
- Legacy duplicate (pre-refactor): `firebase/functions/src/**` archived to `functions/ARCHIVE_LEGACY/`

Rationale:
1. Avoid drift between two parallel implementations.
2. Centralize constants via `functions/src/config/constants.ts`.
3. Prepare for adding lint rules + tests without ambiguity.

Pending:
- After confirming no missing unique logic, remove `firebase/functions` directory entirely.
- Add `INVITATIONS`, `COUNTERS` (if stable) to `COLLECTIONS`.
- Implement ESLint rule to forbid raw collection string literals & direct FieldValue.serverTimestamp.

Rollback Plan:
If any regression surfaces, compare with archived legacy files under `ARCHIVE_LEGACY` and port needed logic.

Owner: Architecture Refactor Task
