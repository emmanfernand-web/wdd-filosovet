<?php
/**
 * Pemrosesan Keranjang & Checkout Transaksi Toko & Farmasi
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

    $action = $input['action'] ?? 'checkout';

    if ($action === 'checkout') {
        $items = $input['items'] ?? [];
        $total = intval($input['total'] ?? 0);
        $payMethod = trim($input['payment_method'] ?? 'QRIS');
        $shipping = trim($input['shipping'] ?? 'kirim');

        $invoiceNo = 'INV-' . strtoupper(dechex(time()));

        $orderData = [
            'invoice_no' => $invoiceNo,
            'items' => $items,
            'total' => $total,
            'payment_method' => $payMethod,
            'shipping' => $shipping,
            'status' => 'Berhasil',
            'created_at' => date('Y-m-d H:i:s')
        ];

        if (!isset($_SESSION['orders'])) {
            $_SESSION['orders'] = [];
        }
        array_unshift($_SESSION['orders'], $orderData);

        $response = [
            'status' => 'success',
            'message' => 'Pembayaran berhasil diproses!',
            'invoice' => $invoiceNo,
            'data' => $orderData
        ];
    } else {
        $response = ['status' => 'error', 'message' => 'Aksi keranjang tidak dikenali.'];
    }

    if ($isAjax || isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } else {
        header("Location: ../pages/keranjang.php?invoice=" . urlencode($invoiceNo ?? ''));
        exit;
    }
}

header("Location: ../pages/keranjang.php");
exit;
?>

