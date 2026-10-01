<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Keranjang & Checkout | Filosovet Petshop & Klinik Hewan</title>

<!-- Pre-script Anti Flashing Dark Mode -->
<script>
  if (localStorage.getItem('fv_theme') === 'dark' || (!('fv_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark-mode');
  }
</script>

  <!-- CSS Utama (Menggunakan ../ untuk keluar dari folder pages/) -->
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/shop.css">
  <link rel="stylesheet" href="../css/admin.css">

  <!-- CSS Komponen Terpisah -->
  <link rel="stylesheet" href="../css/components/header.css">
  <link rel="stylesheet" href="../css/components/footer.css">
  
  <!-- CSS Mode Malam (Paling Bawah) -->
  <link rel="stylesheet" href="../css/dark.css">
</head>
<body>

<!-- PLACEHOLDER NAVBAR -->
<div id="header-placeholder"></div>

<!-- HERO SUB PAGE -->
<section class="page-hero" style="padding-top: 140px;">
  <div class="container">
    <h1>Keranjang & Checkout</h1>
    <div class="breadcrumb"><a href="../index.html">Beranda</a> / Keranjang</div>
  </div>
</section>

<!-- MAIN CONTENT -->
<section class="section">
  <div class="container cart-layout">
    <!-- ITEM KERANJANG (KIRI) -->
    <div class="card">
      <h3 class="mb-3">🛒 Item Keranjang</h3>
      <div id="cartItems"></div>
    </div>

    <!-- RINGKASAN BELANJA (KANAN) -->
    <div class="card summary-card">
      <h3 class="mb-3">💳 Ringkasan Belanja</h3>
      <div class="promo-row">
        <input type="text" id="promoInput" placeholder="Kode promo (coba: FILO10)">
        <button class="btn btn-outline btn-sm" id="applyPromo">Pakai</button>
      </div>
      <div class="summary-row"><span>Subtotal</span><strong id="sumSubtotal">Rp 0</strong></div>
      <div class="summary-row" id="rowDiskon" style="display:none;color:var(--primary-dark)"><span>Diskon (10%)</span><strong id="sumDiskon">-Rp 0</strong></div>
      <div class="summary-row"><span>Ongkos Kirim</span><strong id="sumOngkir">Rp 15.000</strong></div>
      <div class="ship-options">
        <label><input type="radio" name="ship" value="kirim" checked> 🚚 Dikirim ke alamat</label>
        <label><input type="radio" name="ship" value="ambil"> 🏬 Ambil di toko (gratis)</label>
      </div>
      <div class="summary-row total"><span>Total</span><span id="sumTotal">Rp 0</span></div>
      <hr class="mb-3" style="border:0;border-top:1px solid var(--border);margin:1rem 0">
      <div class="form-group">
        <label>Metode Pembayaran</label>
        <select id="payMethod">
          <option>QRIS</option>
          <option>Transfer Bank (BCA)</option>
          <option>Transfer Bank (Mandiri)</option>
          <option>Kartu Debit/Kredit</option>
          <option>COD (bayar di toko)</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="btnCheckout">Bayar Sekarang</button>
      <a href="toko.html" class="btn btn-outline btn-block" style="margin-top:.6rem">← Lanjut Belanja</a>
    </div>
  </div>
</section>

<!-- MODAL NOTA DIGITIAL -->
<div id="notaModal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:2000;place-items:center;backdrop-filter:blur(4px);">
  <div class="card" style="max-width:430px;width:92%">
    <div class="text-center mb-3">
      <div style="font-size:3rem">🧾</div>
      <h3>Pembayaran Berhasil</h3>
      <p class="muted" style="font-size:.9rem">Nota transaksi digital telah diterbitkan.</p>
    </div>
    <div class="summary-row"><span>No. Nota</span><strong id="notaNo"></strong></div>
    <div class="summary-row"><span>Item</span><strong id="notaItems"></strong></div>
    <div class="summary-row"><span>Metode</span><strong id="notaPay"></strong></div>
    <div class="summary-row total"><span>Total Dibayar</span><span id="notaTotal"></span></div>
    <button class="btn btn-primary btn-block" onclick="document.getElementById('notaModal').style.display='none'" style="margin-top:1rem">Selesai</button>
  </div>
</div>

<!-- PLACEHOLDER FOOTER -->
<div id="footer-placeholder"></div>

<!-- SCRIPTS (Urutan Panggilan Presisi & Menggunakan ../) -->
<script src="../js/cart.js"></script>
<script src="../js/main.js"></script>
<script src="../js/dark-mode.js"></script>

<script>
  // Inisialisasi Keranjang Setelah DOM Siap
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof initKeranjang === 'function') {
      initKeranjang();
    }
  });
</script>
</body>
</html>