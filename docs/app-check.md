## App Check Integration (Soft → Strict Rollout)

هذه الوثيقة تشرح دمج App Check في وظائف السحابة وكيفية الانتقال التدريجي من الوضع المرن إلى الوضع الصارم.

### 1. What Was Implemented
We introduced a soft verification helper `verifyAppCheck(request, functionName)` that is invoked at the start of every callable Cloud Function (auth, firestore, utils, storage modules). It behaves according to the environment variable `APP_CHECK_MODE`:

Mode | Behavior
---- | --------
off  | No verification performed
warn (default) | If token missing: log warning + write security activity log, continue execution
strict | If token missing: throw `failed-precondition` error and block the call

### 2. Server-Side Configuration
Deploy with a desired mode (start with warn):

```bash
firebase functions:config:set app.security.placeholder="1"   # (optional placeholder to force re-deploy)
set APP_CHECK_MODE=warn  # Windows (session)
export APP_CHECK_MODE=warn  # macOS/Linux
firebase deploy --only functions
```

In production CI you can bake the variable via your hosting / Cloud Functions environment (2nd gen supports Cloud Build substitutions or dotenv injection if using build tooling). For local emulator testing you can prefix:

```bash
APP_CHECK_MODE=warn npm test
```

### 3. Client-Side Setup
Initialize App Check early in the web app (in `firebase-init.js` or equivalent) using reCAPTCHA v3 or reCAPTCHA Enterprise. Example (Firebase JS SDK v11+) in JavaScript:

```js
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const app = initializeApp(firebaseConfig);

// For development you can enable debug token *before* loading App Check script
// window.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // or a fixed string token

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

All callable `httpsCallable` invocations will automatically attach the App Check token once initialized.

### 4. Migration Strategy
1. Phase 0 (now) – `warn` mode: Deploy backend, integrate client App Check, monitor new `activity_logs` with `action=missing_app_check`.
2. Phase 1 – Monitor: Ensure ≥95% of calls have valid tokens (create temporary dashboard / query on last 24h logs).
3. Phase 2 – `strict` mode dry-run: Switch staging to `strict`; fix any pages still failing (usually background workers or legacy scripts).
4. Phase 3 – Production `strict`: Set `APP_CHECK_MODE=strict` and deploy. Add alert if `missing_app_check` appears (should be near zero after switch).

### 5. Observability
When in `warn` mode, each missing token creates an `activity_logs` document:
```json
{
  "category": "security",
  "action": "missing_app_check",
  "function": "<functionName>",
  "mode": "warn",
  "timestamp": <serverTimestamp>,
  "priority": "high"
}
```
You can create a composite index or run ad‑hoc queries to count these per hour.

### 6. Error Surfaces (Strict Mode)
Client receives: `{ code: 'functions/failed-precondition', message: 'App Check token required' }` enabling UI to prompt a refresh.

### 7. Backward Compatibility
- Existing clients without App Check continue to function in `warn` mode.
- No breaking change to response schema (`buildResponse`) since App Check failures throw an `HttpsError` before building a payload.

### 8. Future Enhancements
- Add metrics aggregation (daily count of missing tokens) into `daily_statistics`.
- Enrich security logs with `request.auth.uid` (if present) to detect authenticated clients missing tokens.
- Add automated alert (e.g., via Cloud Monitoring log-based metric) when count > threshold.
- Optionally move to **enforceAppCheck: true** per function after strict mode stabilization to shift validation earlier in the platform layer.

### 9. Quick Verification Checklist
Item | Done
---- | ----
Helper present | ✅ `src/utils/helpers.js` (`verifyAppCheck`)
Auth callables integrated | ✅
Firestore callables integrated | ✅
Utils callables integrated | ✅
Storage callables integrated | ✅
Soft logs appear on missing token | ✅ (warn mode)

### 10. Rollback Plan
If unexpected failures occur after switching to `strict`, redeploy with:
```bash
APP_CHECK_MODE=warn firebase deploy --only functions
```

---
English & Arabic comments included to align with project bilingual conventions.
