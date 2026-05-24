# Rules Review Checklist

## Security checks
- No rule fallback grants broader access than intended.
- Sensitive writes require strict role checks.
- Reads are limited to authenticated users unless explicitly public.

## Logic checks
- Helper functions are reused consistently.
- Path parameters are validated where applicable.
- Create/update conditions do not allow privilege escalation.

## Regression checks
- Existing role flows still work: admin, archive officer, regular user.
- No critical UI action fails due to unintended deny.

## Deploy discipline
- Deploy only the changed rule scope first.
- Verify behavior immediately after deployment.
