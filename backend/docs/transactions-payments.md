# Module 6 — Transactions & Payments

**Implemented; verifikasi 14 November 2026, Asia/Jakarta.** Backend transaksi service/product, booking billing, cashier lookup, pembayaran manual penuh/parsial/DP, refund uang dan receipt data. Baca [master context](PROJECT_MASTER_CONTEXT.md), [audit/design](transactions-payments-design.md), [plan](transactions-payments-plan.md), [booking](service-booking-management.md), [inventory](inventory-pharmacy-management.md) dan [purchasing](purchasing-suppliers.md).

## Confirmed Decisions dan workflow

Pengguna menyetujui seluruh enam kelompok keputusan bisnis sebelum implementasi:

- Mata uang IDR; discount_amount dan tax_amount selalu `0.00`. Tidak ada override harga oleh Kasir. Harga jual product nullable dan dikelola `manage_products`; product tanpa selling_price ditolak saat draft billing. Tidak mengambil purchase price sebagai harga jual.
- Service langsung memakai harga katalog; service booking otomatis memakai booking.price_snapshot, quantity satu. Product/service name, description, type/unit, quantity dan harga disnapshot pada item. Perubahan master tidak mengubah receipt historis.
- Lifecycle `draft → confirmed → completed`. Hanya draft editable; penggantian seluruh items secara eksplisit mengambil snapshot harga terbaru, sedangkan PATCH notes/date saja mempertahankan item/harga. Customer/booking tidak dapat dipindah melalui PATCH.
- Confirmation membekukan item dan memotong stok **walau belum lunas**, dalam satu transaksi database. Draft tidak mereservasi stok; ketersediaan definitif diperiksa ulang saat confirmed. Item susulan memakai transaksi baru.
- Completed wajib lunas; jika terkait booking, booking harus completed. Tidak ada status in_progress keuangan yang menduplikasi status layanan.
- Satu booking maksimal satu transaksi aktif. Pending/confirmed/checked_in/in_progress/completed boleh ditagihkan; cancelled/no_show ditolak saat create/edit/confirmation. Satu transaksi hanya satu booking opsional, tetapi dapat memuat beberapa layanan/produk tambahan; customer dapat memiliki beberapa transaksi.
- DP adalah partial payment nominal manual, tanpa minimum persen, timeout atau pengamanan/pelepasan slot otomatis. **Lifecycle Module 3 tidak diubah**; pending masih memblokir overlap. Pembayaran tidak mengonfirmasi booking. Pembatalan/no_show booking setelah billing tidak otomatis membatalkan transaksi/refund.
- Cancellation hanya draft atau confirmed yang belum memiliki payment sukses maupun stock allocation. Service-only confirmed unpaid boleh cancelled. Draft cancelled dapat ditagihkan ulang; booking FK histori tetap ada. Payment pernah sukses tetap menghalangi cancellation walau sudah direfund penuh.
- Refund penuh/parsial berupa histori uang immutable, alasan wajib, tidak melebihi bagian payment sukses yang belum direfund. Tidak mengubah stok, booking, item atau status operasional.
- Refund **bukan credit note**: grand_total tetap, net paid berkurang, remaining muncul lagi. Misalnya total100, paid100, refund25 → net paid75, remaining25. Append payment pengganti dibolehkan pada confirmed/completed dengan saldo positif, tanpa membuka ulang status operasional completed.
- Metode manual: cash, bank_transfer, qris, debit_card, credit_card, e_wallet. Tidak ada gateway atau verifikasi bank otomatis. Cash amount adalah pembayaran bersih; overpayment/cash tender dan kembalian tidak dimodelkan.

## Schema dan relasi

Migration additive `2026_11_14_000007_create_transactions_payments_tables.php`, MySQL **batch7**. Menambah enam tabel dan satu field nullable `products.selling_price DECIMAL(18,2)` tanpa backfill. Migration applied lama tidak diubah. Semua **18 FK baru RESTRICT**, total domain **48 FK**.

| Tabel | Struktur penting |
| --- | --- |
| transactions | unique transaction_number `TX-`+ULID; customer_id, nullable booking_id; nullable active_booking_id unique; transaction_date; status; subtotal/grand_total DECIMAL(18,2); notes; created_by; timestamps. Index customer/date dan status/date. |
| transaction_items | transaction_id; item_type service/product; nullable service_id/product_id eksklusif lewat domain validation; from_booking; item_name/description/product_type/unit snapshots; quantity integer; unit_price/subtotal DECIMAL(18,2); timestamps. Unique transaction/service serta transaction/product; unique id/product untuk FK allocation. |
| transaction_stock_allocations | transaction_item_id/product_id/product_batch_id nullable; quantity; stock_movement_id nullable unique; timestamps. Composite FK item/product dan product/batch. Movement link terisi sebelum commit confirmation sukses. |
| payment_methods | code unique, name, is_active, timestamps. Enam metode awal; penambahan/deaktivasi operator melalui jalur administrasi tepercaya, belum CRUD API metode. |
| payments | unique payment_number `PY-`+ULID; transaction_id/payment_method_id, method_snapshot; UUID idempotency_key unique; payload_hash server; payment_date; amount DECIMAL(18,2); status succeeded/failed/cancelled; nullable reference_number/notes; received_by; timestamps. Unique transaction/id untuk refund FK, index transaction/date. |
| payment_refunds | unique refund_number `RF-`+ULID; payment_id/transaction_id, composite FK pasangan tersebut; UUID unique/payload_hash; refund_date; amount DECIMAL(18,2); reason; refunded_by; timestamps. Index transaction/date. |

Relasi: Transaction belongsTo Customer/Booking/User creator, hasMany items/payments/refunds. Item belongsTo Transaction/Service/Product, hasMany allocations. Allocation belongsTo item/Product/Batch/StockMovement. Payment belongsTo Transaction/PaymentMethod/User receiver, hasMany refunds; Refund belongsTo Payment/Transaction/User actor. Booking pet memakai relasi historis withTrashed existing. Tidak menggandakan customer/booking/product/batch/stock balance.

`active_booking_id` menjaga satu tagihan aktif secara unique; cancellation yang sah melepas nilainya secara atomik sambil mempertahankan booking_id historis. Service/product referensi, type eksklusif, positive quantity dan lifecycle dijaga service; composite FK menjaga referensi allocation/refund. Database belum memiliki trigger untuk seluruh invariant bisnis.

## Harga, total dan financial status

- Selling price input 0–999.999.999,99, maksimum dua desimal; null berarti belum ditetapkan, nol adalah harga gratis yang sah.
- Kuantitas integer positif, maksimum2.147.483.647; tidak ada konversi unit. Item reference duplikat ditolak, termasuk service booking yang dikirim ulang sebagai line biasa. Maksimum100 input lines; booking otomatis menambahkan satu line.
- `TransactionMoney` memvalidasi monetary strings, mengonversi integer cents, memeriksa multiplication/addition overflow, lalu memformat decimal string. Storage total DECIMAL(18,2). Tidak memakai float arithmetic atau SUM uang yang berpotensi float.
- Item subtotal=quantity×unit_price; header subtotal=sum items; grand_total=subtotal karena diskon/pajak0. Draft boleh kosong, tetapi tidak dapat confirmed. Transaksi gratis dapat completed tanpa payment; payment tetap harus positif.
- `gross_paid`=jumlah succeeded; `total_refunded`=jumlah refund valid; `total_paid`=gross_paid−total_refunded; `remaining_balance`=grand_total−total_paid. Failed/cancelled payment tidak berpengaruh, dan nominal percobaan failed boleh melebihi remaining.
- `payment_status`: unpaid / partially_paid / paid berdasarkan net paid terhadap total. `refund_status`: none / partially_refunded / refunded berdasarkan refund terhadap gross paid. Keduanya terpisah dari operational status; refund tidak menyembunyikan remaining.
- Tidak ada kolom saldo pembayaran mutable. Ringkasan uang dibaca satu UNION statement agar tidak mencampur payment/refund dari commit berbeda; detail/list transaction memuat histori dan ringkasan dalam satu snapshot transaksi read.

## Inventory, atomisitas dan concurrency

`TransactionService::transition()` memegang lock parent sebelum confirmation. Urutan linked booking: pet → booking → transaction → current financial/item/allocation reads → sorted products → services/category → batches/ledger. Money-only writers mengunci transaction, lalu payment/method/history terkait tanpa mengunci booking.

`TransactionStockService` memeriksa kembali active catalog/type/unit snapshot. General memakai satu bucket unbatched. Medicine memilih batch nonexpired urut expiry_date/id, membaca saldo ledger terkini dengan locking reads, dan membagi kuantitas lintas batch FEFO. Expiry hari ini UTC masih usable. Kurang stok menolak seluruh confirmation; tidak ada partial sale otomatis.

`InventoryService::sellTransactionAllocation(User, TransactionStockAllocation, Transaction)` menerima dokumen persisted tepercaya. Parent dikunci sebelum product; allocation/item dibaca dengan current locking reads, parent/product/status/quantity/link dan permission diperiksa ulang. Writer private yang sama digunakan oleh manual adjustment, purchase receipt dan sale. Movement `sale` direction out, reference_type `sale_transaction_item`, reference_id item. Satu item medicine dapat menghasilkan beberapa movements, masing-masing memiliki satu allocation dan unique movement link; confirmation replay tidak membuat allocations/movements baru.

Public POST stock-movements tetap menerima opening/adjustment saja; sale/reference/actor tidak dapat dipalsukan oleh klien. Filter GET histori kini menerima sale. Tidak mengubah stok products, membuat ledger kedua, mengubah expiry, atau memakai purchase price sebagai selling price.

Confirmation, allocations, ledger dan status satu DB transaction; exception pada movement kedua atau status me-rollback seluruhnya. Cancellation memeriksa allocation memakai **current locking reads**, sehingga snapshot sebelum confirmation tidak dapat meloloskan cancellation berstok. Laravel transaction retries3 untuk deadlock.

## Payments, refunds dan idempotensi

`PaymentService::record()` / `refund()` mengotorisasi sebelum validasi dan setelah parent lock. Actor/number/reference ownership/hash berasal server. Payment hanya confirmed/completed; refund hanya payment succeeded. Refund cap dihitung ulang dari current refund rows di bawah transaction lock.

UUID key unique global dalam masing-masing tabel payment/refund. UUID dinormalisasi lowercase; amount `1` dan `1.00` bernilai payload sama. Hash memasukkan target document, tanggal, amount, metode/status/optional metadata relevan. Key sama + payload sama mengembalikan record awal200; payload/target berbeda422. Replay diperiksa sebelum kondisi terminal atau metode nonaktif, tetapi **sesudah authorization** sehingga pencabutan grant tetap berlaku. First create201. Unique collision lintas transaksi ditangani sebagai422.

Payment/refund/allocation immutable melalui event Eloquent, tidak memiliki update/delete endpoint. Transaction tidak dapat dihapus; confirmed items tidak dapat diedit/dipindah parent. Query-builder/direct SQL dapat melewati domain guards: bukan writer operasional yang sah.

## Permission matrix

| Capability | Hak |
| --- | --- |
| manage_transactions (baru) | Create/update draft, lifecycle, minimal billing lookup; read transaksi. Grant awal Admin/Kasir saja. |
| view_transactions (existing) | Read/list seluruh transaksi, payment history dan receipts; tanpa write. |
| process_payments (existing) | Append payment dan read dokumen terkait/metode pembayaran; tidak otomatis edit draft, refund, customer profile atau inventory. |
| manage_refunds (baru) | Append refund dan read dokumen terkait. Grant awal Admin saja. |
| view_own_transactions (existing) | Read/list/receipt transaksi sendiri; tidak menulis atau membaca transaksi customer lain. |
| manage_products (existing) | Mengelola selling_price pada katalog existing; Kasir tidak otomatis mendapat capability ini. |

`TransactionsPaymentsSeeder` memberi grant hanya saat permission pertama dibuat; rerun mempertahankan pencabutan/manual grants. Metode memakai firstOrCreate, tanpa reset nama/active. Existing grants Module1–5 tetap. MySQL kini **9 roles /31 permissions /76 grants**, tambahan dua permissions/tiga grants. Tidak ada role-name checks controller atau universal Admin bypass.

## API

Semua path relatif `/api/v1`, middleware auth + active. **12 route declarations baru**, total **65 API routes**; satu route lookup mencakup lima kind. JSON `data`, pagination `links/meta`, default20/max100. Validation/domain conflict422, guest401, forbidden403, missing404. Tidak ada auth library/login endpoint baru.

| Method | Path | Perilaku |
| --- | --- | --- |
| GET | /billing/{kind} | kind customers/bookings/products/services/payment-methods; search dan customer_id booking. manage_transactions, kecuali metode boleh process_payments. |
| GET / POST | /transactions | List scoped own/global; create draft. Filter search nomor/customer_id/status/from/to. |
| GET / PATCH | /transactions/{transaction} | Detail atau update draft items/notes/transaction_date. |
| PATCH | /transactions/{transaction}/status | confirmed/completed/cancelled sesuai lifecycle. |
| GET | /transactions/{transaction}/receipt | Data invoice/receipt, item breakdown, cashier/customer, history dan saldo. |
| GET / POST | /transactions/{transaction}/payments | Histori paginated atau append payment. |
| GET | /payments/{payment} | Payment detail termasuk customer/nomor transaksi minimal dan refunds. |
| GET | /payments/{payment}/receipt | Receipt payment dengan payment/transaction references dan receiver. |
| POST | /payments/{payment}/refunds | Append money refund. |

Lookup customer hanya id/name. Booking hanya identitas/code/customer/pet/service/status/jadwal/harga snapshot/active_transaction_id. Product hanya id/sku/name/type/unit/selling_price/usable_stock; tanpa ledger audit, biaya beli atau data supplier. Service hanya identitas/nama/harga/kategori. Tidak membuka customer email/address atau booking staff_notes/medical data. Receipts memakai field eksplisit tanpa credential/raw users/payload_hash.

Contoh draft langsung (ID harus merujuk data sah):

```json
{"customer_id":1,"transaction_date":"2026-11-14","items":[{"item_type":"service","service_id":1,"quantity":1},{"item_type":"product","product_id":1,"quantity":2}]}
```

Dari booking: tambah `booking_id`, `items: []` valid karena booking service ditambahkan server. Untuk PATCH items, daftar input mengganti seluruh extra items; booking line tetap dibuat otomatis. Unit price, totals, discount/tax, actors, status atau stock allocations bukan writable fields biasa.

```json
{"status":"confirmed"}
```

```json
{"idempotency_key":"0b3e901a-fde8-4ce0-bcb7-787da77d39c8","payment_date":"2026-11-14","amount":"200000.00","method":"bank_transfer","status":"succeeded","reference_number":"REFERENSI-PEMBAYARAN"}
```

```json
{"idempotency_key":"b09d6c68-893b-4843-b7cf-ff16eae6e7a0","refund_date":"2026-11-14","amount":"25000.00","reason":"Pengembalian dana yang disetujui"}
```

Contoh di atas dokumentasi, bukan akun/token/data seed operasional.

## Verifikasi aktual

Dari backend:

```sh
LOG_CHANNEL=stderr vendor/bin/phpunit --do-not-cache-result
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
```

Hasil: **234 tests /1854 assertions lulus**: **38 tes Module6** +196 regresi Module1–5. Coverage combined/service/product, harga snapshot/override/precision/overflow, booking ownership/duplicate/cancellation, FEFO/expiry/negative stock, partial/full/failed/cancelled payment, UUID replay/mismatch/revocation, money-only refund/cap/history, rollback movement/status/payment/refund, receipt snapshot, FK/unique, inactive/own-only/minimal lookup. Pint/Composer, syntax **183 PHP files**, route count65 dan diff checks lulus.

MySQL8.4.13: migration000007 batch7 applied; **34 tables /10 migrations Ran /48 FK domain**. Six payment method records; tabel transaction/items/allocations/payments/refunds kosong, stock operational tetap0. Seeder khusus diulang dua kali. Fingerprint seluruh28 tabel lama terjaga, dengan pengecualian authorized: nullable selling_price, satu migration record, dua permissions/tiga grants. Tidak ada demo operational fixtures.

Probe [TransactionsPaymentsMySqlProbe.php](../tests/Support/TransactionsPaymentsMySqlProbe.php) dijalankan manual terpisah dari default PHPUnit:

```sh
LOG_CHANNEL=stderr php tests/Support/TransactionsPaymentsMySqlProbe.php
```

Probe menolak prefix q6_ yang sudah ada, membuat salinan schema terisolasi, memastikan FK hanya ke scratch, dan memakai actual services/two PHP workers. Membutuhkan akses MySQL lokal dan izin DDL scratch; jangan dijalankan di production atau bersamaan dengan probe prefix sama. Hanya scratch milik run dibersihkan, tanpa reset/menghapus tabel operasional.

Bukti MySQL:

- Stale-snapshot cancellation bug direproduksi dengan guard lama; current guard menolak cancellation setelah concurrent stock posting.
- Stale-snapshot draft replacement direproduksi sebagai missing item pada writer lama; current item/parent reads berhasil, outer transaction tetap rollback.
- Stock/payment nested outer rollback dan FK rejection lulus.
- Dua sales30 pada stock49: satu succeeds, satu ditolak; physical akhir19 tepat, tanpa overselling.
- Dua payment60 pada total100: satu succeeds, satu ditolak. UUID sama menghasilkan satu payment + satu replay.
- Dua refund70 pada payment100: satu succeeds, satu ditolak. UUID sama menghasilkan satu refund + satu replay.
- Dua create billing booking bersamaan: satu succeeds, satu ditolak. Workers benar-benar menunggu held lock sekitar1,2 detik.
- **33 scratch tables dibuat/dibersihkan; tidak ada scratch tersisa.**

Review independen menemukan tiga isu penting (read snapshot, cancellation/current reads, sale writer/current reads) serta parent reassignment guard. Semuanya diperbaiki dengan regression evidence; tidak ada blocker yang dibiarkan. Probe adalah skenario terkontrol, bukan stress/deadlock fuzz semua kombinasi lintas modul.

## Known limitations

- Tidak ada automatic DP/slot gating, gateway/reconciliation bank, cash tender/change, printer/PDF, accounting/AP, tax/discount/multicurrency, cost valuation, atau frontend auth/integration.
- Refund bukan credit note/retur barang. Tidak ada stock return/reversal atau cancellation confirmed product sale. Memerlukan spesifikasi bisnis terpisah.
- Additional items setelah confirmation menjadi transaksi baru; tidak mengedit paid invoice atau menggabungkan booking baru ke invoice confirmed.
- Medicine sale adalah stock sale langsung, bukan resep/dispensing klinis Module7. Tidak ada medicine dosing/prescription validation pada modul ini.
- Selling_price lama tetap null hingga operator berizin menetapkannya; tidak mengimpor harga demo frontend atau menebak margin pembelian.
- Row locks/domain invariants berlaku untuk writer service. Direct SQL bisa melewati guards. Ledger/history read pada write belum dioptimalkan dengan balance cache; perlu pengukuran pada volume nyata.
- Auth production, E2E browser, CI/deployment, production load, Module7–8 dan AI tetap belum diimplementasikan.

## File Module 6

Baseline file diambil setelah Module5 selesai. Perubahan Module5 yang masih uncommitted tetap dipertahankan; daftar berikut khusus delta Module6.

Dibuat (**35 file**):

- `app/Http/Controllers/Api/BillingLookupController.php`
- `app/Http/Controllers/Api/PaymentController.php`
- `app/Http/Controllers/Api/TransactionController.php`
- `app/Http/Requests/BillingLookupRequest.php`
- `app/Http/Requests/SaveTransactionRequest.php`
- `app/Http/Requests/StorePaymentRefundRequest.php`
- `app/Http/Requests/StorePaymentRequest.php`
- `app/Http/Requests/TransactionListRequest.php`
- `app/Http/Requests/TransactionStatusRequest.php`
- `app/Http/Resources/BillingLookupResource.php`
- `app/Http/Resources/PaymentRefundResource.php`
- `app/Http/Resources/PaymentResource.php`
- `app/Http/Resources/TransactionItemResource.php`
- `app/Http/Resources/TransactionResource.php`
- `app/Models/Payment.php`
- `app/Models/PaymentMethod.php`
- `app/Models/PaymentRefund.php`
- `app/Models/Transaction.php`
- `app/Models/TransactionItem.php`
- `app/Models/TransactionStockAllocation.php`
- `app/Policies/TransactionPolicy.php`
- `app/Services/BillingLookupService.php`
- `app/Services/PaymentService.php`
- `app/Services/TransactionService.php`
- `app/Services/TransactionStockService.php`
- `app/Support/TransactionMoney.php`
- `app/Support/TransactionSummary.php`
- `app/Support/TransactionValidation.php`
- `database/migrations/2026_11_14_000007_create_transactions_payments_tables.php`
- `database/seeders/TransactionsPaymentsSeeder.php`
- `docs/transactions-payments-design.md`
- `docs/transactions-payments-plan.md`
- `docs/transactions-payments.md`
- `tests/Feature/TransactionsPaymentsTest.php`
- `tests/Support/TransactionsPaymentsMySqlProbe.php`

Diubah (**10 file existing**):

- `README.md`
- `app/Http/Requests/InventoryMonitorRequest.php`
- `app/Http/Resources/ProductResource.php`
- `app/Models/Product.php`
- `app/Providers/AppServiceProvider.php`
- `app/Services/InventoryService.php`
- `app/Support/InventoryValidation.php`
- `database/seeders/DatabaseSeeder.php`
- `docs/PROJECT_MASTER_CONTEXT.md`
- `routes/api.php`

Frontend, konfigurasi environment/database/auth/access, migration Module1–5 dan data operasional tidak diubah/dihapus. Tidak melakukan commit/push/merge/reset/branch switch atau Git mutation lain. Berhenti setelah Module6; Module7 menunggu instruksi.
