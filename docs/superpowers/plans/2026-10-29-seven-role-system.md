# Seven-role management system implementation plan

**Goal:** Extend the existing vanilla JavaScript workspace with integrated daily workflows for seven staff roles.
**Architecture:** Preserve the legacy catalog, booking and transaction keys. Add a shared operational repository, centralized permissions, domain services and role-specific views; retain existing admin tables, reports and shell.
**Constraints:** Indonesian UI; no backend/framework/dependencies; preserve existing data and warm green visual system. UI permissions are demo controls only.

- [x] Foundation: test seven-role navigation/denials and non-destructive normalization; implement permissions and shared atomic persistence helpers.
- [x] Operations: test receptionist registration/check-in, assignment conflicts, doctor draft/final/addendum and multi-medicine prescriptions, grooming progress, hotel overlap/care/check-out.
- [x] Commerce: test stock batches/movements/negative balance, supplier receiving, payable invoices, idempotent payment and dispensing, POS promotion and public checkout integration.
- [x] Interface: extend role dashboards and navigation using existing panels/tables/drawers; add scoped operational forms, staff/settings/approvals and role-aware notifications.
- [x] Verification: run domain integration scenarios A–D, syntax and local reference checks, browser workflow/layout checks when available, review changes and update README with exact behavior/limitations.

Review focus: legacy data preservation; replayed payments/dispensing; invalid or stale references; finalized clinical record immutability; assignment and room conflicts.

Execution: inline in the existing clean workspace, as requested. No commits or deployment requested. Use additive modules and small integration changes rather than a rewrite.

Verification outcome: 26 automated tests pass; syntax/local-reference/whitespace checks pass. Browser connector has no available browser, so actual visual/interactive browser acceptance remains explicitly pending in README and the implementation report. Independent review findings were fixed with regression coverage.
