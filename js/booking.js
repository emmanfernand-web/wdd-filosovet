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
    staff: ['drh. Andini', 'drh. Prasetyo', 'drh. Larasati'],
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
    staff: ['Paramedis Rawat Inap'],
    slots: ['08:00', '10:00', '13:00', '15:00'], // jam check-in
    hint: 'Wajib lampirkan bukti vaksin lengkap, bebas kutu & cacing saat check-in.',
    perDay: true
  }
};

const state = { svc: 'grooming', dateIdx: 0, time: null, typeIdx: 0 };

/* ---------- Tanggal: 14 hari ke depan ---------- */
function renderDates() {
  const wrap = document.getElementById('dateTabs');
  if (!wrap) return;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let html = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hari ini' : days[d.getDay()];
    html += `<button type="button" class="tab${i===state.dateIdx?' active':''}" data-date="${i}">
      <small>${label}</small>${d.getDate()} ${months[d.getMonth()]}</button>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll('.tab').forEach(b => b.onclick = () => { 
    state.dateIdx = +b.dataset.date; 
    state.time = null; 
    renderDates(); 
    renderSlots(); 
    updateSummary(); 
  });
}

/* ---------- Slot waktu (simulasi: beberapa penuh) ---------- */
function seededFull(svc, dateIdx, slot) {
  const seed = (dateIdx * 7 + slot.split(':').reduce((a, b) => a + +b, 0) + svc.length) % 10;
  return seed < 3;
}

function renderSlots() {
  const cfg = SERVICES[state.svc];
  const grid = document.getElementById('slotGrid');
  const slotHint = document.getElementById('slotHint');
  if (slotHint) slotHint.textContent = cfg.hint;
  if (!grid) return;

  grid.innerHTML = cfg.slots.map(t => {
    const full = seededFull(state.svc, state.dateIdx, t);
    return `<button type="button" class="tab" data-time="${t}" ${full ? 'disabled' : ''}>${t}</button>`;
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
  if (!cfg) return;

  const typeEl = document.getElementById('svcType');
  const staffEl = document.getElementById('svcStaff');
  const durasiWrap = document.getElementById('durasiWrap');

  if (typeEl) {
    typeEl.innerHTML = cfg.types.map((t, i) =>
      `<option value="${i}">${t.name} — ${rupiah(t.price)}</option>`).join('');
    typeEl.value = "0";
  }

  if (staffEl) {
    staffEl.innerHTML = cfg.staff.map(s => `<option>${s}</option>`).join('');
    staffEl.value = cfg.staff[0] || '';
  }

  if (durasiWrap) {
    durasiWrap.style.display = cfg.perDay ? 'block' : 'none';
  }

  document.querySelectorAll('#serviceTabs .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.svc === state.svc));

  state.typeIdx = 0; 
  state.time = null;
  renderSlots(); 
  updateSummary();
}

/* ---------- Ringkasan ---------- */
function updateSummary() {
  const cfg = SERVICES[state.svc];
  if (!cfg) return;
  const type = cfg.types[state.typeIdx] || cfg.types[0];
  const hotelDurasiEl = document.getElementById('hotelDurasi');
  const durasi = cfg.perDay ? Math.max(1, +(hotelDurasiEl ? hotelDurasiEl.value : 1) || 1) : 1;
  const d = new Date(); d.setDate(d.getDate() + state.dateIdx);
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  const dateLabel = document.getElementById('selectedDateLabel');
  if (dateLabel) {
    dateLabel.textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  const sumService = document.getElementById('sumService');
  if (sumService) sumService.textContent = `${cfg.icon} ${cfg.label}`;

  const sumType = document.getElementById('sumType');
  if (sumType) sumType.textContent = type.name;

  const sumDate = document.getElementById('sumDate');
  if (sumDate) sumDate.textContent = state.dateIdx === 0 ? 'Hari ini' : `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

  const sumTime = document.getElementById('sumTime');
  if (sumTime) sumTime.textContent = state.time || '—';

  const petNameEl = document.getElementById('petName');
  const pet = petNameEl ? petNameEl.value.trim() : '';
  const sumPet = document.getElementById('sumPet');
  if (sumPet) sumPet.textContent = pet || '—';

  const sumPrice = document.getElementById('sumPrice');
  if (sumPrice) sumPrice.textContent = rupiah(type.price * durasi);
}

function initBookingEvents() {
  document.querySelectorAll('#serviceTabs .tab').forEach(t => {
    t.onclick = () => { 
      state.svc = t.dataset.svc; 
      renderService(); 
    };
  });

  const typeEl = document.getElementById('svcType');
  if (typeEl) {
    typeEl.onchange = e => { 
      state.typeIdx = +e.target.value; 
      updateSummary(); 
    };
  }

  const durasiEl = document.getElementById('hotelDurasi');
  if (durasiEl) {
    durasiEl.oninput = updateSummary;
  }

  ['petName','petSpecies','petBreed','petWeight','petNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updateSummary;
  });

  const btnConfirm = document.getElementById('btnConfirm');
  if (btnConfirm) {
    btnConfirm.onclick = () => {
      const petNameEl = document.getElementById('petName');
      const petName = petNameEl ? petNameEl.value.trim() : '';
      if (!petName) return toast('Isi nama hewan terlebih dahulu', 'error');
      if (!state.time) return toast('Pilih slot waktu terlebih dahulu', 'error');

      const cfg = SERVICES[state.svc];
      const type = cfg.types[state.typeIdx];
      const hotelDurasi = document.getElementById('hotelDurasi');
      const durasi = cfg.perDay ? Math.max(1, +(hotelDurasi ? hotelDurasi.value : 1) || 1) : 1;
      const code = 'FV-' + Date.now().toString(36).toUpperCase().slice(-6);
      const d = new Date(); d.setDate(d.getDate() + state.dateIdx);

      const booking = {
        code, layanan: cfg.label, icon: cfg.icon, tipe: type.name,
        tanggal: d.toISOString().slice(0, 10), waktu: state.time,
        hewan: petName, spesie: document.getElementById('petSpecies')?.value || 'Kucing',
        biaya: type.price * durasi, status: 'Menunggu Konfirmasi',
        catatan: document.getElementById('petNotes')?.value.trim() || ''
      };
      const all = JSON.parse(localStorage.getItem('fv_bookings') || '[]');
      all.unshift(booking);
      localStorage.setItem('fv_bookings', JSON.stringify(all));

      const codeEl = document.getElementById('bookingCode');
      if (codeEl) codeEl.value = code;
      const modalTextEl = document.getElementById('modalText');
      if (modalTextEl) {
        modalTextEl.textContent = `${cfg.label} ${type.name} untuk ${petName} pada ${state.time} telah terdaftar. Notifikasi telah dikirim ke admin.`;
      }
      const modal = document.getElementById('bookingModal');
      if (modal) modal.style.display = 'grid';
    };
  }
}

function initBooking() {
  const params = new URLSearchParams(location.search);
  const paramSvc = params.get('layanan');
  if (paramSvc && SERVICES[paramSvc]) {
    state.svc = paramSvc;
  } else {
    state.svc = 'grooming';
  }

  renderDates();
  renderService();
  initBookingEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}
