<?php
require_once __DIR__ . '/../config/session.php';

$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$isInsidePages = (strpos($scriptName, '/pages/') !== false);
$baseUrl = $isInsidePages ? '../' : '';
$currentPage = basename($scriptName);
$currentUser = getCurrentUser();
?>
<header class="site-header">
  <div class="container nav-wrap">
    <a href="<?= $baseUrl ?>index.php" class="brand" title="Kembali ke Beranda">
      <img src="<?= $baseUrl ?>assets/images/logo_filosovet.png" alt="Filosovet" class="logo">
    </a>

    <nav class="main-nav">
      <a href="<?= $baseUrl ?>index.php" data-page="index.php" class="<?= ($currentPage === 'index.php' && !$isInsidePages) ? 'active' : '' ?>">Beranda</a>
      <a href="<?= $isInsidePages ? 'daftar-layanan.php' : 'pages/daftar-layanan.php' ?>" data-page="daftar-layanan.php" class="<?= ($currentPage === 'daftar-layanan.php') ? 'active' : '' ?>">Layanan</a>
      <a href="<?= $isInsidePages ? 'booking.php' : 'pages/booking.php' ?>" data-page="booking.php" class="<?= ($currentPage === 'booking.php') ? 'active' : '' ?>">Booking</a>
      <a href="<?= $isInsidePages ? 'toko.php' : 'pages/toko.php' ?>" data-page="toko.php" class="<?= ($currentPage === 'toko.php') ? 'active' : '' ?>">Toko</a>
      <a href="<?= $isInsidePages ? 'profil-pelanggan.php' : 'pages/profil-pelanggan.php' ?>" data-page="profil-pelanggan.php" class="<?= ($currentPage === 'profil-pelanggan.php') ? 'active' : '' ?>">Profil</a>
    </nav>

    <div class="nav-actions">
      <a href="<?= $isInsidePages ? 'keranjang.php' : 'pages/keranjang.php' ?>" class="cart-link" title="Keranjang">🛒<span class="cart-count" style="display:none">0</span></a>
      <?php if ($currentUser): ?>
        <?php if (($currentUser['role'] ?? '') === 'admin'): ?>
          <a href="<?= $isInsidePages ? 'dashboard-admin.php' : 'pages/dashboard-admin.php' ?>" class="btn-login" style="background:var(--secondary);color:#fff">Admin</a>
        <?php else: ?>
          <a href="<?= $isInsidePages ? 'profil-pelanggan.php' : 'pages/profil-pelanggan.php' ?>" class="btn-login"><?= htmlspecialchars($currentUser['name'] ?? 'Profil') ?></a>
        <?php endif; ?>
        <a href="<?= $baseUrl ?>actions/process-auth.php?action=logout" class="btn-login" style="background:transparent;border:1px solid var(--border);color:var(--text);margin-left:0.4rem" title="Keluar">Keluar</a>
      <?php else: ?>
        <a href="<?= $isInsidePages ? 'auth.php' : 'pages/auth.php' ?>" class="btn-login">Masuk</a>
      <?php endif; ?>
      <button class="hamburger" aria-label="Menu">☰</button>
    </div>
  </div>
</header>