<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Profil & Riwayat | Filosovet Petshop & Klinik Hewan</title>

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
  
  <!-- CSS Mode Malam (Selalu Paling Bawah) -->
  <link rel="stylesheet" href="../css/dark.css">
</head>
<body>

<!-- PLACEHOLDER NAVBAR -->
<div id="header-placeholder"></div>

<!-- HERO SUB PAGE -->
<section class="page-hero" style="padding-top: 140px;">
  <div class="container">
    <h1>Profil & Riwayat Pelanggan</h1>
    <div class="breadcrumb"><a href="../index.html">Beranda</a> / Profil</div>
  </div>
</section>

<!-- MAIN CONTENT -->
<section class="section">
  <div class="container cart-layout" style="display: grid; grid-template-columns: 280px 1fr; gap: 2rem; align-items: start;">
    <!-- MENU SAMPING (STICKY SIDEBAR) -->
    <aside class="card" style="position:sticky;top:100px;z-index:10">
      <div class="text-center mb-4">
        <div class="avatar" style="width:72px;height:72px;font-size:1.6rem;margin:0 auto .8rem" id="profilAvatar">A</div>
        <h3 id="profilName">Pengunjung</h3>
        <p class="muted" style="font-size:.85rem" id="profilEmail">—</p>
        <span class="badge badge-teal mt-2" style="margin-top:.5rem">👑 Member Filosovet</span>
      </div>
      <nav class="admin-menu" style="display:grid;gap:.3rem">
        <a href="#panelProfil" class="side-link active" data-panel="panelProfil">👤 Data Diri</a>
        <a href="#panelHewan" class="side-link" data-panel="panelHewan">🐾 Hewan Peliharaan</a>
        <a href="#panelBooking" class="side-link" data-panel="panelBooking">📅 Riwayat Booking</a>
        <a href="#panelMedis" class="side-link" data-panel="panelMedis">📋 Rekam Medis</a>
        <a href="#panelTransaksi" class="side-link" data-panel="panelTransaksi">🧾 Riwayat Transaksi</a>
      </nav>
      <button class="btn btn-danger btn-sm btn-block mt-3" style="margin-top:1rem" onclick="logout()">Keluar Akun</button>
    </aside>

    <!-- PANEL KONTEN KANAN -->
    <div>
      <!-- 1. DATA DIRI -->
      <div class="card mb-4 prof-panel" id="panelProfil">
        <h3 class="mb-3">👤 Data Diri</h3>
        <div class="form-row">
          <div class="form-group"><label>Nama Lengkap</label><input type="text" id="pName" value="Ayu Lestari"></div>
          <div class="form-group"><label>Nomor HP</label><input type="tel" id="pPhone" value="0812-3456-7890"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input type="email" id="pEmail" value="ayu@email.com"></div>
          <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="pDob" value="2000-05-12"></div>
        </div>
        <div class="form-group"><label>Alamat</label><textarea id="pAddr" rows="2">Jl. Melati No. 12, Tangerang</textarea></div>
        <button class="btn btn-primary" onclick="toast('Profil berhasil diperbarui')">Simpan Perubahan</button>
      </div>

      <!-- 2. HEWAN PELIHARAAN -->
      <div class="card mb-4 prof-panel" id="panelHewan" style="display:none">
        <div class="panel-head" style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center">
          <h3>🐾 Hewan Peliharaan</h3>
          <button class="btn btn-outline btn-sm" onclick="toast('Fitur tambah hewan (demo)')">+ Tambah</button>
        </div>
        <div class="grid grid-2">
          <div class="card" style="box-shadow:none">
            <div style="display:flex;gap:1rem;align-items:center">
              <div style="font-size:2.5rem">🐱</div>
              <div>
                <strong>Momo</strong> <span class="muted" style="font-size:.85rem">— Kucing Persia, 3,5 kg</span>
                <div style="margin-top:.3rem"><span class="badge badge-green">✔ Vaksin lengkap</span> <span class="badge badge-blue">Steril</span></div>
              </div>
            </div>
          </div>
          <div class="card" style="box-shadow:none">
            <div style="display:flex;gap:1rem;align-items:center">
              <div style="font-size:2.5rem">🐶</div>
              <div>
                <strong>Bubu</strong> <span class="muted" style="font-size:.85rem">— Golden Retriever, 18 kg</span>
                <div style="margin-top:.3rem"><span class="badge badge-amber">⚠ Vaksin diperbarui 2 bln lagi</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. RIWAYAT BOOKING -->
      <div class="card mb-4 prof-panel" id="panelBooking" style="display:none">
        <h3 class="mb-3">📅 Riwayat Booking</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Kode</th><th>Layanan</th><th>Tanggal</th><th>Waktu</th><th>Hewan</th><th>Biaya</th><th>Status</th></tr></thead>
            <tbody id="bookingHistoryBody"></tbody>
          </table>
        </div>
      </div>

      <!-- 4. REKAM MEDIS -->
      <div class="card mb-4 prof-panel" id="panelMedis" style="display:none">
        <h3 class="mb-3">📋 Rekam Medis</h3>
        <div style="display:grid;gap:.9rem" id="medisList"></div>
      </div>

      <!-- 5. RIWAYAT TRANSAKSI -->
      <div class="card prof-panel" id="panelTransaksi" style="display:none">
        <h3 class="mb-3">🧾 Riwayat Transaksi</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>No. Nota</th><th>Tanggal</th><th>Item</th><th>Metode</th><th>Total</th></tr></thead>
            <tbody id="orderHistoryBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PLACEHOLDER FOOTER -->
<div id="footer-placeholder"></div>

<!-- SCRIPTS (Urutan Panggilan Sesuai Struktur Folder Baru) -->
<script src="../js/cart.js"></script>
<script src="../js/main.js"></script>
<script src="../js/dark-mode.js"></script>

<script>
// Load Data User
const user = JSON.parse(localStorage.getItem('fv_user') || 'null');
if (user) {
  document.getElementById('profilName').textContent = user.name;
  document.getElementById('profilEmail').textContent = user.email || '';
  document.getElementById('profilAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('pName').value = user.name;
  document.getElementById('pEmail').value = user.email || '';
}

function logout() { 
  localStorage.removeItem('fv_user'); 
  toast('Anda telah keluar'); 
  setTimeout(() => location.href = 'auth.html', 800); 
}

// Navigasi Menu Samping Panel
document.querySelectorAll('.side-link').forEach(a => a.onclick = e => {
  e.preventDefault();
  document.querySelectorAll('.side-link').forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  document.querySelectorAll('.prof-panel').forEach(p => p.style.display = 'none');
  document.getElementById(a.dataset.panel).style.display = 'block';
});

// Render Riwayat Booking
const sampleBookings = [
  { code: 'FV-8K2M1P', layanan: 'Grooming', icon: '✂️', tipe: 'Grooming Kucing', tanggal: '2026-08-28', waktu: '10:30', hewan: 'Momo', biaya: 120000, status: 'Selesai', catatan: '' },
  { code: 'FV-7J4N2Q', layanan: 'Konsultasi Dokter Hewan', icon: '🩺', tipe: 'Vaksinasi', tanggal: '2026-08-15', waktu: '09:30', hewan: 'Bubu', biaya: 180000, status: 'Selesai', catatan: '' },
];
const myBookings = [...(JSON.parse(localStorage.getItem('fv_bookings') || '[]')), ...sampleBookings];
const statusClass = s => s === 'Selesai' ? 'status-selesai' : s.includes('Menunggu') ? 'status-menunggu' : 'status-proses';

document.getElementById('bookingHistoryBody').innerHTML = myBookings.length ? myBookings.map(b => `
  <tr>
    <td><strong>${b.code}</strong></td>
    <td>${b.icon || ''} ${b.tipe}</td>
    <td>${b.tanggal}</td>
    <td>${b.waktu}</td>
    <td>${b.hewan}</td>
    <td>${rupiah(b.biaya)}</td>
    <td><span class="status-chip ${statusClass(b.status)}">${b.status}</span></td>
  </tr>`).join('')
  : '<tr><td colspan="7" class="text-center muted">Belum ada riwayat booking.</td></tr>';

// Render Rekam Medis
document.getElementById('medisList').innerHTML = [
  { icon: '🐱', pet: 'Momo', tgl: '28 Agt 2026', ket: 'Grooming sehat — kondisi kulit normal, berat stabil 3,5 kg.', oleh: 'Rani (Groomer)' },
  { icon: '🐶', pet: 'Bubu', tgl: '15 Agt 2026', ket: 'Vaksin rabies dosis kedua. Tidak ada reaksi. Kontrol 1 tahun.', oleh: 'drh. Andini' },
  { icon: '🐶', pet: 'Bubu', tgl: '02 Jul 2026', ket: 'Konsultasi kulit — diberikan shampoo anti-jamur, grooming jamur 2x seminggu.', oleh: 'drh. Prasetyo' },
].map(m => `
  <div style="display:flex;gap:1rem;padding:1rem;border:1px solid var(--border);border-radius:12px">
    <div style="font-size:2rem">${m.icon}</div>
    <div>
      <strong>${m.pet}</strong> <span class="muted" style="font-size:.8rem">· ${m.tgl} · oleh ${m.oleh}</span>
      <p style="font-size:.9rem;margin-top:.2rem">${m.ket}</p>
    </div>
  </div>`).join('');

// Render Riwayat Transaksi
const myOrders = JSON.parse(localStorage.getItem('fv_orders') || '[]');
document.getElementById('orderHistoryBody').innerHTML = myOrders.length ? myOrders.map(o => `
  <tr>
    <td><strong>${o.no}</strong></td>
    <td>${o.tanggal.slice(0, 10)}</td>
    <td>${o.item}</td>
    <td>${o.metode}</td>
    <td><strong>${rupiah(o.total)}</strong></td>
  </tr>`).join('')
  : '<tr><td colspan="5" class="text-center muted">Belum ada transaksi.</td></tr>';
</script>
</body>
</html>