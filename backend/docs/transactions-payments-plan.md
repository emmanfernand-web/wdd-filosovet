# Module 6 — Transactions & Payments Implementation Plan

> **For agentic workers:** gunakan superpowers:executing-plans untuk implementasi inline, lalu independent review security/concurrency/precision/inventory sesuai mandat pengguna. Tidak ada commit atau branch/worktree baru.

**Goal:** transaksi gabungan layanan/produk, booking billing, partial payments dan receipt terintegrasi ledger inventory secara atomik.
**Architecture:** Laravel13 native policies/services/FormRequests/Resources, /api/v1, additive migration, current locking reads, immutable money/history dan shared stock writer.
**Tech Stack:** PHP8.4, Laravel13, MySQL8.4, PHPUnit/SQLite in-memory, Pint.
**Spec:** [audit/design](transactions-payments-design.md) + permintaan Module6 pengguna.
**Status:** Implemented dan diverifikasi14 November2026; seluruh keputusan bisnis1–6 disetujui pengguna.

## Global constraints

- Pertahankan source/uncommitted Module1–5 dan frontend; jangan lakukan Git mutations, destructive DB commands, operational fixtures, perubahan .env atau migration applied.
- No Module7–8/AI/deployment/accounting/AP/payroll/reporting kompleks.
- Quantity integer, prices server-owned snapshot, integer cents/DECIMAL, no balance mutable.
- Keputusan harga/discount/tax/stock timing/DP/booking/refund/access harus ditetapkan pengguna sebelum dependent implementation. Tidak meminta approval ulang per fase.

## Review focus

- Payment/refund replay setelah terminal status, normalized payload mismatch dan cross-transaction UUID collisions.
- Multi-product lock ordering, FEFO current balance dan competing purchase/adjustment/sale writers.
- Booking duplicate billing/rebilling cancellation dan pet→booking ordering existing.
- Partial permissions, revoked grants, own-only resource fields dan cashier lookup leakage.
- Monetary overflow/cents, concurrent overpayment/refund, rollback setelah sebagian allocation/payment tersimpan.

## Tasks

### 1. Baseline dan finalisasi kontrak

Files: docs/transactions-payments-design.md, docs/transactions-payments-plan.md.

- [x] Audit Module1–5 source/docs, routes, DB metadata/status, permissions, baseline files/records.
- [x] Jalankan baseline full suite: 196 tests / 1520 assertions.
- [x] Ajukan satu kumpulan keputusan bisnis yang memblokir implementasi.
- [x] Masukkan jawaban pengguna ke design/schema/lifecycle/authorization dan finalisasi interfaces sebelum kode.

### 2. Harga katalog dan transaction draft

Create: migration additive Module6, app/Models/Transaction.php, TransactionItem.php; app/Policies/TransactionPolicy.php; app/Support/TransactionValidation.php, TransactionMoney.php; app/Services/TransactionService.php; app/Http/{Controllers/Api/TransactionController.php,Requests/SaveTransactionRequest.php,Resources/TransactionResource.php,Resources/TransactionItemResource.php}; database/seeders/TransactionsPaymentsSeeder.php; tests/Feature/TransactionsPaymentsTest.php.
Modify if approved: Product model, InventoryValidation, ProductResource, AppServiceProvider, DatabaseSeeder, routes/api.php.
Interfaces proposed: TransactionService::save(User $actor,array $input,?Transaction $transaction=null): Transaction; ::listing(User $actor,array $filters,int $perPage); ::show(User $actor,Transaction $transaction): Transaction.

- [x] RED: service/product/combined drafts, catalog selling-price authority, unpriced/inactive rejection, booking snapshot/customer match, duplicate booking, unauthorized mutations, zero/fraction/bool quantities, exact cents and overflow.
- [x] Verify failures via phpunit --filter TransactionsPaymentsTest before implementation.
- [x] GREEN: schema/FKs/unique, models, permission-based requests/policy, catalog price support, draft totals/snapshot and safe read Resources. Draft replacement preserves invariant; no client internal totals/actors.
- [x] Run focused tests, then baseline regression. Seeder rerun preserves grant revocation and manual changes.

### 3. Confirmation, shared ledger dan lifecycle

Create: TransactionStockAllocation model; service/policy/request transition methods; trusted sale integration dan allocation fields pada TransactionItemResource.
Modify: InventoryService shared writer, InventoryMonitorRequest filter.
Interfaces proposed: TransactionService::transition(User $actor,Transaction $transaction,string $status): Transaction; InventoryService::sellTransactionAllocation(User $actor,TransactionStockAllocation $allocation,Transaction $transaction): StockMovement.

- [x] RED: confirmation general/service/mixed, FEFO multiple batches, expired/mismatch/insufficient/inactive products, duplicate confirm, immutable confirmed items, lifecycle completion rules, cancellation and rebilling per approved rules.
- [x] RED: rollback after second movement and status failure, nested transaction current reads, sorted multi-product lock ordering.
- [x] GREEN: document/allocation/movement/status one transaction, posted movement unique link, trusted server reference, no stock negative, no changes to manual/purchase writer semantics.
- [x] Focused tests and full regression; public API continues to reject forged sale/reference input.

### 4. Payments dan refunds sesuai jawaban

Create: Payment, PaymentMethod, PaymentRefund if approved; PaymentService (record/refund); policies/requests/resources/controllers; shared normalization/idempotency/money support as needed.
Interfaces proposed: PaymentService::record(User $actor,Transaction $transaction,array $input): array [Payment,bool created]; PaymentService::refund(User $actor,Payment $payment,array $input): array; summary helper derives gross/refunded/net-paid/remaining from current records.

- [x] RED: full/partial payments, failed/cancelled no effect, positive/precision/overflow/overpay rejection, same UUID replay/different payload rejection, own-only/partial permission/revocation/inactive user.
- [x] RED if approved: full/partial refunds capped per payment, repeat/mismatch, reason/actor, net-paid/remaining/status and immutable completed operational state.
- [x] RED: rollback payment/refund failure, old transaction snapshot current locking read, cross-transaction idempotency collision.
- [x] GREEN: transaction lock/reauthorize, immutable history, server-calculated summary, no implicit stock return/booking cancellation.
- [x] Focused tests + regression; no mutable total_paid balance source.

### 5. Cashier lookup, history dan receipts

Create: billing lookup service/controller/request/explicit Resources; receipt endpoint using safe transaction/payment data.
Modify: routes/api.php.

- [x] RED: paginated search/filter, cashier minimal customer/booking/catalog view, no internal notes/purchase cost/credentials, customer own-only receipts, permission separation.
- [x] GREEN: lookup capability independent from general customer/inventory grants; item/payment history/remaining snapshot receipt without PDF/printer.
- [x] Verify API route coverage and eager-loading; full suite.

### 6. MySQL, independent review, documentation dan final QA

Create: tests/Support/TransactionsPaymentsMySqlProbe.php, docs/transactions-payments.md.
Modify: docs/PROJECT_MASTER_CONTEXT.md, README.md backend; plan evidence ledger.

- [x] Syntax/Pint/Composer/routes/diff checks, isolated full suite.
- [x] Inspect migration SQL then additive migrate and dedicated seeder on MySQL when authorized connection available; verify schema/FK/index and allowed baseline differences. No demo operational data.
- [x] Isolated MySQL scratch probe: transaction rollback/FK/unique, two-worker competing stock sale, concurrent payments remaining cap, duplicate UUID and refund race if approved. Cleanup only scratch created by probe.
- [x] Independent review security, concurrency, idempotency, exact money and ledger integration. Fix findings with RED→GREEN tests.
- [x] Reverify suite/checks/MySQL preservation, file scope, existing frontend/migrations/config untouched except approved additive field.
- [x] Update final schema/API/permissions/workflow/testing/limitations master context and module docs from actual evidence. Final report and stop before Module7.

## Evidence ledger

- 13 November2026: 196 tests/1520 assertions passed; 53 API endpoints. MySQL28tables/9migrations Ran/9roles/29permissions/73grants. No Module6 application/schema changes.
- Pengguna kemudian menyetujui seluruh keputusan bisnis1–6; implementasi diselesaikan sesuai scope.

- Confirmed: pengguna menyetujui semua enam rekomendasi. Ruling: remaining=total−net_paid; refund bukan credit note dan pembayaran pengganti boleh pada completed tanpa mengubah status/item. Booking cancellation tidak otomatis mengubah transaksi/payment.

- Final suite234tests/1854assertions,38 Module6+196 regression. Syntax183 PHP files, Pint/Composer/routes65/diff/Markdown passed.
- Migration000007 batch7 applied;34tables/10migrations/48FK/9roles/31permissions/76grants. Dedicated seeder repeated twice;6methods, no operational fixtures. Old28-table fingerprints preserved except authorized selling_price/migration/permissions/grants.
- Independent review: snapshot summary bug RED→GREEN via single UNION; item parent reassignment RED→GREEN; cancellation and stale replaced item RED→GREEN reproduced on MySQL8.4 actual services. Detail/history summary share read snapshot.
- MySQL two-worker stock/payment/refund cap, payment/refund UUID replay, duplicate booking billing, stock/payment outer rollback and FK passed;33scratch created/cleaned, physical19 exact. Probe is controlled concurrency, not exhaustive load proof.
- Payment receipt customer/transaction references added RED→GREEN, with explicit fields and no profile secrets. Frontend/environment/applied migrations/Git branch/index untouched. Module7 not started.

- Ruling: refund ditempatkan di PaymentService agar transaction lock, authorization dan UUID patterns tetap berdekatan; allocation diserialisasi pada item Resource tanpa class terpisah. Tidak mengubah business rules.
- Date-only filter regression RED→GREEN: whereDate menjaga batas inklusif konsisten pada MySQL DATE dan cast SQLite; final suite234/1854.
