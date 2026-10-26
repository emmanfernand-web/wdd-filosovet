/* ============================================================
   FILOSOVET ADMIN — booking.js
   Daftar, Jadwal Harian, drawer detail, tambah booking manual
   ============================================================ */
const BK = { status: 'Semua', q: '', range: 'today', from: '', to: '', layanan: 'Semua', view: 'list', day: todayISO(), roleApplied: false };
const SVC_LABELS = ['Grooming', 'Konsultasi Dokter Hewan', 'Pet Hotel'];
const STATUS_TABS = [
  { value: 'Semua', label: 'Semua', test: () => true },
  { value: 'Menunggu', label: 'Menunggu', test: s => s === 'Menunggu Konfirmasi' },
  { value: 'Dikonfirmasi', label: 'Dikonfirmasi', test: s => s === 'Dikonfirmasi' },
  { value: 'Diproses', label: 'Diproses', test: s => s === 'Diproses' },
  { value: 'Selesai', label: 'Selesai', test: s => s === 'Selesai' },
  { value: 'Batal', label: 'Batal & Lewat', test: s => ['Dibatalkan', 'Tidak Hadir', 'Kedaluwarsa'].includes(s) }
];
const RANGE_OPTS = [['today', 'Hari ini'], ['7', '7 hari ke depan'], ['month', 'Bulan ini'], ['custom', 'Rentang kustom'], ['all', 'Semua tanggal']];

function inRange(b) {
  const t = todayISO();
  switch (BK.range) {
    case 'today': return b.tanggal === t;
    case '7': return b.tanggal >= t && b.tanggal <= addDaysISO(t, 6);
    case 'month': return b.tanggal.slice(0, 7) === t.slice(0, 7);
    case 'custom': return (!BK.from || b.tanggal >= BK.from) && (!BK.to || b.tanggal <= BK.to);
    default: return true;
  }
}
function filteredBase() {
  const q = BK.q.trim().toLowerCase();
  return AD.bookings.all().filter(b => inRange(b) && (BK.layanan === 'Semua' || b.layanan === BK.layanan) &&
    (!q || [b.code, b.pelanggan, b.hewan, b.hp, b.tipe].some(v => String(v).toLowerCase().includes(q))));
}

/* Tombol aksi sesuai status efektif */
function actionButtons(b, small = true) {
  return AD.bookings.actions(b).map(a => `<button type="button" class="btn btn-${a.kind === 'primary' ? 'primary' : 'outline-danger'} ${small ? 'btn-sm' : ''}" data-act="${a.to}" data-code="${b.code}">${a.label}</button>`).join('');
}
async function runAction(code, to) {
  const b = AD.bookings.get(code); if (!b) return;
  if (to === 'Dibatalkan') {
    const ok = await UI.confirm({ title: 'Batalkan booking?', message: `Booking <strong>${esc(b.pelanggan || 'Tanpa nama')}</strong> (${esc(b.tipe)}, ${fmtDateShort(b.tanggal)} ${b.waktu}) akan dibatalkan. Tindakan ini tercatat di riwayat.`, confirmLabel: 'Ya, batalkan', cancelLabel: 'Kembali', danger: true });
    if (!ok) return;
  }
  AD.bookings.setStatus(code, to);
  UI.toast(`Status booking diubah menjadi ${to}`);
  AD.refresh();
  if ($q('.drawer') && $q('.drawer').dataset.code === code) AD.openBooking(code);
}
AD.runBookingAction = runAction;

Pages.booking = {
  title: 'Booking & Reservasi',
  render(view, params) {
    if (params.range) BK.range = params.range;
    if (params.layanan) BK.layanan = params.layanan;
    if (params.status) BK.status = params.status;
    if (params.q != null) { BK.q = params.q; if (params.q && !params.range) BK.range = 'all'; }
    const rf = ROLES[AD.role()].bookingFilter;
    if (rf && !BK.roleApplied) { BK.layanan = rf; BK.roleApplied = true; }
    if (!rf) BK.roleApplied = false;

    view.innerHTML = `
      <div class="page-bar">
        <div class="bar-left">
          ${UI.segmented('bkView', [{ value: 'list', label: 'Daftar' }, { value: 'day', label: 'Jadwal Harian' }], BK.view)}
        </div>
        <button type="button" class="btn btn-primary" id="btnManual">${ico('plus', 16)} Tambah Booking Manual</button>
      </div>
      <section class="panel">
        <div class="filters">
          <div class="search-field"><label class="sr-only" for="bkQ">Cari booking</label>${ico('search', 16)}<input type="search" id="bkQ" placeholder="Cari nama, hewan, kode, HP…" value="${esc(BK.q)}"></div>
          <div class="sel"><label class="sr-only" for="bkRange">Periode</label><select id="bkRange">${RANGE_OPTS.map(o => `<option value="${o[0]}" ${BK.range === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
          <div class="custom-range" id="bkCustom" ${BK.range === 'custom' ? '' : 'hidden'}><input type="date" id="bkFrom" value="${BK.from}" aria-label="Dari tanggal"><span>–</span><input type="date" id="bkTo" value="${BK.to}" aria-label="Sampai tanggal"></div>
          <div class="sel"><label class="sr-only" for="bkSvc">Layanan</label><select id="bkSvc"><option value="Semua">Semua layanan</option>${SVC_LABELS.map(l => `<option ${BK.layanan === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div id="bkTabs"></div>
        <div id="bkBody"></div>
      </section>`;
    this.bind(view);
    // Tampilan Jadwal Harian memakai navigasi tanggal sendiri: sembunyikan periode & tab status
    if (BK.view === 'day') { $q('#bkRange', view).closest('.sel').hidden = true; $q('#bkCustom', view).hidden = true; }
    this.renderBody();
  },
  bind(view) {
    $q('#bkView', view).onclick = e => { const b = e.target.closest('[data-v]'); if (b) { BK.view = b.dataset.v; this.render(view, {}); } };
    $q('#btnManual', view).onclick = () => AD.manualBooking();
    $q('#bkQ', view).oninput = e => { BK.q = e.target.value; UI.resetPage('bk-list'); this.renderBody(); };
    $q('#bkRange', view).onchange = e => { BK.range = e.target.value; $q('#bkCustom').hidden = BK.range !== 'custom'; UI.resetPage('bk-list'); this.renderBody(); };
    $q('#bkFrom', view).onchange = e => { BK.from = e.target.value; this.renderBody(); };
    $q('#bkTo', view).onchange = e => { BK.to = e.target.value; this.renderBody(); };
    $q('#bkSvc', view).onchange = e => { BK.layanan = e.target.value; UI.resetPage('bk-list'); this.renderBody(); };
  },
  renderBody() {
    const base = filteredBase();
    const withEff = base.map(b => ({ b, s: AD.bookings.eff(b) }));
    if (BK.view === 'day') { $q('#bkTabs').innerHTML = ''; return this.renderDay(); }
    // Tab status + hitungan
    $q('#bkTabs').innerHTML = `<div class="seg seg-scroll" id="bkStatus" role="group" aria-label="Filter status">${STATUS_TABS.map(t => `<button type="button" class="seg-btn ${BK.status === t.value ? 'active' : ''}" data-v="${t.value}" aria-pressed="${BK.status === t.value}">${t.label}<span class="seg-count">${withEff.filter(x => t.test(x.s)).length}</span></button>`).join('')}</div>`;
    $q('#bkStatus').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { BK.status = b.dataset.v; UI.resetPage('bk-list'); this.renderBody(); } };
    const tab = STATUS_TABS.find(t => t.value === BK.status) || STATUS_TABS[0];
    const rows = withEff.filter(x => tab.test(x.s)).map(x => x.b);
    rows.sort((a, b) => (AD.bookings.start(a) - AD.bookings.start(b)) * (BK.range === 'all' ? -1 : 1));
    const all = AD.bookings.all();
    UI.table($q('#bkBody'), {
      id: 'bk-list', rows, pageSize: window.innerWidth < 700 ? 5 : 10, onRow: b => AD.openBooking(b.code),
      empty: { title: 'Tidak ada booking', msg: BK.q || BK.status !== 'Semua' || BK.layanan !== 'Semua' ? 'Tidak ada booking yang cocok dengan filter ini.' : 'Belum ada booking pada periode ini.', action: 'Reset filter', onAction: () => { BK.q = ''; BK.status = 'Semua'; BK.layanan = 'Semua'; BK.range = 'all'; Pages.booking.render($q('#view'), {}); } },
      columns: [
        { key: 'code', label: 'Kode', render: b => `<code class="code">${esc(b.code)}</code>`, cls: 'col-code' },
        { key: 'p', label: 'Pelanggan', cls: 'col-name', render: AD.nameCell },
        { key: 'l', label: 'Layanan', cls: 'col-wide', render: b => `<div class="cell-stack">${esc(b.tipe)}<small class="sub">${esc(b.layanan)}${b.durasiHari > 1 ? ` · ${b.durasiHari} hari` : ''}</small></div>` },
        { key: 'j', label: 'Jadwal', render: b => `<span class="nowrap">${fmtDateShort(b.tanggal)} · ${b.waktu}</span>` },
        { key: 'o', label: 'Dokter / Petugas', render: b => esc(b.petugas || '—') },
        { key: 's', label: 'Status', render: b => `${UI.chip(AD.bookings.eff(b))}${AD.bookings.conflicts(b, all).length ? `<span class="conflict-flag" title="Jadwal bentrok dengan booking lain">${ico('alert', 14)}</span>` : ''}` },
        { key: 'a', label: 'Aksi', align: 'right', cls: 'col-act', render: b => `<div class="row-actions">${actionButtons(b)}<button type="button" class="icon-btn" data-detail="${b.code}" aria-label="Lihat detail ${esc(b.pelanggan || b.code)}">${ico('eye')}</button></div>` }
      ]
    });
    const body = $q('#bkBody');
    if (!body.dataset.act) {
      body.dataset.act = '1';
      body.addEventListener('click', e => {
        const a = e.target.closest('[data-act]'); if (a) return runAction(a.dataset.code, a.dataset.act);
        const d = e.target.closest('[data-detail]'); if (d) AD.openBooking(d.dataset.detail);
      });
    }
  },
  /* ---------- Jadwal harian ---------- */
  renderDay() {
    const t = todayISO();
    const HS = 8, HE = 20, PX = 60;
    const groups = [
      { name: 'Dokter', svc: 'konsultasi', cols: SERVICES.konsultasi.staff },
      { name: 'Groomer', svc: 'grooming', cols: SERVICES.grooming.staff },
      { name: 'Kandang', svc: 'hotel', cols: SERVICES.hotel.staff }
    ];
    const dayB = AD.bookings.all().filter(b => b.tanggal === BK.day && b.status !== 'Dibatalkan' && (BK.layanan === 'Semua' || b.layanan === BK.layanan));
    const colsFlat = groups.flatMap(g => g.cols.map(c => ({ key: c, svc: g.svc })));
    const allDay = AD.bookings.all();
    const hours = Array.from({ length: HE - HS }, (_, i) => HS + i);
    const colHtml = col => {
      const mine = dayB.filter(b => b.petugas === col.key && b.svcKey === col.svc);
      const blocks = mine.map(b => {
        const top = (toMin(b.waktu) - HS * 60) / 60 * PX, h = Math.max(30, b.durMin / 60 * PX - 3);
        const conf = AD.bookings.conflicts(b, allDay).length;
        return `<button type="button" class="tl-block st-${AD.bookings.eff(b).replace(/\s/g, '')} ${conf ? 'is-conflict' : ''}" style="top:${top}px;height:${h}px" data-detail="${b.code}" aria-label="${esc(b.waktu + ' ' + (b.pelanggan || 'Tanpa nama') + ', ' + b.tipe + ', ' + AD.bookings.eff(b))}">
          <span class="tl-time">${b.waktu}${conf ? ' ' + ico('alert', 12) : ''}</span><strong>${esc(b.pelanggan || 'Tanpa nama')}</strong><small>${esc(b.hewan)} · ${esc(b.tipe)}</small></button>`;
      }).join('');
      const dur = col.svc === 'grooming' ? 90 : col.svc === 'konsultasi' ? 30 : 60;
      const free = SERVICES[col.svc].slots.filter(s => !mine.some(b => toMin(b.waktu) < toMin(s) + dur && toMin(b.waktu) + b.durMin > toMin(s)) && (BK.day > t || (BK.day === t && toMin(s) > new Date().getHours() * 60 + new Date().getMinutes())))
        .map(s => `<button type="button" class="tl-free" style="top:${(toMin(s) - HS * 60) / 60 * PX}px;height:${Math.max(28, dur / 60 * PX - 3)}px" data-free="${s}" data-svc="${col.svc}" data-who="${esc(col.key)}" aria-label="Slot kosong ${s} untuk ${esc(col.key)}. Tambah booking"><span>${ico('plus', 12)} ${s}</span></button>`).join('');
      return `<div class="tl-col" style="height:${hours.length * PX}px">${blocks}${free}</div>`;
    };
    const dow = parseISO(BK.day).getDay();
    $q('#bkBody').innerHTML = `
      <div class="day-nav">
        <button type="button" class="icon-btn" id="dPrev" aria-label="Hari sebelumnya">${ico('chevleft')}</button>
        <div class="day-label"><strong>${DAYS_LONG[dow]}, ${fmtDate(BK.day)}</strong>${BK.day === t ? '<span class="chip chip-ok">Hari ini</span>' : ''}</div>
        <button type="button" class="icon-btn" id="dNext" aria-label="Hari berikutnya">${ico('chevright')}</button>
        <input type="date" id="dPick" value="${BK.day}" aria-label="Pilih tanggal">
        ${BK.day !== t ? '<button type="button" class="btn btn-outline btn-sm" id="dToday">Hari ini</button>' : ''}
        <span class="legend"><i class="lg lg-free"></i> Slot kosong <i class="lg lg-conf"></i> Bentrok</span>
      </div>
      <div class="timeline-scroll"><div class="timeline" style="--cols:${colsFlat.length}">
        <div class="tl-corner"></div>
        ${groups.map(g => `<div class="tl-group" style="grid-column: span ${g.cols.length}">${g.name}</div>`).join('')}
        <div class="tl-corner"></div>
        ${colsFlat.map(c => `<div class="tl-head">${esc(c.key.replace(' — Groomer', ''))}</div>`).join('')}
        <div class="tl-hours">${hours.map(h => `<span style="height:${PX}px">${pad2(h)}:00</span>`).join('')}</div>
        ${colsFlat.map(colHtml).join('')}
      </div></div>
      ${dayB.length ? '' : `<p class="muted center-note">Belum ada booking pada tanggal ini. Klik slot kosong untuk menambah booking.</p>`}`;
    const go = d => { BK.day = d; this.renderDay(); };
    $q('#dPrev').onclick = () => go(addDaysISO(BK.day, -1));
    $q('#dNext').onclick = () => go(addDaysISO(BK.day, 1));
    $q('#dPick').onchange = e => e.target.value && go(e.target.value);
    const tb = $q('#dToday'); if (tb) tb.onclick = () => go(t);
    const body = $q('#bkBody');
    body.onclick = e => {
      const d = e.target.closest('[data-detail]'); if (d) return AD.openBooking(d.dataset.detail);
      const f = e.target.closest('[data-free]'); if (f) AD.manualBooking({ svc: f.dataset.svc, waktu: f.dataset.free, petugas: f.dataset.who, tanggal: BK.day });
    };
  }
};

/* ---------- Drawer detail booking ---------- */
AD.openBooking = function (code) {
  const b = AD.bookings.get(code); if (!b) return;
  const eff = AD.bookings.eff(b), all = AD.bookings.all();
  const conf = AD.bookings.conflicts(b, all);
  const wa = waLink(b.hp);
  const trx = b.trxId || AD.trx.all().find(x => x.ref === b.code)?.id;
  const row = (k, v) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`;
  const hist = [...b.riwayat].reverse().map(h => `<li><span class="log-dot"></span><div><p>${esc(h.status)}</p><small class="muted">${esc(h.by || '—')} · ${fmtDateTime(h.at)}</small></div></li>`).join('');
  const dr = UI.drawer({
    title: b.pelanggan || 'Tanpa nama', subtitle: `${esc(b.code)} · ${UI.chip(eff)}`,
    body: `
      ${conf.length ? `<div class="banner banner-bad" role="alert">${ico('alert', 18)}<p>Jadwal bentrok dengan <strong>${esc(conf[0].pelanggan || 'Tanpa nama')}</strong> (${conf[0].waktu}) untuk ${esc(b.petugas)}.</p></div>` : ''}
      <h3 class="ds-title">Pelanggan</h3>
      <dl class="kvs">${row('Nama', b.pelanggan ? esc(b.pelanggan) : '<span class="dim">Tanpa nama</span>')}${row('Kontak', b.hp ? `${esc(b.hp)} ${wa ? `<a class="btn btn-ghost btn-sm" href="${wa}" target="_blank" rel="noopener">${ico('chatbubble', 14)} WhatsApp</a>` : ''}` : '<span class="dim">—</span>')}${row('Sumber', UI.chip(b.sumber))}</dl>
      <h3 class="ds-title">Hewan</h3>
      <dl class="kvs">${row('Nama', esc(b.hewan || '—'))}${row('Jenis', esc(b.spesie || '—') + (b.ras ? ` · ${esc(b.ras)}` : ''))}${b.berat ? row('Berat', `${esc(b.berat)} kg`) : ''}</dl>
      <h3 class="ds-title">Layanan</h3>
      <dl class="kvs">${row('Layanan', `${esc(b.tipe)} <small class="muted">(${esc(b.layanan)})</small>`)}${row('Jadwal', `${fmtDate(b.tanggal)}, ${b.waktu}${b.svcKey === 'hotel' ? ` · ${b.durasiHari} hari` : ` · ± ${b.durMin} mnt`}`)}${row('Dokter / petugas', esc(b.petugas || '—'))}${row('Biaya', rp(b.biaya))}${trx ? row('Transaksi', `<button type="button" class="link" data-trx="${trx}">${esc(trx)}</button>`) : ''}</dl>
      <h3 class="ds-title">Keluhan / catatan pelanggan</h3>
      <p class="note-box">${b.catatan ? esc(b.catatan) : '<span class="dim">Tidak ada catatan.</span>'}</p>
      <h3 class="ds-title">Catatan internal</h3>
      <label class="sr-only" for="dsNote">Catatan internal</label>
      <textarea id="dsNote" rows="3" placeholder="Hanya terlihat oleh staf…">${esc(b.catatanInternal)}</textarea>
      <button type="button" class="btn btn-outline btn-sm" id="dsSaveNote">Simpan catatan</button>
      <h3 class="ds-title">Riwayat status</h3>
      <ul class="log-list">${hist || '<li class="muted">Belum ada riwayat.</li>'}</ul>`,
    footer: `${actionButtons(b, false)}<button type="button" class="btn btn-outline" data-close2>Tutup</button>`
  });
  dr.el.querySelector('.drawer').dataset.code = code;
  $q('#dsSaveNote', dr.el).onclick = () => { AD.bookings.setNote(code, $q('#dsNote', dr.el).value.trim()); UI.toast('Catatan disimpan'); };
  $q('[data-close2]', dr.el).onclick = dr.close;
  dr.el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (a) runAction(a.dataset.code, a.dataset.act);
    const t = e.target.closest('[data-trx]'); if (t) { dr.close(); AD.go('transaksi', { drawer: t.dataset.trx }); }
  });
};

/* ---------- Tambah booking manual (3 langkah) ---------- */
AD.manualBooking = function (pre = {}) {
  const customers = AD.bookings.customers();
  const st = { step: 1, svc: pre.svc || 'konsultasi', typeIdx: 0, waktu: pre.waktu || '', petugas: pre.petugas || '' };
  const dateMin = todayISO();
  const m = UI.modal({
    title: 'Tambah Booking Manual', size: 'lg',
    body: `
      <ol class="steps" aria-label="Langkah">${['Pelanggan & hewan', 'Layanan & jadwal', 'Konfirmasi'].map((s, i) => `<li data-s="${i + 1}" class="${i === 0 ? 'cur' : ''}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>
      <div class="wz" data-wz="1">
        <div class="field"><label for="mbName">Nama pelanggan <span class="req">*</span></label><input id="mbName" list="mbList" autocomplete="off" placeholder="Cari pelanggan atau ketik nama baru" aria-describedby="err-mbName"><datalist id="mbList">${customers.map(c => `<option value="${esc(c.nama)}">${esc(c.hp)}</option>`).join('')}</datalist><small class="field-error" id="err-mbName" role="alert"></small></div>
        ${UI.field({ id: 'mbHp', label: 'Nomor HP / WhatsApp', type: 'tel', attrs: 'placeholder="08xxxxxxxxxx"', required: true })}
        <div class="field" id="mbPetPickWrap" hidden><label for="mbPetPick">Hewan tersimpan</label><select id="mbPetPick"></select></div>
        <div class="row2">${UI.field({ id: 'mbPet', label: 'Nama hewan', attrs: 'autocomplete="off"', required: true })}
          <div class="field"><label for="mbSpecies">Jenis hewan</label><select id="mbSpecies"><option>Kucing</option><option>Anjing</option><option>Kelinci</option><option>Hewan lainnya</option></select></div></div>
      </div>
      <div class="wz" data-wz="2" hidden>
        <div class="row2">
          <div class="field"><label for="mbSvc">Layanan</label><select id="mbSvc">${Object.keys(SERVICES).map(k => `<option value="${k}" ${k === st.svc ? 'selected' : ''}>${SERVICES[k].label}</option>`).join('')}</select></div>
          <div class="field"><label for="mbType">Tipe</label><select id="mbType"></select></div>
        </div>
        <div class="row2">
          <div class="field"><label for="mbStaff">Dokter / petugas</label><select id="mbStaff"></select></div>
          <div class="field"><label for="mbDate">Tanggal</label><input type="date" id="mbDate" min="${dateMin}" value="${pre.tanggal || dateMin}"><small class="field-error" id="err-mbDate" role="alert"></small></div>
        </div>
        <div class="field" id="mbDaysWrap" hidden><label for="mbDays">Lama menginap (hari)</label><input type="number" id="mbDays" min="1" max="60" value="1"></div>
        <div class="field"><span class="lbl" id="mbSlotLbl">Slot waktu <span class="req">*</span></span><div class="slot-grid" id="mbSlots" role="group" aria-labelledby="mbSlotLbl"></div><small class="field-error" id="err-mbSlot" role="alert"></small></div>
      </div>
      <div class="wz" data-wz="3" hidden>
        <div class="field"><label for="mbNote">Keluhan / catatan</label><textarea id="mbNote" rows="3" placeholder="Opsional"></textarea></div>
        <dl class="kvs" id="mbSummary"></dl>
      </div>`,
    actions: [
      { label: 'Kembali', kind: 'outline', onClick: () => go(st.step - 1) },
      { label: 'Lanjut', kind: 'primary', onClick: () => next() }
    ]
  });
  const el = m.el, $ = id => $q('#' + id, el);
  const back = $q('[data-act="0"]', el), nextBtn = $q('[data-act="1"]', el);

  const cfg = () => SERVICES[$('mbSvc').value];
  function fillSvc() {
    const c = cfg();
    $('mbType').innerHTML = c.types.map((t, i) => `<option value="${i}">${esc(t.name)} — ${rp(t.price)}${c.perDay ? ' / hari' : ''}</option>`).join('');
    $('mbType').value = String(Math.min(st.typeIdx, c.types.length - 1));
    $('mbStaff').innerHTML = c.staff.map(s => `<option ${s === st.petugas ? 'selected' : ''}>${esc(s)}</option>`).join('');
    $('mbDaysWrap').hidden = !c.perDay;
    drawSlots();
  }
  function slotInfo(s) {
    const c = cfg(), type = c.types[+$('mbType').value], date = $('mbDate').value, who = $('mbStaff').value;
    const probe = { code: '_new', petugas: who, tanggal: date, waktu: s, durMin: type.min || 60, svcKey: $('mbSvc').value, status: 'Dikonfirmasi' };
    const clash = AD.bookings.conflicts(probe).length > 0;
    const past = date === dateMin && toMin(s) <= new Date().getHours() * 60 + new Date().getMinutes();
    return { clash, past };
  }
  function drawSlots() {
    const date = $('mbDate').value;
    $('mbSlots').innerHTML = cfg().slots.map(s => { const i = slotInfo(s); const dis = i.clash || i.past; return `<button type="button" class="slot ${st.waktu === s ? 'active' : ''} ${dis ? 'is-full' : ''}" data-s="${s}" ${dis ? 'disabled' : ''} aria-pressed="${st.waktu === s}">${s}<small>${i.clash ? 'Bentrok' : i.past ? 'Lewat' : cfg().perDay ? 'check-in' : 'Tersedia'}</small></button>`; }).join('');
    if (st.waktu && slotInfo(st.waktu).clash) st.waktu = '';
  }
  $('mbSlots').onclick = e => { const b = e.target.closest('[data-s]'); if (b) { st.waktu = b.dataset.s; UI.setError('mbSlot', ''); drawSlots(); } };
  $('mbSvc').onchange = () => { st.typeIdx = 0; st.petugas = ''; fillSvc(); };
  $('mbType').onchange = drawSlots; $('mbStaff').onchange = () => { st.petugas = $('mbStaff').value; drawSlots(); }; $('mbDate').onchange = drawSlots;
  // Pelanggan tersimpan
  $('mbName').addEventListener('change', () => {
    const c = customers.find(x => x.nama.toLowerCase() === $('mbName').value.trim().toLowerCase());
    if (!c) { $('mbPetPickWrap').hidden = true; return; }
    $('mbHp').value = c.hp || $('mbHp').value;
    if (c.pets.length) {
      $('mbPetPickWrap').hidden = false;
      $('mbPetPick').innerHTML = '<option value="">— Hewan baru —</option>' + c.pets.map((p, i) => `<option value="${i}">${esc(p.nama)} (${esc(p.spesie || '—')})</option>`).join('');
      $('mbPetPick').onchange = () => { const p = c.pets[$('mbPetPick').value]; if (p) { $('mbPet').value = p.nama; if (p.spesie) $('mbSpecies').value = p.spesie; } };
      $('mbPetPick').value = '0'; $('mbPetPick').onchange();
    }
  });
  fillSvc();

  function validate(step) {
    if (step === 1) {
      const a = UI.setError('mbName', $('mbName').value.trim().length >= 2 ? '' : 'Nama pelanggan minimal 2 karakter.');
      const b = UI.setError('mbHp', /^[0-9+\-\s]{8,16}$/.test($('mbHp').value.trim()) ? '' : 'Nomor HP hanya angka, 8–16 digit.');
      const c = UI.setError('mbPet', $('mbPet').value.trim().length >= 2 ? '' : 'Nama hewan minimal 2 karakter.');
      return a && b && c;
    }
    if (step === 2) {
      const d = UI.setError('mbDate', $('mbDate').value && $('mbDate').value >= dateMin ? '' : 'Pilih tanggal hari ini atau setelahnya.');
      let s = true;
      if (!st.waktu) { UI.setError('mbSlot', 'Pilih slot waktu yang tersedia.'); s = false; } else UI.setError('mbSlot', '');
      let cap = true;
      if (cfg().perDay) {
        const n = Math.max(1, +$('mbDays').value || 1);
        for (let i = 0; i < n; i++) if (AD.bookings.hotelOccupied(addDaysISO($('mbDate').value, i)) >= HOTEL_CAPACITY) { UI.setError('mbSlot', `Kandang penuh pada ${fmtDate(addDaysISO($('mbDate').value, i))}.`); cap = false; break; }
      }
      return d && s && cap;
    }
    return true;
  }
  function summary() {
    const c = cfg(), type = c.types[+$('mbType').value], days = c.perDay ? Math.max(1, +$('mbDays').value || 1) : 1;
    $('mbSummary').innerHTML = [['Pelanggan', `${esc($('mbName').value.trim())} · ${esc($('mbHp').value.trim())}`], ['Hewan', `${esc($('mbPet').value.trim())} (${$('mbSpecies').value})`], ['Layanan', `${esc(type.name)} <small class="muted">(${c.label})</small>`], ['Jadwal', `${fmtDate($('mbDate').value)}, ${st.waktu}${c.perDay ? ` · ${days} hari` : ''}`], ['Petugas', esc($('mbStaff').value)], ['Biaya', `<strong>${rp(type.price * days)}</strong>`]].map(r => `<div class="kv"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  }
  function go(n) {
    if (n < 1) return;
    st.step = n;
    $qa('.wz', el).forEach(w => { w.hidden = +w.dataset.wz !== n; });
    $qa('.steps li', el).forEach(li => { li.classList.toggle('cur', +li.dataset.s === n); li.classList.toggle('done', +li.dataset.s < n); });
    back.style.visibility = n === 1 ? 'hidden' : 'visible';
    nextBtn.textContent = n === 3 ? 'Simpan Booking' : 'Lanjut';
    if (n === 3) summary();
    const f = $q(`.wz[data-wz="${n}"] input, .wz[data-wz="${n}"] select, .wz[data-wz="${n}"] textarea`, el); f && f.focus();
  }
  function next() {
    if (!validate(st.step)) return;
    if (st.step < 3) return go(st.step + 1);
    const c = cfg(), type = c.types[+$('mbType').value], days = c.perDay ? Math.max(1, +$('mbDays').value || 1) : 1;
    const code = AD.bookings.addManual({ pelanggan: $('mbName').value.trim(), hp: $('mbHp').value.trim(), hewan: $('mbPet').value.trim(), spesie: $('mbSpecies').value, layanan: c.label, tipe: type.name, tanggal: $('mbDate').value, waktu: st.waktu, petugas: $('mbStaff').value, durasiHari: days, biaya: type.price * days, catatan: $('mbNote').value.trim() });
    m.close(); UI.toast(`Booking ${code} ditambahkan`);
    BK.range = 'all'; BK.status = 'Semua'; BK.q = '';
    AD.refresh();
  }
  go(1);
};
