/* ============================================================
   FILOSOVET — admin.js (dashboard operasional)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Tanggal hari ini
  const now = new Date();
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  document.getElementById('todayLabel').textContent =
    `${hari[now.getDay()]}, ${now.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][now.getMonth()]} ${now.getFullYear()}`;

  // Data stok (sinkron dengan cart.js)
  const stocks = [
    { name: 'Obat Kutu Spot-On Kucing', stock: 5, min: 10 },
    { name: 'Antibiotik (resep dokter)', stock: 3, min: 10 },
    { name: 'Vitamin Bulu & Kulit 60ml', stock: 12, min: 15 },
    { name: 'Paw Balm Pelembab Telapak', stock: 9, min: 12 },
  ];
  const low = stocks.filter(s => s.stock < s.min);

  // Peringatan stok
  document.getElementById('stockAlert').innerHTML = low.length
    ? `<span class="bell">🔔</span> <span><strong>${low.length} produk</strong> di bawah batas minimum stok. Segera buat order ke distributor.</span>`
    : `<span>✅ Semua stok dalam kondisi aman.</span>`;
  document.getElementById('stLow').textContent = low.length;

  document.getElementById('lowStockList').innerHTML = low.length ? low.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem .8rem;background:var(--danger-bg);border-radius:10px">
      <div><strong style="font-size:.9rem">${s.name}</strong><br><small class="muted">Sisa ${s.stock} · min. ${s.min}</small></div>
      <span class="badge badge-red">Restock</span>
    </div>`).join('')
    : '<p class="muted" style="font-size:.9rem">Tidak ada produk yang perlu di-restock.</p>';

  // Booking: dari localStorage pelanggan + contoh
  const custBookings = JSON.parse(localStorage.getItem('fv_bookings') || '[]');
  const sample = [
    { cust: 'Rania P.', layanan: '✂️ Grooming Kucing', jadwal: 'Hari ini 09:00', status: 'Diproses' },
    { cust: 'Dimas A.', layanan: '🏨 Pet Hotel — Kandang Premium', jadwal: 'Hari ini 13:00', status: 'Menunggu' },
    { cust: 'Sinta W.', layanan: '🩺 Medical Check-Up', jadwal: 'Besok 10:30', status: 'Menunggu' },
    { cust: 'Bayu R.', layanan: '✂️ Grooming Anjing', jadwal: 'Besok 14:30', status: 'Selesai' },
  ];
  const bookings = [...custBookings.map(b => ({ cust: userName(), layanan: `${b.icon || ''} ${b.tipe}`, jadwal: `${b.tanggal} ${b.waktu}`, status: b.status })), ...sample];
  function userName() { const u = JSON.parse(localStorage.getItem('fv_user') || 'null'); return u ? u.name : 'Pelanggan'; }

  const cls = s => s === 'Selesai' ? 'status-selesai' : s === 'Menunggu' || s.includes('Menunggu') ? 'status-menunggu' : 'status-proses';
  document.getElementById('adminBookingBody').innerHTML = bookings.map((b, i) => `
    <tr><td><strong>${b.cust}</strong></td><td>${b.layanan}</td><td>${b.jadwal}</td>
    <td><span class="status-chip ${cls(b.status)}">${b.status}</span></td>
    <td><button class="btn btn-outline btn-sm" onclick="toast('Detail booking ${b.cust} (demo)')">Detail</button></td></tr>`).join('');

  // Statistik
  document.getElementById('stBooking').textContent = bookings.length + 9;
  document.getElementById('stRevenue').textContent = rupiah(2750000 + bookings.length * 150000);
  document.getElementById('stHotel').textContent = '78%';

  // Grafik batang pendapatan
  const data = [1.8, 2.4, 2.1, 2.8, 2.6, 3.1, 2.75]; // juta
  const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  document.getElementById('barChart').innerHTML = data.map((v, i) => `
    <div class="bar" style="height:${(v / Math.max(...data)) * 100}%" title="Rp ${v} juta"><span>${days[i]}</span></div>`).join('');
});
