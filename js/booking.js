/* ============================================================
   FILOSOVET — booking.js (reservasi slot layanan)
   ============================================================ */
const SERVICES = {
  grooming: {
    label: 'Grooming', icon: '✂️',
    types: [
      { name: 'Grooming Kucing', price: 120000 },
      { name: 'Grooming Anjing <10kg', price: 150000 },
      { name: 'Grooming Anjing >10kg', price: 200000 },
      { name: 'Grooming Jamur', price: 220000 },
    ],
    staff: ['Paramedis bebas', 'Rani — Groomer', 'Bagas — Groomer'],
    slots: ['09:00', '10:30', '13:00', '14:30', '16:00'],
    hint: 'Durasi grooming ± 90 menit per slot.'
  },
  konsultasi: {
    label: 'Konsultasi Dokter Hewan', icon: '🩺',
    types: [
      { name: 'Konsultasi Umum', price: 150000 },
      { name: 'Medical Check-Up', price: 350000 },
      { name: 'Vaksinasi', price: 180000 },
      { name: 'Kontrol / Tindak Lanjut', price: 100000 },
    ],
    staff: ['Dokter jadwal', 'drh. Andini', 'drh. Prasetyo', 'drh. Larasati'],
    slots: ['08:30', '09:30', '10:30', '11:30', '13:30', '15:00', '16:30'],
    hint: 'Bawakan kartu vaksin & riwayat kesehatan bila ada.'
  },
  hotel: {
    label: 'Pet Hotel', icon: '🏨',
    types: [
      { name: 'Kandang Reguler', price: 150000 },
      { name: 'Kandang Premium', price: 250000 },
      { name: 'Kandang Suite', price: 400000 },
    ],
    staff: ['Petugas jadwal', 'Paramedis Rawat Inap'],
    slots: ['08:00', '10:00', '13:00', '15:00'], // jam check-in
    hint: 'Wajit lampirkan bukti vaksin lengkap, bebas kutu & cacing saat check-in.',
    perDay: true
  }
};

const state = { svc: 'grooming', dateIdx: 0, time: null, typeIdx: 0 };

// Ambil query ?layanan=
const params = new URLSearchParams(location.search);
if (params.get('layanan') && SERVICES[params.get('layanan')]) state.svc = params.get('layanan');

/* ---------- Tanggal: 14 hari ke depan ---------- */
function renderDates() {
  const wrap = document.getElementById('dateTabs');
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let html = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hari ini' : days[d.getDay()];
    html += `<button class="tab${i===state.dateIdx?' active':''}" data-date="${i}">
      <small style="display:block;font-weight:400">${label}</small>${d.getDate()} ${months[d.getMonth()]}</button>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll('.tab').forEach(b => b.onclick = () => { state.dateIdx = +b.dataset.date; state.time = null; renderDates(); renderSlots(); updateSummary(); });
}

/* ---------- Slot waktu (simulasi: beberapa penuh) ---------- */
function seededFull(svc, dateIdx, slot) {
  // Deterministik: kombinasi tanggal + slot menghasilkan "penuh"
  const seed = (dateIdx * 7 + slot.split(':').reduce((a, b) => a + +b, 0) + svc.length) % 10;
  return seed < 3;
}
function renderSlots() {
  const cfg = SERVICES[state.svc];
  const grid = document.getElementById('slotGrid');
  document.getElementById('slotHint').textContent = cfg.hint;
  grid.innerHTML = cfg.slots.map(t => {
    const full = seededFull(state.svc, state.dateIdx, t);
    return `<button class="tab" data-time="${t}" ${full ? 'disabled style="opacity:.35;cursor:not-allowed;text-decoration:line-through"' : ''}>${t}</button>`;
  }).join('');
  grid.querySelectorAll('.tab:not([disabled])').forEach(b => b.onclick = () => {
    grid.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.time = b.dataset.time;
    updateSummary();
  });
}

/* ---------- Layanan & tipe ---------- */
function renderService() {
  const cfg = SERVICES[state.svc];
  document.getElementById('svcType').innerHTML = cfg.types.map((t, i) =>
    `<option value="${i}">${t.name} — ${rupiah(t.price)}</option>`).join('');
  document.getElementById('svcStaff').innerHTML = cfg.staff.map(s => `<option>${s}</option>`).join('');
  document.getElementById('durasiWrap').style.display = cfg.perDay ? 'block' : 'none';
  document.querySelectorAll('#serviceTabs .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.svc === state.svc));
  state.typeIdx = 0; state.time = null;
  renderSlots(); updateSummary();
}
document.querySelectorAll('#serviceTabs .tab').forEach(t =>
  t.onclick = () => { state.svc = t.dataset.svc; renderService(); });
document.getElementById('svcType').addEventListener('change', e => { state.typeIdx = +e.target.value; updateSummary(); });
document.getElementById('hotelDurasi').addEventListener('input', updateSummary);

/* ---------- Ringkasan ---------- */
function updateSummary() {
  const cfg = SERVICES[state.svc];
  const type = cfg.types[state.typeIdx];
  const durasi = cfg.perDay ? Math.max(1, +document.getElementById('hotelDurasi').value || 1) : 1;
  const d = new Date(); d.setDate(d.getDate() + state.dateIdx);
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('selectedDateLabel').textContent =
    `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('sumService').textContent = `${cfg.icon} ${cfg.label}`;
  document.getElementById('sumType').textContent = type.name;
  document.getElementById('sumDate').textContent = state.dateIdx === 0 ? 'Hari ini' : `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  document.getElementById('sumTime').textContent = state.time || '—';
  const pet = document.getElementById('petName').value.trim();
  document.getElementById('sumPet').textContent = pet || '—';
  document.getElementById('sumPrice').textContent = rupiah(type.price * durasi);
}
['petName','petSpecies','petBreed','petWeight','petNotes'].forEach(id =>
  document.getElementById(id).addEventListener('input', updateSummary));

/* ---------- Konfirmasi ---------- */
document.getElementById('btnConfirm').addEventListener('click', () => {
  const petName = document.getElementById('petName').value.trim();
  if (!petName) return toast('Isi nama hewan terlebih dahulu', 'error');
  if (!state.time) return toast('Pilih slot waktu terlebih dahulu', 'error');

  const cfg = SERVICES[state.svc];
  const type = cfg.types[state.typeIdx];
  const durasi = cfg.perDay ? Math.max(1, +document.getElementById('hotelDurasi').value || 1) : 1;
  const code = 'FV-' + Date.now().toString(36).toUpperCase().slice(-6);
  const d = new Date(); d.setDate(d.getDate() + state.dateIdx);

  const booking = {
    code, layanan: cfg.label, icon: cfg.icon, tipe: type.name,
    tanggal: d.toISOString().slice(0, 10), waktu: state.time,
    hewan: petName, spesies: document.getElementById('petSpecies').value,
    biaya: type.price * durasi, status: 'Menunggu Konfirmasi',
    catatan: document.getElementById('petNotes').value.trim()
  };
  const all = JSON.parse(localStorage.getItem('fv_bookings') || '[]');
  all.unshift(booking);
  localStorage.setItem('fv_bookings', JSON.stringify(all));

  document.getElementById('bookingCode').value = code;
  document.getElementById('modalText').textContent =
    `${cfg.label} ${type.name} untuk ${petName} pada ${state.time} telah terdaftar. Notifikasi telah dikirim ke admin.`;
  document.getElementById('bookingModal').style.display = 'grid';
});

/* ---------- Init ---------- */
renderDates();
renderService();
