<?php
/**
 * Pemrosesan Aksi Operasional & Dashboard Admin
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

$isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
          || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $action = $input['action'] ?? 'update_status';

    if ($action === 'update_status') {
        $bookingCode = $input['code'] ?? '';
        $newStatus = $input['status'] ?? 'Diproses';

        // Update status di session jika ada
        if (isset($_SESSION['bookings'])) {
            foreach ($_SESSION['bookings'] as &$b) {
                if ($b['code'] === $bookingCode) {
                    $b['status'] = $newStatus;
                    break;
                }
            }
        }

        $response = ['status' => 'success', 'message' => "Status booking $bookingCode berhasil diperbarui menjadi $newStatus."];
    } elseif ($action === 'restock') {
        $productId = $input['product_id'] ?? 0;
        $qty = intval($input['qty'] ?? 10);
        $response = ['status' => 'success', 'message' => "Order restock sebanyak $qty unit berhasil diajukan ke distributor."];
    } else {
        $response = ['status' => 'error', 'message' => 'Aksi admin tidak valid.'];
    }

    if ($isAjax || isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } else {
        header("Location: ../pages/dashboard-admin.php");
        exit;
    }
}

header("Location: ../pages/dashboard-admin.php");
exit;
?>

