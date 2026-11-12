# Module 4 Implementation Plan

> For agentic workers: execute inline, task by task, with tests before implementation. Preserve existing uncommitted work; do not commit.

**Goal:** katalog inventory, batch medicine, immutable stock ledger dan monitoring terintegrasi Module 1–3.
**Architecture:** Laravel native Policies/Gates, FormRequests, Resources, thin controllers dan domain services. Saldo berasal ledger; transaksi memakai lock produk yang sama untuk seluruh writer.
**Tech Stack:** Laravel 13, PHP 8.4, MySQL 8.4; tests SQLite in-memory.
**Spec:** [Rancangan disetujui pengguna](inventory-pharmacy-management-design.md), ditambah spesifikasi Module 4 pengguna.

## Global Constraints

- Integer quantity; no unit conversion; zero/negative/fraction rejected for movements.
- No demo inventory seed, no new permissions/grant reset, no frontend, no Module 5–8 implementation.
- No destructive DB commands, editing applied migrations, commits/pushes/merge/reset.
- Opening once per bucket before other movements; medicine-only batches; expiry day UTC inclusive; existing permission scope as approved.

## Review Focus

- Simultaneous outflows must share product lock even when batch differs; do not infer proof from SQLite.
- Multi-role/read permissions must not expose general products or actor ledger to medicine-only readers.
- Product type/unit and batch expiry must not retroactively change ledger meaning.
- Repeated opening, stale catalog state, actor spoofing and malformed integer input must not create movements.
- Correlated stock aggregates must preserve exact totals with multiple batches, filters and pagination.

## Task 1 — Catalog and batches

Files: new inventory migration; ProductCategory/Product/ProductBatch/StockMovement models; InventoryAccess/InventoryValidation support; ProductCategory/Product/ProductBatch policies; InventoryCatalogService; FormRequests, Resources and API controller/routes; tests/Feature/InventoryPharmacyManagementTest.php.

- [x] Write failing HTTP/service tests for catalog CRUD/validation, permission scoping, batch constraints and history guards.
- [x] Run test file; confirm missing inventory endpoints fail.
- [x] Implement additive schema, models, catalog/batch services, authorization and API.
- [x] Run focused tests and full regression; confirm green.

## Task 2 — Ledger

Interfaces: InventoryService::record(User $actor, array $input): StockMovement; InventoryBalance stock query helpers consumed by monitoring.

- [x] Write failing tests for opening/adjustment, signed sums, nonnegative stock, integer rules, expiry, inactive products, immutable movement, audit and forbidden input.
- [x] Confirm failure before implementing shared transactional writer.
- [x] Implement product-first locking, fresh authorization, bucket checks and server-owned fields; no normal update/delete endpoints.
- [x] Run focused and full tests; verify no regression.

## Task 3 — Monitoring

Interfaces: InventoryQueryService provides paginated balances/batches/movements, medicine-only scope and usable FEFO candidates; only internal stock managers see movement history.

- [x] Write failing tests for physical/usable/expired, expiry boundary, low-stock, FEFO, filters and pagination.
- [x] Confirm failure, implement query service and resources without per-row queries.
- [x] Run focused and full regression, seed idempotency tests and constraints.

## Task 4 — QA and documentation

- [x] Pint, Composer validation, PHP syntax, route:list and git diff --check.
- [x] Verify migration pending, apply only new additive migration to MySQL.
- [x] Compare all existing metadata/record fingerprints (except authorized migration row); verify new indexes/FK, integer schema/application constraints dan batas DB CHECK yang belum diterapkan, empty inventory and role/grant preservation.
- [x] Review source and test coverage independently; resolve substantive findings via regression tests.
- [x] Write inventory-pharmacy-management.md; update backend README and master context with actual results, remaining limitations and Planned Module 5–8.
- [x] Final suite/style checks and scope verification; stop after Module 4.

## Ledger

- Baseline: 116 tests / 755 assertions; 19 tables / 7 migrations / 12 FK / 9 roles / 27 permissions / 69 grants / 26 endpoints verified.
- User approved design and implementation; integer quantities, opening once, UTC expiry cutoff, medicine-only batches and permission split approved explicitly.
- Existing MySQL data/schema fingerprint stored outside repository; baseline diambil sebelum mutation database.

- Task 1: RED missing routes/tables → GREEN; full suite127/876.
- Task 2: RED missing ledger writer/API → GREEN; full suite143/1037.
- Task 3: RED missing monitoring/FEFO results → GREEN; full suite153/1151.
- Additional regression: composite product/batch FK RED→GREEN; invalid boolean quantity RED→GREEN; multi-capability scope, stale batch product, parent FK and multi-batch aggregates verified. Final suite162/1230.
- Review: one material nested-transaction stale-history risk fixed with current locking reads and fresh authorization. No two-connection MySQL regression was run; concurrency proof remains a documented limitation.
- QA: MySQL migration000005 applied batch5;23 tables/8 migrations/17 domain FK,9 roles/27 permissions/69 grants. Existing19 table schema/index/FK/record fingerprints match except new migration row. All inventory tables empty; seeders twice preserve exact originals. MySQL aggregate queries and zero invalid/negative ledger buckets verified.
- Documentation: Module4 guide/design/plan, backend README link and master context updated; Module5–8 remain Planned. No destructive commands, frontend changes or Git commits/pushes/merge/reset.
