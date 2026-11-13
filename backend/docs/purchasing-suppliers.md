# Module 5 — Purchasing & Suppliers

Module 5 menambahkan pengadaan barang melalui supplier, purchase orders dan goods receiving yang langsung terhubung dengan immutable inventory ledger Module 4. Tidak mengimplementasikan pembayaran supplier, accounts payable, invoice reconciliation, sales, dispensing, hotel, AI atau integrasi frontend.

Baca [master context](PROJECT_MASTER_CONTEXT.md), [fondasi inventory](inventory-pharmacy-management.md), dan [implementation plan](purchasing-suppliers-plan.md).

## Keputusan dan lifecycle

- Lifecycle: `draft → ordered → partially_received → fully_received`. Receiving seluruh kuantitas sekaligus dapat membawa ordered langsung ke fully_received. Cancel hanya dari draft/ordered sebelum receiving apa pun. Tidak ada approval stage, reopening atau DELETE endpoints.
- Draft boleh kosong sebagai dokumen kerja; ordering wajib minimal satu item. Item dapat diganti seluruhnya lewat PATCH draft; ID item draft tidak stabil setelah replacement. Ordered dan status berikutnya tidak dapat diedit lewat PATCH biasa.
- Satu PO memiliki supplier dan beberapa produk unik; quantity integer positif, maksimum 2.147.483.647 per item. Satu unit dasar produk; tidak ada konversi unit. Product name/type/unit dan harga beli disnapshot pada PO item.
- Produk harus aktif saat membuat item, ordering dan receiving. Perbedaan type/unit terhadap snapshot menolak ordering/receiving; draft dapat diperbarui terlebih dahulu. Rename katalog tidak mengubah snapshot.
- **Dikonfirmasi pengguna:** supplier nonaktif menolak pembuatan PO dan ordering baru; PO yang sudah ordered tetap dapat diterima. Histori tetap terbaca. Tidak ada penghapusan supplier melalui API.
- **Dikonfirmasi pengguna:** medicine expired ditolak pada purchasing receipt. Expiry tanggal UTC hari ini masih valid sesuai Module 4; penerimaan tidak menerima expiry sebelum received_date. General tidak diwajibkan batch dan menolak batch fields non-null.
- **Dikonfirmasi pengguna:** harga aktual receiving boleh berbeda dari harga PO; default harga PO bila dihilangkan. Snapshot PO tidak diubah. Ini belum invoice reconciliation.

## Schema dan relasi

Migration additive: `2026_11_13_000006_create_purchasing_tables.php`, MySQL batch **6**. Tidak ada perubahan tabel/migration Module 1–4.

| Tabel | Field dan constraint penting |
| --- | --- |
| suppliers | id, name, nullable contact_name/email/phone/address/notes, is_active true, timestamps; index active/name. |
| purchase_orders | id, po_number unique (`PO-` + ULID server), supplier_id FK, order_date, expected_delivery_date nullable, status, notes nullable, created_by FK users, subtotal/total DECIMAL(18,2), timestamps; index supplier/status/date dan status/date. |
| purchase_order_items | id, purchase_order_id FK, product_id FK, product_name/type/unit snapshot, quantity_ordered, unit_purchase_price/subtotal DECIMAL(18,2), timestamps; unique PO/product, PO/id serta id/product. |
| goods_receivings | id, receiving_number unique (`GR-` + ULID server), purchase_order_id FK, idempotency_key UUID unique, payload_hash server, received_date, received_by FK users, notes nullable, timestamps; unique PO/id, index PO/date. |
| goods_receiving_items | id, goods_receiving_id, purchase_order_id, purchase_order_item_id, product_id, product_batch_id nullable, quantity, actual_unit_price/subtotal DECIMAL(18,2), stock_movement_id unique FK, timestamps. |

Seluruh **13 FK baru** menggunakan RESTRICT, total domain **30 FK**. Composite FK menjaga receiving header/item berasal dari PO yang sama, product cocok dengan PO item, dan batch milik product tersebut. Receiving item terhubung unik ke movement; kolom movement nullable hanya selama perakitan dokumen di transaksi, lalu wajib terisi pada hasil sukses. Tidak ada saldo inventory kedua atau quantity_received mutable. Received quantity dan remaining dihitung dari receiving items; PO Resource eager-load data tersebut.

Relasi: Supplier hasMany PurchaseOrder; PurchaseOrder belongsTo Supplier/User creator dan hasMany items/receivings; PurchaseOrderItem belongsTo PO/Product dan hasMany receivingItems; GoodsReceiving belongsTo PO/User receiver dan hasMany items; GoodsReceivingItem belongsTo receiving, PO item, Product, batch, serta movement. Referensi histori dipertahankan.

Harga input 0–999.999.999,99, maksimal dua desimal; integer cents digunakan untuk perkalian/penjumlahan, kemudian disimpan sebagai DECIMAL(18,2), tanpa floating-point arithmetic. Subtotal/total dan hasil perkalian/penjumlahan melebihi kapasitas ditolak. Total PO sama dengan subtotal karena belum ada pajak/diskon/ongkir. Mata uang/multi-currency belum dimodelkan.

## Receiving atomik dan integrasi inventory

`GoodsReceivingService::confirm(User, PurchaseOrder, array)` mengonfirmasi satu dokumen final dari payload; tidak ada draft receiving yang belum diposting. Stock bertambah hanya bila transaksi konfirmasi selesai.

1. Validasi dan authorize receive capability, normalisasi UUID/payload hash.
2. Kunci PO dan ulangi authorization; cek replay sebelum lifecycle sehingga retry full receipt tetap berhasil setelah PO fully_received.
3. Kunci PO items dan seluruh produk dalam urutan ID konsisten; gunakan current locking read pada receiving items untuk menghitung remaining terbaru.
4. Jumlahkan seluruh baris payload per PO item sebelum membandingkan remaining. Satu PO item dapat dibagi ke beberapa batch/baris, tanpa bypass over-receiving.
5. Untuk medicine, batch_number dan expiry wajib. Batch existing dengan nomor sama harus memiliki expiry sama; batch baru dibuat di transaksi. Tidak mengubah expiry/received_date batch existing. Nomor batch `0` valid.
6. Simpan receiving/item, lalu panggil `InventoryService::receivePurchaseItem()`; metode ini menggunakan writer ledger yang sama dengan opening/adjustment, dengan reference server `goods_receiving_item` dan reference_id item.
7. Perbarui status dari total quantity received, lalu commit. Kegagalan validasi, movement, batch, atau status me-rollback seluruh dokumen dan stok.

Module 4 diperluas terbatas: private writer bersama, metode receipt tepercaya, dan filter histori `purchase_receipt`. Public POST stock-movements tetap hanya opening/adjustment; klien tidak boleh memalsukan type purchase_receipt, actor atau reference. Receiving tidak memerlukan manage_inventory untuk membuat adjustment umum; permission receive berdiri sendiri. Produk nonaktif, batch mismatch, saldo negatif dan batas saldo Module 4 tetap berlaku.

Model receiving/header item menolak update/delete Eloquent. Linking stock_movement_id dilakukan sekali melalui internal builder update di transaksi konfirmasi sebelum dokumen final dikembalikan; tidak ada endpoint edit/delete receiving. Query-builder/direct SQL tetap dapat melewati application guards dan bukan writer operasional yang didukung.

## Idempotensi dan concurrency

Client wajib mengirim UUID idempotency_key baru untuk setiap receiving yang berbeda. Retry payload yang sama memakai UUID sama → **200**, dokumen lama dikembalikan. Konfirmasi pertama → **201**. UUID sama dengan payload/PO berbeda → **422**, tanpa stok tambahan. UUID key dinormalisasi lowercase; item order tidak memengaruhi hash, integer/numeric prices dinormalisasi. Omitted actual price dan nilai eksplisit diperlakukan sebagai payload berbeda; payload retries harus konsisten. Aktor/status/permission tetap diperiksa saat retry; tidak membuka bypass akses.

PO lock menserialkan penerimaan bersamaan pada satu PO. Product locks berurutan menserialkan stok lintas PO dan writer inventory; nested transactions/savepoints menjaga atomicity. Unique UUID global juga melindungi request lintas PO; unique collision mengembalikan konflik validasi. Unique PO/receiving number memakai ULID dan constraint database; tidak ada nomor urut gapless.

MySQL 8.4 dua-worker probe membuktikan dua kasus terkontrol: dua request masing-masing qty7 pada PO10 hanya satu berhasil; dua request identik qty10 menghasilkan satu receipt dan satu replay. Keduanya menunggu lock PO yang sengaja ditahan. Ini bukan load/stress test menyeluruh atau jaminan writer direct SQL.

## Permissions

| Permission | Supplier | PO | Receiving |
| --- | --- | --- | --- |
| manage_suppliers (existing) | Read/create/update/deactivate | Tidak otomatis | Tidak otomatis |
| manage_purchase_orders (baru) | Hanya ringkasan supplier di PO | Read/create/edit draft/ordered/cancel | Read history |
| receive_purchase_orders (baru) | Hanya ringkasan supplier di PO | Read | Confirm/read |

Nama role tidak diperiksa di controller. Baseline Admin dan Inventory Staff mendapat kedua permission baru saat permission pertama diciptakan. Role lain tidak diberi grant otomatis. `view_suppliers` dan `view_purchase_orders` tidak dibuat karena kebutuhan read saat ini tercakup manage/receive; read-only terpisah dapat dirancang bila dibutuhkan.

`PurchasingSeeder` memakai firstOrCreate, hanya attach Admin/Inventory ketika permission baru dibuat, tidak mereset grant atau mengembalikan grant yang dicabut. DatabaseSeeder memanggilnya setelah seeders existing. Jika permission sudah diprovision manual, grant dikelola eksplisit; rerun bukan cara memulihkan izin.

PO-only/receiver-only tidak melihat kontak/alamat/notes supplier; embedded supplier hanya id/name. Pemegang manage_suppliers dapat melihat detail supplier. Receipt menampilkan batch number/expiry tanpa membuka seluruh katalog inventory. Resources tidak mengeluarkan payload_hash, credential atau objek User lengkap. Akun nonaktif dan pencabutan grant tetap ditolak.

## API

Semua prefix `/api/v1`, middleware auth + active. **12 endpoint baru**, total **53 API routes**.

| Method | Path | Fungsi |
| --- | --- | --- |
| GET / POST | /suppliers | List/search/filter / create. |
| GET / PATCH | /suppliers/{supplier} | Detail / edit/deactivate. |
| GET / POST | /purchase-orders | List/filter / create draft. |
| GET / PATCH | /purchase-orders/{purchaseOrder} | Detail/histori snapshot / edit draft. |
| PATCH | /purchase-orders/{purchaseOrder}/status | ordered atau cancelled; transisi terkontrol. |
| GET / POST | /purchase-orders/{purchaseOrder}/receivings | History / confirm receiving. |
| GET | /goods-receivings/{receiving} | Detail receiving immutable. |

Supplier list: search name/contact_name dan is_active. PO list: supplier_id, status, from/to (order_date). Semua list pagination default20/max100. Detail PO menyertakan items dengan quantity_received dan remaining_quantity. Request dates YYYY-MM-DD; expected_delivery_date tidak boleh sebelum order_date; received_date tidak boleh di masa depan. UTC mengikuti fondasi inventory. JSON response `data`, list `links/meta`; 401 guest,403 forbidden,404 missing,422 invalid/domain conflict.

Contoh create PO (data contoh dokumentasi, bukan seed):

```json
{"supplier_id":1,"order_date":"2026-11-13","expected_delivery_date":"2026-11-20","items":[{"product_id":1,"quantity_ordered":10,"unit_purchase_price":"12500.00"}]}
```

Confirm receiving medicine (general hilangkan batch fields):

```json
{"idempotency_key":"3ef69788-8b8a-4a06-aabc-e7262e73d808","received_date":"2026-11-13","notes":"Barang diterima sebagian","items":[{"purchase_order_item_id":1,"quantity":3,"batch_number":"LOT-APPROVED","expiry_date":"2027-12-31","actual_unit_price":"12750.00"}]}
```

Response receiving berisi id/number, PO id, UUID, date/actor/notes, items product/batch/quantity/actual price/subtotal/movement ID dan metadata batch. Field internal PO status/number/creator/totals, receipt actor/number/hash/reference tidak client-writable.

## Verifikasi

Dari backend:

```sh
LOG_CHANNEL=stderr vendor/bin/phpunit --do-not-cache-result
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
git diff --check

# Setelah audit/schema baseline; hanya migration additive baru:
php artisan migrate --path=database/migrations/2026_11_13_000006_create_purchasing_tables.php --force
php artisan db:seed --class=PurchasingSeeder --force

# Optional integration QA, memerlukan MySQL/create-table privileges dan proc_open:
LOG_CHANNEL=stderr php tests/Support/PurchasingMySqlProbe.php
```

Probe manual terpisah dari default PHPUnit. Membuat schema salinan di **tabel q5_ terisolasi** dalam database lokal, menolak bila prefix sudah ada, memverifikasi semua FK scratch hanya merujuk scratch, menjalankan actual services/two PHP workers, lalu menghapus **hanya tabel scratch buatan run tersebut**. Tidak menjalankan migrate:fresh/db:wipe/rollback atas tabel proyek. Jangan jalankan probe bersamaan dengan probe lain berprefix sama. DDL scratch/worker fixture membutuhkan izin database; bukan perintah untuk production.

Hasil **13 November 2026**:

- Full suite **196 tests / 1.520 assertions lulus**: 162 tests Module1–4 + **34 purchasing tests**. Coverage supplier, PO snapshots/lifecycle, partial/multiple/full, overreceive, idempotensi termasuk item order, medicine validation, split/reuse batch, general, inactive supplier/product, revoked permissions, receiver-only capability, ledger references/filter, overflow/precise cents, dan rollback status/movement kedua.
- Pint, Composer validation, syntax **151 file PHP**, pemeriksaan **53 API routes**, Markdown links/fences dan git diff --check lulus.
- MySQL8.4.13 probe: outer rollback menghapus efek receipt/movement, FK salah ditolak; dua skenario concurrency/replay lulus; aggregate physical20 tepat. **27 tabel scratch dibuat dan dibersihkan**, tidak ada scratch tersisa.
- Migration000006 applied batch6; **28 tabel / 9 migrations / 30 FK domain**. FK/index/unique diperiksa langsung. Lima tabel purchasing tetap kosong, inventory operational tetap tanpa demo.
- Fingerprint record/kolom/index/FK seluruh **23 tabel lama identik**, selain penambahan yang diotorisasi: satu migration record, dua permission dan empat grants. Jumlah role/permission/grant **9/29/73**.
- PurchasingSeeder diulang dua kali tanpa duplikasi atau reset grant. SQLite test juga memverifikasi grant yang dicabut tidak dipulihkan.
- Review independen menemukan supplier detail leak pada embedded PO resource; regresi RED→GREEN dan perbaikan scope sudah diterapkan. Tidak ada blocker lain tersisa.

## File dan perubahan

Dibuat: migration000006; Supplier/PurchaseOrder/PurchaseOrderItem/GoodsReceiving/GoodsReceivingItem models; SupplierPolicy/PurchaseOrderPolicy; SupplierService/PurchaseOrderService/GoodsReceivingService; PurchasingValidation/PurchasingMoney; tiga API controllers; lima requests; lima resources; PurchasingSeeder; PurchasingSuppliersTest; PurchasingMySqlProbe; dokumen modul dan plan.

Diubah: InventoryService (shared receipt writer), InventoryMonitorRequest (filter purchase_receipt), AppServiceProvider (policy), routes/api.php, DatabaseSeeder, README backend dan PROJECT_MASTER_CONTEXT.md. Tidak mengubah schema/migration lama, config/access/auth, frontend atau environment. Tidak melakukan Git mutation/commit/push/merge/branch switch/reset.

## Known limitations dan technical debt

- Receiving langsung final; belum ada edit, retur supplier, reverse receipt, approval PO, payments atau accounts payable. Koreksi inventory via adjustment bukan perubahan PO/receipt historis; prosedur koreksi pengadaan perlu spesifikasi terpisah.
- Tidak ada pajak/diskon/ongkir/multi-currency/invoice reconciliation. Harga actual snapshot bukan pembayaran atau costing valuation engine.
- Type/unit katalog yang berubah sebelum receiving ditolak; operator perlu menyelesaikan perbedaan dokumen/produk melalui proses yang disetujui, bukan mengedit ordered PO sembarangan.
- SQL query-builder/direct writes dapat melewati event immutability/domain constraints; jangan digunakan sebagai jalur operasional. Nullable movement link hanya valid selama transaksi konfirmasi.
- Probe concurrency mencakup dua kasus terkontrol, belum load/deadlock fuzz test semua kombinasi lintas modul. Existing ledger write memuat seluruh bucket; optimasi cache saldo menunggu pengukuran.
- Semua data demo hanya berada pada SQLite in-memory atau scratch QA; tidak ada provisioning akun/supplier/produk/PO operasional.
- Module6–8, frontend auth/integration, deployment dan AI tetap Planned. Berhenti setelah Module5.
