# Filosovet — Project Master Context

**Referensi utama untuk sesi pengembangan Filosovet berikutnya.** Baca file ini terlebih dahulu, kemudian dokumentasi modul yang ditugaskan dan source code terkait. Dokumen ini memberi konteks, bukan izin untuk memulai fitur, migration, deployment, atau modul berikutnya. Tunggu instruksi implementasi khusus dari pengguna.

Snapshot terakhir diverifikasi: **12 November 2026, Asia/Jakarta**. Branch saat pemeriksaan: `tes-laravel`. Module 1–4 sudah diimplementasikan dan diverifikasi; seluruh perubahan masih belum di-commit. Status branch, file, database dan hasil tes wajib diperiksa ulang pada sesi baru.

**Status terkini:** Module 4 Inventory & Pharmacy **Completed / Implemented** setelah rancangan disetujui, implementasi, migration additive dan QA. Module 5–8 tetap **Planned**; pembaruan master plan sebelumnya dipertahankan sebagai konteks masa depan dan bukan izin implementasi. Tidak ada modul yang sedang otomatis dilanjutkan.

### Rekonsiliasi awal Module 4 (baseline historis)

Sebelum implementasi, source/dokumentasi Module 1–3, routes dan MySQL diperiksa ulang: **19 tabel, 7 migration applied, 12 FK domain, 9 role, 27 permission, 69 grant, 26 endpoint API**. Full suite kembali lulus **116 tes / 755 assertions** pada tahap ini. Fingerprint record dan metadata schema/index/FK disimpan di luar repository untuk verifikasi preservation berikutnya. Tidak ada mutation database pada rekonsiliasi ini.

**Confirmed Decisions tambahan:** kuantitas inventory memakai **bilangan bulat saja**, sesuai jawaban pengguna; tanpa konversi unit pada scope Module 4. Rancangan awal tercatat di [design Module 4](inventory-pharmacy-management-design.md), telah disetujui pengguna sebelum implementasi. Hasil akhir terdapat di [dokumentasi Module 4](inventory-pharmacy-management.md); angka baseline di atas bukan jumlah terkini setelah migration inventory.

## Klasifikasi status dan sumber

| Label | Makna |
| --- | --- |
| **Confirmed Decisions** | Keputusan bisnis/arsitektur yang sudah ditetapkan pengguna atau kontrak implementasi yang sudah berlaku; pertahankan kecuali perubahan diotorisasi atau konflik teknis dibahas. |
| **Implemented** | Ada source code dan, bila relevan, schema/tes yang mendukung klaim. Tidak berarti sudah terintegrasi atau dideploy ke production. |
| **Pending** | Belum tersedia atau belum selesai; jangan digunakan seolah sudah ada. |
| **Planned** | Masuk roadmap, belum menjadi izin implementasi. Detail teknis yang belum ditentukan bukan keputusan final. |
| **Proposed** | Usulan desain konseptual untuk ditinjau saat spesifikasi modul dibuat; belum menjadi schema atau lifecycle final. |
| **Open Decisions** | Membutuhkan keputusan lanjutan; jangan mengubah asumsi menjadi persyaratan tetap. |

Sumber utama adalah Master Context dan pembaruan master plan Module 5–8 yang diberikan pengguna. Dokumentasi ini juga mencocokkan [README backend](../README.md), [Module 1](access-management.md), [rencana Module 1](access-management-plan.md), [Module 2](customer-pet-management.md), [rencana Module 2](customer-pet-management-plan.md), [Module 3](service-booking-management.md), [Module 4](inventory-pharmacy-management.md), source code, migration, hasil tes aktual dan metadata MySQL secara read-only. Nama file di bawah relatif terhadap root repository kecuali disebut relatif terhadap `backend/`.

## 1. Project Overview

Filosovet adalah sistem manajemen klinik hewan dan layanan pelanggan, dengan petshop, pelayanan dokter, grooming, dan pet hotel. Sasaran akhirnya adalah satu alur bisnis terintegrasi: akun dan pasien → layanan/booking → operasional → pencatatan klinis/resep → pergerakan stok → transaksi/pembayaran → laporan.

**Confirmed Decisions:** proyek terdiri dari frontend HTML/CSS/JavaScript yang sudah ada, backend REST API Laravel di `backend/`, dan database relasional MySQL. Customer dan staf memakai fondasi akun yang sama. Jangan membangun CRUD terpisah yang menduplikasi customer, pet, produk, booking atau identitas akun.

**Implemented:** backend mencakup Module 1–4, termasuk katalog layanan/booking, katalog inventory, batch medicine, ledger stok dan monitoring. Frontend memiliki simulasi operasional yang jauh lebih luas, tetapi fitur frontend tersebut bukan bukti implementasi backend.

**Completed / Implemented:** Module 4 telah diverifikasi; tidak mencakup dispensing/resep atau receiving supplier.

**Planned:** purchasing, transaksi/pembayaran, rekam medis/resep, operasional hotel, laporan terintegrasi, integrasi frontend/deployment, dan AI customer service.

## 2. Technology Stack & Architecture

| Area | Kondisi / keputusan |
| --- | --- |
| Frontend | Plain HTML, CSS, vanilla JavaScript; pertahankan struktur dan framework yang ada. Penyimpanan/demo operasional masih memakai localStorage. |
| Hosting frontend | Vercel menurut konteks pengguna; deployment/domain aktif tidak diaudit dalam pemeriksaan ini. |
| Backend | Laravel 13; runtime terverifikasi **13.42.0**. `composer.json` mensyaratkan `laravel/framework: ^13.8`. |
| PHP | Target proyek PHP 8.4; CLI terverifikasi **8.4.21**. Minimum manifest Composer adalah `^8.3`; ini tidak mengubah target lingkungan yang ditetapkan pengguna. |
| Database | MySQL 8.4, database `filosovet`; server lokal terverifikasi **8.4.13**. Koneksi sudah dikonfigurasi; jangan mengganti konfigurasi tanpa kebutuhan. |
| Arsitektur backend | Routes → middleware → Form Requests → controller tipis → services → Eloquent/database; Policies/Gates untuk akses dan Resources untuk response. |
| Pengujian | PHPUnit 12 melalui dependency Composer; feature tests memakai kernel Laravel, Eloquent/services sebenarnya dan SQLite in-memory terisolasi. |
| Tooling | Composer, Laravel Artisan, Laravel Pint. Scaffold backend juga mempunyai Vite/Tailwind dan package.json; keberadaannya bukan migrasi frontend utama ke framework baru. |
| Lingkungan kerja | macOS, VS Code, terminal, Git; branch snapshot `tes-laravel`. |
| Backend hosting | **Open Decisions:** provider, domain, topologi dan proses deployment belum dipilih. Jangan berasumsi backend ditempatkan di Vercel. |

**Confirmed Decisions:** frontend dan backend akan berkomunikasi melalui REST API. Jangan memilih strategi autentikasi production, CORS, CSRF, cookie atau token sebelum strategi deployment dan kebutuhan integrasi diputuskan. Laravel active-account provider yang sudah ada tetap dipertahankan.

## 3. Repository Structure

```text
Filosovet/
├── README.md                         # Dokumentasi demo frontend; beberapa klaim backend sudah tertinggal
├── index.html
├── assets/ components/ css/ js/ pages/ # Frontend existing, termasuk workspace admin simulasi
├── tests/                            # Checks frontend; terpisah dari PHPUnit backend
├── docs/                             # Dokumentasi root existing
└── backend/
    ├── README.md                     # Tautan modul + dokumentasi scaffold Laravel
    ├── app/
    │   ├── Auth/ActiveUserProvider.php
    │   ├── Http/
    │   │   ├── Controllers/Api/       # Customer/Pet, service/booking dan inventory controllers
    │   │   ├── Middleware/           # EnsureAccountIsActive
    │   │   ├── Requests/             # Domain FormRequests dan pagination
    │   │   └── Resources/            # Customer/Pet, service/booking dan inventory Resources
    │   ├── Models/                   # Akun/akses, customer/pet, service/booking, product/batch/movement
    │   ├── Enums/BookingStatus.php
    │   ├── Policies/                 # Akun/customer/pet, service/booking dan inventory policies
    │   ├── Providers/AppServiceProvider.php
    │   ├── Services/                 # UserAccountService, AccessManagementService,
    │   │                             # Customer/Pet, service/booking dan Inventory* services
    │   └── Support/                  # Pet/booking validation, BookingAccess/CodeGenerator, Inventory*
    ├── bootstrap/app.php             # Registrasi routes, middleware dan exception JSON API
    ├── config/                       # access.php, auth.php dan konfigurasi Laravel existing
    ├── database/
    │   ├── migrations/               # 3 migration bawaan + 5 migration tambahan
    │   ├── seeders/                  # DatabaseSeeder → AccessControlSeeder + ServiceBookingSeeder
    │   ├── factories/UserFactory.php # Data tes, bukan akun production default
    │   └── database.sqlite           # File existing; jangan dihapus/dipakai sebagai database tes destruktif
    ├── routes/                       # api.php, web.php, console.php
    ├── tests/
    │   ├── Feature/AccessManagementTest.php
    │   ├── Feature/CustomerPetManagementTest.php
    │   ├── Feature/ServiceBookingManagementTest.php
    │   ├── Feature/InventoryPharmacyManagementTest.php
    │   ├── Feature/ExampleTest.php
    │   ├── Unit/ExampleTest.php
    │   └── Support/InMemoryDatabaseTestCase.php
    ├── docs/
    │   ├── PROJECT_MASTER_CONTEXT.md # File ini; titik masuk sesi baru
    │   ├── access-management.md
    │   ├── access-management-plan.md
    │   ├── customer-pet-management.md
    │   ├── customer-pet-management-plan.md
    │   ├── service-booking-management.md
    │   ├── service-booking-management-plan.md
    │   ├── inventory-pharmacy-management.md
    │   ├── inventory-pharmacy-management-design.md
    │   └── inventory-pharmacy-management-plan.md
    ├── composer.json / composer.lock
    ├── package.json / vite.config.js
    └── phpunit.xml
```

**Perbedaan dokumentasi yang sudah diketahui:** README root menyatakan tidak ada backend/database dan memuat rancangan database lama dengan `users.role_id`. Source serta MySQL kini menunjukkan backend Module 1–4 dan relasi multi-role melalui `user_roles`. Jangan menyalin rancangan lama sebagai schema aktual. Penyebutan delapan role di demo frontend merujuk peran workspace staf; backend mempunyai sembilan role termasuk Customer. Dokumen Module 1 merekam tahap historis sebelum endpoint Module 2 ditambahkan; kalimat “belum ada endpoint” pada dokumen tersebut bukan status backend keseluruhan saat ini. Dokumen lama tidak diubah oleh pembuatan master context ini.

## 4. Confirmed Business Decisions

### Akun, customer dan pasien

- Satu tabel `users` untuk seluruh jenis akun; satu user dapat mempunyai lebih dari satu role.
- Customer wajib terhubung ke akun login melalui `customers.user_id`. Staff profile juga terhubung ke users.
- Satu user maksimal mempunyai satu customer profile dan satu staff profile; keduanya boleh ada pada akun yang sama.
- Customer boleh memiliki banyak pet; setiap pet mempunyai tepat satu customer.
- Kepemilikan wajib ditegakkan backend, bukan hanya frontend. Akun nonaktif tidak boleh memakai fungsi terlindungi.
- Pet mendukung arsip/soft delete. Microchip boleh null, tetapi harus unik bila diberikan.

### Layanan dan booking

- Tiga kategori bisnis utama: **Klinik & Dokter**, **Grooming**, dan **Pet Hotel**.
- Gunakan satu katalog layanan dan satu sistem booking bersama, termasuk untuk Pet Hotel.
- Satu booking mewakili tepat satu service, satu customer, dan satu pet. Customer dapat mempunyai banyak booking.
- Status booking harus mengikuti lifecycle terkontrol. Customer tidak boleh mengubah status yang dikendalikan staf.
- Rooms, capacity, stays, check-in/check-out hotel dan catatan perawatan adalah tanggung jawab Module 8, bukan perluasan awal booking Module 3.

### Klinis, farmasi, inventory dan purchasing

- Dokter mengelola pemeriksaan/rekam medis dan membuat resep. Informasi klinis historis harus dipertahankan.
- Apoteker menyiapkan dan menyerahkan obat; role ini berbeda dari Inventory Staff.
- Obat adalah produk dengan detail obat, bukan sistem stok terpisah. Resep harus merujuk produk/obat yang benar.
- Perubahan stok harus mempunyai riwayat pergerakan: pembelian/penerimaan, penjualan, dispensing/pemakaian, dan penyesuaian.
- Batch dan tanggal kedaluwarsa digunakan bila relevan. Jangan hanya menyimpan angka stok yang dapat diedit tanpa jejak.
- Supplier, purchase order dan item penerimaan harus terhubung ke inventory. Receiving menciptakan stock movements; jangan mengubah stok di luar alur resmi.

### Inventory — Implemented Module 4

- Kuantitas stok integer positif; minimum_stock integer nonnegatif. Satu unit dasar per produk, tanpa konversi unit atau harga jual pada Module 4.
- Satu ledger untuk produk general dan medicine; tidak ada pharmacy ledger/kolom stock mutable terpisah. General memakai bucket tanpa batch; medicine wajib batch milik produk dengan expiry_date valid.
- Opening hanya sekali dan sebelum movement lain pada bucket produk general atau tiap batch medicine. Adjustment in/out wajib alasan; actor/direction/waktu berasal server; saldo bucket tidak boleh negatif. Batas teknis input/saldo bucket 2.147.483.647 unit.
- Produk nonaktif menolak batch/operasi stok normal baru. Type/unit membeku setelah batch/movement ada. Histori dilindungi FK RESTRICT; tidak ada DELETE API inventory.
- Ledger immutable melalui API/event Eloquent; koreksi melalui compensating movement. Direct SQL/query-builder dapat melewati domain guards dan tidak boleh menjadi writer operasional.
- Medicine expiry berlaku sampai akhir tanggal UTC; expired stock-out normal ditolak. Physical, usable dan expired dibedakan; low-stock berdasarkan usable < minimum_stock. Batch FEFO bersaldo positif diurut expiry/id, tanpa dispensing otomatis.
- Rincian kontrak writer/locking, monitoring dan akses ada di dokumentasi Module 4; receiving, sale dan dispensing masih Planned.

### Transaksi dan pembayaran

- Satu transaksi dapat berisi jasa dan produk; jenis item harus dapat dibedakan.
- **DP dibayar untuk mengamankan slot booking**, kemudian sisa tagihan dilunasi setelah layanan selesai. Urutan ini merupakan kebutuhan bisnis, bukan fitur yang sudah tersedia.
- Pembayaran booking masuk Module 6. Jangan menanamkan perhitungan DP atau pembayaran ke booking CRUD Module 3.
- Riwayat pembayaran harus dipertahankan. Besaran DP, tenggat, refund dan detail pengamanan slot masih perlu ditetapkan.

## 5. User Roles & Permission Architecture

### Implemented: relasi dan mekanisme

`users ↔ user_roles ↔ roles ↔ role_permissions ↔ permissions` merupakan fondasi RBAC native Eloquent. Tidak ada tabel login per role atau dependency permission library tambahan. `User::hasRole()` tersedia untuk pemeriksaan identitas role; otorisasi fitur menggunakan `hasPermission()`, Gate, dan Policy.

`User::hasPermission()` memeriksa grant serta status aktif dari database saat dipanggil, bukan cache relasi yang mungkin sudah kedaluwarsa. `AppServiceProvider` memasang Gate untuk menolak akun nonaktif dan memeriksa permission dinamis. Pemberian izin melalui Gate permission tidak melewati policy apabila ada argumen resource. Bahkan Admin mengikuti permission database; tidak ada bypass universal berdasarkan nama role.

Provider `active-eloquent` memfilter lookup credential, ID sesi, dan remember token. Middleware `active` memeriksa kembali status akun yang sudah berada di guard. CustomerPolicy, StaffProfilePolicy dan PetPolicy tetap menjadi pusat aturan resource.

### Role dan mapping baseline

MySQL aktual terverifikasi: **9 role, 27 permission, 69 role-permission grants**. Baseline legacy `backend/config/access.php` berisi 26 permission/68 grant; Module 3 menambahkan `manage_services` dan satu grant Admin lewat `ServiceBookingSeeder`, tanpa menimpa grant lama. Ini adalah baseline/snapshot, bukan alasan menimpa perubahan akses Admin di masa depan.

Setiap role staf selain Admin menerima tambahan `view_own_profile` dan `update_own_profile` pada mapping di bawah. Hak tersebut tidak memberi izin mengubah data kepegawaian; StaffProfilePolicy tetap mensyaratkan `manage_users` untuk update.

| Role | Slug aktual | Permission operasional awal | Total grant |
| --- | --- | --- | --- |
| Admin | `admin` | Semua 26 permission legacy + `manage_services` | 27 |
| Resepsionis | `resepsionis` | `manage_customers`, `manage_pets`, `view_bookings`, `manage_bookings` | 6 |
| Dokter | `dokter` | `view_bookings`, `manage_medical_records`, `manage_prescriptions`, `view_medication_stock` | 6 |
| Apoteker | `pharmacist` | `manage_prescriptions`, `dispense_prescriptions`, `view_medication_stock` | 5 |
| Inventory Staff | `inventory` | `manage_inventory`, `manage_products`, `manage_suppliers`, `view_medication_stock` | 6 |
| Groomer | `groomer` | `view_bookings`, `manage_grooming` | 4 |
| Pet Hotel Staff | `hotel` | `view_bookings`, `manage_hotel` | 4 |
| Kasir | `kasir` | `view_transactions`, `process_payments` | 4 |
| Customer | `customer` | Tujuh permission own-data di bawah | 7 |

Katalog 26 permission legacy, dikelompokkan tanpa mengubah slug (ditambah `manage_services` oleh Module 3):

- Administrasi: `manage_users`, `manage_roles`, `manage_permissions`.
- Customer/pet: `manage_customers`, `manage_pets`.
- Booking: `view_bookings`, `manage_bookings`.
- Klinis/farmasi: `manage_medical_records`, `manage_prescriptions`, `dispense_prescriptions`, `view_medication_stock`.
- Inventory: `manage_inventory`, `manage_products`, `manage_suppliers`.
- Operasional: `manage_hotel`, `manage_grooming`.
- Keuangan/laporan: `view_transactions`, `process_payments`, `view_reports`.
- Own-data Customer: `view_own_profile`, `update_own_profile`, `manage_own_pets`, `view_own_bookings`, `manage_own_bookings`, `view_own_medical_records`, `view_own_transactions`.

`manage_services` khusus pengelolaan kategori/service dan visibilitas katalog nonaktif. Hanya Admin mendapat grant awal; manage_bookings/manage_products tidak otomatis mencakupnya. Seeder Module 3 hanya memberi grant saat permission pertama dibuat, sehingga rerun mempertahankan pencabutan Admin.

Module 4 tidak menambah permission/grant. `manage_products` mengelola katalog; `manage_inventory` mengelola batch/ledger serta membaca seluruh saldo; `view_medication_stock` membaca katalog/batch/saldo medicine saja tanpa ledger internal. Admin/Inventory Staff baseline memiliki dua capability manage; Dokter/Apoteker hanya medicine read. Gabungan catalog + medicine read tidak memperluas general-stock/audit access. `view_products`/`view_inventory` belum diperlukan dan tidak ditambahkan.

Permission yang sudah di-seed untuk modul masa depan tidak berarti fungsi tersebut sudah diimplementasikan. Dokter dan Apoteker sama-sama memiliki `manage_prescriptions`; modul klinis berikutnya tetap harus membedakan tindakan meresepkan, klarifikasi, penyiapan dan penyerahan lewat policy/business rules.

### Service dan seeder yang harus dipertahankan

- `AccessManagementService::syncUserRoles()` memerlukan `manage_roles`; `syncRolePermissions()` memerlukan `manage_permissions`; `setUserActive()` memerlukan `manage_users`.
- Sync memvalidasi list ID integer, distinct dan existing. Operasi relasi memakai transaksi/row lock; array kosong berarti pencabutan seluruh relasi target secara eksplisit.
- `AccessControlSeeder` menggunakan `firstOrCreate`. Mapping awal hanya diberikan ketika role baru dibuat. Rerun tidak mengembalikan grant yang dicabut dan tidak menimpa grant tambahan atau nama/deskripsi yang diubah Admin.
- Permission baru tidak otomatis diberikan kepada role existing, termasuk Admin. Jika modul baru membutuhkan permission tambahan, rancang strategi additive dan mapping yang disetujui tanpa mereset grant.
- `DatabaseSeeder` memanggil seeder akses lalu seeder Module 3, tanpa membuat akun/service/booking atau inventory demonstrasi. Factory akun hanya untuk tes; jangan memakainya sebagai provisioning production.

## 6. Database Design Principles

**Confirmed Decisions:** gunakan schema relasional, foreign key dan unique/index yang sesuai; jangan menduplikasi entitas lintas modul. Gunakan additive migrations, transaksi untuk operasi multi-langkah, serta penyimpanan historis/audit pada alur klinis, inventory dan pembayaran. Penambahan tabel harus punya alasan bisnis yang nyata.

### Schema aktual — Implemented

MySQL saat snapshot terkini mempunyai **23 tabel**: lima belas tabel domain di bawah, ditambah `migrations`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`.

| Tabel domain | Kolom / constraint penting |
| --- | --- |
| `users` | `id`, `name`, `email` unique, `email_verified_at`, kolom hash autentikasi dan remember bawaan, timestamps, `is_active` boolean default true. |
| `roles` | `id`, `name`, `slug` unique, nullable description, timestamps. |
| `permissions` | `id`, `name`, `slug` unique, nullable description, timestamps. |
| `user_roles` | FK user/role, composite unique `(user_id, role_id)`, hanya `created_at`; kedua FK CASCADE delete. |
| `role_permissions` | FK role/permission, composite unique `(role_id, permission_id)`, hanya `created_at`; kedua FK CASCADE delete. |
| `customers` | `id`, unique FK `user_id`, nullable phone/address, timestamps; FK user RESTRICT delete. |
| `staff_profiles` | `id`, unique FK `user_id`, unique employee_number, nullable phone/address/hire_date, timestamps; FK user RESTRICT delete. |
| `pets` | `id`, FK customer_id RESTRICT delete, name/species, nullable breed/gender/date_of_birth/weight/color/microchip_number/notes, timestamps, deleted_at. Unique microchip; index `(customer_id, name)`. |
| `service_categories` | id, name, slug unique, description nullable, is_active default true, timestamps. |
| `services` | id, service_category_id FK RESTRICT, name/slug unique, nullable description/duration_minutes, price DECIMAL(12,2), is_active, timestamps. |
| `bookings` | id, booking_code unique, customer/pet/service FK RESTRICT, scheduled_at/ends_at UTC, status, price_snapshot DECIMAL(12,2), customer_notes/staff_notes, created_by nullable FK users RESTRICT, timestamps. |
| `product_categories` | id, name, slug unique, description nullable, is_active, timestamps. |
| `products` | id, category FK nullable RESTRICT, sku unique, name/type/description/unit, minimum_stock unsigned integer, is_active, timestamps. Tanpa kolom stock/harga jual. |
| `product_batches` | id, product FK RESTRICT, batch_number, expiry_date, received_date nullable, timestamps; unique product/batch_number dan product/id; FEFO indexes. |
| `stock_movements` | id, product FK, nullable product_batch_id, movement_type/direction/quantity/reason, reference_type/id nullable, performed_by FK users, created_at saja. Composite FK product/batch ke product_batches; seluruh FK RESTRICT. |

Terdapat **17 FK domain** yang telah diperiksa pada metadata MySQL. Bawaan Laravel `sessions.user_id` mempunyai index, tetapi migration existing tidak mendeklarasikan FK; jangan mengasumsikan semua kolom bernama user_id sudah ber-FK.

Relasi model: User belongsToMany Role; Role belongsToMany User dan Permission; Permission belongsToMany Role; User hasOne Customer dan StaffProfile; keduanya belongsTo User; Customer hasMany Pet; Pet belongsTo Customer. Pivot timestamp memakai `withTimestamps('created_at', false)` sesuai Laravel yang terpasang. ProductCategory hasMany Product; Product belongsTo category dan hasMany batches/movements; ProductBatch belongsTo Product dan hasMany movements; StockMovement belongsTo Product, batch dan performer User.

Penghapusan user yang masih memiliki profil dibatasi; gunakan deaktivasi akun untuk mempertahankan profil. Customer yang memiliki pet, termasuk pet arsip, tidak dapat dihapus fisik begitu saja. Pemindahan pemilik dan pemulihan pet arsip belum mempunyai endpoint.

### Migration aktual

| Migration | Batch di MySQL | Status |
| --- | --- | --- |
| `0001_01_01_000000_create_users_table` | 1 | Applied |
| `0001_01_01_000001_create_cache_table` | 1 | Applied |
| `0001_01_01_000002_create_jobs_table` | 1 | Applied |
| `2026_11_12_000001_add_is_active_to_users_table` | 2 | Applied |
| `2026_11_12_000002_create_access_management_tables` | 2 | Applied |
| `2026_11_12_000003_create_pets_table` | 3 | Applied |
| `2026_11_12_000004_create_service_booking_tables` | 4 | Applied |
| `2026_11_12_000005_create_inventory_tables` | 5 | Applied |

`is_active` ditambahkan lewat migration baru, bukan dengan mengedit migration users yang sudah dijalankan. Table customers berasal dari Module 1; Module 2 hanya menambahkan pets. Module 3 menambahkan service_categories, services dan bookings; satu booking tetap satu service. Module 4 menambahkan empat tabel inventory tanpa mengubah schema lama. Baca schema aktual sebelum menyusun migration berikutnya.

### Kontrak data pet yang sudah berlaku

`weight` tersimpan sebagai DECIMAL(8,3), satuan kg; validasi service/request mensyaratkan >0 hingga 10000 kg dengan maksimal tiga desimal. Species berupa teks hingga 100 karakter untuk mendukung hewan eksotis/nama ilmiah. Gender nullable: `male`, `female`, `intersex`, `unknown`. DOB valid YYYY-MM-DD dan tidak di masa depan. Microchip kosong/whitespace menjadi null; string `0` dipertahankan; uniqueness juga mencakup record arsip. Ini adalah validasi aplikasi existing, bukan klaim bahwa seluruh rentang/enum ditegakkan oleh CHECK constraint database.

### Schema Planned

Tabel Module 5–8 pada roadmap masih desain konseptual, bukan schema final. Module 4 kini sudah mempunyai product_categories, products, product_batches dan stock_movements. `medicine_details` yang dahulu direncanakan ditunda karena belum ada field bisnis yang diminta; medicine dikenali dari products.type. Detail schema/lifecycle/referensi dokumen masa depan diputuskan saat tugas masing-masing, dengan memakai inventory/ledger existing.

## 7. API Architecture & Conventions

**Implemented:** `backend/routes/api.php` didaftarkan melalui `bootstrap/app.php`, prefix `/api/v1`. Semua endpoint customer/pet/booking/inventory dan write katalog memakai middleware `auth` dengan default guard existing serta `active`. Empat endpoint GET katalog kategori/service bersifat public dengan middleware `active`. Provider users dikonfigurasi `active-eloquent`. Default konfigurasi guard adalah `web`/session dan dapat dipengaruhi konfigurasi runtime; belum ada mekanisme login API yang disepakati untuk frontend terpisah.

| Method | Endpoint | Pembatasan utama |
| --- | --- | --- |
| GET | `/api/v1/me/customer` | Profil customer akun sendiri; policy view. |
| PATCH | `/api/v1/me/customer` | Update profil sendiri; policy update dan pembatasan field. |
| GET | `/api/v1/customers` | Staff capability `manage_customers`. |
| POST | `/api/v1/customers` | `manage_customers`; membuat akun + profil + role customer secara atomik. |
| GET | `/api/v1/customers/{customer}` | Pemilik dengan own-profile permission atau `manage_customers`. |
| PATCH | `/api/v1/customers/{customer}` | Pemilik dengan own-profile permission atau `manage_customers`; email login orang lain dibatasi lagi. |
| GET | `/api/v1/customers/{customer}/pets` | `manage_pets`, atau pemilik dengan `manage_own_pets`. |
| POST | `/api/v1/customers/{customer}/pets` | Policy create memeriksa parent customer; owner diambil dari relasi yang diotorisasi. |
| GET | `/api/v1/pets/{pet}` | Policy pet, termasuk kepemilikan. |
| PATCH | `/api/v1/pets/{pet}` | Policy pet; tidak boleh mengganti owner. |
| DELETE | `/api/v1/pets/{pet}` | Soft delete/arsip melalui policy, bukan hapus fisik. |

Module 3 menambahkan 15 route (total historis setelah Module 3 **26 route API**): GET/POST `/service-categories`, GET/PATCH `/service-categories/{category}`, GET/POST `/services`, GET/PATCH `/services/{service}`, GET `/me/bookings`, GET/POST `/bookings`, GET/PATCH `/bookings/{booking}`, PATCH `/bookings/{booking}/status` dan PATCH `/bookings/{booking}/staff-notes`. Empat GET katalog hanya menampilkan data aktif bagi public/customer; `manage_services` dapat melihat/filter data nonaktif. Detail payload/filter: [Module 3](service-booking-management.md).

Module 4 menambahkan **15 route**, sehingga total terkini **41 route API**: GET/POST `/product-categories`, PATCH `/product-categories/{category}`, GET/POST `/products`, GET/PATCH `/products/{product}`, GET/POST `/products/{product}/batches`, GET `/product-batches/{batch}`, GET `/inventory/balances`, `/inventory/low-stock`, `/inventory/expired-batches`, serta GET/POST `/stock-movements`. Seluruhnya internal auth + active, dengan scope medicine-only dan manage permissions yang terpisah. Tidak ada PATCH/DELETE ledger atau stock field writable. Detail filter/payload: [Module 4](inventory-pharmacy-management.md).

Konvensi existing yang perlu dipertahankan:

- Controller tipis, business rules di services, validasi/otorisasi awal di FormRequest. Service juga mengotorisasi dan memvalidasi agar pemanggilan internal aman.
- Resource memakai field whitelist. Customer response tidak menyertakan objek user lengkap, credential, grants, atau koleksi pet otomatis.
- Objek dalam `data`; koleksi paginated memakai `data`, `links`, `meta`. Default `per_page` 20, maksimum 100; `page` integer positif.
- Show/update 200; create 201; archive 204; guest 401 JSON; akses ditolak 403; resource tidak ditemukan/diarsipkan 404; validasi 422.
- Akun tanpa profil customer mendapat 404 pada `/me/customer`. Inactive user yang sudah ada pada guard ditolak 403; lookup autentikasi akun nonaktif dapat menghasilkan guest/401.
- DOB dikirim YYYY-MM-DD, timestamps ISO 8601, weight string desimal seperti `"4.125"`.
- PATCH bersifat parsial. Field wajib tidak boleh kosong/null ketika disertakan; field optional yang nullable dapat dikosongkan dengan null.
- Binding customer dibuat eksplisit karena action update dipakai bersama oleh route customer dan `/me/customer`.
- List customer melakukan eager loading user; list pet dibatasi relasi customer yang sudah diotorisasi. Policy saja tidak otomatis membatasi query list.

**Pending:** endpoint login/logout API, registrasi publik via HTTP, token/session integrasi frontend, email verification/reset flow dan mekanisme pengiriman akses awal. Method `registerCustomer()` di service bukan endpoint publik. Jangan membuat bypass identitas atau fake auth header agar endpoint dapat dipakai sebelum integrasi resmi.

## 8. Security & Authorization Rules

**Confirmed Decisions dan aturan implementasi yang berlaku:**

1. Akun nonaktif ditolak melalui provider, middleware dan Gate; jangan menghapus salah satu lapisan tanpa evaluasi kebutuhan.
2. Terapkan permission untuk kemampuan dan policy untuk record/ownership. Hindari pengecekan nama role yang tersebar pada controller.
3. Input owner dari body maupun parameter URL tidak membuktikan hak akses. Pastikan parent/resource diotorisasi dan batasi query dengan pemilik/assignment yang benar.
4. User biasa tidak dapat mengubah role, permission, status aktif, owner atau atribut verifikasi melalui input profil/pet.
5. `User` hanya mass-assignable name/email/password; foreign key pemilik profil/pet tidak mass-assignable. Hashing Laravel dan hidden attributes bawaan tetap dipertahankan.
6. Pembuatan customer oleh staf menghasilkan role customer saja. Password harus dikonfirmasi, minimal 12 karakter dengan huruf besar/kecil, angka dan simbol sesuai rule existing; tidak disimpan sebagai plaintext.
7. Perubahan email login akun lain memerlukan `manage_users` selain akses update customer. Pemilik dapat mengubah email sendiri sesuai policy. Perubahan email mengosongkan email_verified_at; update user/profil berada dalam satu transaksi.
8. StaffProfilePolicy membatasi update data kepegawaian ke `manage_users`. Permission edit profil sendiri bukan izin mengubah nomor pegawai/identitas employment.
9. Jangan memberikan semua permission ke semua role, mengembalikan grant yang dicabut Admin, atau memperluas hak akses hanya agar tes lulus.
10. Jangan mengekspos credential melalui response, output terminal, dokumentasi atau Git. Jangan membaca/mencetak isi .env untuk laporan. Jangan menyimpan password contoh yang dapat dijadikan akun default, API key, token atau salinan konfigurasi rahasia dalam master context.
11. Provisioning Admin pertama dan pemberian role harus melalui proses operator terpercaya dengan akses unik; tidak ada akun admin default dari seeder atau endpoint publik pemberian role.
12. Pemanggilan `Auth::login($user)` adalah operasi internal terpercaya yang melewati validasi credential; jangan memakainya untuk objek yang dipercaya dari input klien.
13. Frontend localStorage dan role simulation bukan security boundary dan tidak otomatis menjadi akun/data backend.
14. Rahasia layanan eksternal, termasuk AI API, hanya berada di backend dan tidak boleh dikirim ke frontend JavaScript.

## 9. Implemented Modules & Current Status

| Bagian | Status aktual | Bukti / batasan |
| --- | --- | --- |
| Module 1 — User & Access Management | **Implemented** | Shared users, multi-role/permission, profil, provider akun aktif, Gates/Policies, access/account services, seeder dan tests. Bukan API autentikasi lengkap. |
| Module 2 — Customer & Pet Management | **Implemented** | Customer retrieval/update/list/create staf, pet create/read/update/archive, ownership, FormRequests/Resources/services, 11 REST routes dan tests. |
| Module 3 — Service & Booking | **Implemented** | Tiga tabel baru, kategori/katalog, booking ownership, price snapshot, status lifecycle, per-pet overlap, staff scope, 15 route baru dan 37 tests. |
| Module 4 — Inventory & Pharmacy | **Completed / Implemented** | Empat tabel, katalog/batch, immutable ledger, opening/adjustments, stok nonnegatif, expiry/FEFO monitoring, 15 endpoint dan 46 tests. Tanpa receiving/sales/dispensing. |
| Module 5–8 | **Planned** | Hanya master plan; katalog permission/fungsi simulasi frontend bukan implementasi backend modul-modul ini. |
| Integrasi frontend ke backend | **Pending** | Frontend masih terpisah; belum ada alur login API/integrasi data yang selesai. |
| Production deployment dan AI chatbot | **Open Decisions / Planned** | Belum diimplementasikan atau diverifikasi sebagai production. |

### Hasil pemeriksaan penyelesaian Module 4 (terkini)

- Full suite: **162 tes / 1.230 assertions lulus**, termasuk **46 tes Module 4** serta seluruh 116 tes sebelumnya. Pint, Composer validation, syntax **122 file PHP** dan git diff --check lulus.
- API **41 endpoint** (15 baru); MySQL **23 tabel, 8 migration applied, 17 FK domain**. Role/permission/grant tetap **9/27/69**, tanpa permission atau grant tambahan.
- Migration 000005 applied batch 5. Fingerprint record, kolom, index dan FK seluruh **19 tabel lama identik**, selain tepat satu catatan migration baru. Empat tabel inventory kosong; tidak ada demo products/batches/movements.
- DatabaseSeeder existing diulang dua kali pada MySQL; fingerprint kembali sama, tanpa perubahan data/grant. Query aggregate product/batch/low-stock berjalan pada MySQL; konsistensi ledger tidak menemukan bucket negatif atau movement invalid, dengan batas bahwa inventory masih kosong.
- Review independen memperbaiki guard current locking read pada update type/unit di nested transaction; tidak ada temuan material lain tersisa. SQLite membuktikan perilaku/constraint, bukan race-free MySQL: belum ada stress/concurrency test MySQL dua koneksi atau stock-write fixtures pada database operasional.

### Hasil pemeriksaan penyelesaian Module 3 (snapshot historis)

- Runtime: Laravel **13.42.0**, PHP CLI **8.4.21**, MySQL **8.4.13**.
- Full suite dijalankan ulang: **116 passed, 755 assertions, 0 failures/errors**.
- Breakdown source tests: AccessManagementTest **46**, CustomerPetManagementTest **31**, ServiceBookingManagementTest **37**, dua ExampleTest **2**. Jumlah **48/177** yang dilaporkan setelah Module 1 adalah total suite historis sebelum Module 2; 79/377 adalah total setelah Module 2; jangan menjumlahkan total historis dengan total penyelesaian Module 3 116/755 atau total terkini Module 4 162/1230.
- Terdapat **26 route API**, **7 migration applied**, **19 tabel MySQL**, **9 role**, **27 permission**, **69 grant**. FK/index domain dan kesesuaian mapping baseline dibaca langsung dari MySQL.
- Pada implementasi Module 3, satu migration additive dan seeder khusus telah dijalankan. Fingerprint record/kolom pada 16 tabel existing tetap sama, dengan pengecualian penambahan yang diotorisasi: satu catatan migration, satu permission manage_services dan satu grant Admin. Tiga kategori ditambahkan; tidak ada akun/service/booking uji yang dimasukkan ke MySQL. Seeder diulang untuk verifikasi idempotensi. Tests menggunakan database in-memory, bukan MySQL existing.

**Bukti historis dari dokumentasi Module 2:** setelah migration pets, 15 tabel existing beserta record lamanya dipastikan terjaga melalui fingerprint sebelum/sesudah, dengan satu catatan migration baru. Review independen Module 1/2 sebelumnya dilaporkan tidak mempunyai temuan pemblokir. Klaim historis ini tidak berarti fingerprint lama atau review independen diulang pada setiap sesi dokumentasi.

### Kontrak Module 3 yang sudah berlaku

- Public catalog aktif; write katalog memerlukan `manage_services`. Tiga kategori disiapkan; katalog harga frontend demo tidak diimpor karena tarif produksi/satuan hotel belum disetujui.
- Booking code server FV-ULID, unique dengan retry collision. Customer berasal dari pet yang sudah diotorisasi; pet arsip/service/kategori nonaktif ditolak untuk create/reschedule. Harga snapshot tidak berubah saat harga katalog diubah.
- scheduled_at harus masa depan dengan offset/Z eksplisit, disimpan/dikirim UTC. ends_at hanya dihitung bila duration tersedia. Reschedule mempertahankan interval awal. Timezone/jam buka klinik belum ditetapkan.
- Status: pending → confirmed/cancelled; confirmed → checked_in/cancelled/no_show; checked_in → in_progress/cancelled; in_progress → completed; completed/cancelled/no_show terminal. Status write hanya manage_bookings. Customer tidak mendapat cancellation endpoint.
- PATCH hanya scheduled_at/customer_notes pada pending/confirmed yang belum mulai. Staff notes dipisahkan dan disembunyikan dari owner-only response. Owner/service/pet/code/status/price/internal fields tidak dapat diganti lewat PATCH.
- Overlap per pet memakai interval half-open; durasi null hanya point reservation. Pending/confirmed/checked_in/in_progress memblokir; cancelled/no_show/completed tidak memblokir. Pet row lock dan locking reads pada transaksi menserialkan writer yang memakai service; belum ada stress test concurrency MySQL atau global staff/room capacity.
- Scope pembaca staf: manage_bookings global; selain itu view_bookings + manage_medical_records/manage_grooming/manage_hotel membatasi kategori klinik-dokter/grooming/pet-hotel (union). Tidak memakai role-name checks. Slug kategori ber-service tidak dapat diubah; booked service tidak dapat direklasifikasi.

## 10. Development Roadmap & Module Dependencies

Urutan berikut adalah roadmap yang ditetapkan pengguna, **bukan izin mengerjakan seluruhnya sekaligus**. Setiap modul memerlukan prompt tersendiri. Perubahan urutan hanya jika ada dependensi teknis yang nyata dan alasannya dijelaskan sebelum mengubah rencana.

| Tahap | Status | Tabel / keluaran yang direncanakan | Dependensi dan batas scope |
| --- | --- | --- | --- |
| 1. User & Access Management | Completed / Implemented | users, roles, permissions, pivots, customers, staff_profiles | Fondasi seluruh modul. |
| 2. Customer & Pet Management | Completed / Implemented | pets dan customer/pet API | Memakai akun, profil dan policy Module 1. |
| 3. Service & Booking Management | Completed / Implemented | service_categories, services, bookings; katalog umum dan lifecycle | Memakai customer/pet dan akses Module 1–2. Satu service per booking; tanpa pembayaran, rooms/stays hotel. |
| 4. Inventory & Pharmacy Management | Completed / Implemented | product_categories, products, product_batches, stock_movements; medicine_details ditunda | Memakai otorisasi/staf; fondasi barang/obat untuk purchasing, penjualan dan resep. Integrasi resep penuh menunggu Module 7. |
| 5. Purchasing & Suppliers Management | Planned, next (menunggu instruksi) | suppliers, purchase_orders, purchase_order_items; receiving | Memakai Module 1 dan katalog/batch/stock-movement Module 4; penerimaan tidak boleh memperbarui stok tanpa ledger. |
| 6. Transactions & Payments Management | Planned | transactions, transaction_items, payments; DP dan pelunasan | Memakai Module 1, booking/service Module 3 dan produk/ledger Module 4; Module 5 bila analisis biaya diperlukan. Menyediakan kontrak tagihan bagi klinis/hotel. |
| 7. Medical Records & Prescriptions | Planned | examinations, prescriptions, prescription_items; tabel klinis tambahan bila dibutuhkan | Memakai Module 1–4 dan kontrak biaya/transaksi Module 6 bila terkait biaya layanan/obat. Menyelesaikan alur resep/farmasi lintas modul. |
| 8. Pet Hotel Operations | Planned | hotel_rooms, hotel_stays; tabel perawatan bila dibutuhkan | Memakai Module 1–3 dan transaksi Module 6; Module 7 jika ada kesehatan/perawatan medis. Tidak membuat booking atau rekam medis kedua. |
| Laporan dan konsolidasi alur operasional | Planned | Pelaporan lintas modul serta alur grooming/resepsionis/kasir yang relevan | Bergantung data operasional nyata. Scope dan penempatan rinci belum ditetapkan sebagai modul tersendiri. |
| Integrasi frontend, autentikasi dan deployment | Pending / Planned | Koneksi frontend/API, guard, kontrak response/error, deployment, E2E | Keputusan hosting/topologi harus mendahului pilihan CORS/CSRF/cookie/token. Pekerjaan ini hanya dimulai setelah otorisasi fase integrasi. |
| AI customer service | Planned, setelah katalog inti siap | Integrasi AI lewat backend dan pengambilan data katalog terverifikasi | Membutuhkan service/product catalog, ketersediaan stok yang benar, dan backend aman; bukan bagian Module 3–8 kecuali diminta eksplisit. |

Dependensi lintas tahap tidak boleh diselesaikan dengan menggandakan data: Module 4 boleh menyiapkan kontrak inventory untuk dispensing, tetapi belum dapat dianggap mempunyai resep klinis lengkap sebelum Module 7. Demikian pula, Module 3 sudah menyiapkan referensi booking/harga snapshot untuk pembayaran Module 6 tanpa menghitung DP. Persyaratan DP mengamankan slot harus direkonsiliasi dengan lifecycle/konkurensi saat spesifikasi terkait dibahas; jangan mengarang aturan timeout atau status bayar sekarang.

### 10.1 Module 5 — Purchasing & Suppliers Management

**Planned — tujuan dan scope:** pengadaan produk umum/obat terstruktur, terintegrasi dengan inventory Module 4. Supplier memuat identitas perusahaan, kontak/komunikasi, alamat, informasi tambahan dan status aktif. Supplier yang direferensikan histori pembelian dipertahankan; gunakan deaktivasi sesuai kebutuhan.

Alur sasaran: buat purchase order → pilih supplier, produk, kuantitas dan harga beli → pengajuan/approval bila disepakati → pengiriman → penerimaan aktual → pencatatan selisih pesanan/penerimaan. Nomor PO unik dihasilkan server. Riwayat pembelian per supplier, receiving, perubahan harga beli, PO terbuka dan sisa barang harus dapat ditelusuri.

**Confirmed Decisions untuk implementasi mendatang:** goods receiving merujuk PO dan dokumen penerimaan, mencatat kuantitas serta harga beli aktual, dan mempertahankan batch number/expiry date medicine. Receiving wajib menghasilkan stock movement ledger Module 4 dengan referensi dokumen; tidak menulis stok langsung atau membuat ledger baru.

**Proposed:** lifecycle `draft → submitted → approved → partially_received → received`, dengan `cancelled` sesuai transisi yang kelak disetujui. Daftar ini belum menetapkan transisi final, approval wajib, maupun izin partial receiving.

**Dependensi:** Module 1 untuk akun/akses; Module 4 untuk product, medicine batch dan stock movements. Histori pembelian menjadi masukan analisis pengeluaran/biaya bila diperlukan.

**Di luar scope:** penjualan produk, transaksi layanan, pembayaran customer/invoice penjualan, rekam medis, resep/dispensing, serta supplier payment/account payable kompleks kecuali disepakati nanti.

**Open Decisions:** approval PO; permission pembuat/pengaju/penyetuju/penerima; pencatatan pembayaran supplier versus status pembelian saja; partial receiving; retur supplier; metode pencatatan harga beli dan perubahannya. Detail schema, dokumen receiving dan lifecycle ditentukan pada spesifikasi Module 5.

### 10.2 Module 6 — Transactions & Payments Management

**Planned — tujuan dan scope:** menghubungkan layanan, booking, customer dan produk dalam transaksi multi-item. Satu transaksi dapat mencampur beberapa layanan dan produk, misalnya grooming serta shampoo. Gunakan katalog existing; batas satu service per booking Module 3 tetap berlaku dan tidak membatasi transaksi menjadi satu item.

Setiap transaction item menyimpan snapshot nama, kuantitas, harga satuan, subtotal dan referensi produk/service. Perubahan katalog tidak boleh mengubah histori transaksi. Kontrak harga harus merekonsiliasi snapshot booking Module 3 dan harga produk secara konsisten, bukan menghitung ulang histori dari harga terbaru.

**Confirmed Decisions:** DP mengamankan slot booking dan sisa tagihan dibayar setelah layanan. Implementasi pembayaran masih Planned: catat DP, sisa tagihan, pelunasan, riwayat/status payment serta referensi booking/transaksi. Detail pengamanan slot belum diimplementasikan pada lifecycle Module 3.

**Planned:** pencatatan cash/transfer bank, serta metode digital jika disetujui, dengan waktu, jumlah, status dan nomor referensi bila tersedia. Pembayaran manual dapat menjadi tahap awal; integrasi gateway bukan prasyarat wajib. Fondasi laporan membedakan pendapatan layanan, penjualan produk, pembayaran diterima, riwayat transaksi serta piutang/sisa pembayaran bila dibutuhkan.

**Confirmed Decisions untuk integrasi stok:** penjualan menghasilkan stock movement Module 4 dengan referensi transaksi, tanpa stok negatif. Medicine memakai batch tersedia, valid dan belum kedaluwarsa. Transaksi bisnis dan pengurangan stok harus atomik; desain final wajib mencegah transaksi tersimpan tanpa movement atau movement tertinggal saat transaksi gagal, serta menetapkan kompensasi bila relevan.

**Dependensi:** Module 1, Module 3 dan Module 4; Module 5 jika histori purchasing diperlukan untuk analisis biaya. Kontrak tagihan menjadi fondasi Module 7 dan Module 8.

**Di luar scope:** akuntansi double-entry/general ledger, pajak/pelaporan perpajakan kompleks, gateway wajib, payroll dan AI financial forecasting.

**Open Decisions:** format invoice/nomor transaksi; DP persentase atau nominal dan variasi kategori; expiry booking tanpa DP; waktu pembayaran; cicilan lebih dari dua kali; refund/pembatalan dan dampaknya ke DP; metode pembayaran aktual; partial payment/pelunasan; reversal transaksi; retur produk; pajak/diskon; desain teknis atomisitas stok/transaksi; apakah satu booking boleh terkait beberapa transaksi. Keharusan konsistensi atomik sudah ditetapkan, mekanismenya belum final.

### 10.3 Module 7 — Medical Records & Prescriptions

**Planned — tujuan dan scope:** rekam medis historis per pet dan alur resep/dispensing yang dapat ditelusuri. Pemeriksaan terhubung dengan customer, pet, dokter/staf medis berwenang, tanggal pemeriksaan dan booking bila pemeriksaan berasal dari booking. Informasi konseptual meliputi keluhan, riwayat relevan, hasil pemeriksaan, diagnosis, tindakan, catatan dokter dan rekomendasi tindak lanjut.

**Confirmed Decisions untuk data klinis:** customer/staf nonmedis tidak boleh mengubah diagnosis atau catatan klinis tanpa kewenangan. Koreksi historis wajib menjaga jejak perubahan; tidak boleh menghapus diam-diam. Riwayat tetap tertelusur setelah booking selesai, pet diarsipkan, service dinonaktifkan atau medicine tidak aktif.

**Planned:** dokter berizin membuat resep yang memuat medicine, dosis, frekuensi, durasi, jumlah, instruksi dan catatan. Validasi merujuk katalog medicine Module 4, bukan produk umum. Alur sasaran: pemeriksaan → rekam medis → resep → pemeriksaan resep oleh Apoteker → penyiapan → dispensing → stock movement batch → histori resep/dispensing.

**Confirmed Decisions untuk farmasi:** gunakan medicine/batch dan ledger Module 4, tanpa stok obat atau pharmacy ledger terpisah. Stok tidak berkurang saat resep baru dibuat; pengurangan terjadi saat obat benar-benar didispense atau sesuai aturan operasional yang disetujui. Batch kedaluwarsa/stok tak tersedia dilarang; gunakan FEFO bila sesuai ketersediaan batch.

**Proposed:** status resep `draft`, `issued`, `partially_dispensed`, `dispensed`, `cancelled`; lifecycle dan transisinya belum final.

**Planned — authorization:** Dokter mengelola klinis/resep sesuai kewenangan; Apoteker membaca resep relevan dan memproses dispensing tanpa mengubah diagnosis; Customer hanya mendapat informasi medis pet sendiri yang disetujui untuk ditampilkan, tanpa hak edit. Admin mengelola akses dan tidak otomatis berwenang mengubah isi klinis karena nama role. Semua memakai Policy/Gate, permission dan ownership checks.

**Batas existing yang perlu direkonsiliasi:** baseline Module 1 saat ini memberi Admin permission `manage_medical_records`/`manage_prescriptions`, dan Dokter/Apoteker sama-sama memiliki `manage_prescriptions`. Itu fondasi capability, bukan policy klinis/dispensing yang sudah selesai. Spesifikasi Module 7 harus merancang batas aksi/resource dan audit secara eksplisit; pembaruan plan ini tidak mencabut grant, mengubah seeder atau menambah bypass Admin.

**Dependensi:** Module 1–3; Module 4 untuk medicine/batch/movements; Module 6 bila ada biaya layanan/obat. Tidak menduplikasi sistem product/inventory.

**Di luar scope:** AI diagnosis/resep otomatis, laboratorium kompleks, integrasi alat pemeriksaan, telemedicine dan rekam medis lintas klinik.

**Open Decisions:** struktur diagnosis/tindakan (free text, katalog atau kombinasi); format resep/dosis; approval sebelum dispensing; revisi/pembatalan resep; edit setelah pemeriksaan ditutup; akses baca customer; koreksi/audit trail; penanganan obat tidak tersedia. Detail schema klinis belum final.

### 10.4 Module 8 — Pet Hotel Operations

**Planned — tujuan dan scope:** melengkapi booking kategori Pet Hotel Module 3 dengan room management, alokasi kapasitas, stay, check-in/check-out dan catatan operasional. Satu booking tetap satu customer, satu pet, satu service; tidak membuat sistem booking kedua.

Room secara konseptual memuat nama/kode, tipe, kapasitas, fasilitas, status aktif serta ketersediaan. Stay merujuk booking/customer/pet/room, check-in datetime, expected/actual check-out, status dan catatan. Ini konsep domain, bukan keputusan kolom/tabel final. Jangan mengasumsikan semua kamar hanya muat satu hewan.

Alur sasaran: booking hotel → verifikasi staf → check-in/alokasi kamar → catat kondisi masuk → aktivitas/perawatan bila diperlukan → check-out → tutup stay → tagihan akhir Module 6. Booking, room allocation dan stay harus konsisten; hubungan status stay dengan lifecycle booking existing perlu dirancang, bukan mengizinkan transisi booking bebas.

**Confirmed Decisions untuk availability:** kapasitas kamar tidak boleh terlampaui. Perhitungan mempertimbangkan tanggal mulai/selesai, stay berjalan, booking mendatang, pembatalan dan perpanjangan; kapasitas hotel tidak boleh dianggap sudah dijamin oleh overlap per-pet Module 3.

**Planned / sesuai kebutuhan:** feeding schedule, activity log, pet condition notes, special care instructions dan incident reports, dibatasi kebutuhan operasional dan authorization. Catatan hotel tidak menjadi rekam medis kedua; data klinis/instruksi medis merujuk Module 7 bila diperlukan.

**Confirmed Decisions untuk billing:** harga akhir terkait durasi masa inap, bukan asumsi harga flat booking Module 3. Snapshot booking historis tidak diubah retroaktif. Kalkulasi akhir dan payment menggunakan Module 6; satuan per hari/per malam masih Open Decision.

**Dependensi:** Module 1–3 dan Module 6; Module 7 jika diperlukan catatan kesehatan atau perawatan medis.

**Di luar scope:** booking terpisah, marketplace hotel, live CCTV, aplikasi mobile khusus, AI monitoring dan duplikasi veterinary records.

**Open Decisions:** tipe/kapasitas kamar dan aturan berbagi; room allocation; cutoff check-in/check-out; tarif per hari/per malam; pembulatan/minimum stay/overtime; perpanjangan; pembatalan/refund; feeding/aktivitas harian; penanganan insiden/darurat. Lifecycle stay dan mekanisme concurrency kapasitas harus ditentukan pada spesifikasi Module 8.

### 10.5 Aturan arsitektur lintas Module 5–8

**Confirmed Decisions untuk implementasi mendatang; belum berarti fitur tersedia:**

- Receiving Module 5, penjualan Module 6 dan dispensing Module 7 memakai stock movement ledger Module 4 dengan referensi dokumen sumber yang dapat ditelusuri. Jangan mengubah stok langsung atau menggandakan medicine/batch/ledger.
- Module 6 memakai katalog product/service existing. Module 7 memakai medicine/batch yang sama. Module 8 memakai booking Pet Hotel Module 3 dan transaksi Module 6.
- Pisahkan rekam medis Module 7 dari catatan operasional hotel Module 8; referensikan data klinis ketika dibutuhkan.
- Pertahankan referensi historis transaksi, stok, booking, medis dan stay meski entitas katalog/pet/akun dinonaktifkan atau diarsipkan. Snapshot dan koreksi berjejak harus dirancang sesuai domain, tanpa penghapusan histori.
- Gunakan permission, Policy/Gate, FormRequest, Resource, domain service serta testing/regresi existing; permission baru harus additive dan tidak mereset grant manual. Pertahankan kontrak transaksi/locking booking ketika modul lain menulis booking.
- Nama tabel pada roadmap adalah **Proposed**, bukan schema final. Tentukan schema, lifecycle, atomisitas dan authorization rinci pada prompt spesifik tiap modul setelah memeriksa hasil final Module 4.
- **Module 4 sudah Completed / Implemented.** Module 5–8 tetap hanya konteks roadmap; master plan ini tidak mengotorisasi implementasi, migration, seeding atau perubahan source code.

## 11. Core Business Workflows

### Implemented: akun, customer, pet dan inventory

Staf dengan `manage_customers` → validasi identitas/akses awal customer → `UserAccountService` membuat akun, profil dan role customer dalam satu transaksi → customer memiliki profil login sendiri. Endpoint publik registrasi belum tersedia.

Customer yang sudah terautentikasi → policy profil sendiri → ubah name/email/phone/address sesuai field rule → create/list/show/update/archive pet milik sendiri. Pengelola pet yang berizin dapat bekerja lintas customer; role lain tidak memperoleh akses tersebut secara otomatis.

Staf dengan manage_products membuat katalog → manage_inventory membuat batch medicine bila diperlukan → opening/adjustment melalui InventoryService → ledger immutable → monitoring physical/usable/expired dan FEFO candidates. Dokter/Apoteker membaca stok medicine melalui permission existing; belum menjalankan dispensing.

### Confirmed Decisions / Planned: alur bisnis akhir

1. Customer membuat akun dan mendaftarkan pet.
2. Customer menelusuri layanan klinik, grooming atau pet hotel.
3. Customer mengajukan satu booking untuk satu pet dan satu service.
4. DP melalui transaksi/payment mengamankan slot sesuai aturan yang nanti ditetapkan; resepsionis mengelola konfirmasi, assignment dan check-in.
5. Untuk klinik, dokter memeriksa pasien dan menyimpan rekam medis yang menjaga sejarah klinis, lalu membuat resep bila perlu.
6. Apoteker memeriksa resep, menyiapkan serta menyerahkan obat. Inventory mencatat pergerakan batch/stok yang sesuai.
7. Untuk grooming, Groomer melaksanakan pekerjaan yang ditugaskan. Untuk hotel, Pet Hotel Staff mengelola penempatan, stay, perawatan dan check-out melalui booking yang sama.
8. Tagihan dapat mencakup service, tindakan dan produk yang dapat dibedakan. Kasir memproses pembayaran dan sisa tagihan setelah layanan; riwayat DP/pelunasan tetap tersimpan.
9. Inventory Staff/purchasing mengelola supplier, PO dan penerimaan stok dengan audit movements.
10. Admin memantau operasional dan laporan; AI customer service kelak membantu pertanyaan umum dan mengarahkan kasus mendesak ke staf.

Ini adalah alur sasaran; urutan persis assignment/konfirmasi, status pembayaran, dan transisi klinis belum semuanya dispesifikasikan. Jangan menganggap seluruh langkah sudah berfungsi dari frontend ke MySQL.

## 12. AI Chatbot Future Integration

**Planned:** asisten customer service berbasis AI setelah katalog layanan, produk dan inventory inti tersedia. Tujuannya menjawab pertanyaan layanan, makanan/produk, serta perawatan umum tanpa berpura-pura menjadi dokter hewan.

**Confirmed Decisions:**

- Komunikasi ke AI API dilakukan backend Laravel; PHP cURL atau Laravel HTTP Client merupakan kemungkinan implementasi, bukan pilihan provider/library final.
- Gunakan data katalog sebagai sumber harga, layanan, stok dan produk. Jangan mengarang ketersediaan barang, harga atau klaim medis.
- Gejala mendesak/berbahaya diarahkan ke staf veteriner atau WhatsApp klinik; AI tidak menggantikan diagnosis dokter.
- API key/credential hanya di backend; jangan memasukkannya ke frontend, response, Git atau dokumen konteks.
- Jangan mengimplementasikan chatbot selama Module 3–8 tanpa instruksi eksplisit.

**Open Decisions:** provider/model AI, retrieval, cakupan data yang boleh dibaca, privasi, penyimpanan percakapan, batas biaya/rate limit, pengujian kualitas dan mekanisme eskalasi. Nomor kontak klinik harus diverifikasi sebelum dipakai; dokumen ini tidak menetapkan kontak production.

## 13. Testing & Quality Standards

**Standar setiap modul:** tes perilaku sukses/gagal, permission boundaries, ownership lintas akun, payload tidak valid, relasi/constraint, operasi atomik, dan regresi semua modul sebelumnya. Tests harus bermakna dan menggunakan arsitektur sebenarnya. Jangan mengandalkan data operasional atau memberi permission berlebih untuk membuat tes lulus.

`AccessManagementTest` mengatur koneksi SQLite `access_testing` dengan `:memory:` secara eksplisit. `InMemoryDatabaseTestCase` menyediakan pola sama bagi Module 2. Tiap tes memakai database in-memory baru dan migration additive; tidak memakai refresh/wipe terhadap MySQL atau database.sqlite existing. Periksa setup ini sebelum menambahkan tes database.

Contoh pemeriksaan dari folder `backend/`:

```sh
# Full suite tanpa menulis result cache PHPUnit; log diarahkan ke stderr.
LOG_CHANNEL=stderr vendor/bin/phpunit --do-not-cache-result

# Verifikasi style tanpa perbaikan file otomatis.
vendor/bin/pint --test

composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
git diff --check
```

Untuk implementasi yang diotorisasi, `php artisan test --compact` juga merupakan perintah suite existing. Jangan menjalankan setup/install/build/config-cache secara membabi buta: beberapa Composer scripts dapat memasang dependency, membuat konfigurasi atau menjalankan migration. Baca command sebelum menjalankannya, terutama saat scope hanya dokumentasi.

**Hasil aktual terkini setelah Module 4:** 162 tes / 1.230 assertions lulus (46 tes inventory + 116 sebelumnya). Hasil 116/755 pada pembaruan master plan adalah snapshot historis, bukan total terkini. Coverage mencakup inventory catalog/batch/ledger/expiry/integer/negative-stock/monitoring, serta multi-role/permission, perubahan grant, seeder berulang tanpa mengembalikan pencabutan, constraint duplikat/orphan, akun nonaktif/login/session/remember lookup, customer/pet ownership, HTTP validation/resources, arsip dan larangan eskalasi akses.

**Batas bukti:** HTTP feature tests memakai kernel Laravel dan `actingAs`; ini bukan pengujian login frontend/Vercel atau browser E2E. Constraint-write tests berjalan pada SQLite in-memory. MySQL schema/index/FK dibaca langsung, tetapi suite ini bukan suite konkurensi/integrasi-write MySQL. Style, syntax (122 file PHP) dan Composer lulus pada penyelesaian Module 4; jangan menyebutnya baru dijalankan jika sesi selanjutnya hanya menjalankan tes tertentu. Browser acceptance, CI/CD, production load/concurrency dan integrasi pembayaran belum dapat diklaim selesai.

## 14. Development Rules & Restrictions

Aturan ini berlaku untuk tugas berikutnya, dengan instruksi terbaru pengguna sebagai pembatas scope:

- Kerjakan hanya modul/fase yang ditugaskan. Selesai satu modul → verifikasi → dokumentasikan → laporkan → berhenti menunggu prompt berikutnya.
- Jangan otomatis mengerjakan Module 5 atau tahap berikutnya hanya karena tercantum sebagai next. Master context sendiri bukan perintah implementasi.
- Pertahankan seluruh perubahan existing, termasuk file baru yang masih untracked. Jangan mengasumsikan file uncommitted boleh dibuat ulang/dihapus.
- Jangan commit, push, merge, reset atau membuang perubahan kecuali diperintahkan eksplisit.
- Jangan mengubah frontend selama implementasi backend. Migrasi framework frontend dan integrasi dilakukan hanya pada fase yang diotorisasi.
- Jangan memindahkan struktur repository, menggandakan customers/User/permission, mengganti sistem role atau membuat login terpisah per role.
- Jangan mengedit migration yang sudah applied. Periksa status/schema terlebih dahulu dan buat migration tambahan bila diperlukan.
- **Dilarang menjalankan `php artisan migrate:fresh`, `php artisan db:wipe`, DROP TABLE tanpa persetujuan, penghapusan data existing tanpa persetujuan, atau destructive schema changes.** Jangan memakai rollback/reset migration sebagai cara coba-coba pada database existing.
- Jangan mengubah/menghapus MySQL atau file SQLite existing, konfigurasi database, atau credential tanpa kebutuhan dan otorisasi yang sesuai.
- Gunakan transaksi, FK/index/unique dan deletion behavior yang mempertahankan referensi/histori; jangan mengandalkan validasi frontend.
- Hindari enum/nilai bisnis yang membatasi pengembangan tanpa alasan, sekaligus pertahankan kontrak validasi existing hingga perubahan disetujui.
- Jangan menambah abstraksi/paket/library atau implementasi auth production tanpa memeriksa kebutuhan.
- Jika verifikasi gagal atau koneksi tidak tersedia, laporkan batas bukti. Jangan menyatakan migration/test berhasil berdasarkan perkiraan.
- Dokumentasi harus membedakan actual implementation, kebutuhan bisnis yang confirmed, roadmap dan keputusan terbuka. Jangan menyalin state demo frontend menjadi jaminan backend.

Batas satu-file saat pembuatan awal master context bersifat historis. Setiap tugas baru mengikuti scope pengguna saat itu; pembaruan Module 3–4 mencakup implementasi, migration additive dan dokumentasi yang diotorisasi. Keberadaan dokumen ini sendiri tidak memberi izin perubahan tambahan.

## 15. Open Decisions & Known Limitations

### Open Decisions

Keputusan khusus Module 5–8 dicatat di bagian 10.1–10.4 (PO/receiving, billing/DP, klinis/dispensing dan room/stay); semuanya harus ditinjau pada spesifikasi modul terkait. Daftar berikut tetap menjadi keputusan lintas proyek.

- Backend hosting, domain/topologi frontend–backend, HTTPS/reverse proxy dan proses deployment.
- Guard autentikasi API, session/cookie versus token, kebutuhan CORS/CSRF, expiry/revocation, login/logout dan integrasi frontend.
- Provisioning Admin pertama dan pengiriman credential awal customer, public registration, email verification/reset dan recovery. Tidak ada akun default dari seeder.
- Assignment/availability staf, timezone/jam buka klinik, kapasitas/konkurensi lintas resource, occupancy layanan tanpa durasi dan hubungan booking–DP saat integrasi pembayaran. Lifecycle dasar Module 3 sudah ditetapkan; perubahan di luar tabel perlu keputusan baru.
- Persentase/nominal DP, tenggat pembayaran/slot, pembatalan/no-show, refund, metode/gateway dan verifikasi/idempotensi pembayaran.
- Rincian pricing/invoice/audit klinis, pengembalian/penyesuaian stok, aturan batch/expiry serta izin tindakan farmasi yang granular.
- Scope laporan/grooming lanjutan, browser/support matrix, CI/CD, backup/recovery, observability dan acceptance production.
- Rincian AI provider, privasi data, retrieval dan eskalasi.

### Known Limitations — Implemented boundaries

- Backend terverifikasi mencakup Module 1–4. Module 5–8 masih Planned; pet hotel sudah menggunakan booking umum tanpa rooms/stays.
- Route API sudah terlindungi, tetapi klien eksternal belum memiliki alur login API. `actingAs` pada tes bukan mekanisme integrasi pengguna production.
- Frontend localStorage tidak sinkron dengan MySQL; tidak ada migrasi data demo frontend ke akun backend.
- Tidak ada endpoint restore/transfer pemilik pet atau penghapusan customer. Microchip unik tetap berlaku setelah pet diarsipkan.
- Seed permission tidak otomatis memperluas akses role existing ketika katalog ditambah. Ini disengaja untuk menjaga perubahan Admin.
- Booking sudah memiliki transisi dasar dan scope kategori; assignment staf rinci serta kontrol transisi modul klinis/farmasi/hotel belum diimplementasikan.
- README root masih mengandung klaim dan ERD lama. Verifikasi source serta live schema; tandai perbedaan dan jangan diam-diam menganggap satu dokumen selalu benar.
- Verifikasi schema/query MySQL dan SQLite tests tidak membuktikan kesiapan production, browser integration atau konkurensi MySQL. Inventory masih kosong di database operasional; pengujian write berdata dilakukan pada SQLite terisolasi.
- Module 4 belum menyediakan disposal expired/inactive stock, unit conversion, audited batch correction, reserved stock atau medicine_details. Tipe purchase_receipt/sale/medicine_dispensing masih ditolak API awal; perlu perluasan writer bersama pada modul terkait.

## 16. Instructions for Future Codex Sessions

1. **Baca `backend/docs/PROJECT_MASTER_CONTEXT.md` terlebih dahulu.** Kemudian baca dokumentasi modul terkait dan implementasi aktualnya sebelum merancang perubahan.
2. Pahami prompt khusus sesi tersebut. Jika hanya diberi konteks, jangan mulai fitur. Jika scope hanya dokumentasi/file tertentu, jangan menyentuh file atau state lain.
3. Periksa branch, Git diff, staged/unstaged serta untracked files. Pertahankan Module 1–4 dan pekerjaan pengguna; branch/state pada dokumen ini adalah snapshot yang bisa berubah.
4. Baca model, relation, policy, permission/seeder, service, FormRequest, Resource, controller dan routes yang akan dipakai kembali. Jangan duplikasi logic existing.
5. Periksa daftar migration dan status/schema secara read-only. Jangan mencetak .env, credential atau isi data sensitif. Jika tidak dapat memverifikasi database, tandai status sebagai belum diverifikasi pada sesi itu.
6. Bila master context, dokumen modul dan source/database berbeda, catat fakta yang berbeda dan bukti yang ditemukan. Verifikasi dahulu; jangan otomatis menganggap dokumen atau kode salah. Bahas perubahan yang berpotensi merusak data sebelum menerapkannya.
7. Tentukan dependensi dan rencana perubahan terbatas pada modul yang ditugaskan. Pakai keputusan confirmed; tandai asumsi/open decision yang belum ditetapkan.
8. Implementasikan sesuai arsitektur existing, dengan authorization/ownership, transaksi, validasi dan tests yang terisolasi. Jangan memperluas scope ke modul berikutnya.
9. Jalankan pemeriksaan yang sesuai dan full suite. Untuk migration yang memang diotorisasi, gunakan additive migrate setelah pemeriksaan; verifikasi FK/index dan kelestarian data existing. Tugas dokumentasi tidak memerlukan migration/seeding.
10. Laporkan file/perubahan, hasil aktual tes/migration, risiko/keterbatasan, dan langkah lanjutan. Bedakan pekerjaan selesai dan integrasi Pending.
11. Jika pembaruan dokumentasi diizinkan, perbarui status/hasil/tanggal master context serta dokumen modul terkait agar sesi baru tidak memakai angka lama. Jangan mengubah dokumen di luar scope izin saat itu.
12. **Berhenti setelah tugas/modul terverifikasi dan menunggu instruksi berikutnya.** Jangan commit, push, deploy atau memulai roadmap berikutnya secara otomatis.
