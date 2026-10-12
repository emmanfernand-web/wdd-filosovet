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

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const _now = new Date();
const today = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());

const state = {
  svc: 'grooming',
  selectedDate: new Date(today),
  viewYear: today.getFullYear(),
  viewMonth: today.getMonth(),
  time: null,
  typeIdx: 0
};

/* ---------- Kalender Booking: Bulan depan & Batas Bulan Lalu ---------- */
function renderCalendar() {
  const grid = document.getElementById('calDaysGrid');
  const monthNameEl = document.getElementById('calMonthName');
  const yearNameEl = document.getElementById('calYearName');
  const prevBtn = document.getElementById('calPrevBtn');

  if (monthNameEl) monthNameEl.textContent = MONTH_NAMES[state.viewMonth];
  if (yearNameEl) yearNameEl.textContent = state.viewYear;

  // Batasi agar tidak bisa mundur ke bulan sebelum bulan hari ini
  const isCurrentMonthOrPast = 
    state.viewYear < today.getFullYear() || 
    (state.viewYear === today.getFullYear() && state.viewMonth <= today.getMonth());

  if (prevBtn) {
    prevBtn.disabled = isCurrentMonthOrPast;
    prevBtn.classList.toggle('disabled', isCurrentMonthOrPast);
  }

  if (!grid) return;

  const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(state.viewYear, state.viewMonth, 1).getDay(); // 0: Min, 1: Sen, ...

  let html = '';

  // Sel kosong sebelum tanggal 1
  for (let i = 0; i < firstDayIndex; i++) {
    html += '<div class="cal-day cal-day-empty" aria-hidden="true"></div>';
  }

  // Tanggal dalam bulan aktif
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(state.viewYear, state.viewMonth, d);
    const isPast = cellDate.getTime() < today.getTime();
    const isToday = cellDate.getTime() === today.getTime();
    const isSelected = cellDate.getTime() === state.selectedDate.getTime();

    if (isPast) {
      html += `<button type="button" class="cal-day is-disabled" disabled aria-disabled="true" data-day="${d}" title="Tanggal sudah berlalu">
        <span class="cal-day-num">${d}</span>
      </button>`;
    } else {
      html += `<button type="button" class="cal-day${isSelected ? ' active' : ''}${isToday ? ' is-today' : ''}" data-day="${d}">
        <span class="cal-day-num">${d}</span>
        ${isToday ? '<span class="cal-today-indicator" title="Hari ini"></span>' : ''}
      </button>`;
    }
  }

  grid.innerHTML = html;

  // Event handler klik tanggal
  grid.querySelectorAll('.cal-day:not([disabled])').forEach(btn => {
    btn.onclick = () => {
      const day = +btn.dataset.day;
      state.selectedDate = new Date(state.viewYear, state.viewMonth, day);
      state.time = null; // reset slot waktu
      renderCalendar();
      renderSlots();
      updateSummary();
    };
  });
}

function initCalendarNav() {
  const prevBtn = document.getElementById('calPrevBtn');
  const nextBtn = document.getElementById('calNextBtn');

  if (prevBtn) {
    prevBtn.onclick = () => {
      const isAtLimit = 
        state.viewYear < today.getFullYear() || 
        (state.viewYear === today.getFullYear() && state.viewMonth <= today.getMonth());
      if (isAtLimit) return;

      state.viewMonth--;
      if (state.viewMonth < 0) {
        state.viewMonth = 11;
        state.viewYear--;
      }
      renderCalendar();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      state.viewMonth++;
      if (state.viewMonth > 11) {
        state.viewMonth = 0;
        state.viewYear++;
      }
      renderCalendar();
    };
  }
}

/* ---------- Slot waktu (simulasi: beberapa penuh) ---------- */
function seededFull(svc, date, slot) {
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const seed = (Math.abs(diffDays) * 7 + slot.split(':').reduce((a, b) => a + +b, 0) + svc.length) % 10;
  return seed < 3;
}

function renderSlots() {
  const cfg = SERVICES[state.svc];
  const grid = document.getElementById('slotGrid');
  const slotHint = document.getElementById('slotHint');
  if (slotHint) slotHint.textContent = cfg.hint;
  if (!grid) return;

  grid.innerHTML = cfg.slots.map(t => {
    const full = seededFull(state.svc, state.selectedDate, t);
    const isActive = state.time === t;
    return `<button type="button" class="tab${isActive ? ' active' : ''}" data-time="${t}" ${full ? 'disabled' : ''}>${t}</button>`;
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
  const d = state.selectedDate;
  const isToday = d.getTime() === today.getTime();

  const dateLabel = document.getElementById('selectedDateLabel');
  if (dateLabel) {
    dateLabel.textContent = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  const sumService = document.getElementById('sumService');
  if (sumService) sumService.textContent = `${cfg.icon} ${cfg.label}`;

  const sumType = document.getElementById('sumType');
  if (sumType) sumType.textContent = type.name;

  const sumDate = document.getElementById('sumDate');
  if (sumDate) sumDate.textContent = isToday ? 'Hari ini' : `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

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
      
      const d = state.selectedDate;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const tanggalStr = `${yyyy}-${mm}-${dd}`;

      const booking = {
        code, layanan: cfg.label, icon: cfg.icon, tipe: type.name,
        tanggal: tanggalStr, waktu: state.time,
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
        modalTextEl.textContent = `${cfg.label} ${type.name} untuk ${petName} pada ${state.time} (${dd} ${MONTH_NAMES[d.getMonth()]} ${yyyy}) telah terdaftar. Notifikasi telah dikirim ke admin.`;
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

  renderCalendar();
  initCalendarNav();
  renderService();
  initBookingEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}
