<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceBookingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach (['klinik-dokter' => 'Klinik & Dokter', 'grooming' => 'Grooming', 'pet-hotel' => 'Pet Hotel'] as $slug => $name) {
                ServiceCategory::firstOrCreate(['slug' => $slug], ['name' => $name]);
            }
            // Separate from the established 26-permission catalog; never reset existing grants.
            $permission = Permission::firstOrCreate(['slug' => 'manage_services'], [
                'name' => 'Manage services', 'description' => 'Mengelola kategori dan katalog layanan',
            ]);
            if ($permission->wasRecentlyCreated) {
                Role::where('slug', 'admin')->first()?->permissions()->syncWithoutDetaching([$permission->id]);
            }
        });
    }
}
