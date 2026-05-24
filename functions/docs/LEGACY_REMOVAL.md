# Legacy Functions Directory Removal

Date: 2025-08-19

The duplicate legacy directory at `firebase/functions` has been neutralized (source files removed or pending removal). Active source of truth: `functions/src`.

Rationale:
- Prevent divergence and confusion.
- Centralize dependency management and constants.

Next Steps:
1. Ensure CI/build scripts reference only `functions/`.
2. Remove residual `firebase/functions` directory entirely in git history (future cleanup commit) once node_modules not needed.
3. Enforce lint rule to block reintroduction.

Rollback: Use `functions/ARCHIVE_LEGACY` for any needed code comparison.
