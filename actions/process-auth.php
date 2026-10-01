<?php
/**
 * Pemrosesan Autentikasi (Login, Register, Logout)
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

// Menangani permintaan AJAX JSON atau Form POST reguler
$isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') 
          || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

$action = $_GET['action'] ?? ($_POST['action'] ?? 'login');

// Fitur Logout
if ($action === 'logout') {
    unset($_SESSION['user']);
    session_destroy();
    header("Location: ../pages/auth.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $name = trim($_POST['name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');

    if ($action === 'login') {
        if (empty($email) || empty($password)) {
            $response = ['status' => 'error', 'message' => 'Email dan kata sandi wajib diisi.'];
        } else {
            // Simulasi / Query User
            $userName = explode('@', $email)[0];
            $role = (strpos($email, 'admin') !== false) ? 'admin' : 'customer';

            $_SESSION['user'] = [
                'name' => ucwords($userName),
                'email' => $email,
                'role' => $role
            ];

            $redirectUrl = ($role === 'admin') ? '../pages/dashboard-admin.php' : '../pages/profil-pelanggan.php';
            $response = ['status' => 'success', 'message' => 'Berhasil masuk!', 'redirect' => $redirectUrl];
        }
    } elseif ($action === 'register') {
        if (empty($name) || empty($email) || empty($password)) {
            $response = ['status' => 'error', 'message' => 'Semua kolom pendaftaran wajib diisi.'];
        } elseif (strlen($password) < 8) {
            $response = ['status' => 'error', 'message' => 'Kata sandi minimal 8 karakter.'];
        } else {
            $_SESSION['user'] = [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'role' => 'customer'
            ];

            $response = ['status' => 'success', 'message' => 'Akun berhasil dibuat!', 'redirect' => '../pages/profil-pelanggan.php'];
        }
    } else {
        $response = ['status' => 'error', 'message' => 'Aksi tidak valid.'];
    }

    if ($isAjax) {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } else {
        if ($response['status'] === 'success') {
            header("Location: " . $response['redirect']);
        } else {
            header("Location: ../pages/auth.php?error=" . urlencode($response['message']));
        }
        exit;
    }
}

// Jika diakses via GET tanpa aksi yang sesuai, alihkan ke auth.php
header("Location: ../pages/auth.php");
exit;
?>

