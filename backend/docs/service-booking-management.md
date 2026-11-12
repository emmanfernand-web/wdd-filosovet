# Module 3 — Service & Booking Management

Modul Laravel 13 untuk kategori, katalog layanan dan booking bersama Klinik & Dokter, Grooming, serta Pet Hotel. Menggunakan akun/customer/pet, provider akun aktif, Gates/Policies dan pola REST Module 1–2. Tidak mengimplementasikan payment/DP, invoice, transaksi, klinis/resep, inventory, purchasing, staff assignment, kapasitas hotel atau chatbot.

## Database dan relasi

Migration additive: `2026_11_12_000004_create_service_booking_tables.php`. Migration lama tidak diubah.

| Tabel | Kolom dan constraint |
| --- | --- |
| service_categories | id; name; slug unique; description nullable; is_active default true; timestamps. |
| services | id; service_category_id FK RESTRICT; name; slug unique; description nullable; duration_minutes unsigned nullable; price DECIMAL(12,2); is_active default true; timestamps. Index category/active. |
| bookings | id; booking_code unique VARCHAR(29); customer_id, pet_id, service_id FK RESTRICT; scheduled_at UTC DATETIME; ends_at nullable UTC DATETIME; status string default pending; price_snapshot DECIMAL(12,2); customer_notes/staff_notes nullable; created_by nullable FK users RESTRICT; timestamps. |

Index bookings: `(pet_id,status,scheduled_at)`, `(customer_id,scheduled_at)`, `(status,scheduled_at)`, unique booking_code dan index FK. Lima FK baru, semuanya RESTRICT agar referensi historis tidak hilang akibat penghapusan induk. Tidak ada endpoint DELETE kategori/service/booking; gunakan deaktivasi katalog.

Relasi: ServiceCategory.hasMany services; Service.belongsTo category dan hasMany bookings; Customer/Pet.hasMany bookings; Booking.belongsTo customer, pet, service, creator (User). Booking.pet memakai withTrashed agar histori pasien arsip tetap dapat dibaca. Tidak ada relasi banyak service per booking.

Harga snapshot diambil dari service terkunci ketika booking dibuat. Update harga katalog tidak memperbarui histori. Reschedule mempertahankan panjang interval booking awal, bukan durasi katalog yang mungkin sudah berubah. Harga snapshot belum merupakan tagihan atau kalkulasi tarif hotel per malam.

## Seed dan katalog frontend

`ServiceBookingSeeder` dipanggil setelah AccessControlSeeder oleh DatabaseSeeder. Pada database existing, jalankan hanya seeder khusus ini jika menambahkan Module 3:

```sh
php artisan migrate
php artisan db:seed --class=ServiceBookingSeeder
```

Seeder mengisi tiga kategori `klinik-dokter` (Klinik & Dokter), `grooming`, dan `pet-hotel`. Semua memakai firstOrCreate sehingga nama/deskripsi/status yang diedit staf tidak ditimpa. Tidak membuat akun, booking atau service/harga contoh.

`js/services-data.js` diperiksa dan mempunyai katalog demo klinik/grooming beserta harga/durasi, dan hotel bertarif per hari tanpa durasi tetap. Data tersebut belum menjadi harga produksi yang disetujui; menyalinnya langsung ke kontrak satu harga booking akan menyamarkan satuan tarif hotel. Karena itu implementasi konservatif hanya menanam kategori dan membiarkan staf berizin membuat layanan dengan harga/durasi eksplisit. Tidak mengarang atau mengubah harga frontend. Import katalog dan billing hotel perlu ditinjau saat kontrak harga disetujui.

## Permission dan policy

Permission baru **manage_services** diperlukan karena manage_products untuk inventory dan manage_bookings untuk operasi booking tidak memberi tanggung jawab pengelolaan katalog. Permission ini mengelola kategori/service dan akses katalog nonaktif; tidak memberi hak booking otomatis.

Permission baru dikelola oleh seeder khusus, **tidak mengganti katalog 26 permission legacy di config/access.php**. Seeder pertama kali membuat permission lalu menambahkan satu grant ke role Admin yang sudah ada. Jika permission sudah ada, rerun tidak mengembalikan grant yang dicabut, menimpa grant manual, atau memperluas akses role lain. Role existing selain Admin tidak diberi grant baru. Instalasi kosong menggunakan DatabaseSeeder agar role dibuat sebelum seeder ini. Bila operator menjalankan seeder khusus sebelum role Admin ada, grant perlu dikelola eksplisit melalui service akses; jangan mengandalkan rerun untuk memulihkan grant.

| Kemampuan | Syarat |
| --- | --- |
| Baca katalog aktif | Public, tanpa login; kategori dan service aktif. |
| Buat/edit kategori/service, baca/filter nonaktif | manage_services. |
| Create booking lintas customer, update booking, staff notes, transisi status | manage_bookings. |
| Baca operasional booking global | manage_bookings. |
| Baca operasional kategori tertentu | view_bookings + kemampuan kategori di bawah. |
| Daftar/detail booking sendiri | view_own_bookings. |
| Create/edit booking sendiri | manage_own_bookings; owner tetap diverifikasi dari pet/customer. |

Cakupan kategori untuk pemegang view_bookings yang tidak mempunyai manage_bookings: manage_medical_records → klinik-dokter; manage_grooming → grooming; manage_hotel → pet-hotel. Beberapa kemampuan menghasilkan union kategori. view_bookings saja tidak memberi akses global; kategori baru yang tidak dipetakan hanya terlihat oleh pengelola booking global. Mapping ini berbasis permission, tidak menggunakan nama role pada controller. Admin/Resepsionis baseline dapat mengelola semua booking; Dokter/Groomer/Hotel hanya membaca kategori relevan dan tidak mendapat status-write dari view permission.

Slug kategori yang sudah mempunyai service tidak dapat diganti. Service yang sudah mempunyai booking tidak boleh dipindah kategori. Ini menjaga cakupan otorisasi/histori agar tidak berubah hanya karena reclassification. Penyesuaian kategori bisnis baru memerlukan peninjauan capability mapping.

Policies ServiceCategory/Service/Booking dipasang di AppServiceProvider. FormRequest mengotorisasi terlebih dahulu; domain/query services juga memeriksa Gate. Booking model guarded penuh; service mengisi field internal secara eksplisit. Resource hanya mengirim staff_notes dan created_by jika pemanggil mempunyai akses operasional booking tersebut. Owner-only response menyembunyikan keduanya. Tidak ada response credential atau objek user lengkap.

## API endpoints

Semua path relatif terhadap `/api/v1`. Empat endpoint baca katalog public menggunakan active middleware; write katalog dan seluruh booking menggunakan auth + active. Tidak menambah login/token/CORS/CSRF atau integrasi frontend. Akun nonaktif yang sudah berada dalam guard ditolak; provider existing tidak memulihkan identitas akun nonaktif.

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | /service-categories | Kategori aktif public; manager dapat melihat seluruhnya/filter is_active. |
| GET | /service-categories/{category} | Detail kategori; nonaktif tersembunyi (404) bagi non-manager. |
| POST | /service-categories | Buat kategori, manage_services. |
| PATCH | /service-categories/{category} | Edit/deaktivasi kategori, manage_services. |
| GET | /services | Katalog aktif public; filter service_category_id; manager dapat memfilter is_active. |
| GET | /services/{service} | Detail service; service/kategori nonaktif tersembunyi bagi non-manager. |
| POST | /services | Buat service pada kategori aktif. |
| PATCH | /services/{service} | Edit/deaktivasi service; histori booking tetap. |
| GET | /me/bookings | Daftar booking pemilik, termasuk status terminal. |
| POST | /bookings | Buat booking berdasarkan pet_id/service_id; owner ditentukan backend. |
| GET | /bookings/{booking} | Detail sesuai ownership/operational scope. |
| PATCH | /bookings/{booking} | Hanya scheduled_at dan customer_notes; kebijakan edit di bawah. |
| GET | /bookings | Daftar staf sesuai scope kategori/global. |
| PATCH | /bookings/{booking}/status | Transisi terkontrol, hanya manage_bookings. |
| PATCH | /bookings/{booking}/staff-notes | Ubah/hapus catatan internal, hanya manage_bookings. |

List terpaginasikan: default per_page 20, maksimum 100, page positif. Filter booking: status, service_category_id, service_id, pet_id, from/to YYYY-MM-DD (rentang hari **UTC**). Filter menambah pembatasan query yang sudah di-scope; tidak dapat memperluas kepemilikan/kategori. Filter is_active memakai boolean 0/1 dan hanya manager; public tanpa filter otomatis aktif. Response mengikuti data, links, meta Module 2.

Create 201, detail/update 200, guest protected 401, penolakan permission/owner 403, resource tidak ada/katalog tersembunyi 404, validasi/overlap/transisi ilegal 422. Tidak ada endpoint customer cancellation: customer tidak dapat memakai endpoint status, termasuk untuk cancelled. Kebijakan cancellation customer dan hubungannya ke DP masih Open Decision.

## Payload dan contoh response

Contoh service (harga hanya contoh request, **tidak di-seed**):

```json
{
  "service_category_id": 1,
  "name": "Layanan yang disetujui klinik",
  "slug": "layanan-disetujui",
  "price": "150000.00",
  "duration_minutes": 30,
  "is_active": true
}
```

Name wajib maksimal 255; slug unik lowercase alphanumeric/hyphen; price 0–9999999999.99 dengan maksimal dua desimal. Durasi nullable atau integer positif, batas validasi teknis 525600 menit; bukan durasi baku semua layanan. Description nullable maksimal 10000. Kategori nonaktif tidak bisa dipakai untuk service baru atau pemindahan service. Service di bawah kategori nonaktif boleh dideaktivasi/diedit, tetapi tidak dapat dibooking.

Contoh create booking:

```json
{
  "pet_id": 12,
  "service_id": 3,
  "scheduled_at": "2027-01-15T10:00:00+07:00",
  "customer_notes": "Bawa riwayat vaksin"
}
```

Contoh bagian response owner:

```json
{
  "data": {
    "id": 41,
    "booking_code": "FV-01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "customer_id": 8,
    "pet_id": 12,
    "service_id": 3,
    "scheduled_at": "2027-01-15T03:00:00+00:00",
    "ends_at": "2027-01-15T03:30:00+00:00",
    "status": "pending",
    "price_snapshot": "150000.00",
    "customer_notes": "Bawa riwayat vaksin"
  }
}
```

Response sebenarnya juga menyertakan created_at/updated_at. booking_code FV-ULID dihasilkan server, unique constraint dan maksimal tiga percobaan allocation jika terjadi duplicate code. Selain collision code, error unique lain tidak disembunyikan. ULID mudah dibaca, bukan secret atau authorization token.

Pada create/update, payload customer_id, booking_code, status, staff_notes, created_by, price_snapshot, ends_at, id/timestamps ditolak melalui rule missing. PATCH juga menolak pet_id/service_id: tidak ada transfer customer/pet/service melalui edit biasa. Nullable customer_notes membedakan omitted (tidak berubah) dari null (hapus catatan). Catatan maksimal 10000.

Staff membuat booking customer melalui pet_id yang sah; customer tidak dapat memilih pet orang lain. User tanpa customer profile tetap dapat membuat booking untuk customer sebagai staf jika mempunyai manage_bookings. Pet arsip tidak boleh dipakai create/reschedule. Booking lama tetap dapat dibaca setelah pet diarsipkan atau katalog dinonaktifkan.

## Lifecycle

| Current | Allowed next |
| --- | --- |
| pending | confirmed, cancelled |
| confirmed | checked_in, cancelled, no_show |
| checked_in | in_progress, cancelled |
| in_progress | completed |
| completed | Tidak ada |
| cancelled | Tidak ada |
| no_show | Tidak ada |

Status awal selalu pending. Semua transisi, termasuk status yang sama, harus cocok tabel; tidak ada generic model update dari controller. Input status valid enum saja belum cukup: transisi juga diperiksa berdasarkan row terbaru dalam transaksi. Status endpoint hanya memproses status, tidak memperbarui catatan/harga/jadwal dari field lain.

PATCH jadwal/customer_notes berlaku untuk booking **pending/confirmed yang belum mulai**. Kebijakan konservatif yang sama berlaku pada endpoint PATCH untuk staf; staf tidak dapat mengubah jadwal completed/in_progress lewat endpoint ini. Staff notes dapat diubah terpisah dengan otorisasi pengelola, termasuk pada status terminal. Belum ada audit status table/addendum notes; schema histori tambahan dapat dirancang bila diperlukan modul operasional.

## Waktu, overlap dan concurrency

- scheduled_at harus waktu masa depan dalam bentuk YYYY-MM-DDTHH:MM:SSZ atau YYYY-MM-DDTHH:MM:SS±HH:MM. Jam 24, menit/detik di luar 00–59, tanggal tidak valid, waktu tanpa timezone dan waktu lampau ditolak. Fractional seconds belum diterima.
- Input dikonversi UTC sebelum disimpan; response dijelaskan UTC. Tidak menetapkan timezone/jam buka klinik tanpa keputusan bisnis.
- Bila duration_minutes tersedia, ends_at dihitung backend. Jika null, ends_at tetap null; jangan mengarang durasi hotel/layanan.
- Pending, confirmed, checked_in, in_progress memblokir jadwal. Cancelled, no_show, completed tidak memblokir.
- Interval diketahui memakai `[start,end)`; tepat pada akhir booking sebelumnya dapat diterima. Booking pet berbeda boleh bersamaan; tidak ada global slot/dokter tunggal.
- Durasi null diperlakukan sebagai **titik waktu**, bukan occupancy yang tidak diketahui panjangnya. Titik sama konflik; titik di dalam interval yang diketahui konflik; titik di luar interval tidak dianggap konflik. Ini batas minimum, bukan jaminan ketersediaan untuk layanan tanpa durasi.
- Create mengunci row pet, kemudian service/category dan melakukan locking read booking aktif. Reschedule/status mengunci pet kemudian booking terbaru; reauthorization dan lifecycle dilakukan setelah lock. Semua penulisan melalui domain service memakai urutan yang konsisten; transaksi mempunyai retry deadlock Laravel.
- Lock pada row pet menjadi titik serialisasi bahkan ketika belum ada booking, menghindari check-then-insert tanpa lock. Locking read overlap menggunakan latest committed rows pada MySQL/InnoDB; database unique mencegah kode duplikat. Stale object tidak boleh mengembalikan status terminal.
- Proteksi ini memerlukan semua booking writer mengikuti domain service/lock yang sama. Tidak ada exclusion constraint database untuk overlap, staff capacity, room capacity atau duplicate request idempotency. Direct SQL/penulis lain yang melewati service bisa melanggar aturan. SQLite tests tidak membuktikan race bebas pada MySQL.

## File implementasi

Dibuat:

- `database/migrations/2026_11_12_000004_create_service_booking_tables.php`
- `database/seeders/ServiceBookingSeeder.php`
- `app/Models/ServiceCategory.php`, `Service.php`, `Booking.php`
- `app/Enums/BookingStatus.php`
- `app/Policies/ServiceCategoryPolicy.php`, `ServicePolicy.php`, `BookingPolicy.php`
- `app/Support/BookingAccess.php`, `BookingCodeGenerator.php`, `ServiceBookingValidation.php`
- `app/Services/ServiceCatalogService.php`, `BookingService.php`, `BookingQueryService.php`
- `app/Http/Requests/CatalogListRequest.php`, `SaveServiceCategoryRequest.php`, `SaveServiceRequest.php`, `StoreBookingRequest.php`, `UpdateBookingRequest.php`, `BookingListRequest.php`, `BookingStatusRequest.php`, `BookingStaffNotesRequest.php`
- `app/Http/Resources/ServiceCategoryResource.php`, `ServiceResource.php`, `BookingResource.php`
- `app/Http/Controllers/Api/ServiceCategoryController.php`, `ServiceController.php`, `BookingController.php`
- `tests/Feature/ServiceBookingManagementTest.php`
- `docs/service-booking-management-plan.md`, `docs/service-booking-management.md`

Diubah: Customer/Pet model (relasi bookings), AppServiceProvider (policy registration), DatabaseSeeder (pemanggilan seeder khusus), routes/api.php (15 route baru), README backend (tautan), PROJECT_MASTER_CONTEXT.md (status terverifikasi). Katalog config/access.php legacy, migration lama dan frontend tidak diubah.

## Verifikasi dan batas bukti

Dari backend:

```sh
LOG_CHANNEL=stderr vendor/bin/phpunit --do-not-cache-result
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
git diff --check
```

**Hasil 12 November 2026:** full suite **116 tes / 755 assertion lulus** (79 tes existing + 37 tes Module 3). Pint --test, Composer validation, syntax 89 file PHP dan route:list lulus. Terdapat 26 route API total. MySQL: 7 migration applied, 19 tabel total, 3 kategori, 9 role, 27 permission, 69 grant. Sebanyak 16 tabel existing beserta record/kolom lama terjaga; hanya satu migration/permission/grant yang ditambahkan sesuai scope. Tidak ada akun/service/booking uji di MySQL. Full suite mencakup seluruh tes Module 1–2 dan tes Module 3: lifecycle 49 kombinasi transisi, owner/permission scopes, validasi katalog/UTC, harga historis, arsip pet, overlap termasuk titik/interval, reschedule, stale status, kode collision dan preservation seeder. Constraint-write tests pada SQLite in-memory; MySQL diverifikasi metadata/FK/index dan fingerprint data lama secara langsung. Tidak menjalankan tes concurrency paralel pada MySQL operasional.

## Known limitations dan Open Decisions

- Jadwal dokter/staf, assignment, jam buka/shift, clinic timezone dan kapasitas/ruangan belum dimodelkan. Pet Hotel tetap booking umum tanpa stays/rooms.
- Unknown-duration occupancy dan stay dates/rate per hari perlu kontrak berikutnya; price_snapshot adalah harga unit service saat create, bukan tagihan hotel.
- Customer cancellation/reschedule cutoff rinci, DP mengamankan slot, expiry unpaid booking, refund, biaya reschedule dan gateway menunggu Module 6/keputusan bisnis.
- Tidak ada backend public registration/login/token/frontend integration baru. Public catalog bekerja tanpa login; protected endpoints menunggu integrasi guard resmi seperti Module 2.
- Tidak ada service pricing/duration produksi yang ditanam. Staf harus membuat service dengan data disetujui melalui API/domain service sebelum booking dipakai.
- `manage_services` baru diberikan Admin pertama kali; staf lain membutuhkan grant melalui mekanisme akses existing. Rerun seeder tidak mengembalikan grant yang sengaja dicabut.
- Category capability mapping saat ini memakai tiga slug utama; kategori tambahan memerlukan peninjauan scope, bukan akses otomatis bagi semua staf.
- Role/pet/customer ownership atau grant bisa berubah pada boundary request; operasi booking mengotorisasi ulang data terkunci. Tidak ada central audit permission changes/status history atau endpoint revisi histori di modul ini.
- Race behavior didukung row locking InnoDB, tetapi belum diuji stress/concurrent pada MySQL. Kontrak writer lintas modul wajib menggunakan service/locking yang sama.
- Tidak ada Modul 4+, payment, medical, inventory, purchasing atau AI yang dibuat. Berhenti setelah Module 3.
