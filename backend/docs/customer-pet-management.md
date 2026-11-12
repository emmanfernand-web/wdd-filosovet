# Module 2 — Customer & Pet Management

Modul Laravel 13 ini menambahkan REST API customer dan hewan di `/api/v1`. Model, akun, role, permission dan policy Module 1 dipakai kembali. Tidak ada tabel customer baru, tabel login terpisah, perubahan frontend, atau modul operasional lain.

## Batas autentikasi

Semua endpoint memakai middleware `auth` dengan default guard yang sudah tersedia dan middleware `active`. API mengembalikan JSON 401 untuk guest, termasuk request tanpa header Accept. Akun nonaktif yang sudah ada di guard ditolak 403. Permission dan policy Module 1 tetap menjadi pemeriksaan akses sebenarnya.

Belum ada endpoint login, token, library autentikasi tambahan, atau konfigurasi CORS/cookie lintas origin. Default guard merupakan titik integrasi, bukan mekanisme login baru untuk frontend Vercel. Sampai lapisan autentikasi API disepakati dan diimplementasikan, klien HTTP eksternal tidak memiliki alur login melalui modul ini. Tes mengisi guard menggunakan `actingAs` bawaan Laravel; tidak ada bypass/header identitas untuk klien.

## Endpoint

Semua path di bawah relatif terhadap `/api/v1`.

| Method | Path | Akses / hasil |
| --- | --- | --- |
| GET | `/me/customer` | Profil customer akun sendiri, dengan `view_own_profile` (atau hak pengelolaan customer yang sesuai). |
| PATCH | `/me/customer` | Memperbarui profil sendiri sesuai policy. |
| GET | `/customers` | Daftar customer, khusus `manage_customers`. |
| POST | `/customers` | Membuat akun login dan profil customer, khusus `manage_customers`. |
| GET | `/customers/{customer}` | Detail milik sendiri atau `manage_customers`. |
| PATCH | `/customers/{customer}` | Update milik sendiri dengan `update_own_profile`, atau `manage_customers`. |
| GET | `/customers/{customer}/pets` | Daftar hewan customer yang diizinkan policy pet. |
| POST | `/customers/{customer}/pets` | Membuat hewan untuk customer pada URL, setelah policy pet mengizinkan. |
| GET | `/pets/{pet}` | Detail hewan milik sendiri atau pemegang `manage_pets`. |
| PATCH | `/pets/{pet}` | Update hewan milik sendiri atau pemegang `manage_pets`. |
| DELETE | `/pets/{pet}` | Mengarsipkan hewan; mengembalikan 204, bukan penghapusan fisik. |

Operasi pet untuk pemilik memerlukan `manage_own_pets`. Pemegang `manage_pets` tidak perlu diberi `manage_customers` untuk mengelola hewan. Pemeriksaan ini berbasis permission, bukan daftar role hardcoded. Mapping Module 1 tidak diubah: Admin/Resepsionis memiliki permission pengelolaan; Customer hanya permission milik sendiri.

List memakai pagination dengan `per_page` default 20, rentang 1–100, serta `page` integer positif. Response list menyertakan `data`, `links`, dan `meta`. Response objek memakai `data`; create mengembalikan 201, show/update 200. Kesalahan validasi 422; akses tidak diizinkan 403; ID tidak ditemukan atau hewan diarsipkan 404. Akun tanpa profil customer memperoleh 404 pada endpoint `/me/customer`.

## Payload customer

Pembuatan customer membutuhkan `name`, `email` unique, `password`, dan `password_confirmation`. Ketentuan password Module 1 tetap berlaku. `phone` dan `address` opsional/nullable. Service Module 1 membuat user, profil customer, dan role customer dalam satu transaksi; tidak memberi permission staf.

Update profil menerima `name`, `email`, `phone`, dan `address` secara parsial. Nama/email tidak boleh null atau kosong jika disertakan; phone/address boleh null untuk mengosongkan data. Email unique terhadap tabel users, dengan pengecualian akun target sendiri.

Perubahan **email login akun lain** membutuhkan `manage_users`, sekalipun pemanggil mempunyai `manage_customers`. Pengelola customer tetap boleh mengubah nama, phone, dan address. Pemilik boleh mengganti email sendiri sesuai policy. Pengamanan tambahan ini mencegah pengelola profil mengubah identitas login akun yang juga mempunyai role staf/Admin. Mengganti email mengosongkan `email_verified_at`. Perubahan akun dan profil dilakukan dalam transaksi yang sama; kegagalan otorisasi/validasi tidak menyimpan perubahan sebagian.

Password pada endpoint update, role/permission, status akun, user_id, dan email_verified_at tidak dapat ditulis melalui payload profil. Gunakan alur administrasi akses tersendiri untuk perubahan tersebut. CustomerResource hanya mengeluarkan id/user_id, name/email, phone/address dan timestamps; tidak mengeluarkan password, remember_token, role/permission, objek user lengkap atau daftar hewan secara otomatis.

## Payload pet dan schema

Satu migration baru: `2026_11_12_000003_create_pets_table.php`.

| Field | Penyimpanan / validasi |
| --- | --- |
| `id` | Bigint primary key. |
| `customer_id` | FK wajib ke customers.id; berasal dari URL/relasi, bukan payload. ON DELETE RESTRICT. |
| `name` | String wajib, maksimum 255 karakter. |
| `species` | String wajib, maksimum 100; menerima jenis eksotis dan nama ilmiah, tanpa enum kucing/anjing. |
| `breed` | Nullable string, maksimum 255. |
| `gender` | Nullable: `male`, `female`, `intersex`, `unknown`. |
| `date_of_birth` | Nullable DATE; YYYY-MM-DD yang valid dan tidak di masa depan. |
| `weight` | Nullable DECIMAL(8,3), satuan kg; >0 sampai 10000, maksimum 3 angka desimal. Batas lebar mendukung hewan kecil maupun besar dan menolak bobot nol/negatif. |
| `color` | Nullable string, maksimum 100. |
| `microchip_number` | Nullable string maksimum 100, unique index; string kosong/whitespace menjadi null. String `0` tetap disimpan. |
| `notes` | Nullable text, maksimum 10000 karakter. |
| `created_at`, `updated_at` | Timestamps Laravel. |
| `deleted_at` | Nullable timestamp untuk arsip melalui soft delete. |

Terdapat index `(customer_id, name)` untuk akses berdasarkan pemilik dan unique index `microchip_number`. Banyak microchip null diperbolehkan, tetapi nilai yang diberikan harus unik termasuk terhadap record yang diarsipkan. Ownership dan timestamps tidak dapat diubah melalui payload; belum ada alur perpindahan kepemilikan atau restore.

Contoh payload pet:

```json
{
  "name": "Milo",
  "species": "kucing",
  "breed": "domestik",
  "gender": "male",
  "weight": 4.125,
  "date_of_birth": "2024-02-29",
  "color": "jingga",
  "microchip_number": null,
  "notes": "Mudah takut suara keras"
}
```

Resource mengeluarkan bobot sebagai string desimal, misalnya `"4.125"`, agar presisi konsisten. DOB memakai YYYY-MM-DD; timestamps memakai ISO 8601. Optional field dapat dikosongkan dengan null; field wajib tetap required jika disertakan pada PATCH.

Arsip menyembunyikan hewan dari daftar dan route binding biasa sambil mempertahankan identitas untuk referensi klinis berikutnya. FK RESTRICT mencegah penghapusan fisik customer yang masih memiliki hewan, termasuk hewan arsip. Tidak ada endpoint penghapusan akun/customer.

## Arsitektur dan kepemilikan

- `Customer::pets()` adalah hasMany; `Pet::customer()` belongsTo. Relasi User–Customer yang sudah ada tidak digandakan.
- `CustomerPolicy` dipakai kembali, dengan kemampuan create khusus `manage_customers`.
- `PetPolicy` memeriksa pemilik pada setiap list/create/show/update/archive. Parameter parent atau ID pet dari klien tidak dipercaya sebagai bukti kepemilikan.
- FormRequest mengotorisasi sebelum validasi. Service mengulangi otorisasi agar pemanggilan internal juga aman. Service memvalidasi data dengan rule yang sama seperti request.
- `CustomerService` meneruskan pembuatan dan perubahan akun/profil ke `UserAccountService` Module 1. Identitas akun tidak diimplementasikan ulang.
- Controller hanya menghubungkan request, service dan resource. List customer melakukan eager load user untuk menghindari query user per baris; list pet langsung dibatasi relasi customer yang sudah diotorisasi.
- Binding customer didaftarkan secara eksplisit karena endpoint PATCH customer dan `/me/customer` berbagi action controller.

## File Module 2

Dibuat:

- `database/migrations/2026_11_12_000003_create_pets_table.php`
- `app/Models/Pet.php`
- `app/Policies/PetPolicy.php`
- `app/Support/PetValidation.php`
- `app/Services/CustomerService.php`, `app/Services/PetService.php`
- `app/Http/Controllers/Api/CustomerController.php`, `app/Http/Controllers/Api/PetController.php`
- `app/Http/Requests/PaginationRequest.php`, `ListCustomersRequest.php`, `StoreCustomerRequest.php`, `UpdateCustomerRequest.php`, `ListPetsRequest.php`, `StorePetRequest.php`, `UpdatePetRequest.php`
- `app/Http/Resources/CustomerResource.php`, `app/Http/Resources/PetResource.php`
- `routes/api.php`
- `tests/Support/InMemoryDatabaseTestCase.php`
- `tests/Feature/CustomerPetManagementTest.php`
- `docs/customer-pet-management-plan.md`, `docs/customer-pet-management.md`

Diubah untuk integrasi: `app/Models/Customer.php`, `app/Policies/CustomerPolicy.php`, `app/Providers/AppServiceProvider.php`, `app/Services/UserAccountService.php`, `bootstrap/app.php`, dan `README.md` backend. Semua perubahan Module 1 sebelumnya tetap dipertahankan; tidak ada migration lama yang diedit atau permission yang di-seed ulang.

## Verifikasi

Dari backend:

```sh
php artisan test --compact
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
php artisan route:list --path=api --except-vendor
php artisan migrate:status
git diff --check
```

Hasil pada 12 November 2026:

- Full suite: **79 tes, 377 assertion lulus**, termasuk 48 tes existing Module 1/default dan 31 tes Module 2.
- Tes HTTP memakai kernel Laravel sebenarnya dan actingAs, bukan mock controller. Database tes adalah SQLite `access_testing` in-memory baru per tes, menjalankan migration additive tanpa refresh/wipe.
- Cakupan meliputi profil sendiri/lintas pemilik, update akun/profil, privilege injection, registrasi customer oleh staf, pemisahan hak staf, seluruh operasi pet, pagination, validasi, chip duplikat/null, FK, arsip, akun nonaktif, pencabutan permission, dan otorisasi service langsung.
- Migration pets berhasil diterapkan pada MySQL 8.4.13. Keenam migration berstatus Ran. FK RESTRICT dan index pemilik/microchip diperiksa langsung melalui metadata MySQL.
- Fingerprint data dan kolom 15 tabel existing sebelum/sesudah identik. Catatan migration existing juga tidak berubah; tepat satu catatan migration baru ditambahkan. Tetap 9 role, 26 permission dan 68 grant; tidak ada customer/pet/akun uji yang ditambahkan ke MySQL.
- Pemeriksaan insert duplikat/orphan dilakukan pada SQLite in-memory. MySQL operasional diperiksa secara read-only setelah migration.
- Review independen tidak menemukan masalah pemblokir.
- Tidak menjalankan perintah database destruktif, mengubah frontend, credential, database SQLite existing, maupun melakukan commit/push/merge/reset.

## Sisa integrasi

Guard dan kontrak autentikasi frontend Vercel, CORS/CSRF/cookie atau token, verifikasi email, serta pengiriman credential awal customer masih memerlukan keputusan dan implementasi terpisah. Tidak ada notifikasi otomatis atau credential yang dikirim oleh endpoint pembuatan customer. Tidak ada restore/transfer pemilik pet dalam Module 2. Pengembangan berhenti pada Module 2; booking dan modul berikutnya belum ditambahkan.
