---
name: firebase-safe-deploy
description: "Safe Firebase deployment workflow for this project. Use when deploying hosting, functions, firestore rules, or storage rules. Includes preflight checks, staged deployment, and rollback notes to reduce production mistakes. Keywords: firebase deploy, hosting, functions, firestore rules, release."
argument-hint: "Target and scope, for example: hosting only, functions only, or full release"
user-invocable: true
---

# Firebase Safe Deploy

## When to use
- You are preparing any Firebase deployment.
- You changed hosting pages or JS modules in public.
- You changed Cloud Functions in functions/src.
- You changed security files: firestore.rules or storage.rules.

## Procedure
1. Confirm working tree and changed files.
2. Run root dependency check: npm install (if needed).
3. If functions changed, run functions checks:
   - cd functions
   - npm install (if needed)
   - npm run build
   - npm run test:fast
4. Validate deployment scope from changed files.
5. Deploy in stages instead of one-shot deploy:
   - hosting first for UI-only changes
   - rules separately for security-only changes
   - functions last for backend changes
6. Verify post-deploy behavior with smoke checks.
7. Document what was deployed and why.

## Commands
- Root hosting dev check: npm run start
- Full deploy: npm run deploy
- Hosting only: firebase deploy --only hosting
- Functions only: firebase deploy --only functions
- Firestore rules only: firebase deploy --only firestore:rules
- Storage rules only: firebase deploy --only storage

## Safety gates
- Never deploy functions without a successful build.
- Never deploy firestore rules without reviewing role helper logic.
- Prefer selective deploy over full deploy unless all layers changed.

## References
- [Deploy Checklist](./references/deploy-checklist.md)
