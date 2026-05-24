# RTL UI Checklist

## Layout checks
- Text direction remains RTL.
- Form labels and inputs are visually aligned.
- Icons and action buttons are positioned correctly for RTL.

## Behavior checks
- Page initialization does not race Firebase readiness.
- Protected page access respects auth state.
- Role-based UI visibility still works.

## Responsiveness checks
- Dashboard cards and tables remain readable on small screens.
- Action buttons remain accessible on mobile.
- No clipping or overlap in Arabic text.

## Stability checks
- No uncaught exceptions in browser console.
- No missing script/module errors.
