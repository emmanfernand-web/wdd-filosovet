# Pharmacist Module Frontend Rebuild Design

## Intent

Rebuild the four pharmacist-facing frontend surfaces in the existing vanilla Filosovet admin workspace: Farmasi dashboard, prescription queue, medication stock, and dispensing history. The rebuild improves hierarchy, readability, responsive behavior, modal consistency, and dispensing-proof printing while preserving the existing `AD.pharmacy` service, `FVStore` persistence contract, localStorage keys, demo data, role routing, and pharmacist workflow.

## Goals

- Give all pharmacist pages a consistent, scoped visual system using the existing Filosovet palette and typography tokens.
- Preserve every existing queue, search, filter, modal, form, clarification, preparation, dispensing, batch, proof, and print interaction.
- Render dynamic values as text nodes or escaped content; status badges must be real DOM elements, never escaped markup in headings.
- Make labels, values, controls, placeholders, status chips, tables, and error messages readable in light and dark themes.
- Make the dispensing proof usable in a screen preview and in a predictable A4 print layout.
- Keep all changes backward-compatible for shared UI and other roles.
- Add only documented validation corrections; do not invent business rules.

## Non-goals and anti-goals

- No Laravel, database, migration, API, authentication, or authorization changes.
- No framework, bundler, dependency, or build-system migration.
- No changes to `AD.pharmacy` status lifecycle, dispensing calculation, stock movement semantics, localStorage keys, seed data, or demo records unless a documented validation defect requires a narrowly scoped service guard and is approved.
- No deletion or simplification of existing pharmacist features.
- No broad redesign of non-pharmacist roles or public pages.
- No replacement of the previous local fixes in `js/admin/ui.js` and `js/admin/pharmacy-ui.js`.

## Constraints

- Existing page entry remains `pages/dashboard-admin.html` with classic scripts and hash routing.
- Existing data access remains `FVStore.state()` / `FVStore.commit()` and `AD.pharmacy`.
- Existing role permission checks remain authoritative.
- Existing data fields and status names remain compatible with current localStorage data.
- CSS changes for pharmacist surfaces are scoped under `.pharmacy-module` wherever possible.
- Shared component changes are optional, minimal, and backward-compatible.
- No Git commit, push, merge, reset, branch switch, or destructive workspace operation.

## Existing workflow contract to preserve

1. Prescription statuses normalize as Pending, Processing, Ready, Dispensed, or Cancelled while stored values remain compatible with existing Indonesian/English aliases.
2. Pending prescriptions can start preparation and become Processing; the responsible pharmacist and timestamps are recorded.
3. Preparation records actual prepared quantities, optional batch IDs, notes, and changes the prescription to Ready.
4. Ready prescriptions can be dispensed once; recipient, notes, pharmacist, timestamps, item quantities, and batch references are recorded.
5. Dispensing invokes the existing stock movement ledger and duplicate-dispensing guard.
6. Pharmacists can request clarification without editing the doctor's original prescription.
7. Medication stock remains read-only for pharmacists; batch inspection remains available.
8. Dispensing history opens the existing proof flow and supports printing.

## Documented validation boundary

The README and existing inventory ledger document that dispensing must not use expired stock, must respect available batch stock, and must preserve prescribed quantities. The rebuild may correct UI/service validation only where it enforces those documented constraints without changing the status flow or stored shape. The implementation must first compare current behavior against `README.md`, `backend/docs/inventory-pharmacy-management.md`, `backend/docs/inventory-pharmacy-management-design.md`, and `js/operations-store.js`.

Any candidate validation that is not clearly supported by those sources must be reported instead of being changed.

## Approaches considered

### 1. Targeted rebuild in the existing vanilla architecture (selected)

Keep the current files and service contracts, rebuild pharmacist markup and styles in `pharmacy-ui.js` plus a scoped pharmacist stylesheet, and extend shared UI only where necessary. This preserves routing, event delegation, data compatibility, and role isolation while allowing a substantial visual/UX improvement.

### 2. Split pharmacist UI into several new classic-script modules

Separate queue, preparation, dispensing proof, stock, and history into multiple files. This improves file size and ownership but requires script-order and router changes with little immediate product benefit.

### 3. Introduce a new frontend framework/component layer

This conflicts with the repository's no-dependency vanilla architecture and would add migration risk without improving the data/workflow boundary.

## Selected architecture

- Keep `js/admin/pharmacy.js` as the domain/service boundary.
- Keep `js/admin/pharmacy-ui.js` as the pharmacist view/controller boundary and preserve its exported `AD.pharmacyUI` methods and `Pages.*` registrations.
- Keep the pharmacist dashboard composition in `js/admin/role-dashboards.js`; preserve its KPI sources, action hooks, priority queues, stock warnings, and activity section while bringing it into the scoped visual system.
- Add a pharmacist-scoped stylesheet, preferably `css/pharmacy.css`, loaded after `admin.css` in `pages/dashboard-admin.html`; if the existing stylesheet is safer to extend, use a clearly scoped section in `css/admin.css` and document why.
- Keep shared `UI.modal`, `UI.table`, `UI.print`, `W.button`, `UI.chip`, and focus trapping backward-compatible. The previous `titleBadge` DOM-node fix remains intact.
- Use semantic wrappers (`.pharmacy-module`, `.pharmacy-page`, `.pharmacy-panel`, `.pharmacy-modal`, `.pharmacy-proof`) and CSS grid/flex layouts that collapse at the existing responsive breakpoints.
- Use existing `esc`, `fmtDate`, `fmtDateTime`, and status normalization helpers for dynamic values.

## Screen design direction

The pharmacist module is an Operate surface: scanability and reliable task completion outrank decoration. Each page uses a clear page header, compact context line, one primary content surface, consistent controls, and predictable status/action placement.

- Dashboard: KPI strip backed only by `AD.pharmacy.stats()`, active-work queue, ready-to-handover queue, and stock/expiry alerts backed by `AD.pharmacy.medications()`.
- Queue: filter tabs with counts, full-width search, responsive table/card fallback, status chip, clarification indicator, and action cluster with stable ordering.
- Detail/preparation/dispensing modals: shared modal header, structured summary blocks, readable labels/values, explicit validation feedback, and action footer with primary action at the end.
- Stock: read-only notice, filter tabs, medication table, batch/expiry status, and batch detail modal.
- History: search, empty state, dispensing metadata, item summary, and proof action.
- Proof: document-like screen preview with clinic heading, metadata grid, medication table, notes, signature area, and a print action that targets a dedicated print surface.

## Print strategy

The screen preview remains a modal for the existing interaction. The print action will generate the same proof content into the existing `#printArea` / `UI.print` pathway with the `print-a4` class, then rely on the existing `afterprint` cleanup. Print CSS will hide admin shell, overlays, controls, and navigation; force readable black-on-white output; preserve table headers and signature spacing; set A4 margins; and avoid printing the modal backdrop. The modal preview itself must not call `window.print()` directly.

## File impact

Likely modifications:

- `js/admin/pharmacy-ui.js`: rebuild pharmacist view markup, modal structure, proof preview, and print handoff while keeping exported method names and event actions.
- `js/admin/role-dashboards.js`: align the pharmacist dashboard composition with the scoped system while preserving KPI/action sources and the role activity audit section.
- `css/pharmacy.css` (new) or a scoped pharmacist section in `css/admin.css`: pharmacist-only layout, controls, modal content, responsive rules, and print rules.
- `pages/dashboard-admin.html`: only if a new stylesheet is added; preserve script order and all existing scripts.
- `js/admin/ui.js`: only if a backward-compatible shared helper is required; preserve the existing title badge DOM fix and test every shared modal use.

No backend files, database files, API routes, seed data, or unrelated role files are intended to change.

## Verification plan

- Static checks: syntax-check every changed JavaScript file and run the existing workspace test suite.
- Domain regression: run existing pharmacist queue, preparation, clarification, dispensing, duplicate-prevention, stock deduction, and read-only inventory tests.
- DOM interaction checks: render each pharmacist page with the existing test harness/stubs and assert action hooks, modal IDs, labels, status text, and empty states.
- Print checks: assert the proof action writes to `#printArea`, applies `print-a4`, invokes the existing print pathway, cleans up after `afterprint`, and that print CSS excludes shell/overlay elements.
- Browser verification where available: open the pharmacist dashboard, queue, stock, and history at desktop and mobile widths; exercise search, filters, each status action, modal close/Escape, validation errors, proof preview, and print preview.
- Regression checks: render the pharmacist dashboard and each pharmacist route, exercise keyboard Escape/focus close behavior and responsive layouts, then render at least one representative page for each non-pharmacist role and confirm shared modal/table/sidebar behavior remains intact.
- Run the Impeccable mechanical detector once against changed UI targets after implementation.

## Acceptance criteria

The rebuild is complete when the pharmacist dashboard and all three pharmacist routes share the new scoped system, all inventoried workflows still work against the same data contracts, documented validation constraints are preserved/enforced, the proof preview and print output are readable and isolated, no raw HTML leaks into user-visible text, all modal interactions remain active, and regression checks pass for shared role surfaces.

## Open decision

No new business rule is proposed. Existing data structures allow prepared and dispensed quantities to be recorded independently, so the rebuild will preserve the current partial-quantity behavior and will not add an exact-quantity guard. It will hide or disable expired batch choices where the documented no-expired-stock rule applies, while leaving aggregate stock movement and lifecycle semantics unchanged. Any other validation behavior not clearly supported by the documented README/inventory rules must remain unchanged and be reported as a known limitation.
