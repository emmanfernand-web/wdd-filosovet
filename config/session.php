<?php
/**
 * Konfigurasi & Manajemen Session Filosovet
 */

if (session_status() === PHP_SESSION_NONE) {
    // Pengaturan cookie sesi yang aman
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

/**
 * Cek apakah user sudah login
 */
function isLoggedIn() {
    return isset($_SESSION['user']) && !empty($_SESSION['user']);
}

/**
 * Cek apakah user adalah admin
 */
function isAdmin() {
    return isLoggedIn() && isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'admin';
}

/**
 * Ambil data user yang sedang login
 */
function getCurrentUser() {
    return isLoggedIn() ? $_SESSION['user'] : null;
}

/**
 * Proteksi halaman - wajib login
 */
function requireLogin($redirect = '../pages/auth.php') {
    if (!isLoggedIn()) {
        header("Location: $redirect");
        exit;
    }
}

/**
 * Proteksi halaman - wajib admin
 */
function requireAdmin($redirect = '../pages/auth.php') {
    if (!isAdmin()) {
        header("Location: $redirect");
        exit;
    }
}
?>

