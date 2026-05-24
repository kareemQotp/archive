---
name: frontend-rtl-qa
description: "Quality workflow for Arabic RTL frontend updates in this project. Use when editing pages in public or JS modules in public/assets/js, especially auth, dashboards, forms, notifications, and file upload UI. Keywords: RTL, Arabic UI, frontend QA, responsive, browser checks."
argument-hint: "Page or module changed and expected user behavior"
user-invocable: true
---

# Frontend RTL QA

## When to use
- You edit HTML under public.
- You edit JS modules under public/assets/js.
- You change navigation, forms, dashboards, or notifications.

## Procedure
1. Confirm Firebase initialization flow is not broken.
2. Verify auth gate and role-based redirects.
3. Test in desktop and mobile widths.
4. Validate RTL alignment and readable Arabic labels.
5. Validate critical user actions for changed page.
6. Check console for runtime errors.

## Project-specific focus
- Keep module registration on window when required.
- Respect firebaseReady and firebaseAuthReady timing.
- Preserve unified auth and UI permission controller behavior.

## Smoke test paths
- Login and redirect.
- Dashboard entry per role.
- File upload/open flow.
- Notification visibility and count.
- Activity logging trigger for major actions.

## References
- [RTL UI Checklist](./references/ui-checklist.md)
