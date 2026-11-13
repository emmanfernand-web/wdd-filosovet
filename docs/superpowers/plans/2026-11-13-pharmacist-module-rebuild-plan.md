# Pharmacist Module Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Filosovet pharmacist dashboard and three pharmacist routes with a scoped, readable vanilla UI while preserving all existing data, workflows, localStorage contracts, and role behavior.

**Architecture:** Keep `AD.pharmacy` and `FVStore` unchanged as the domain/persistence boundary. Rework pharmacist view markup and modal/proof flows in `pharmacy-ui.js`, align dashboard composition in `role-dashboards.js`, and add scoped styles in `css/pharmacy.css` loaded after `admin.css`.

**Tech Stack:** HTML5, CSS3, classic vanilla JavaScript, existing `UI.modal`, `UI.table`, `UI.print`, `W.button`, `FVStore`, and `AD.pharmacy`.

**Spec:** `docs/superpowers/specs/2026-11-13-pharmacist-module-rebuild-design.md`

## Global Constraints

- Preserve `AD.pharmacy`, `FVStore`, `fv_workspace_v1`, all localStorage keys, demo seed data, status lifecycle, dispensing calculation, stock movement, and existing event actions.
- Do not change backend Laravel, database, API, authentication, authorization, framework, bundler, or unrelated role behavior.
- Preserve the previous DOM-safe title badge changes in `ui.js` and `pharmacy-ui.js`.
- Apply pharmacist styling under `.pharmacy-module` / `.pharmacy-proof` and keep shared changes backward-compatible.
- Do not introduce an exact-quantity business rule; preserve existing partial quantity behavior.
- Hide or disable expired batch choices where documented inventory rules prohibit expired stock.
- Do not commit or run destructive Git operations.

## Review Focus

- Dynamic prescription/status/owner/medicine values must stay escaped or text-node based, including modal titles and proof output; test with HTML-like values.
- Preparation must preserve existing status transitions and stored fields while preventing selection of expired batches; test an expired and a usable batch.
- Dispensing must preserve duplicate prevention, stock ledger calls, batch references, recipient, pharmacist, timestamps, and partial quantities; test existing domain workflow.
- Proof printing must populate `#printArea` with `print-a4`, exclude modal/sidebar chrome, and clean up after `afterprint`; test print handoff.
- Shared UI must remain compatible with other roles; render representative non-pharmacist views and exercise shared modal/table/sidebar hooks.

### Task 1: Baseline and style foundation

**Files:**
- Create: `css/pharmacy.css`
- Modify: `pages/dashboard-admin.html`
- Test: `node --check` and existing test suite baseline

**Interfaces:**
- Consumes: existing design tokens and admin component classes.
- Produces: `.pharmacy-module`, `.pharmacy-page`, `.pharmacy-panel`, `.pharmacy-modal`, `.pharmacy-proof`, responsive and print selectors.

- [ ] Record current test baseline and inspect existing changed files without overwriting them.
- [ ] Add `css/pharmacy.css` after `admin.css` and define scoped colors, type hierarchy, layout, tables, controls, modal content, empty/error states, responsive collapse, and proof print rules.
- [ ] Run JavaScript syntax checks and the existing workspace tests.

### Task 2: Rebuild pharmacist dashboard composition

**Files:**
- Modify: `js/admin/role-dashboards.js`
- Test: pharmacist dashboard render assertions and existing role render tests

**Interfaces:**
- Consumes: `AD.pharmacy.stats()`, `AD.pharmacy.prescriptions()`, `AD.pharmacy.medications()`, `W.button`, `UI.chip`.
- Produces: existing `#roleQueue`, `#pharmacist-dashboard-queue`, `data-go`, `data-work`, KPI values, stock warnings, and activity section with `.pharmacy-module` wrappers.

- [ ] Wrap pharmacist-specific dashboard content in scoped classes without changing data sources or action IDs.
- [ ] Preserve all KPI, active queue, ready queue, stock/expiry alert, navigation, and generic activity output.
- [ ] Verify dashboard empty states and action hooks render for the pharmacist role.

### Task 3: Rebuild queue, stock, and history pages

**Files:**
- Modify: `js/admin/pharmacy-ui.js`
- Test: DOM render/search/filter/action-hook checks

**Interfaces:**
- Consumes: existing `AD.pharmacy.prescriptions`, `medications`, `dispenses`; `UI.table`; `W.button`.
- Produces: existing page exports and data-work actions for `rxopen`, `rxprep`, `rxdispense`, `dispenseproof`, and `medbatches`.

- [ ] Rebuild queue header, tabs, search, responsive table/card presentation, status/clarification chips, actions, loading/empty states, and scoped wrappers.
- [ ] Rebuild read-only stock page with tabs, search, batch/expiry indicators, and batch detail action while preserving filters.
- [ ] Rebuild dispensing history with search, empty state, metadata, item summary, and proof action.
- [ ] Keep dynamic content escaped and preserve existing pagination/table IDs.
- [ ] Exercise all filters and action hooks in DOM tests.

### Task 4: Rebuild detail, preparation, and dispensing modals

**Files:**
- Modify: `js/admin/pharmacy-ui.js`
- Modify only if required: `js/admin/ui.js`
- Test: modal open/close, keyboard close, validation feedback, and workflow domain tests

**Interfaces:**
- Consumes: existing modal helpers and service methods.
- Produces: existing exported modal methods and form IDs used by handlers.

- [ ] Rebuild Detail modal into structured patient/doctor/diagnosis/medication sections; preserve the existing DOM-safe `titleBadge` contract.
- [ ] Rebuild Preparation modal labels, batch selectors, quantities, notes, errors, and action footer; hide/disable expired batches without changing stored shape or lifecycle.
- [ ] Rebuild Dispensing modal identity verification, item summary, recipient, notes, errors, and confirmation action.
- [ ] Preserve `AD.pharmacy.startPreparation`, `savePreparation`, `dispense`, and clarification calls exactly at the existing boundaries.
- [ ] Verify all modal close paths, Escape/focus trap, reportValidity, and error text.

### Task 5: Rebuild proof preview and print handoff

**Files:**
- Modify: `js/admin/pharmacy-ui.js`
- Modify: `css/pharmacy.css`
- Test: print handoff and proof content assertions

**Interfaces:**
- Consumes: existing `dispenses` records and `UI.print`.
- Produces: screen proof modal plus `#printArea.print-a4` print markup with cleanup.

- [ ] Rebuild proof preview as a document-like `.pharmacy-proof` surface containing all existing metadata, medicine/batch rows, notes, and signature lines.
- [ ] Replace direct `window.print()` with the existing `UI.print` pathway using a proof-specific HTML generator and `print-a4`.
- [ ] Ensure print CSS excludes shell, overlays, buttons, and backdrop; force readable black-on-white output and sensible A4 margins.
- [ ] Test afterprint cleanup and no raw HTML leakage.

### Task 6: Documented validation boundary

**Files:**
- Modify: `js/admin/pharmacy-ui.js` only unless source comparison proves a narrowly scoped service guard is required.
- Test: expired-batch UI test plus existing domain tests

**Interfaces:**
- Consumes: existing batch data and documented inventory rules.
- Produces: preparation selectors that do not offer expired positive-stock batches.

- [ ] Compare README and inventory documentation against `FVStore.movement` and current pharmacy service behavior.
- [ ] Implement only the documented expired-batch selection correction at the UI boundary if service behavior already protects dispensing.
- [ ] Leave undocumented exact-quantity/partial-dispensing behavior unchanged and record it as a known limitation.

### Task 7: Verification and regression

**Files:**
- Test: existing `tests/workspace.test.cjs`; any focused UI test fixture added for pharmacist rendering/print

- [ ] Run `node --check` on every changed JavaScript file.
- [ ] Run all existing workspace tests.
- [ ] Run focused pharmacist workflow tests: queue, preparation, clarification, dispensing, duplicate prevention, stock deduction, read-only inventory, localStorage reload.
- [ ] Run DOM checks for all four pharmacist surfaces and modal/print lifecycle.
- [ ] Render representative non-pharmacist roles to check shared regression.
- [ ] If browser automation is available, capture desktop/mobile and print preview; otherwise report the limitation explicitly.
- [ ] Run Impeccable detector once on changed UI targets and fix actionable findings that remain within scope.
- [ ] Review `git diff`/status to confirm no backend or unrelated files changed and no Git operation was performed.
