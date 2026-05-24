# Deploy Checklist

## Preflight
- Confirm Firebase project target is correct.
- Confirm changed files are expected.
- Confirm required environment and secrets are available.

## Build and test
- Root: install dependencies if lockfiles changed.
- Functions: npm run build must pass.
- Functions: npm run test:fast should pass for backend-impact changes.

## Stage deploy
- UI-only changes: deploy hosting first.
- Rules-only changes: deploy rules only and verify access.
- Function changes: deploy functions after passing tests.

## Post-deploy smoke checks
- Login and role-based navigation.
- Document upload and basic read flow.
- Notification trigger path (if changed).
- Activity logging write path.

## Rollback notes
- Keep last known good tag or commit reference.
- Re-deploy previous version for affected scope only.
