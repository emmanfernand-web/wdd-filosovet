/* ============================================================
   FILOSOVET ADMIN — dashboard.js
   ============================================================ */
const Pages = {};

function pctDelta(cur, prev, suffix) {
  if (!prev && !cur) return `<span class="delta flat">Belum ada data ${suffix}</span>`;
  if (!prev) return `<span class="delta up">${ico('arrowup', 14)} Naik dari 0 ${suffix}</span>`;
  const p = Math.round((cur - prev) / prev * 100);
  if (p === 0) return `<span class="delta flat">Sama seperti ${suffix}</span>`;
  return `<span class="delta ${p > 0 ? 'up' : 'down'}">${ico(p > 0 ? 'arrowup' : 'arrowdown', 14)} ${p > 0 ? '+' : ''}${p}% vs ${suffix}</span>`;
}
const revenueOn = (trx, iso) => trx.filter(t => t.status === 'Lunas' && t.tanggal.slice(0, 10) === iso).reduce((s, t) => s + t.total, 0);
AD.revenueOn = revenueOn;

function whenLabel(b) {
  const d = diffDays(b.tanggal, todayISO());
  return `${d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : fmtDateShort(b.tanggal)} · ${b.waktu}`;
}
AD.whenLabel = whenLabel;
const nameCell = b => `<div class="cell-stack"><strong class="${b.pelanggan ? '' : 'dim'}">${esc(b.pelanggan || 'Tanpa nama')}</strong><small class="sub">${esc(b.hewan || '—')}${b.spesie ? ' · ' + esc(b.spesie) : ''}</small></div>`;
AD.nameCell = nameCell;

Pages.dashboard = {
  title: 'Dashboard',
  render(view) {
    const compact = ROLES[AD.role()].compactDashboard;
    const t = todayISO(), y = addDaysISO(t, -1);
    const bks = AD.bookings.all(), trx = AD.trx.all();
    const live = b => b.status !== 'Dibatalkan';
    const bt = bks.filter(b => b.tanggal === t && live(b)).length, by = bks.filter(b => b.tanggal === y && live(b)).length;
    const rt = revenueOn(trx, t), ry = revenueOn(trx, y);
    const ot = AD.bookings.hotelOccupied(t), oy = AD.bookings.hotelOccupied(y);
    const opct = Math.round(ot / HOTEL_CAPACITY * 100), opctY = Math.round(oy / HOTEL_CAPACITY * 100);
    const sc = AD.stock.counts(), low = sc.habis + sc.kurang;

    const banner = !compact && low ? `<div class="banner banner-warn" role="status">${ico('alert', 20)}<p><strong>${low} produk</strong> di bawah batas minimum stok (${sc.habis} habis, ${sc.kurang} kurang). Segera buat order ke distributor.</p><button type="button" class="btn btn-outline btn-sm" data-go="stok" data-gp='{"status":"butuh"}'>Lihat stok</button></div>` : '';

    view.innerHTML = `
      ${banner}
      <section class="stat-grid ${compact ? 'stat-grid-1' : ''}" aria-label="Ringkasan hari ini">
        <button type="button" class="stat stat-card" data-go="booking" data-gp='{"range":"today"}'>
          <span class="stat-ico">${ico('booking', 20)}</span><span class="stat-label">Booking Hari Ini</span>
          <span class="stat-value">${bt}</span>${pctDelta(bt, by, 'kemarin')}
        </button>
        ${compact ? '' : `
        <button type="button" class="stat stat-card" data-go="transaksi" data-gp='{"period":"today"}'>
          <span class="stat-ico">${ico('transaksi', 20)}</span><span class="stat-label">Pendapatan Hari Ini</span>
          <span class="stat-value">${rp(rt)}</span>${pctDelta(rt, ry, 'kemarin')}
        </button>
        <button type="button" class="stat stat-card" data-go="booking" data-gp='{"range":"today","layanan":"Pet Hotel"}'>
          <span class="stat-ico">${ico('heart', 20)}</span><span class="stat-label">Okupansi Pet Hotel</span>
          <span class="stat-value">${opct}%</span>${pctDelta(opct, opctY, 'kemarin')}
        </button>
        <button type="button" class="stat stat-card ${low ? 'stat-alert' : ''}" data-go="stok" data-gp='{"status":"butuh"}'>
          <span class="stat-ico">${ico('stok', 20)}</span><span class="stat-label">Stok Menipis</span>
          <span class="stat-value">${low}</span><span class="delta ${low ? 'down' : 'flat'}">${low ? `${sc.habis} habis · ${sc.kurang} kurang` : 'Semua stok aman'}</span>
        </button>`}
      </section>

      <div class="grid-main ${compact ? 'grid-main-1' : ''}">
        <section class="panel" aria-labelledby="hBk">
          <div class="panel-head"><h2 id="hBk">Booking Terbaru</h2><button type="button" class="btn btn-outline btn-sm" data-go="booking" data-gp='{"range":"today"}'>Lihat semua</button></div>
          <p class="panel-note muted">Booking hari ini dan yang masih menunggu konfirmasi.</p>
          <div id="dashBk"></div>
        </section>
        ${compact ? '' : `
        <div class="col">
          <section class="panel" aria-labelledby="hRev">
            <div class="panel-head"><h2 id="hRev">Pendapatan 7 Hari</h2><span class="muted small">Total ${rp(0)}</span></div>
            <div id="dashChart"></div>
          </section>
          <section class="panel" aria-labelledby="hSt">
            <div class="panel-head"><h2 id="hSt">Peringatan Stok</h2><button type="button" class="btn btn-ghost btn-sm" data-go="stok" data-gp='{"status":"butuh"}'>Semua</button></div>
            <div id="dashStock"></div>
          </section>
          <section class="panel" aria-labelledby="hAct">
            <div class="panel-head"><h2 id="hAct">Aktivitas Terbaru</h2></div>
            <div id="dashLog"></div>
          </section>
        </div>`}
      </div>`;

    // Booking terbaru
    const rows = bks.filter(b => (b.tanggal === t && live(b)) || (AD.bookings.eff(b) === 'Menunggu Konfirmasi' && b.tanggal >= t))
      .sort((a, b) => AD.bookings.start(a) - AD.bookings.start(b));
    UI.table($q('#dashBk'), {
      id: 'dash-bk', rows, pageSize: window.innerWidth < 700 ? 5 : 10, onRow: b => AD.openBooking(b.code),
      empty: { title: 'Belum ada booking hari ini', msg: 'Booking baru dari situs atau yang Anda tambahkan manual akan tampil di sini.', action: 'Tambah booking manual', onAction: () => AD.manualBooking() },
      columns: [
        { key: 'p', label: 'Pelanggan', cls: 'col-name', render: nameCell },
        { key: 'l', label: 'Layanan', cls: 'col-wide', render: b => `<div class="cell-stack">${esc(b.tipe)}<small class="sub">${esc(b.layanan)}</small></div>` },
        { key: 'j', label: 'Jadwal', render: b => `<span class="nowrap">${whenLabel(b)}</span>` },
        { key: 's', label: 'Status', render: b => UI.chip(AD.bookings.eff(b)) },
        { key: 'a', label: 'Aksi', align: 'right', render: b => `<button type="button" class="btn btn-outline btn-sm" data-detail="${b.code}">Detail</button>` }
      ]
    });
    $q('#dashBk').addEventListener('click', e => { const d = e.target.closest('[data-detail]'); if (d) AD.openBooking(d.dataset.detail); });

    if (compact) return;
    // Grafik 7 hari
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(t, i - 6));
    const data = days.map(d => ({ label: DAYS[parseISO(d).getDay()], full: `${DAYS_LONG[parseISO(d).getDay()]}, ${fmtDate(d)}`, value: revenueOn(trx, d) }));
    $q('.panel-head .small', view).textContent = `Total ${rp(data.reduce((s, d) => s + d.value, 0))}`;
    UI.barChart($q('#dashChart'), { data, highlightIndex: 6, ariaLabel: 'Pendapatan 7 hari terakhir' });

    // Peringatan stok
    const need = AD.stock.needRestock();
    $q('#dashStock').innerHTML = need.length ? `<ul class="alert-list">${need.slice(0, 5).map(p => `<li>
      <div><strong>${esc(p.name)}</strong><small class="sub">Sisa ${p.stock} · minimum ${p.min}</small></div>
      ${UI.stockChip(p)}<button type="button" class="btn btn-primary btn-sm" data-restock="${p.id}">Restock</button></li>`).join('')}</ul>${need.length > 5 ? `<p class="muted small more-note">+${need.length - 5} produk lainnya</p>` : ''}`
      : `<p class="muted ok-note">${ico('check', 18)} Semua stok dalam kondisi aman.</p>`;
    $q('#dashStock').addEventListener('click', e => { const b = e.target.closest('[data-restock]'); if (b) AD.restockModal(+b.dataset.restock); });

    // Aktivitas
    const lg = AD.log.all().slice(0, 7);
    $q('#dashLog').innerHTML = lg.length ? `<ul class="log-list">${lg.map(l => `<li><span class="log-dot"></span><div><p>${esc(l.ringkas)}</p><small class="muted">${esc(l.aktor)} · ${AD.ago(l.t)}</small></div></li>`).join('')}</ul>` : '<p class="muted">Belum ada aktivitas.</p>';
  }
};

AD.ago = iso => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'baru saja'; if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60); if (h < 24) return `${h} jam lalu`;
  return fmtDateTime(iso);
};
