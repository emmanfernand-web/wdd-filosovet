# User & Access Management — Filosovet

Fondasi Laravel 13 dengan satu tabel akun `users`, multi-role, permission dinamis, dan profil customer/staf. Frontend tetap terpisah. Modul ini menyediakan model, service, policy dan middleware; belum menambahkan endpoint REST, sesi login API, token, atau library autentikasi.

## Daftar file

Dibuat:

- `database/migrations/2026_11_12_000001_add_is_active_to_users_table.php`
- `database/migrations/2026_11_12_000002_create_access_management_tables.php`
- `app/Models/{Role,Permission,Customer,StaffProfile}.php`
- `app/Auth/ActiveUserProvider.php`
- `app/Http/Middleware/EnsureAccountIsActive.php`
- `app/Policies/{CustomerPolicy,StaffProfilePolicy}.php`
- `app/Services/{AccessManagementService,UserAccountService}.php`
- `config/access.php`
- `database/seeders/AccessControlSeeder.php`
- `tests/Feature/AccessManagementTest.php`
- `docs/access-management.md`, `docs/access-management-plan.md`

Diubah: `app/Models/User.php`, `app/Providers/AppServiceProvider.php`, `bootstrap/app.php`, `config/auth.php`, `database/seeders/DatabaseSeeder.php`, dan `README.md` backend. Migration bawaan, database SQLite existing, konfigurasi database, credential, dan frontend tidak diubah.

## Struktur database

| Tabel | Kolom dan constraint |
| --- | --- |
| `users` | Semua kolom bawaan tetap; `is_active` boolean default true melalui migration baru. Email tetap unique. |
| `roles` | `id`, `name`, `slug` unique, `description` nullable, timestamps. |
| `permissions` | `id`, `name`, `slug` unique, `description` nullable, timestamps. |
| `user_roles` | `user_id`, `role_id`, `created_at`; composite unique; kedua FK cascade delete. |
| `role_permissions` | `role_id`, `permission_id`, `created_at`; composite unique; kedua FK cascade delete. |
| `customers` | `id`, `user_id` unique FK, `phone` nullable, `address` nullable, timestamps. |
| `staff_profiles` | `id`, `user_id` unique FK, `employee_number` unique, `phone`/`address`/`hire_date` nullable, timestamps. |

FK profil memakai RESTRICT saat user dihapus: deaktivasi akun melalui `is_active` merupakan cara mempertahankan profil untuk relasi modul berikutnya. Pivot menggunakan CASCADE agar tidak ada relasi yatim. Tidak ada tabel login per role. Satu user dapat memiliki profil customer sekaligus staf; kepemilikan profil tidak otomatis memberi role, dan mengganti role tidak menghapus profil.

Relasi Eloquent bertipe: `User::roles()` ↔ `Role::users()`; `Role::permissions()` ↔ `Permission::roles()`; `User::customer()` ↔ `Customer::user()`; `User::staffProfile()` ↔ `StaffProfile::user()`. Pivot hanya memiliki timestamp `created_at` (menggunakan dukungan Laravel 13 `withTimestamps('created_at', false)`).

## Mapping awal

Sumber definisi: `config/access.php`. Terdapat 9 role dan 26 permission. Semua staf memperoleh `view_own_profile` dan `update_own_profile`, tetapi perubahan data kepegawaian tetap khusus pengelola akun.

| Role (slug) | Permission operasional awal |
| --- | --- |
| Admin (`admin`) | Seluruh 26 permission bawaan, termasuk `manage_users`, `manage_roles`, `manage_permissions`, dan `view_reports`. |
| Resepsionis (`resepsionis`) | `manage_customers`, `manage_pets`, `view_bookings`, `manage_bookings`. |
| Dokter (`dokter`) | `view_bookings`, `manage_medical_records`, `manage_prescriptions`, `view_medication_stock`. |
| Apoteker (`pharmacist`) | `manage_prescriptions`, `dispense_prescriptions`, `view_medication_stock`. |
| Inventory Staff (`inventory`) | `manage_inventory`, `manage_products`, `manage_suppliers`, `view_medication_stock`. |
| Groomer (`groomer`) | `view_bookings`, `manage_grooming`. |
| Pet Hotel Staff (`hotel`) | `view_bookings`, `manage_hotel`. |
| Kasir (`kasir`) | `view_transactions`, `process_payments`. |
| Customer (`customer`) | `view_own_profile`, `update_own_profile`, `manage_own_pets`, `view_own_bookings`, `manage_own_bookings`, `view_own_medical_records`, `view_own_transactions`. |

Admin tidak memakai bypass role hardcoded. Semua akses, termasuk Admin, berasal dari relasi permission di database dan bisa dicabut. Permission custom juga dapat diperiksa dengan native Gate. Permission operasional merupakan fondasi kemampuan; modul klinis/farmasi berikutnya tetap wajib menerapkan policy record dan validasi transisi agar apoteker tidak mengubah resep dokter, serta assignment staf agar hanya menangani pekerjaannya.

## Pemakaian

```php
$user->hasRole('dokter');
$user->hasPermission('manage_medical_records');
Gate::forUser($user)->authorize('manage_users');

$access = app(\App\Services\AccessManagementService::class);
$access->syncUserRoles($actor, $targetUser, $roleIds);
$access->syncRolePermissions($actor, $role, $permissionIds);
$access->setUserActive($actor, $targetUser, false);
```

Service mensyaratkan `manage_roles`, `manage_permissions`, dan `manage_users` masing-masing. Daftar ID divalidasi (list, integer, distinct, exists) sebelum sync. `sync` mengganti daftar target; array kosong secara eksplisit mencabut semua relasi. Operasi relasi memakai transaksi dan row lock. Assignment berulang melalui service tidak membuat duplikat; `attach` duplikat langsung tetap ditolak constraint database. Perubahan akses langsung terbaca tanpa bergantung pada cache relasi model.

```php
$accounts = app(\App\Services\UserAccountService::class);
$customerUser = $accounts->registerCustomer($validatedRegistrationInput);
$staffUser = $accounts->createStaff($actor, $validatedStaffInput, $roleIds);
$accounts->updateCustomerProfile($actor, $customerProfile, $profileInput);
```

Registrasi customer hanya membuat role customer, beserta profil dalam transaksi yang sama. Input akun: name, email unique, password dan password_confirmation; phone/address opsional. Password minimal 12 karakter dengan huruf besar/kecil, angka, simbol, lalu di-hash melalui cast Laravel. Pembuatan staf memerlukan `manage_users` dan `manage_roles`, employee_number unique, dan minimal satu role yang diberikan secara eksplisit. Kegagalan assignment membatalkan pembuatan user dan profil.

Atribut akses (`roles`, `role_ids`, `permissions`, `is_active`, dll.) ditolak dari input publik service. `User` hanya mass-assignable name/email/password; foreign key pemilik profil juga tidak mass-assignable. Password dan remember_token tersembunyi dari serialisasi model. API selanjutnya harus memakai Resource dengan daftar field eksplisit, menghindari serialisasi relasi yang tidak dibutuhkan.

## Autentikasi dan kepemilikan

Provider `active-eloquent` dipasang pada konfigurasi `auth.providers.users`. Ia mempertahankan hashing, rehash, remember-me, dan sesi Laravel, dengan filter akun aktif saat pencarian credential, ID sesi, maupun remember token. `Auth::attempt()` dan `Auth::validate()` menolak akun nonaktif. Middleware `active` terdaftar di `bootstrap/app.php` serta dipasang ke grup web untuk menolak user yang dinonaktifkan setelah guard sudah terisi.

Saat menambahkan endpoint terlindungi, gunakan guard yang disepakati, middleware `auth`, `active`, dan native `can:<permission>`. Middleware `active` bukan pengganti autentikasi dan membiarkan guest melewati halaman publik. Pemanggilan `Auth::login($user)` adalah operasi internal terpercaya yang melewati pemeriksaan credential; jangan menggunakannya dengan objek dari input klien tanpa validasi autentikasi.

`CustomerPolicy` membolehkan pemilik dengan permission own-profile atau pemegang `manage_customers`. Customer tidak boleh melakukan `viewAny`, membaca, atau mengubah profil customer lain. `StaffProfilePolicy` membolehkan pemilik melihat profil sendiri; perubahan data kepegawaian memerlukan `manage_users`. Akun nonaktif selalu ditolak oleh Gate. Gate permission tidak melewati policy ketika ada argumen resource.

Controller berikutnya wajib memanggil `Gate::authorize('view', $customer)` / `Gate::authorize('update', $customer)` dan membatasi query daftar dengan pemilik/assignment yang tepat; keberadaan policy saja tidak otomatis memfilter query Eloquent. Belum ada endpoint yang mengekspos data profil pada tahap ini.

## Migration dan seed

Dari folder backend:

```sh
php artisan migrate
php artisan db:seed --class=AccessControlSeeder
php artisan migrate:status
```

Seeder juga dipanggil oleh `DatabaseSeeder`. Tidak membuat akun demo maupun admin default. `firstOrCreate` menjaga identitas role/permission. Mapping awal hanya diterapkan saat sebuah role baru dibuat; seeding ulang mempertahankan grant tambahan, pencabutan grant, serta perubahan nama/deskripsi oleh Admin. Penambahan permission baru tidak otomatis memberikan akses ke role existing: gunakan service terotorisasi untuk mengelolanya.

Provisioning Admin pertama merupakan operasi operator di console terpercaya: buat akun dengan password unik melalui input rahasia atau alur provisioning yang disepakati, kemudian hubungkan akun tersebut ke role `admin`. Tidak disediakan password bawaan atau endpoint publik untuk pemberian role admin. Frontend localStorage saat ini tidak otomatis menjadi akun backend.

## Pengujian dan hasil verifikasi

```sh
php artisan test --compact
vendor/bin/pint --test
composer validate --no-check-publish --no-interaction
git diff --check
```

`AccessManagementTest` menggunakan koneksi SQLite `access_testing` dengan `:memory:` baru per tes. Semua model/service, seeder, dan migration dalam tes diarahkan ke koneksi tersebut. Hanya perintah additive `migrate` yang dipakai; tidak ada refresh/wipe pada SQLite existing maupun MySQL.

Verifikasi implementasi pada 12 November 2026:

- Laravel 13.42.0, PHP 8.4.21, MySQL 8.4.13.
- Dua migration tambahan berhasil diterapkan. Ketiga migration bawaan tetap tercatat sebagai sudah berjalan.
- Sembilan tabel bawaan dan kolom lamanya tetap ada; jumlah record lama tidak berubah, kecuali penambahan dua catatan pada tabel migrations.
- Enam tabel baru terbentuk, 6 foreign key dan unique index diperiksa langsung melalui metadata MySQL.
- Seeder menghasilkan 9 role, 26 permission dan 68 grant awal; tidak membuat user.
- Suite 48 tes / 177 assertion lulus, termasuk multi-role, constraint, grant/revoke, kepemilikan, hashing, akun nonaktif dan rollback transaksi pembuatan staf.
- Pemeriksaan constraint yang mencoba insert duplikat/orphan berjalan di SQLite in-memory, bukan pada database operasional. Verifikasi MySQL memeriksa schema/index/FK aktual.
- Review independen tidak menemukan masalah pemblokir; catatan seeder yang dapat memulihkan grant tercabut sudah diperbaiki dengan tes regresi.

## Lanjutan

Tentukan kontrak REST API dan guard autentikasi untuk frontend terpisah (termasuk kebutuhan CORS, CSRF/cookie atau token). Tambahkan controller, FormRequest/Resource dan tes HTTP, dengan otorisasi per record serta query yang dibatasi pemilik. Provision Admin pertama secara aman. Setelah itu modul customer/pet dan booking dapat merujuk user/customer/staff_profiles yang sudah tersedia. Tidak ada modul operasional lain yang diimplementasikan oleh perubahan ini.
