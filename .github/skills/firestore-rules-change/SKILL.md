---
name: firestore-rules-change
description: "Review and apply Firestore/Storage security rule changes safely in this archive project. Use when editing firestore.rules, storage.rules, role helpers, access conditions, or write permissions. Keywords: firestore rules, storage rules, permissions, security review."
argument-hint: "Describe the rule change and expected allowed/denied actors"
user-invocable: true
---

# Firestore Rules Change

## When to use
- You edit firestore.rules or storage.rules.
- You change role semantics such as admin or archive officer.
- You add a new collection or write path.

## Procedure
1. Identify exact actor matrix:
   - who can read
   - who can create
   - who can update
   - who can delete
2. Verify helper functions still match business roles.
3. Check for accidental broad permissions.
4. Deploy rules only.
5. Run manual authorization checks for each role.
6. Record before/after policy summary.

## Project-specific checks
- Keep admin and archive officer helpers consistent across affected matches.
- Preserve authenticated-read expectations where required.
- Restrict write paths to creator/admin rules when intended.

## Commands
- Firestore rules deploy: firebase deploy --only firestore:rules
- Storage rules deploy: firebase deploy --only storage

## References
- [Rules Review Checklist](./references/rules-checklist.md)
