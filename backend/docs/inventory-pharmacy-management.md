# Module 4 — Inventory & Pharmacy Management

Module 4 menyediakan katalog produk, batch medicine, immutable stock movement ledger dan monitoring inventory. Menggunakan fondasi Module 1–3: `/api/v1`, middleware auth + active, Policies/Gates, FormRequests, Resources, controller tipis dan domain services. Kuantitas **bilangan bulat saja**, sesuai keputusan pengguna. Tidak ada konversi unit, harga jual, produk/batch/movement demonstrasi, atau implementasi Module 5–8.

Rancangan dan rencana: [design disetujui](inventory-pharmacy-management-design.md), [implementation plan](inventory-pharmacy-management-plan.md). Dokumen ini menjelaskan hasil aktual; detail Proposed pada rancangan tidak menggantikan implementasi.

## Schema dan relasi

Migration additive `2026_11_12_000005_create_inventory_tables.php`, applied pada MySQL batch **5**. Migration Module 1–3 tidak diubah.

| Tabel | Field dan constraint |
| --- | --- |
| `product_categories` | id, name, slug unique, description nullable, is_active true, timestamps. Kategori untuk klasifikasi/filter; tidak ditanam kategori fiktif. |
| `products` | id, product_category_id nullable FK RESTRICT, sku unique VARCHAR(100), name, type VARCHAR(20) (`medicine`/`general` melalui validasi), description nullable, unit VARCHAR(50), minimum_stock unsigned integer default 0, is_active true, timestamps. |
| `product_batches` | id, product_id FK RESTRICT, batch_number VARCHAR(100), expiry_date wajib, received_date nullable, timestamps. Unique `(product_id,batch_number)` serta `(product_id,id)` untuk composite FK. |
| `stock_movements` | id, product_id FK RESTRICT, product_batch_id nullable, movement_type VARCHAR(50), direction VARCHAR(3), quantity unsigned integer, reason text, reference_type/reference_id nullable, performed_by FK users RESTRICT, created_at. Tidak ada updated_at atau saldo mutable. |

Composite FK movement `(product_id,product_batch_id)` → batch `(product_id,id)` menjaga batch milik produk yang sama, termasuk saat insert melewati HTTP. FK produk terpisah tetap melindungi movement general dengan batch null. Lima FK baru semuanya RESTRICT; total FK domain saat ini **17**. Index tambahan: product type/active, expiry/product, product/expiry/id untuk FEFO, movement product/batch/id, batch/id, movement type/date, product/date dan reference type/id.

Relasi: ProductCategory hasMany Product; Product belongsTo category dan hasMany batches/movements; ProductBatch belongsTo Product dan hasMany movements; StockMovement belongsTo Product, batch dan performer (User). Relasi akun/customer/pet/service/booking existing tetap dipertahankan.

Tidak menambahkan `medicine_details`: belum ada field detail obat yang diminta. Identitas medicine ada pada products.type; metadata medicine tambahan dapat dibuat melalui migration additive saat diperlukan.

## Produk dan batch

- SKU wajib unik. Produk dapat diaktifkan/dinonaktifkan melalui PATCH. Tidak ada DELETE endpoint produk/kategori/batch.
- Type/unit tidak bisa diubah setelah ada batch atau movement, meskipun saldo sudah nol. Nama/deskripsi/kategori/minimum_stock/status tetap dapat diperbarui. Pemeriksaan histori memakai current locking reads agar tidak bergantung snapshot transaksi MySQL lama.
- Kategori bersifat klasifikasi; deaktivasi kategori tidak otomatis menonaktifkan produk atau menutup stoknya. Operasi stok memeriksa status produk.
- Medicine wajib batch untuk setiap movement. Batch dibuat hanya untuk medicine aktif; general memakai bucket tanpa batch pada scope awal. Nomor batch unik per produk, bukan secara global.
- Expiry wajib tanggal valid YYYY-MM-DD. received_date opsional, tidak di masa depan. Batch lampau boleh dicatat untuk merepresentasikan stok fisik expired; tidak boleh dipakai stock-out normal.
- Tidak ada endpoint edit/delete batch, sehingga expiry/nomor/produk historis tidak bisa diubah lewat API biasa. Koreksi metadata batch memerlukan desain audit tersendiri.

## Ledger, opening dan adjustment

Satu writer: `InventoryService::record(User $actor, array $input): StockMovement`. FormRequest dan service memakai rule yang sama. Service juga mengotorisasi pemanggilan internal; actor/direction/waktu ditentukan server.

| movement_type | direction | Aturan |
| --- | --- | --- |
| opening_stock | in | Hanya jika bucket belum memiliki movement; sekali untuk produk general atau tiap batch medicine. |
| adjustment_in | in | Alasan wajib; penambahan hasil koreksi/count. |
| adjustment_out | out | Alasan wajib; tidak boleh melebihi saldo bucket atau mengambil medicine expired. |

Quantity integer positif; minimum_stock integer nonnegatif; boolean dan pecahan ditolak. Batas teknis input dan saldo setiap bucket **2.147.483.647** unit. Saldo produk medicine adalah jumlah bucket dan bisa lebih besar dari satu bucket. Gunakan satu unit dasar yang konsisten; tidak ada konversi box/tablet/ml otomatis.

Produk nonaktif menolak operasi stok dan batch baru; histori tetap terbaca. Medicine harus menyebut batch milik produk tersebut. Opening ganda ditolak walaupun stok telah habis; stok tambahan memakai adjustment. Opening setelah adjustment pertama juga ditolak. Semua movement, termasuk opening, wajib alasan agar audit jelas.

Movement immutable pada API dan event update/delete Eloquent; koreksi jumlah menggunakan compensating adjustment. Tidak ada endpoint PATCH/DELETE movement. Model guarded penuh mencegah mass assignment biasa. Query-builder/direct SQL dapat melewati event model; tidak ada trigger/exclusion constraint yang menggantikan domain rules. Semua writer lintas modul wajib memakai service dan mengikuti lock yang sama.

`reference_type`/`reference_id` disiapkan sebagai nullable reference dokumen masa depan; API Module 4 menolak client mengisinya. `purchase_receipt`, `sale`, `medicine_dispensing` belum diaktifkan. Module 5–7 harus memperluas writer bersama dengan tipe, permission dan referensi dokumen terpercaya; tidak membuat ledger paralel atau mengubah stok langsung.

## Saldo, expiry dan FEFO foundation

Saldo = SUM(quantity in) − SUM(quantity out). Tidak ada kolom stock/balance yang dapat diedit. `InventoryBalance` menggunakan correlated SQL aggregates sehingga banyak batch/movement tidak menggandakan saldo dan tidak memerlukan query per item response.

- **physical_stock:** seluruh saldo ledger, termasuk expired dan produk nonaktif.
- **expired_stock:** saldo batch medicine dengan expiry_date sebelum tanggal UTC saat pemeriksaan.
- **usable_stock:** physical − expired untuk produk aktif; nol untuk produk nonaktif.
- **is_low_stock:** usable_stock < minimum_stock. Tepat sama threshold bukan low-stock; threshold nol tidak membuat produk bersaldo nol menjadi low-stock.

Expiry date berlaku sampai akhir hari **UTC**, sesuai rancangan yang disetujui. Batch yang expiry hari ini masih usable; tanggal UTC berikutnya expired. Timezone operasional klinik belum ditetapkan; keputusan perubahan harus konsisten lintas modul.

`GET products/{product}/batches?usable_only=1` memberi batch bersaldo positif, produk aktif, belum expired, urut expiry_date lalu id: kandidat FEFO. Ini belum dispensing, stock reservation atau pemilihan batch otomatis. List batch biasa dan expired-batches tetap memuat histori termasuk saldo nol.

## Transaksi dan concurrency

Writer mengunci row produk dahulu, kemudian batch bila ada, lalu membaca ledger bucket dengan locking read sebelum menghitung saldo dan menambah movement. Lock produk menserialkan writer patuh bahkan saat bucket belum memiliki movement. Catalog update/create batch juga mengunci produk; type/unit/activity dibaca ulang dari row terkini. Transaksi Laravel memakai maksimal tiga percobaan untuk deadlock.

Current locking reads menghindari penggunaan snapshot ledger/histori yang kedaluwarsa pada MySQL REPEATABLE READ. Ini rancangan proteksi, **bukan klaim sudah lolos stress/concurrency test MySQL dua koneksi**. Direct SQL atau writer yang melewati service dapat melanggar aturan. Pembacaan ledger saat write memuat seluruh baris bucket; pada volume besar perlu pengukuran sebelum menambah cache saldo transactional.

## Permission dan akses

Tidak membuat permission/seeder baru, tidak mereset grant. Baseline tetap **9 role, 27 permission, 69 grant**.

| Permission | Akses Module 4 |
| --- | --- |
| manage_products | Kelola kategori/produk dan baca semua katalog; tidak otomatis operasi stok atau audit ledger. |
| manage_inventory | Baca seluruh katalog/kategori, batch, balance dan movement; create batch serta opening/adjustment. Tidak otomatis edit katalog. |
| view_medication_stock | Baca katalog medicine, batch/balance medicine, low-stock/expired medicine; tidak membaca ledger internal atau mengubah stok/katalog. |

Baseline Admin dan Inventory Staff memiliki dua permission manage. Dokter/Apoteker memiliki medicine read. Kasir, Customer, Resepsionis, Groomer dan Hotel tidak otomatis memiliki akses inventory. Semua keputusan memakai permission/Policy, tanpa role-name checks pada controller. Gabungan manage_products + medicine read tetap tidak memperluas balance general atau audit ledger.

`view_products`/`view_inventory` tidak ditambahkan karena requirement saat ini dapat dilayani capability existing. Read-only seluruh katalog/inventory bagi role lain memerlukan penetapan kebutuhan/grant di modul berikutnya. Tidak memberikan seluruh permission kepada semua role. Akun nonaktif tetap ditolak provider/middleware/Gate existing.

## API endpoints

Semua path relatif `/api/v1`, auth + active; **15 endpoint baru**, total **41 endpoint API**. Detail/list memakai `data`; list memakai `links`/`meta`; create 201, show/update 200, guest 401, forbidden 403, missing ID 404, validasi/domain conflict 422. Semua list default per_page 20, max 100.

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | /product-categories | Kategori internal; manage_products/manage_inventory. |
| POST | /product-categories | Buat kategori, manage_products. |
| PATCH | /product-categories/{category} | Edit/deaktivasi kategori, manage_products. |
| GET | /products | Katalog internal sesuai scope; filter type/is_active/product_category_id. |
| POST | /products | Buat produk, manage_products. |
| GET | /products/{product} | Detail sesuai scope. |
| PATCH | /products/{product} | Update/aktivasi/deaktivasi, manage_products. |
| GET | /products/{product}/batches | Batch/balance per medicine; optional usable_only untuk FEFO. |
| POST | /products/{product}/batches | Buat batch medicine, manage_inventory. |
| GET | /product-batches/{batch} | Detail batch/balance sesuai scope. |
| GET | /inventory/balances | Total physical/usable/expired per produk. Filter product_id/type/is_active/product_category_id. |
| GET | /inventory/low-stock | Filter sama, hanya usable < minimum_stock. |
| GET | /inventory/expired-batches | Batch expiry sebelum hari UTC; filter product_id. |
| GET | /stock-movements | Histori khusus manage_inventory; filter product_id/product_batch_id/movement_type/from/to. |
| POST | /stock-movements | Opening/adjustment, khusus manage_inventory. |

Rentang tanggal histori memakai YYYY-MM-DD dan hari UTC inklusif. from/to dapat diberikan masing-masing atau bersama; to tidak boleh sebelum from. Medicine-only scope selalu diinterseksikan dengan filter; filter general tidak memperluas akses. Tidak ada API login/token/CORS/CSRF baru.

Contoh request (hanya dokumentasi, **bukan seed**):

```json
{"sku":"SKU-APPROVED","name":"Nama produk yang disetujui","type":"medicine","unit":"tablet","minimum_stock":10}
```

```json
{"batch_number":"LOT-APPROVED","expiry_date":"2027-12-31","received_date":"2026-11-12"}
```

```json
{"product_id":1,"product_batch_id":1,"movement_type":"opening_stock","quantity":50,"reason":"Hasil stock opname awal"}
```

Untuk general, product_batch_id dihilangkan/null. PATCH produk tidak menerima stock/quantity/balance/price atau field internal. POST movement menolak performed_by, direction, reference_type/id, id dan timestamps dari client.

Contoh bagian response balance:

```json
{"data":[{"id":1,"sku":"SKU-APPROVED","name":"Nama produk yang disetujui","type":"medicine","unit":"tablet","is_active":true,"minimum_stock":10,"physical_stock":50,"usable_stock":40,"expired_stock":10,"is_low_stock":false}]}
```

List sebenarnya juga menyertakan links/meta. Resource audit hanya mengeluarkan performed_by ID, bukan objek user/credential lengkap. GET batch menyertakan saldo; response create batch berisi metadata sebelum movement pertama.

## File implementasi

Dibuat:

- Migration `database/migrations/2026_11_12_000005_create_inventory_tables.php`.
- Models: `ProductCategory`, `Product`, `ProductBatch`, `StockMovement`.
- Policies: `ProductCategoryPolicy`, `ProductPolicy`, `ProductBatchPolicy`, `StockMovementPolicy`.
- Services: `InventoryCatalogService`, `InventoryService`, `InventoryQueryService`.
- Support: `InventoryAccess`, `InventoryValidation`, `InventoryBalance`.
- Controllers API: `InventoryCatalogController`, `InventoryController`, `StockMovementController`.
- Requests: `InventoryListRequest`, `InventoryMonitorRequest`, `SaveProductRequest`, `SaveProductCategoryRequest`, `StoreProductBatchRequest`, `StoreStockMovementRequest`.
- Resources: `ProductCategoryResource`, `ProductResource`, `ProductBatchResource`, `InventoryBalanceResource`, `StockMovementResource`.
- `tests/Feature/InventoryPharmacyManagementTest.php` dan tiga dokumen inventory (design/plan/dokumen ini).

Diubah untuk Module 4: `routes/api.php`, `app/Providers/AppServiceProvider.php`, `README.md` backend dan `docs/PROJECT_MASTER_CONTEXT.md`. Config/access/auth, seeders, migration lama, model/module sebelumnya dan frontend tidak diubah.

## Menjalankan dan hasil verifikasi

Dari `backend/`:

```sh
# Setelah read-only schema/status dan baseline preservation diperiksa:
php artisan migrate --path=database/migrations/2026_11_12_000005_create_inventory_tables.php --force

LOG_CHANNEL=stderr vendor/bin/phpunit --do-not-cache-result
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
git diff --check
```

Tidak diperlukan seeder inventory. DatabaseSeeder existing pada instalasi kosong hanya mengisi akses dan kategori service, tanpa produk/batch/movement.

Hasil verifikasi **12 November 2026**:

- Full suite **162 tes / 1.230 assertions lulus**: 116 tes existing + **46 tes Module 4**. Termasuk integer/boolean input, ownership batch, scope kombinasi permission, immutable API/model, expiry boundary, opening sekali, negative/overflow guard, stale product, saldo multi-batch, filters/pagination, FK dan seed idempotency.
- Pint, Composer validation dan syntax **122 file PHP** lulus; route:list menunjukkan **41 routes**. Tests memakai SQLite in-memory existing; MySQL/database.sqlite tidak dipakai untuk test destruktif.
- MySQL migration applied batch 5; **8 migration**, **23 tabel**, lima FK baru beserta index/unique/composite constraint diverifikasi melalui metadata.
- Fingerprint **record, kolom, index dan FK seluruh 19 tabel lama identik**, mengecualikan tepat satu catatan migration additive baru. Role/permission/grant tetap **9/27/69**.
- DatabaseSeeder dijalankan dua kali di MySQL, kemudian fingerprint diverifikasi lagi: tidak ada perubahan existing atau grant. Empat tabel inventory tetap **kosong**.
- Query aggregate produk, batch dan low-stock dieksekusi di MySQL. Pemeriksaan ledger tidak menemukan saldo bucket negatif atau movement tidak konsisten; inventory masih kosong, sehingga ini bukan bukti perilaku stock-write berdata pada MySQL.
- Review independen memperbaiki current-read guard pada perubahan type/unit dalam nested transaction. Tidak ada temuan material lain yang belum diselesaikan. Stress test MySQL dua koneksi belum dilakukan.

## Keterbatasan dan keputusan berikutnya

- Belum ada disposal expired/inactive-stock, unit conversion, perubahan metadata batch dengan audit, atau tipe movement masa depan yang aktif. Alur normal menolak stock-out expired, termasuk adjustment_out.
- Medicine attributes rinci, reserved stock, request idempotency dan read-only permission umum belum dibutuhkan/dipilih. SKU/batch collation mengikuti database existing; jangan mengasumsikan case-sensitive uniqueness lintas SQLite/MySQL.
- Domain rules seperti qty positif, nonnegative, medicine-only batch dan immutability tidak seluruhnya ditegakkan melalui DB CHECK/trigger; direct SQL/query-builder harus dibatasi dan tidak boleh menjadi writer operasional.
- Monitoring bukan stock reservation. Kinerja ledger besar dan concurrency nyata MySQL perlu pengujian terisolasi sebelum production; tidak mengklaim pembuktian dari SQLite.
- Module 5 dapat memakai product/batch/ledger ini untuk receiving setelah spesifikasi dan referensi dokumen disetujui. Module 6/7 harus memakai writer yang sama untuk sale/dispensing dengan transaksi konsisten.
- Module 5–8 **belum dimulai**. Frontend, autentikasi integrasi, deployment dan chatbot tidak dikerjakan. Tidak ada commit/push/merge/reset atau destructive database command.
