<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AccessControlSeeder::class);
        $this->call(ServiceBookingSeeder::class);
        $this->call(PurchasingSeeder::class);
        $this->call(TransactionsPaymentsSeeder::class);
    }
}
