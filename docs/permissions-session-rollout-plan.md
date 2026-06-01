# Permissions and Session Rollout Plan

Status: Draft v1
Owner: Product + Engineering
Scope: Frontend auth/session flow, role model, Firestore rules, Cloud Functions claims, page access permissions

## Objective
Create a phased, low-risk implementation plan to align the system with a unified role and department model, harden session/access behavior, and keep production stable during migration.

## Ground Rules
- No breaking changes in one step.
- Keep backward compatibility (role aliases) until migration is complete.
- Every phase must include verification before moving forward.
- Use staged deployment and rollback checkpoints.

## Phase 0 - Baseline and Freeze
Goal: Lock current behavior and create a measurable baseline.

Tasks:
- Capture current role/dept values used in users documents.
- Capture current Custom Claims values in Auth users.
- Export current page permissions (system_settings/page_permissions and user_page_permissions).
- List all pages that still load legacy access control logic.
- Define production freeze window for permission-sensitive changes.

Deliverables:
- Baseline report (roles, departments, claims, page permissions).
- Risk register and rollback checklist.

Acceptance criteria:
- Baseline artifacts committed in docs.
- Team sign-off on migration window.

## Phase 1 - Canonical Role/Department Contract
Goal: Define one canonical model and alias map.

Tasks:
- Approve canonical roles: super_admin, department_admin, supervisor, employee, viewer.
- Approve canonical departments: archive, collection, legal, admin.
- Define alias mapping from legacy values to canonical values.
- Publish contract for users schema (role, department, permissions, status).

Deliverables:
- Canonical contract document.
- Alias mapping table.

Acceptance criteria:
- No unresolved role/dept naming conflicts.
- Contract approved by product and backend owners.

## Phase 2 - Compatibility Layer (No Break)
Goal: Make runtime accept canonical + legacy values safely.

Tasks:
- Add role/department normalization utility in frontend auth/routing.
- Add normalization in Cloud Functions where role checks occur.
- Update Firestore rules helper functions to accept alias values temporarily.
- Keep old values working while writing canonical values for new operations.

Deliverables:
- Compatibility utilities in frontend and functions.
- Updated Firestore helper checks with temporary alias support.

Acceptance criteria:
- Existing users can still access expected pages.
- New writes prefer canonical role/dept values.

## Phase 3 - Session and Access Hardening
Goal: Remove inconsistent access behavior and enforce guard logic consistently.

Tasks:
- Remove/disable legacy page guard where unified guard is already used.
- Ensure access guard re-evaluates on auth state changes (login/logout/token expiry).
- Fix login flow ordering so session-expired state is handled deterministically.
- Keep remember-me behavior aligned with actual persistence strategy.

Deliverables:
- Unified session/access behavior matrix.
- Verified guard behavior for protected pages.

Acceptance criteria:
- No unauthorized page access via client-side bypass.
- Session-expired flow consistently requires fresh login when expected.

## Phase 4 - Data and Claims Migration
Goal: Migrate existing users and claims to canonical model.

Tasks:
- Run migration script for users.role/users.department to canonical values.
- Re-issue Custom Claims for all affected users.
- Add migration audit logging (before/after snapshots and counters).
- Validate random sample of migrated accounts by role and department.

Deliverables:
- Migration script and runbook.
- Migration execution report with counts and exceptions.

Acceptance criteria:
- 100% target users migrated or explicitly exempted.
- Claims and Firestore user docs are consistent.

## Phase 5 - Rules Tightening for Document Visibility
Goal: Align document access with private/department/global model.

Tasks:
- Introduce explicit visibility/accessLevel policy in documents.
- Update Firestore rules for read/write based on role + department + visibility.
- Remove permissive logic paths and temporary shortcuts.
- Validate with emulator tests for each role/department scenario.

Deliverables:
- Updated rules and rule test cases.
- Visibility policy guide for frontend/backend.

Acceptance criteria:
- Rules emulator tests pass for all required scenarios.
- No permissive fallback logic remains.

## Phase 6 - Page Permissions Consolidation
Goal: Consolidate page-level permissions under one source of truth.

Tasks:
- Consolidate page permission checks to one active guard path.
- Align system_settings/page_permissions to canonical roles.
- Validate user_page_permissions overrides still work correctly.
- Remove duplicate/legacy permission checks from pages.

Deliverables:
- Consolidated permission architecture note.
- Updated page permission config.

Acceptance criteria:
- Page access is deterministic for every canonical role.
- No duplicate guard conflict in key pages.

## Phase 7 - Cleanup and Decommission Legacy Aliases
Goal: Remove temporary compatibility code after stability period.

Tasks:
- Remove alias-only role values from runtime checks.
- Remove deprecated route/permission mappings.
- Keep a short deprecation note with final cutoff date.

Deliverables:
- Final cleanup PR.
- Post-migration changelog.

Acceptance criteria:
- Codebase uses canonical roles/departments only.
- Monitoring shows no regressions for two release cycles.

## Test Strategy (Cross-Phase)
- Role x Department x Page matrix tests.
- Session lifecycle tests: login, refresh, token expiry, logout, redirected return.
- Rules emulator tests for documents, users, activity_logs, page permission settings.
- Smoke tests on key dashboards and admin pages.

## Deployment Strategy
- Deploy in small increments (rules/functions/frontend separately when possible).
- Use canary validation after each increment.
- Keep rollback point per phase.

## Rollback Triggers
- Unauthorized access detected on protected page.
- Admin lockout or broken dashboard routing.
- Claims/users role mismatch above agreed threshold.

## Definition of Done
- Canonical role/dept model is active everywhere.
- Session behavior is consistent and secure.
- Firestore rules enforce intended visibility and role boundaries.
- Legacy role aliases removed after stabilization.
