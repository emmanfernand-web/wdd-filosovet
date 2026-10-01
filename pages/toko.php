<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Toko Produk & Farmasi | Filosovet Petshop & Klinik Hewan</title>

<!-- Pre-script Anti Flashing Dark Mode -->
<script>
  if (localStorage.getItem('fv_theme') === 'dark' || (!('fv_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark-mode');
  }
</script>

  <!-- CSS Utama (Gunakan ../ untuk keluar dari folder pages/) -->
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/shop.css">
  <link rel="stylesheet" href="../css/admin.css">

  <!-- CSS Komponen Terpisah -->
  <link rel="stylesheet" href="../css/components/header.css">
  <link rel="stylesheet" href="../css/components/footer.css">
  
  <!-- CSS Mode Malam -->
  <link rel="stylesheet" href="../css/dark.css">
</head>
<body>

<!-- PLACEHOLDER NAVBAR -->
<div id="header-placeholder"></div>

<!-- HERO SUB PAGE -->
<section class="page-hero">
  <div class="container">
    <h1>Toko Produk & Farmasi</h1>
    <div class="breadcrumb"><a href="../index.html">Beranda</a> / Toko</div>
  </div>
</section>

<!-- KONTEN TOKO -->
<section class="section">
  <div class="container shop-layout">
    <!-- FILTER (SIDEBAR KIRI) -->
    <aside class="card filter-card">
      <h3>🔍 Filter Produk</h3>
      <div class="filter-group">
        <label>Pencarian</label>
        <div class="search-box"><input type="text" id="searchInput" placeholder="Cari produk..."></div>
      </div>
      <div class="filter-group">
        <label>Kategori</label>
        <div id="catFilters">
          <label class="filter-check"><input type="checkbox" value="makanan" checked> 🍖 Makanan Hewan</label>
          <label class="filter-check"><input type="checkbox" value="obat" checked> 💊 Obat & Vitamin</label>
          <label class="filter-check"><input type="checkbox" value="skincare" checked> 🧴 Skincare</label>
          <label class="filter-check"><input type="checkbox" value="aksesoris" checked> 🎾 Aksesoris</label>
          <label class="filter-check"><input type="checkbox" value="almed" checked> 🩹 Alat Medis</label>
        </div>
      </div>
      <div class="filter-group">
        <label>Urutkan</label>
        <select id="sortSelect">
          <option value="populer">Paling populer</option>
          <option value="price-asc">Harga termurah</option>
          <option value="price-desc">Harga termahal</option>
          <option value="name-asc">Nama A–Z</option>
        </select>
      </div>
      <button class="btn btn-outline btn-sm btn-block" id="resetFilter">Reset Filter</button>
    </aside>

    <!-- GRID PRODUK (KANAN) -->
    <div>
      <p class="muted mb-3" id="resultInfo" style="font-size:.9rem"></p>
      <div class="product-grid" id="productGrid"></div>
    </div>
  </div>
</section>

<!-- PLACEHOLDER FOOTER -->
<div id="footer-placeholder"></div>

<!-- SCRIPTS (Urutan Harus Tepat & Menggunakan ../) -->
<script src="../js/cart.js"></script>
<script src="../js/toko.js"></script>
<script src="../js/main.js"></script>
<script src="../js/dark-mode.js"></script>
</body>
</html>