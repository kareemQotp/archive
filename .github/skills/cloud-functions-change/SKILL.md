---
name: cloud-functions-change
description: "Safe workflow for Firebase Cloud Functions changes in this repository. Use when editing TypeScript handlers, triggers, HTTP functions, shared utils, or tests in functions. Includes build, lint, fast tests, and targeted deploy guidance. Keywords: cloud functions, typescript, firebase functions, jest, build."
argument-hint: "Changed function area and expected behavior"
user-invocable: true
---

# Cloud Functions Change

## When to use
- You edit files under functions/src.
- You modify shared logic used by multiple handlers.
- You update tests in functions/test or functions/__tests__.

## Procedure
1. Move into functions workspace.
2. Install dependencies if needed.
3. Run static and compile checks.
4. Run fast tests.
5. Run full tests for risky changes.
6. Deploy functions only.
7. Inspect logs after deployment.

## Commands
- cd functions
- npm install
- npm run lint
- npm run build
- npm run test:fast
- npm run test:full
- firebase deploy --only functions
- firebase functions:log

## Quality gates
- Build must pass before deploy.
- Fast tests must pass for all backend changes.
- Use full tests for auth, permissions, notification, and document flows.

## References
- [Functions Verification](./references/functions-checklist.md)
