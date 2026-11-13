# Module 6 — Transactions & Payments: Audit dan Technical Specification

Tanggal audit: **13 November 2026, Asia/Jakarta**. Status: **Implemented; verifikasi akhir 14 November 2026.**

Sumber: [master context](PROJECT_MASTER_CONTEXT.md), dokumentasi dan source Module 1–5, serta spesifikasi Module 6 dari pengguna. Pengguna menyetujui seluruh rekomendasi 1–6 beserta penegasan DP manual, refund uang saja dan grant terbatas.

## Tujuan dan batas scope

Transaksi service/product gabungan, billing booking, pembayaran penuh/parsial/DP, histori payment, receipt data, dan pengurangan stock melalui ledger yang sama. Refund/cancellation mengikuti keputusan pengguna. Tidak mencakup supplier payment/AP, payroll, accounting ledger, reporting kompleks, gateway, frontend, deployment, Module 7–8 atau AI. Tidak melakukan Git mutation, perubahan environment, penghapusan data atau migration lama.

## Baseline aktual

- Branch tes-laravel, perubahan Module 5 masih uncommitted dan wajib dipertahankan.
- Full suite dijalankan ulang: **196 tests / 1520 assertions lulus**. Database tests memakai SQLite in-memory terisolasi, bukan MySQL operasional.
- MySQL read-only: **28 tabel, 9 migrations Ran, 9 roles, 29 permissions, 73 grants**. Module 5 migration000006 batch6. Schema/record baseline Module 6 disimpan di luar repository tanpa output credential.
- API baseline **53 endpoints**, belum ada transaksi atau payment.
- Customer wajib terkait akun; tidak ada anonymous customer/guest checkout dalam fondasi saat ini.
- Product belum memiliki harga jual. PO/receipt menyimpan purchase price, yang tidak boleh dipakai sebagai selling price secara implisit.
- Service mempunyai harga DECIMAL(12,2), booking menyimpan price_snapshot. Booking satu service/customer/pet; staff notes bukan data billing.
- Booking lifecycle: pending → confirmed → checked_in → in_progress → completed, dengan cancellation/no_show sesuai transisi existing. Pending sudah memblokir overlap per pet. Tidak ada DP/payment gate atau expiry slot.
- InventoryService private writer menserialkan product → batch → current ledger locking read. Public movement menerima opening/adjustments saja; trusted purchase receipt sudah berbagi writer.
- Medicine wajib batch, expiry valid sampai akhir tanggal UTC; general tanpa batch. FEFO candidates tersedia, belum stock-out otomatis.
- Kasir memiliki view_transactions/process_payments, belum manage_transactions, lookup customer/booking ataupun inventory access. Customer punya view_own_transactions. Jangan memperluas profil/klinis/internal ledger agar kasir dapat billing.
- Purchasing memakai integer cents, DECIMAL(18,2), current locking reads dan UUID idempotency. Pola ini dipertahankan.

## Pendekatan teknis

Gunakan native Laravel services, FormRequests, thin controllers, explicit Resources dan Policies/Gates dengan auth + active di /api/v1. Tidak menambah library payment/auth atau saldo stok baru.

Alternatif yang diperiksa: mengubah purchase price menjadi harga jual akan mencampur biaya dan harga jual; menerima harga bebas dari klien melanggar requirement manipulasi harga. Rekomendasi adalah selling_price nullable terpisah pada products melalui migration additive, atau tabel harga jual terpisah jika pengguna menuntut versioning/catalog pricing. Fondasi sederhana saat ini cukup satu field; histori transaksi tetap snapshot.

Payment total dan remaining dihitung dari immutable payment/refund records, bukan balance mutable. Konfirmasi transaksi dan sale allocation/movements harus satu DB transaction. Payment/refund diserialkan pada row transaksi, dengan current reads, idempotency UUID dan reauthorization setelah lock.

## Confirmed Decisions — jawaban pengguna

1. Harga jual produk nullable dikelola manage_products, tidak boleh override harga oleh kasir. Service dari booking memakai snapshot, service langsung katalog. IDR; tax/discount nol untuk tahap ini.
2. Draft → confirmed → completed, confirmed membekukan item dan memotong stok walau belum lunas. FEFO otomatis medicine lintas batch; completed wajib lunas dan linked booking completed. Item susulan menjadi transaksi baru.
3. Satu booking satu transaksi aktif, cancelled draft dapat ditagihkan ulang; cancelled/no_show booking tidak billable. DP manual tanpa minimum/timeout atau automatic booking status/slot. **Batas pengamanan slot belum otomatis sudah disetujui eksplisit.**
4. Cancel hanya sebelum sukses payment dan stock deduction; confirmed service-only unpaid bisa cancelled. Refund uang immutable penuh/parsial dengan alasan, tidak otomatis stock return/booking cancellation. Admin-only initial manage_refunds. Refund mengurangi net paid; tidak mengubah operational completed atau membuka ulang service. Retur/reversal belum disepakati.
5. Manual cash/bank_transfer/qris/debit_card/credit_card/e_wallet. Payment succeeded dihitung, failed/cancelled histori saja. No overpayment; cash amount adalah nilai bersih pembayaran.
6. Admin/Kasir manage_transactions, existing process_payments/view_transactions. Lookup billing minimal customer/booking/catalog/usable stock tanpa internal notes atau purchase costs. Customer read own-only. Tidak ada grant role lain otomatis.

Jawaban pengguna mengonfirmasi seluruh rekomendasi; kontrak final dan bukti implementasi ada di [dokumentasi modul](transactions-payments.md).

## Rancangan schema — implementation target

- products.selling_price nullable DECIMAL, tanpa backfill harga fiktif; perubahan schema lama hanya additive field ini, jika disetujui.
- transactions: unique server number, customer/optional booking references, operational status, date/notes/creator/timestamps; frozen item snapshots. Booking uniqueness harus mendukung rebilling setelah cancellation yang diizinkan tanpa menghapus histori.
- transaction_items: service/product references eksklusif, name/description/type/unit snapshot, positive integer quantity, price/subtotal DECIMAL. Reject/merge duplicate references secara konsisten.
- transaction_stock_allocations: item/product/batch references, quantity, unique movement link; satu item medicine dapat memiliki beberapa allocation FEFO. Composite constraints menjaga item/product/batch konsisten.
- payments: transaction/actor/method references, number unique, UUID unique, canonical payload hash, amount/date/status/reference/notes dan timestamps. Tidak dapat diedit/dihapus.
- payment_refunds jika disetujui: original payment/transaction/actor, unique UUID/hash/number, positive amount, reason/date/timestamps; append-only.
- payment methods extensible dengan kode stabil; strategi lookup storage ditetapkan di plan final. Tidak menyimpan credential provider.

Foreign keys RESTRICT untuk histori; unique/index di number/idempotency/reference/filter; integer cents checked arithmetic dan batas total DECIMAL(18,2). Resource tidak mengeluarkan payload hash, credential, raw account, clinical/internal notes atau biaya pembelian.

## Kontrak integrasi dan concurrency

- Semua stock writers tetap product-first di dalam urutan lock lintas dokumen yang konsisten. Konfirmasi mengunci transaction dan seluruh product IDs terurut; FEFO memakai batch nonexpired dan saldo dari current locking reads, bukan snapshot aggregate lama.
- Shared writer menerima dokumen allocation persisted yang diverifikasi; actor/type/reference server-owned. Public stock API tetap tidak menerima sale/reference buatan klien.
- Payment/refund lock transaction → relevant payment/current history; retry sama menghasilkan record awal, payload berbeda ditolak. Cek replay sebelum status terminal agar retry sah tetap berhasil.
- Booking duplicate billing dilindungi row lock + unique constraint. Hormati pet → booking lock order Module 3 bila menulis/mengunci booking; jangan memperkenalkan kebalikan lock antar writer.
- Tidak mengubah status booking dari status pembayaran tanpa keputusan eksplisit. Snapshot bill tidak otomatis berubah jika catalog berubah.
- MySQL probe terisolasi wajib membuktikan competing sale last-stock, payment remaining cap, UUID replay, FK/unique dan rollback. Jangan memakai operational fixture; hanya bersihkan scratch milik run tersebut.

## Acceptance dan known limitations

TDD untuk happy/rejection/authorization/immutability, booking billing, exact cents/overflow, FEFO/split batches/expired/negative stock, payment history/partial/full/replay/refund sesuai keputusan, transaction rollback dan resource leakage. Regresi Module1–5 wajib lulus. MySQL 8.4 concurrent workers untuk stock/payment; SQLite saja tidak membuktikan locking.

Baseline di atas bersifat historis. Hasil akhir:234 tests/1854 assertions, MySQL34tables/10migrations/48FK, permissions31/grants76,65 API routes. Lihat dokumentasi modul untuk batas bukti dan detail aktual.

## Penajaman teknis setelah review

Refund adalah pengembalian dana, bukan credit note pengurang grand total: net paid berkurang dan remaining kembali muncul. Append payment pengganti boleh pada confirmed/completed dengan remaining positif; item/status operasional tidak diubah. Payment status (net settlement) dan refund status terpisah. Booking cancelled/no_show setelah billing tidak otomatis membatalkan tagihan/refund; transaksi tetap historis dan dapat menerima pembayaran, tetapi transaksi baru/konfirmasi dari booking cancelled/no_show ditolak.
