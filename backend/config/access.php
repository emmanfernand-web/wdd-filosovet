<?php

// Baseline catalog only. Runtime authorization reads database role assignments.
return [
    'permissions' => [
        'manage_users' => 'Mengelola akun dan status pengguna',
        'manage_roles' => 'Mengelola penugasan role pengguna',
        'manage_permissions' => 'Mengelola permission pada role',
        'manage_customers' => 'Mengelola profil customer',
        'manage_pets' => 'Mengelola data hewan pasien',
        'view_bookings' => 'Melihat jadwal operasional',
        'manage_bookings' => 'Mengelola booking dan check-in',
        'manage_medical_records' => 'Mengelola pemeriksaan dan rekam medis',
        'manage_prescriptions' => 'Mengelola resep sesuai alur klinis',
        'dispense_prescriptions' => 'Menyiapkan dan menyerahkan obat resep',
        'view_medication_stock' => 'Melihat stok obat',
        'manage_inventory' => 'Mengelola stok dan batch',
        'manage_products' => 'Mengelola katalog produk',
        'manage_suppliers' => 'Mengelola supplier dan pemesanan stok',
        'manage_hotel' => 'Mengelola operasional pet hotel',
        'manage_grooming' => 'Mengelola pekerjaan grooming',
        'view_transactions' => 'Melihat transaksi',
        'process_payments' => 'Memproses pembayaran',
        'view_reports' => 'Melihat laporan',
        'view_own_profile' => 'Melihat profil sendiri',
        'update_own_profile' => 'Memperbarui profil sendiri',
        'manage_own_pets' => 'Mengelola hewan sendiri',
        'view_own_bookings' => 'Melihat booking sendiri',
        'manage_own_bookings' => 'Mengelola booking sendiri',
        'view_own_medical_records' => 'Melihat rekam medis hewan sendiri',
        'view_own_transactions' => 'Melihat transaksi sendiri',
    ],
    'roles' => [
        'admin' => ['name' => 'Admin', 'description' => 'Administrasi sistem dan akses.', 'permissions' => ['*']],
        'resepsionis' => [
            'name' => 'Resepsionis', 'description' => 'Registrasi customer, hewan dan jadwal.',
            'permissions' => ['manage_customers', 'manage_pets', 'view_bookings', 'manage_bookings', 'view_own_profile', 'update_own_profile'],
        ],
        'dokter' => [
            'name' => 'Dokter', 'description' => 'Pemeriksaan klinis dan peresepan.',
            'permissions' => ['view_bookings', 'manage_medical_records', 'manage_prescriptions', 'view_medication_stock', 'view_own_profile', 'update_own_profile'],
        ],
        'pharmacist' => [
            'name' => 'Apoteker', 'description' => 'Penyiapan dan penyerahan obat resep.',
            'permissions' => ['manage_prescriptions', 'dispense_prescriptions', 'view_medication_stock', 'view_own_profile', 'update_own_profile'],
        ],
        'inventory' => [
            'name' => 'Inventory Staff', 'description' => 'Katalog, stok, batch dan supplier.',
            'permissions' => ['manage_inventory', 'manage_products', 'manage_suppliers', 'view_medication_stock', 'view_own_profile', 'update_own_profile'],
        ],
        'groomer' => [
            'name' => 'Groomer', 'description' => 'Pelaksanaan grooming.',
            'permissions' => ['view_bookings', 'manage_grooming', 'view_own_profile', 'update_own_profile'],
        ],
        'hotel' => [
            'name' => 'Pet Hotel Staff', 'description' => 'Operasional penitipan hewan.',
            'permissions' => ['view_bookings', 'manage_hotel', 'view_own_profile', 'update_own_profile'],
        ],
        'kasir' => [
            'name' => 'Kasir', 'description' => 'Transaksi dan pembayaran.',
            'permissions' => ['view_transactions', 'process_payments', 'view_own_profile', 'update_own_profile'],
        ],
        'customer' => [
            'name' => 'Customer', 'description' => 'Akses data dan aktivitas milik sendiri.',
            'permissions' => ['view_own_profile', 'update_own_profile', 'manage_own_pets', 'view_own_bookings', 'manage_own_bookings', 'view_own_medical_records', 'view_own_transactions'],
        ],
    ],
];
