<?php
/**
 * Konfigurasi Koneksi Database Filosovet
 */

$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'filosovet_db';

// Inisialisasi koneksi dengan penanganan error yang aman
$conn = null;
try {
    // Suppress warning untuk menangani kasus database server belum aktif tanpa fatal crash
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);
    
    if ($conn) {
        mysqli_set_charset($conn, "utf8mb4");
    }
} catch (Exception $e) {
    $conn = null;
}

/**
 * Helper function untuk mendapatkan status koneksi DB
 */
function isDbConnected() {
    global $conn;
    return ($conn !== null && $conn !== false);
}
?>

