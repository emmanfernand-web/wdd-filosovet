<?php require_once __DIR__ . '/config/session.php'; ?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Filosovet — Petshop & Klinik Hewan</title>

  <!-- Anti-Flashing Dark Mode -->
  <script>
    if (localStorage.getItem('fv_theme') === 'dark' || (!('fv_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark-mode');
    }
  </script>

  <!-- CSS Global & Komponen -->
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/components/header.css">
  <link rel="stylesheet" href="css/components/footer.css">

  <!-- CSS Khusus Beranda (Full Screen 16:9 / 100vh Layout) -->
  <link rel="stylesheet" href="css/index.css">

  <!-- CSS Dark Mode (Wajib Paling Bawah) -->
  <link rel="stylesheet" href="css/dark.css">
</head>
<body>

  <!-- HEADER NAVBAR -->
  <?php include __DIR__ . '/components/header.php'; ?>

  <!-- CONTAINER SCROLL SNAP UTAMA -->
  <main class="snap-container">

    <!-- SECTION 1: HERO (Full Screen with Glassmorphism Card on Right) -->
    <section class="fullscreen-section hero-section" id="hero">
      <div class="hero-overlay"></div>
      <div class="container hero-content">
        <div class="hero-inner">
          
          <!-- SISI KIRI -->
          <div class="hero-left-blank"></div>

          <!-- SISI KANAN (Glassmorphism Card) -->
          <div class="hero-glass-card">
            <span class="sec-tag hero-tag">Klinik & Petshop Terpercaya</span>
            <h1 class="hero-title">Merawat Kesehatan & Kebahagiaan Anabul Anda</h1>
            <p class="hero-desc">
              Layanan medis profesional, perawatan grooming terpadu, dan kebutuhan hewan peliharaan terlengkap dengan kasih sayang penuh.
            </p>
            
            <!-- Tombol CTA Inside Glass Card -->
            <div class="hero-cta-group">
              <a href="pages/booking.php" class="btn btn-accent btn-hero-primary">Booking Perawatan</a>
              <a href="pages/daftar-layanan.php" class="btn btn-outline-hero">Lihat Layanan</a>
            </div>

            <!-- Stats Ringkas Inside Glass Card -->
            <div class="hero-stats-grid">
              <div>
                <strong>1,500+</strong>
                <span>Anabul Ditolong</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Rating Pelanggan</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Layanan Darurat</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 2: LAYANAN UNGGULAN (100vh) -->
    <section class="fullscreen-section" id="services">
      <div class="container my-auto">
        <div class="sec-head">
          <span class="sec-tag">Layanan Kami</span>
          <h2>Solusi Lengkap untuk Hewan Kesayangan</h2>
          <p class="muted">Pilih layanan medis dan perawatan terbaik yang dirancang khusus oleh dokter hewan berpengalaman.</p>
        </div>
        <div class="grid grid-4">
          <a href="pages/daftar-layanan.php" class="card service-card">
            <div class="card-img-wrap">
              <img src="assets/images/clinic.jpeg" alt="Klinik & Medis" class="card-img">
            </div>
            <h3>Klinik & Medis</h3>
            <p class="muted">Konsultasi dokter, vaksinasi, operasi, dan pemeriksaan kesehatan berkala.</p>
            <span class="card-link">Selengkapnya →</span>
          </a>

          <a href="pages/daftar-layanan.php" class="card service-card">
            <div class="card-img-wrap">
              <img src="assets/images/grooming.jpeg" alt="Grooming Spa" class="card-img">
            </div>
            <h3>Grooming Spa</h3>
            <p class="muted">Mandi mandi jamur, potong kuku, styling bulu, dan pembersihan telinga.</p>
            <span class="card-link">Selengkapnya →</span>
          </a>

          <a href="pages/daftar-layanan.php" class="card service-card">
            <div class="card-img-wrap">
              <img src="assets/images/pet_hotel.jpeg" alt="Pet Hotel" class="card-img">
            </div>
            <h3>Pet Hotel</h3>
            <p class="muted">Penitipan hewan dengan fasilitas AC, ruang bermain luas, dan pemantauan harian.</p>
            <span class="card-link">Selengkapnya →</span>
          </a>

          <a href="pages/toko.php" class="card service-card">
            <div class="card-img-wrap">
              <img src="assets/images/pet_store.jpeg" alt="Farmasi & Toko" class="card-img">
            </div>
            <h3>Farmasi & Toko</h3>
            <p class="muted">Obat-obatan resmi, pakan premium, suplemen, serta aksesori terlengkap.</p>
            <span class="card-link">Selengkapnya →</span>
          </a>
        </div>
      </div>
    </section>

    <!-- SECTION 3: MENGAPA FILOSOVET (100vh) -->
    <section class="fullscreen-section bg-alt" id="why-us">
      <div class="container my-auto">
        <div class="sec-head">
          <span class="sec-tag">Keunggulan</span>
          <h2>Mengapa Mempercayakan Anabul ke Filosovet?</h2>
        </div>
        <div class="grid grid-3">
          <a href="pages/daftar-layanan.php" class="card feature-card">
            <div class="card-img-wrap">
              <img src="assets/images/great_doctor.jpeg" alt="Dokter Berpengalaman" class="card-img">
            </div>
            <h3>Dokter Berpengalaman</h3>
            <p class="muted">Tim dokter hewan bersertifikasi yang menangani setiap pasien dengan standar medis tinggi.</p>
          </a>

          <a href="pages/daftar-layanan.php" class="card feature-card">
            <div class="card-img-wrap">
              <img src="assets/images/modern_facility.jpeg" alt="Fasilitas Modern" class="card-img">
            </div>
            <h3>Fasilitas Modern</h3>
            <p class="muted">Peralatan medis canggih untuk diagnosis akurat serta ruang perawatan yang higienis dan nyaman.</p>
          </a>

          <a href="pages/daftar-layanan.php" class="card feature-card">
            <div class="card-img-wrap">
              <img src="assets/images/pet_handling.jpeg" alt="Pendekatan Bebas Stres" class="card-img">
            </div>
            <h3>Pendekatan Bebas Stres</h3>
            <p class="muted">Metode penanganan hewan yang lembut (*fear-free handle*) agar anabul tidak merasa takut.</p>
          </a>
        </div>
      </div>
    </section>

    <!-- SECTION 4: CTA BANNER & FOOTER (100vh) -->
    <section class="fullscreen-section footer-section" id="contact">
      <div class="container my-auto">
        <div class="cta-banner">
          <h2>Siap Memberikan yang Terbaik untuk Anabul?</h2>
          <p style="margin-bottom: 2rem; opacity: 0.9;">Jadwalkan kunjungan klinik atau booking grooming dalam hitungan detik.</p>
          <a href="pages/booking.php" class="btn btn-accent btn-lg">Booking Konsultasi Sekarang</a>
        </div>
      </div>
      <!-- FOOTER -->
      <div style="width: 100%;">
        <?php include __DIR__ . '/components/footer.php'; ?>
      </div>
    </section>

  </main>

  </main>

  <!-- SCRIPTS -->
  <script src="js/cart.js"></script>
  <script src="js/main.js"></script>
  <script src="js/dark-mode.js"></script>
</body>
</html>
