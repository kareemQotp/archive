# Functions Verification Checklist

## Before code changes
- Identify trigger type: auth, firestore, storage, http, schedule.
- Identify downstream effects on notifications, logging, and permissions.

## Validation
- Lint passes.
- TypeScript build passes.
- Fast test suite passes.
- Full test suite passes for high-risk changes.

## Deployment
- Deploy functions only unless other layers changed.
- Check logs for runtime errors after deployment.

## Post-deploy checks
- Trigger executes as expected.
- No unexpected retries or duplicate side effects.
- User-visible flows remain stable.
