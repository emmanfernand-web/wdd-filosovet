/* ============================================================
   FILOSOVET — booking.js (reservasi slot layanan)
   Bergantung pada main.js: rupiah(), toast(), getSavedPets()
   ============================================================ */
/* Data layanan (SERVICES) dimuat dari js/services-data.js */

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MAX_MONTHS_AHEAD = 12;

const _now = new Date();
const today = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());

const state = {
  svc: 'grooming',
  selectedDate: null,   // wajib dipilih user
  time: null,
  typeIdx: 0,
  presetType: null,
  rescheduleCode: null,
  presetPetId: null,
  viewYear: today.getFullYear(),
  viewMonth: today.getMonth()
};

const $ = id => document.getElementById(id);
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMinutes = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const currentType = () => SERVICES[state.svc].types[state.typeIdx] || SERVICES[state.svc].types[0];

/* ---------- Slot: penuh (simulasi) & sudah lewat ---------- */
function seededFull(svc, date, slot) {
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  const seed = (Math.abs(diffDays) * 7 + slot.split(':').reduce((a, b) => a + +b, 0) + svc.length) % 10;
  return seed < 3;
}
function slotState(date, t) {
  if (sameDay(date, today) && toMinutes(t) <= _now.getHours() * 60 + _now.getMinutes()) return 'past';
  return seededFull(state.svc, date, t) ? 'full' : 'ok';
}
function dayUnavailable(date) {
  return SERVICES[state.svc].slots.every(t => slotState(date, t) !== 'ok');
}

/* ---------- Kalender bulanan (ringkas) ---------- */
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

function renderCalendar() {
  const y = state.viewYear, m = state.viewMonth;
  $('calTitle').textContent = `${MONTH_NAMES[m]} ${y}`;
  const monthsAhead = (y - today.getFullYear()) * 12 + (m - today.getMonth());
  $('calPrev').disabled = monthsAhead <= 0;
  $('calNext').disabled = monthsAhead >= MAX_MONTHS_AHEAD;

  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = first.getDay(); // Minggu = 0
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7) cells.push(null);

  let html = '';
  for (let w = 0; w < cells.length; w += 7) {
    const week = cells.slice(w, w + 7);
    // Sembunyikan minggu yang seluruh harinya sudah lewat
    if (week.every(c => !c || c.getTime() < today.getTime())) continue;
    week.forEach(d => {
      if (!d) { html += '<span class="bk-cal-empty" aria-hidden="true"></span>'; return; }
      const past = d.getTime() < today.getTime();
      const off = !past && dayUnavailable(d);
      const sel = sameDay(d, state.selectedDate);
      const isToday = sameDay(d, today);
      const cls = ['bk-cal-day', sel && 'active', isToday && 'is-today', (past || off) && 'is-off'].filter(Boolean).join(' ');
      const label = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}${isToday ? ', hari ini' : ''}${past ? ', sudah lewat' : off ? ', tidak tersedia' : ''}`;
      html += `<button type="button" class="${cls}" data-iso="${toISO(d)}" aria-label="${label}" aria-pressed="${sel}" ${past || off ? 'disabled' : ''}>${d.getDate()}</button>`;
    });
  }
  $('calGrid').innerHTML = html;
  $('calGrid').querySelectorAll('.bk-cal-day:not(:disabled)').forEach(b => b.onclick = () => selectDate(parseISO(b.dataset.iso)));
}

function selectDate(d) {
  state.selectedDate = d;
  state.viewYear = d.getFullYear();
  state.viewMonth = d.getMonth();
  if (state.time && !(SERVICES[state.svc].slots.includes(state.time) && slotState(d, state.time) === 'ok')) state.time = null;
  renderCalendar();
  renderSlots();
  updateSummary();
}

/* ---------- Slot waktu ---------- */
function renderSlots() {
  const cfg = SERVICES[state.svc];
  const grid = $('slotGrid');
  const type = currentType();
  $('slotHint').textContent = cfg.hint;
  $('slotDuration').textContent = cfg.perDay ? '· jam check-in' : (type.min ? `· durasi ± ${type.min} menit` : '');

  if (!state.selectedDate) {
    grid.innerHTML = '<p class="bk-empty">Pilih tanggal terlebih dahulu untuk melihat slot yang tersedia.</p>';
    return;
  }
  grid.innerHTML = cfg.slots.map(t => {
    const st = slotState(state.selectedDate, t);
    const sel = state.time === t;
    const sub = cfg.perDay ? 'check-in' : (type.min ? `s.d. ${fromMinutes(toMinutes(t) + type.min)}` : '');
    const tag = st === 'full' ? 'Penuh' : st === 'past' ? 'Lewat' : (sel ? 'Dipilih' : sub);
    return `<button type="button" class="bk-slot${sel ? ' active' : ''}${st !== 'ok' ? ' is-full' : ''}" data-time="${t}" aria-pressed="${sel}" ${st !== 'ok' ? 'disabled' : ''}>
      <span class="bk-slot-time">${sel ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' : ''}${t}</span>
      <span class="bk-slot-sub">${tag}</span>
    </button>`;
  }).join('');
  grid.querySelectorAll('.bk-slot:not(:disabled)').forEach(b => b.onclick = () => {
    state.time = b.dataset.time;
    renderSlots();
    updateSummary();
  });
}

/* ---------- Layanan & tipe ---------- */
function renderService() {
  const cfg = SERVICES[state.svc];

  document.querySelectorAll('#serviceTabs .tab').forEach(t => {
    const on = t.dataset.svc === state.svc;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });

  const presetIdx = state.presetType ? cfg.types.findIndex(t => t.key === state.presetType) : -1;
  state.presetType = null;
  state.typeIdx = presetIdx >= 0 ? presetIdx : 0;

  renderTypes();
  $('svcStaff').innerHTML = cfg.staff.map(s => `<option>${s}</option>`).join('');
  $('durasiWrap').style.display = cfg.perDay ? 'block' : 'none';

  // Slot bisa berbeda per layanan
  if (state.time && !cfg.slots.includes(state.time)) state.time = null;
  renderCalendar();
  renderSlots();
  updateSummary();
}

function renderTypes() {
  const cfg = SERVICES[state.svc];
  $('typeList').innerHTML = cfg.types.map((t, i) => `
    <label class="bk-type${i === state.typeIdx ? ' active' : ''}">
      <input type="radio" name="svcType" value="${i}" ${i === state.typeIdx ? 'checked' : ''}>
      <span class="bk-type-name">${t.name}</span>
      <span class="bk-type-price">${rupiah(t.price)}${cfg.perDay ? ' <small>/ hari</small>' : ''}</span>
    </label>`).join('');
  $('typeList').querySelectorAll('input').forEach(r => r.onchange = () => {
    state.typeIdx = +r.value;
    renderTypes();
    renderSlots();
    updateSummary();
  });
}

/* ---------- Validasi form hewan ---------- */
function petErrors() {
  const errs = {};
  if ($('ownerName').value.trim().length < 2) errs.ownerName = 'Nama pemilik minimal 2 karakter.';
  if (!/^[0-9+\-\s]{8,16}$/.test($('ownerPhone').value.trim())) errs.ownerPhone = 'Nomor HP hanya angka, 8–16 digit.';
  const name = $('petName').value.trim();
  if (!name) errs.petName = 'Nama hewan wajib diisi.';
  else if (name.length < 2) errs.petName = 'Nama minimal 2 karakter.';
  const w = $('petWeight').value;
  if (w !== '' && (isNaN(+w) || +w < 0.1 || +w > 100)) errs.petWeight = 'Berat harus antara 0,1 dan 100 kg.';
  return errs;
}
function showFieldError(id, msg) {
  const input = $(id), out = $('err-' + id);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  input.classList.toggle('is-invalid', !!msg);
  if (out) out.textContent = msg || '';
}
function validateField(id) { showFieldError(id, petErrors()[id]); }

/* ---------- Ringkasan & status tombol ---------- */
function missingItems() {
  const m = [];
  if (!state.selectedDate) m.push('tanggal');
  if (!state.time) m.push('jam');
  const errs = petErrors();
  if (errs.ownerName) m.push('nama pemilik');
  if (errs.ownerPhone) m.push('nomor HP');
  if (errs.petName) m.push('nama hewan');
  if (errs.petWeight) m.push('berat yang valid');
  return m;
}

function setBadge(step, done) {
  const b = document.querySelector(`.bk-badge[data-step="${step}"]`);
  if (!b) return;
  b.classList.toggle('done', done);
  b.innerHTML = done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' : step;
}

function updateSummary() {
  const cfg = SERVICES[state.svc];
  const type = currentType();
  const dur = cfg.perDay ? Math.min(60, Math.max(1, Math.floor(+$('hotelDurasi').value) || 1)) : 1;
  const d = state.selectedDate;

  $('selectedDateLabel').textContent = d ? `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : 'Belum dipilih';
  $('sumService').textContent = cfg.label;
  $('sumType').textContent = type.name + (cfg.perDay ? ` × ${dur} hari` : '');
  $('sumDate').textContent = d ? (sameDay(d, today) ? 'Hari ini' : `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`) : '—';
  $('sumTime').textContent = state.time ? (cfg.perDay ? `${state.time} (check-in)` : `${state.time}${type.min ? '–' + fromMinutes(toMinutes(state.time) + type.min) : ''}`) : '—';
  const pet = $('petName').value.trim();
  $('sumPet').textContent = pet ? `${pet} (${$('petSpecies').value})` : '—';
  const price = rupiah(type.price * dur);
  $('sumPrice').textContent = price;
  $('sumPriceBar').textContent = price;

  const dateDone = !!(d && state.time);
  const petDone = !Object.keys(petErrors()).length;
  setBadge(1, true);
  setBadge(2, dateDone);
  setBadge(3, petDone);

  const miss = missingItems();
  $('btnConfirm').disabled = miss.length > 0;
  $('missingMsg').textContent = miss.length ? 'Lengkapi dulu: ' + miss.join(', ') + '.' : 'Semua data sudah lengkap.';
  $('missingMsg').classList.toggle('ok', miss.length === 0);
}

/* ---------- Hewan tersimpan ---------- */
function initSavedPets() {
  const pets = getSavedPets();
  if (!pets.length) return;
  $('savedPetWrap').style.display = 'block';
  $('savedPet').innerHTML = '<option value="">— Hewan baru —</option>' + pets.map((p, i) => `<option value="${i}">${p.name} (${p.species}${p.breed ? ', ' + p.breed : ''})</option>`).join('');
  $('savedPet').onchange = e => {
    const p = pets[e.target.value];
    if (p) {
      $('petName').value = p.name;
      $('petSpecies').value = p.species;
      $('petBreed').value = p.breed || '';
      $('petWeight').value = p.weight || '';
    } else {
      ['petName', 'petBreed', 'petWeight'].forEach(id => { $(id).value = ''; });
    }
    ['petName', 'petWeight'].forEach(validateField);
    updateSummary();
  };
  // ?hewan=<id> dari halaman Profil
  const presetIdx = state.presetPetId ? pets.findIndex(p => p.id === state.presetPetId) : -1;
  if (presetIdx >= 0) { $('savedPet').value = String(presetIdx); $('savedPet').onchange({ target: $('savedPet') }); }
}

/* ---------- Modal sukses (Esc menutup, fokus terkunci) ---------- */
let modalOpener = null;
function openModal() {
  const modal = $('bookingModal');
  modalOpener = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('modalPrimary').focus();
}
function closeModal() {
  $('bookingModal').hidden = true;
  document.body.style.overflow = '';
  if (modalOpener) modalOpener.focus();
}
function trapModalKeys(e) {
  const modal = $('bookingModal');
  if (modal.hidden) return;
  if (e.key === 'Escape') return closeModal();
  if (e.key !== 'Tab') return;
  const f = Array.from(modal.querySelectorAll('a[href], button:not(:disabled), input:not([readonly])'));
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

function confirmBooking() {
  if (missingItems().length) return;
  const cfg = SERVICES[state.svc];
  const type = currentType();
  const dur = cfg.perDay ? Math.min(60, Math.max(1, Math.floor(+$('hotelDurasi').value) || 1)) : 1;
  const petName = $('petName').value.trim();
  const code = 'FV-' + Date.now().toString(36).toUpperCase().slice(-6);
  const d = state.selectedDate;

  const booking = {
    code, layanan: cfg.label, icon: cfg.icon, tipe: type.name,
    tanggal: toISO(d), waktu: state.time,
    pelanggan: $('ownerName').value.trim(), hp: $('ownerPhone').value.trim(), email: (getUser() || {}).email || '',
    hewan: petName, spesie: $('petSpecies').value || 'Kucing',
    ras: $('petBreed').value.trim(), berat: $('petWeight').value || '',
    petugas: $('svcStaff').value, durasiHari: dur,
    biaya: type.price * dur, status: 'Menunggu Konfirmasi', sumber: 'Online',
    riwayat: [{ status: 'Menunggu Konfirmasi', at: new Date().toISOString(), by: 'Pelanggan' }],
    catatan: $('petNotes').value.trim()
  };
  let all = [];
  try { all = JSON.parse(localStorage.getItem('fv_bookings') || '[]'); } catch { }
  const rescheduled = !!state.rescheduleCode && all.some(b => b.code === state.rescheduleCode);
  if (rescheduled) {
    booking.code = state.rescheduleCode;
    all = all.map(b => {
      if (b.code !== state.rescheduleCode) return b;
      booking.riwayat = [...(b.riwayat || []), { status: 'Jadwal ulang', at: new Date().toISOString(), by: 'Pelanggan' }, ...booking.riwayat];
      return booking;
    });
  } else {
    all.unshift(booking);
  }
  localStorage.setItem('fv_bookings', JSON.stringify(all));
  $('bookingModalTitle').textContent = rescheduled ? 'Jadwal Diperbarui' : 'Booking Berhasil';

  $('bookingCode').value = booking.code;
  $('modalText').textContent = `${cfg.label} · ${type.name} untuk ${petName} pada ${state.time}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} ${rescheduled ? 'telah dijadwalkan ulang' : 'telah terdaftar'}. Status: menunggu konfirmasi.`;
  openModal();
}

function initBookingEvents() {
  document.querySelectorAll('#serviceTabs .tab').forEach(t => {
    t.onclick = () => { state.svc = t.dataset.svc; renderService(); };
  });

  $('hotelDurasi').oninput = updateSummary;
  $('svcStaff').onchange = updateSummary;

  $('calPrev').onclick = () => { state.viewMonth--; if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; } renderCalendar(); };
  $('calNext').onclick = () => { state.viewMonth++; if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; } renderCalendar(); };

  ['ownerName', 'ownerPhone', 'petName', 'petWeight'].forEach(id => {
    $(id).addEventListener('input', () => { if ($(id).classList.contains('is-invalid')) validateField(id); updateSummary(); });
    $(id).addEventListener('blur', () => validateField(id));
  });
  ['petSpecies', 'petBreed', 'petNotes'].forEach(id => $(id).addEventListener('input', updateSummary));

  // Ringkasan mobile: buka/tutup rincian
  $('sumToggle').onclick = () => {
    const open = $('bkSummary').classList.toggle('open');
    $('sumToggle').setAttribute('aria-expanded', open);
  };

  $('btnConfirm').onclick = confirmBooking;
  $('modalClose').onclick = closeModal;
  $('bookingModal').addEventListener('click', e => { if (e.target === $('bookingModal')) closeModal(); });
  document.addEventListener('keydown', trapModalKeys);
}

function initBooking() {
  const params = new URLSearchParams(location.search);
  const paramSvc = params.get('layanan');
  state.svc = paramSvc && SERVICES[paramSvc] ? paramSvc : 'grooming';
  state.presetType = params.get('tipe');
  state.presetPetId = params.get('hewan');
  document.body.classList.add('has-bottom-bar');

  // Jadwal ulang: isi data dari booking yang ada, pilih tanggal & jam baru
  const rsCode = params.get('jadwalUlang');
  if (rsCode) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('fv_bookings') || '[]'); } catch { }
    const old = list.find(b => b.code === rsCode);
    if (old) {
      state.rescheduleCode = rsCode;
      const svcKey = Object.keys(SERVICES).find(k => SERVICES[k].label === old.layanan);
      if (svcKey) {
        state.svc = svcKey;
        const t = SERVICES[svcKey].types.find(x => x.name === old.tipe);
        state.presetType = t ? t.key : null;
      }
      $('rescheduleBanner').hidden = false;
      $('rescheduleCode').textContent = rsCode;
    }
  }

  // Data pemilik: isi otomatis dari akun yang masuk
  const u = getUser(), pr = (() => { try { return JSON.parse(localStorage.getItem('fv_profile')) || {}; } catch { return {}; } })();
  if (u && u.name) $('ownerName').value = u.name;
  if (pr.phone) $('ownerPhone').value = pr.phone;

  initSavedPets();
  initBookingEvents();
  renderService();
  if (state.rescheduleCode) {
    const old = (JSON.parse(localStorage.getItem('fv_bookings') || '[]')).find(b => b.code === state.rescheduleCode);
    if (old) {
      if (old.pelanggan) $('ownerName').value = old.pelanggan;
      if (old.hp) $('ownerPhone').value = old.hp;
      $('petName').value = old.hewan || '';
      if (old.spesie) $('petSpecies').value = old.spesie;
      $('petBreed').value = old.ras || '';
      $('petWeight').value = old.berat || '';
      $('petNotes').value = old.catatan || '';
      updateSummary();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}
