<?php
$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$isInsidePages = (strpos($scriptName, '/pages/') !== false);
$baseUrl = $isInsidePages ? '../' : '';
?>
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <div class="brand" style="color:#fff;margin-bottom:.8rem">
        <img src="<?= $baseUrl ?>assets/images/logo_filosovet.png" alt="Logo Filosovet" class="logo" style="width:36px;height:36px;border-radius:50%"> 
        Filosovet
      </div>
      <p style="font-size:.9rem;max-width:300px">Petshop & Klinik Hewan — merawat kesehatan dan kebahagiaan hewan peliharaan Anda sejak 2023.</p>
    </div>
    <div>
      <h4>Layanan</h4>
      <a href="<?= $isInsidePages ? 'daftar-layanan.php' : 'pages/daftar-layanan.php' ?>">Klinik & Dokter Hewan</a>
      <a href="<?= $isInsidePages ? 'daftar-layanan.php' : 'pages/daftar-layanan.php' ?>">Grooming</a>
      <a href="<?= $isInsidePages ? 'daftar-layanan.php' : 'pages/daftar-layanan.php' ?>">Pet Hotel</a>
      <a href="<?= $isInsidePages ? 'toko.php' : 'pages/toko.php' ?>">Toko & Farmasi</a>
    </div>
    <div>
      <h4>Bantuan</h4>
      <a href="<?= $isInsidePages ? 'booking.php' : 'pages/booking.php' ?>">Cara Booking</a>
      <a href="<?= $isInsidePages ? 'keranjang.php' : 'pages/keranjang.php' ?>">Keranjang</a>
      <a href="<?= $isInsidePages ? 'profil-pelanggan.php' : 'pages/profil-pelanggan.php' ?>">Akun Saya</a>
    </div>
    <div>
      <h4>Kontak</h4>
      <a href="#">📍 Jl. Petshop Raya No. 88</a>
      <a href="#">📞 (021) 555-0123</a>
      <a href="#">✉️ halo@filosovet.id</a>
      <a href="#">🕐 Buka setiap hari 08.00–21.00</a>
    </div>
  </div>
  <div class="footer-bottom">© <span class="js-year"><?= date('Y') ?></span> Filosovet Petshop & Klinik Hewan. Seluruh hak cipta dilindungi.</div>
</footer>
</footer>