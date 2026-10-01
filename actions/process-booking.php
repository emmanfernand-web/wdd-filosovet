<?php
/**
 * Pemrosesan Reservasi & Booking Layanan (Medis, Grooming, Pet Hotel)
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

$isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
          || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data payload dari form atau raw JSON
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $service = trim($input['service'] ?? $input['layanan'] ?? '');
    $type = trim($input['type'] ?? $input['tipe'] ?? '');
    $date = trim($input['date'] ?? $input['tanggal'] ?? '');
    $time = trim($input['time'] ?? $input['waktu'] ?? '');
    $petName = trim($input['pet_name'] ?? $input['hewan'] ?? '');
    $petSpecies = trim($input['pet_species'] ?? $input['spesies'] ?? 'Kucing');
    $petBreed = trim($input['pet_breed'] ?? $input['ras'] ?? '');
    $petWeight = floatval($input['pet_weight'] ?? $input['berat'] ?? 0);
    $notes = trim($input['notes'] ?? $input['catatan'] ?? '');
    $price = intval($input['price'] ?? $input['biaya'] ?? 0);

    if (empty($petName) || empty($time)) {
        $response = ['status' => 'error', 'message' => 'Nama hewan dan slot waktu wajib diisi.'];
    } else {
        // Generate Kode Booking Unik
        $bookingCode = 'FV-' . strtoupper(substr(uniqid(), -6));
        
        $bookingData = [
            'code' => $bookingCode,
            'layanan' => $service,
            'tipe' => $type,
            'tanggal' => $date ?: date('Y-m-d'),
            'waktu' => $time,
            'hewan' => $petName,
            'spesies' => $petSpecies,
            'ras' => $petBreed,
            'berat' => $petWeight,
            'biaya' => $price,
            'catatan' => $notes,
            'status' => 'Menunggu Konfirmasi',
            'created_at' => date('Y-m-d H:i:s')
        ];

        // Simpan ke session untuk data session fallback jika DB belum disetup
        if (!isset($_SESSION['bookings'])) {
            $_SESSION['bookings'] = [];
        }
        array_unshift($_SESSION['bookings'], $bookingData);

        // Jika DB terhubung, bisa simpan ke database
        if (isDbConnected() && $conn) {
            // Prepared statement query jika tabel booking tersedia
        }

        $response = [
            'status' => 'success',
            'message' => 'Booking berhasil dibuat!',
            'booking_code' => $bookingCode,
            'data' => $bookingData
        ];
    }

    if ($isAjax || isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } else {
        if ($response['status'] === 'success') {
            header("Location: ../pages/profil-pelanggan.php?booking_success=" . urlencode($bookingCode));
        } else {
            header("Location: ../pages/booking.php?error=" . urlencode($response['message']));
        }
        exit;
    }
}

header("Location: ../pages/booking.php");
exit;
?>

