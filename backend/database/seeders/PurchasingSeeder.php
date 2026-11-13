<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PurchasingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach (['manage_purchase_orders' => 'Mengelola purchase orders', 'receive_purchase_orders' => 'Mengonfirmasi goods receiving'] as $slug => $description) {
                $permission = Permission::firstOrCreate(['slug' => $slug], ['name' => str_replace('_', ' ', $slug), 'description' => $description]);
                if ($permission->wasRecentlyCreated) {
                    foreach (Role::whereIn('slug', ['admin', 'inventory'])->get() as $role) {
                        $role->permissions()->syncWithoutDetaching([$permission->id]);
                    }
                }
            }
        });
    }
}
