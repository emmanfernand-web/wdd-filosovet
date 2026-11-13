<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TransactionsPaymentsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach (['manage_transactions' => ['admin', 'kasir'], 'manage_refunds' => ['admin']] as $slug => $roles) {
                $p = Permission::firstOrCreate(['slug' => $slug], ['name' => str_replace('_', ' ', $slug)]);
                if ($p->wasRecentlyCreated) {
                    foreach (Role::whereIn('slug', $roles)->get() as $role) {
                        $role->permissions()->syncWithoutDetaching([$p->id]);
                    }
                }
            }
            foreach (['cash' => 'Cash', 'bank_transfer' => 'Bank transfer', 'qris' => 'QRIS', 'debit_card' => 'Debit card', 'credit_card' => 'Credit card', 'e_wallet' => 'E-wallet'] as $code => $name) {
                PaymentMethod::firstOrCreate(['code' => $code], ['name' => $name]);
            }
        });
    }
}
