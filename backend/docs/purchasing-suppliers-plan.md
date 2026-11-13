# Module 5 — Purchasing & Suppliers Implementation Plan

**Goal:** supplier, draft/ordered PO dan partial/multiple goods receiving atomik melalui ledger Module 4.
**Architecture:** Laravel13 services/policies/FormRequests/Resources, `/api/v1`, additive schema. Integer quantity, monetary arithmetic integer cents, DECIMAL(18,2); no floating arithmetic. Shared inventory writer for purchase_receipt.
**Spec:** user Module5 request; PROJECT_MASTER_CONTEXT.md and inventory-pharmacy-management.md.

## Decisions and constraints

- User confirmed: deactivated supplier blocks new PO/ordering but Ordered PO can still receive; expired medicine rejected on purchasing receipt; actual receipt price separate from immutable PO snapshot, default PO price.
- draft → ordered → partially_received → fully_received; cancel draft/ordered only before any receipt. No approval stage or deletion endpoints. Draft may be empty, ordering may not. Item replacement permitted only on draft.
- Each confirmation POST creates a final immutable receiving atomically (no unconfirmed staging). Client UUID idempotency_key unique globally; same normalized payload retries return original, different payload 422. PO row lock serializes remaining/status/replay; sorted product locks prevent inverted multi-product order.
- Batch details on each receipt item allow splitting one PO item across multiple batches. Existing product/batch number must have identical expiry; do not silently edit batch. General batch fields rejected.
- Existing manage_suppliers handles supplier read/write; add manage_purchase_orders (read/write PO/receipts) and receive_purchase_orders (read PO/receipts and confirm), first creation grants Admin/Inventory only; never reset grants. Existing stock permission remains unchanged; dedicated trusted receipt writer authorizes receive capability.
- No Module6–8, frontend, Git mutations, existing data deletion, destructive migrations, demo seeds, environment changes.

## Tasks

- [x] Baseline: inspect Module1–4 docs/source, tests, MySQL status/schema and file/data fingerprints.
- [x] TDD supplier + PO: create failing HTTP tests, additive five tables/models/policies/services/requests/resources/controller/routes; lifecycle and exact price snapshots.
- [x] TDD receiving: failing partial/multiple/full/duplicate/overdelivery/rollback/medicine/permission tests; extend InventoryService with purchase receipt path sharing stock rules, locks and ledger storage; link unique movement to receiving item.
- [x] QA: full suite, syntax/Pint/Composer/routes; safe MySQL migration/seed; original schema/record fingerprint verification; isolated MySQL transaction/constraint/concurrent receipt probes without operational demo records.
- [x] Independent review, resolve bugs with regression tests; docs, master context, final report; stop.

## Review focus

Replay payload normalization, concurrent remaining quantity, cross-PO item injection, batch/expiry consistency, bigint/cents overflow, rollback after movement/status failure, grant revocation, immutable receiving, late catalog type/unit mutation and MySQL current reads.

## Evidence ledger

- Initial full suite162/1230; branch tes-laravel and clean tree. Critical business questions answered together by user; no staged approvals required.

- Final suite: 196 tests / 1520 assertions, 34 purchasing + 162 regression; Pint/Composer passed. Syntax151 PHP files, 53 API routes, Markdown checks dan git diff --check passed.
- Migration000006 applied batch6; MySQL28 tables/9 migrations/30 FK, roles9/permissions29/grants73. PurchasingSeeder repeated twice. Original23-table schema/index/FK/records preserved except authorized additive migration/permissions/grants.
- MySQL8.4.13 actual-service probe: rollback/FK rejection, two-worker overreceive and identical UUID replay passed, physical20 exact; all27 scratch tables cleaned. No operational fixtures.
- Independent review supplier embedded-data leak fixed with regression test; no remaining blocker. Docs/master context/README updated; Module6 not started.
