/* ============================================================
   FILOSOVET — admin.js (dashboard operasional)
   ============================================================ */

// Data Stok Obat & Farmasi
let stocksData = [
  { id: 1, name: 'Obat Kutu Spot-On Kucing', cat: 'Obat', stock: 5, min: 10 },
  { id: 2, name: 'Antibiotik (resep dokter)', cat: 'Obat', stock: 3, min: 10 },
  { id: 3, name: 'Vitamin Bulu & Kulit 60ml', cat: 'Vitamin', stock: 12, min: 15 },
  { id: 4, name: 'Paw Balm Pelembab Telapak', cat: 'Perawatan', stock: 9, min: 12 },
  { id: 5, name: 'Shampoo Antijamur Kucing 250ml', cat: 'Grooming', stock: 18, min: 10 },
  { id: 6, name: 'Obat Cacing Broad Spectrum', cat: 'Obat', stock: 25, min: 10 }
];

// Data Transaksi Contoh
const transaksiData = [
  { id: 'TRX-20261007-01', cust: 'Rania P.', tipe: 'Layanan Grooming', total: 150000, bayar: 'QRIS', status: 'Lunas' },
  { id: 'TRX-20261007-02', cust: 'Dimas A.', tipe: 'Pet Hotel Premium', total: 450000, bayar: 'Transfer Bank', status: 'Lunas' },
  { id: 'TRX-20261007-03', cust: 'Sinta W.', tipe: 'Medical Check-Up', total: 250000, bayar: 'Tunai', status: 'Menunggu' },
  { id: 'TRX-20261006-04', cust: 'Bayu R.', tipe: 'Pembelian Produk Toko', total: 185000, bayar: 'QRIS', status: 'Lunas' }
];

document.addEventListener('DOMContentLoaded', () => {
  // Tanggal hari ini
  const now = new Date();
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('todayLabel').textContent = `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;

  renderStockAlerts();
  renderDashboardTab();
  renderBookingTab();
  renderStokTab();
  renderProdukTab();
  renderTransaksiTab();
});

// Function Perpindahan Tab Active
function switchTab(tabName) {
  // Navigasi menu
  document.querySelectorAll('.admin-menu .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
  });

  // Tampilkan tab yang dipilih
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.style.display = 'block';
  }

  // Update Judul Topbar
  const titles = {
    dashboard: 'Dashboard Operasional',
    booking: 'Manajemen Booking & Reservasi',
    stok: 'Stok Obat & Produk Farmasi',
    produk: 'Katalog Produk Toko',
    transaksi: 'Riwayat Transaksi Penjualan',
    laporan: 'Laporan Performance & Keuangan'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard Admin';
}

// 1. Peringatan Stok
function renderStockAlerts() {
  const low = stocksData.filter(s => s.stock < s.min);
  document.getElementById('stockAlert').innerHTML = low.length
    ? `<span class="bell">🔔</span> <span><strong>${low.length} produk</strong> di bawah batas minimum stok. Segera buat order ke distributor.</span>`
    : `<span>✅ Semua stok dalam kondisi aman.</span>`;
  document.getElementById('stLow').textContent = low.length;

  document.getElementById('lowStockList').innerHTML = low.length ? low.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem .8rem;background:var(--danger-bg);border-radius:10px">
      <div><strong style="font-size:.9rem">${s.name}</strong><br><small class="muted">Sisa ${s.stock} · min. ${s.min}</small></div>
      <button class="btn btn-outline btn-sm" onclick="restockItem(${s.id})">Restock</button>
    </div>`).join('')
    : '<p class="muted" style="font-size:.9rem">Tidak ada produk yang perlu di-restock.</p>';
}

// Data Booking dari LocalStorage & Contoh
function getBookings() {
  const custBookings = JSON.parse(localStorage.getItem('fv_bookings') || '[]');
  const sample = [
    { cust: 'Rania P.', layanan: '✂️ Grooming Kucing', jadwal: 'Hari ini 09:00', status: 'Diproses' },
    { cust: 'Dimas A.', layanan: '🏨 Pet Hotel — Kandang Premium', jadwal: 'Hari ini 13:00', status: 'Menunggu' },
    { cust: 'Sinta W.', layanan: '🩺 Medical Check-Up', jadwal: 'Besok 10:30', status: 'Menunggu' },
    { cust: 'Bayu R.', layanan: '✂️ Grooming Anjing', jadwal: 'Besok 14:30', status: 'Selesai' },
  ];
  return [...custBookings.map(b => ({
    cust: b.nama || 'Pelanggan',
    layanan: `${b.icon || ''} ${b.tipe || b.layanan || 'Layanan'}`,
    jadwal: `${b.tanggal || ''} ${b.waktu || ''}`,
    status: b.status || 'Menunggu'
  })), ...sample];
}

const cls = s => s === 'Selesai' ? 'status-selesai' : s === 'Menunggu' || s.includes('Menunggu') ? 'status-menunggu' : 'status-proses';

// 2. Render Tab Dashboard
function renderDashboardTab() {
  const bookings = getBookings();
  document.getElementById('adminBookingBody').innerHTML = bookings.slice(0, 5).map((b) => `
    <tr>
      <td><strong>${b.cust}</strong></td>
      <td>${b.layanan}</td>
      <td>${b.jadwal}</td>
      <td><span class="status-chip ${cls(b.status)}">${b.status}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="switchTab('booking')">Detail</button></td>
    </tr>`).join('');

  document.getElementById('stBooking').textContent = bookings.length + 9;
  document.getElementById('stRevenue').textContent = 'Rp 3.650.000';
  document.getElementById('stHotel').textContent = '78%';

  const data = [1.8, 2.4, 2.1, 2.8, 2.6, 3.1, 2.75];
  const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  document.getElementById('barChart').innerHTML = data.map((v, i) => `
    <div class="bar" style="height:${(v / Math.max(...data)) * 100}%" title="Rp ${v} juta"><span>${days[i]}</span></div>`).join('');
}

// 3. Render Tab Booking
function renderBookingTab() {
  const bookings = getBookings();
  document.getElementById('fullBookingTable').innerHTML = bookings.map((b, i) => `
    <tr>
      <td><strong>${b.cust}</strong></td>
      <td>${b.layanan}</td>
      <td>${b.jadwal}</td>
      <td><span class="status-chip ${cls(b.status)}">${b.status}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="updateStatus(${i}, 'Diproses')">Proses</button>
        <button class="btn btn-outline btn-sm" onclick="updateStatus(${i}, 'Selesai')">Selesai</button>
      </td>
    </tr>`).join('');
}

function updateStatus(idx, newStatus) {
  if (typeof toast === 'function') toast(`Status booking diperbarui menjadi ${newStatus}`);
  renderBookingTab();
}

// 4. Render Tab Stok & Farmasi
function renderStokTab() {
  document.getElementById('stokTableBody').innerHTML = stocksData.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.cat}</td>
      <td><strong style="color:${s.stock < s.min ? 'var(--danger)' : 'inherit'}">${s.stock}</strong></td>
      <td>${s.min}</td>
      <td><span class="status-chip ${s.stock < s.min ? 'status-batal' : 'status-selesai'}">${s.stock < s.min ? 'Kurang' : 'Aman'}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="restockItem(${s.id})">+ Restock (+10)</button></td>
    </tr>`).join('');
}

function restockItem(id) {
  const item = stocksData.find(s => s.id === id);
  if (item) {
    item.stock += 10;
    if (typeof toast === 'function') toast(`Berhasil menambahkan stok untuk ${item.name}`);
    renderStockAlerts();
    renderStokTab();
  }
}

function restockAll() {
  stocksData.forEach(s => {
    if (s.stock < s.min) s.stock += 15;
  });
  if (typeof toast === 'function') toast('Order restock masal telah dikirim ke distributor!');
  renderStockAlerts();
  renderStokTab();
}

// 5. Render Tab Produk
function renderProdukTab() {
  const prods = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [
    { name: 'Dry Food Kucing Premium 1,5kg', cat: 'Makanan', price: 185000, stock: 24, sold: 312 },
    { name: 'Dry Food Anjing Adult 3kg', cat: 'Makanan', price: 265000, stock: 18, sold: 245 },
    { name: 'Wet Food Kucing Tuna 85g', cat: 'Makanan', price: 22000, stock: 60, sold: 580 },
    { name: 'Obat Cacing Broad Spectrum', cat: 'Obat', price: 35000, stock: 40, sold: 410 }
  ];

  document.getElementById('produkTableBody').innerHTML = prods.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.cat}</td>
      <td>${typeof rupiah === 'function' ? rupiah(p.price) : 'Rp ' + p.price.toLocaleString('id-ID')}</td>
      <td>${p.stock}</td>
      <td>${p.sold || 0}</td>
      <td><button class="btn btn-outline btn-sm" onclick="toast('Edit produk ${p.name}')">Edit</button></td>
    </tr>`).join('');
}

// 6. Render Tab Transaksi
function renderTransaksiTab() {
  document.getElementById('transaksiTableBody').innerHTML = transaksiData.map(t => `
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.cust}</td>
      <td>${t.tipe}</td>
      <td>${typeof rupiah === 'function' ? rupiah(t.total) : 'Rp ' + t.total.toLocaleString('id-ID')}</td>
      <td>${t.bayar}</td>
      <td><span class="status-chip ${t.status === 'Lunas' ? 'status-selesai' : 'status-menunggu'}">${t.status}</span></td>
    </tr>`).join('');
}

// Helper Export Data
function exportData(type) {
  if (typeof toast === 'function') toast(`Mengunduh file rekap ${type}...`);
}