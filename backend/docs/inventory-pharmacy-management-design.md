# Module 4 — Inventory & Pharmacy Management: Design

Status: **Approved** oleh pengguna untuk implementasi; dokumen rancangan bukan bukti fitur sudah selesai. Sumber: spesifikasi Module 4 pengguna dan pemeriksaan repository/MySQL. Baca PROJECT_MASTER_CONTEXT.md lebih dahulu.

## Tujuan dan batas

Menyediakan katalog inventory, batch medicine, ledger stok dan monitoring, mengikuti pola Module 1–3. Module 5–8, penjualan, receiving supplier, dispensing, medical records, pembayaran, frontend, autentikasi integrasi dan deployment tidak diimplementasikan. Tidak menanam produk/batch/movement contoh, mengubah migration applied, menghapus data, atau melakukan commit/push/merge/reset.

## Baseline terverifikasi sebelum implementasi

- MySQL: 19 tabel, 7 migration applied, 12 FK domain, 9 role, 27 permission, 69 grant.
- API: 26 endpoint. Full suite: 116 tes / 755 assertions lulus.
- Belum ada artefak inventory di checkout. Metadata schema/index/FK dan fingerprint record semua tabel disimpan di luar repository untuk pemeriksaan preservation; tidak mencetak data atau credential.
- Dokumentasi Module 1/2 mencatat status historis; ketidaktersediaan endpoint/booking pada dokumen lama bukan status terkini Module 3.

## Keputusan pengguna

- Kuantitas **bilangan bulat saja**. Setiap produk memiliki satu unit dasar; tidak ada konversi kemasan/unit pada Module 4.
- Stok tidak negatif; medicine wajib batch dan expiry; general tidak wajib batch.
- Seluruh perubahan melalui ledger immutable; koreksi memakai compensating movement, bukan edit/delete movement.
- Adjustment wajib alasan dan actor; batch kedaluwarsa tidak boleh stock-out normal.

## Pendekatan yang diusulkan

**Ledger langsung, tanpa cache saldo:** saldo = total quantity in dikurangi total quantity out. Row produk dikunci dalam transaksi sebelum memvalidasi saldo dan memasukkan movement. Semua writer lintas modul wajib memakai domain service yang sama. Pendekatan ini paling sederhana untuk fondasi sekarang dan tidak memiliki saldo mutable kedua.

Alternatif cache saldo transactional dapat mempercepat pembacaan volume besar, tetapi memperkenalkan state turunan dan kebutuhan rekonsiliasi. Ditunda sampai ada kebutuhan terukur. Ledger pharmacy terpisah tidak sesuai keputusan proyek.

## Schema konseptual untuk migration additive

Empat tabel baru; field teknis final mengikuti implementasi/hasil pengujian:

- `product_categories`: id, name, slug unique, nullable description, is_active, timestamps. Alasan keberadaan: klasifikasi/filter katalog; bukan seed kategori fiktif.
- `products`: id, nullable category FK, SKU unique, name, type medicine/general, nullable description, unit, minimum_stock integer nonnegatif, is_active, timestamps. Tidak ada kolom stok mutable atau harga jual. Type/unit tidak dapat diubah setelah ada batch/movement agar histori satuan tidak berubah.
- `product_batches`: id, product FK, batch_number, expiry_date wajib, received_date nullable, timestamps; unique product/batch number. Dalam scope awal hanya medicine memakai batch. Batch tidak punya saldo manual; tidak disediakan endpoint edit/delete agar expiry/referensi historis tidak berubah diam-diam.
- `stock_movements`: id, product FK, nullable batch FK, movement_type string, direction in/out, quantity integer positif, reason, nullable reference_type/reference_id, performed_by FK users, created_at. Tanpa updated_at. FK RESTRICT mempertahankan histori. Index untuk product/batch/date dan tipe/date; type string memungkinkan penambahan tipe di modul berikutnya.

Tidak membuat `medicine_details` tanpa field bisnis yang diminta. Identitas medicine memakai products.type; detail farmasi dapat ditambahkan secara additive ketika requirement tersedia.

## Domain services dan aturan stok

- Catalog service mengelola kategori/produk; policy dan service memeriksa permission. Aktivasi/deaktivasi melalui PATCH, tanpa DELETE endpoints. Produk berhistori dilindungi FK.
- Inventory service menangani create batch, opening_stock, adjustment_in, adjustment_out. Validasi service dipakai ulang FormRequest agar pemanggilan internal tetap aman.
- Medicine wajib batch milik produk yang sama; general memakai batch null pada scope awal. Tidak menciptakan model batch general tanpa kebutuhan.
- Opening stock diusulkan hanya sekali pada bucket: produk general atau batch medicine, dan sebelum movement lain pada bucket. Stok berikutnya memakai adjustment dengan alasan; setiap batch baru bisa punya opening sendiri. Periksa di bawah lock produk untuk menolak race/duplikasi.
- Quantity integer positif; minimum_stock integer nonnegatif. Batas input/total teknis ditetapkan eksplisit untuk menghindari overflow, bukan aturan unit bisnis baru.
- Actor dan created_at berasal server, direction berasal tipe movement. API awal hanya menerima tiga tipe; reference dokumen tidak boleh dipalsukan payload biasa. Tipe purchase_receipt/sale/medicine_dispensing belum dijalankan.
- Produk nonaktif tidak dapat menerima batch/operasi stok normal baru. Histori dan monitoring tetap dapat dibaca. Tidak ada jalur disposal expired pada modul ini karena aturan meminta stock-out expired ditolak; desain disposal dapat dibahas kemudian.
- Adjustment out melebihi saldo ditolak atomik. Medicine stock-out expired ditolak. Tidak mengarang expiry atau memilih batch diam-diam.
- Movement tidak bisa diedit/delete melalui API; event model juga menolak update/delete. Direct SQL/query-builder tetap di luar jaminan application guard; dokumentasikan batasnya.

## Monitoring, expiry dan FEFO

List terpaginasikan default 20/max 100. Sediakan balance per produk/batch, low-stock, expired batches dan movement history dengan filter product/type/date. Public/customer tidak dapat membaca inventory.

Physical = semua saldo ledger. Expired = saldo medicine dengan expiry_date sebelum tanggal UTC saat pemeriksaan. Usable = physical minus expired untuk produk aktif; produk nonaktif tidak usable. Expiry date hari ini diusulkan valid sampai akhir hari UTC; timezone operasional klinik belum ditetapkan. Low stock memakai usable di bawah minimum_stock, bukan stok expired.

FEFO foundation berupa daftar batch medicine belum expired dengan saldo positif, diurut expiry_date lalu id. Tidak melakukan dispensing/reservasi/konversi unit otomatis.

## Akses menggunakan permission existing

Tidak diperlukan seeder permission baru atau reset grant:

- `manage_products`: kelola/baca katalog kategori dan semua produk; tidak otomatis adjustment atau membaca ledger internal.
- `manage_inventory`: baca semua balance/batch/movement, create batch dan operasi stok; tidak otomatis mengubah katalog.
- `view_medication_stock`: baca katalog medicine serta balance/batch medicine saja, termasuk stok expired yang dibedakan. Tidak membaca ledger/audit actor internal dan tidak menulis stok.
- Baseline Admin/Inventory Staff memiliki permission kelola; Dokter/Apoteker hanya medicine read. Kasir dan Customer tidak memperoleh akses inventory otomatis. Tidak ada pemeriksaan nama role hardcoded di controller atau perubahan grant existing.

## API yang diusulkan

Semua `/api/v1`, middleware auth + active, Resources/Policies/FormRequests/domain services:

- GET/POST `product-categories`; PATCH `product-categories/{category}`.
- GET/POST `products`; GET/PATCH `products/{product}` (is_active untuk aktivasi/deaktivasi).
- GET/POST `products/{product}/batches`; GET `product-batches/{batch}`.
- GET `inventory/balances`; GET `inventory/low-stock`; GET `inventory/expired-batches`.
- GET `stock-movements`; POST `stock-movements` dengan movement_type tiga tipe awal.

Tidak ada endpoint edit/delete movement, tidak ada saldo client-writable, tidak ada endpoint duplikat untuk farmasi. Response error mengikuti 401/403/404/422 dan envelope/pagination existing. Referensi user tidak mengeluarkan credential atau model User lengkap.

## Verifikasi dan preservation

Tulis dan jalankan failing tests sebelum kode terkait: catalog/unique/activation/permission; batch ownership/type/expiry; opening/adjustment/immutability/quantity/negative stock/audit; physical/usable/expired/low-stock/filters/pagination; service authorization; constraints; seed idempotency; seluruh regresi Module 1–3.

Gunakan SQLite in-memory existing, bukan refresh/wipe MySQL. QA mencakup full suite, Pint, Composer, PHP syntax, routes, MySQL migrate:status, additive migration, metadata FK/index, fingerprint preservation sebelum/sesudah, inventory kosong dan ledger consistency. Tidak mengklaim MySQL concurrency terbukti dari SQLite; row-lock design memerlukan semua writer patuh dan stress test terpisah bila belum dijalankan.

## Keputusan disetujui dan batas terbuka

Aturan opening sekali sebelum movement lain; cutoff expiry akhir hari UTC; general batch null pada tahap awal; serta pembagian permission di atas adalah usulan konservatif. Pengguna telah menyetujui rancangan ini sebelum implementasi. Disposal stok expired, unit conversion, medicine attributes rinci dan penambahan read permissions lintas role tetap keputusan masa depan, bukan scope otomatis.
