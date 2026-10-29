/* ============================================================
   FILOSOVET ADMIN — finance.js  (Transaksi + Laporan)
   ============================================================ */
const TX = { q: '', period: 'all', metode: 'Semua', status: 'Semua', sumber: 'Semua', from: '', to: '' };
const LP = { period: '7', from: '', to: '' };
const PERIODS = [['all', 'Semua waktu'], ['today', 'Hari ini'], ['7', '7 hari terakhir'], ['month', 'Bulan ini'], ['custom', 'Rentang kustom']];

function periodRange(kind, from, to) {
  const t = todayISO();
  switch (kind) {
    case 'today': return [t, t];
    case '7': return [addDaysISO(t, -6), t];
    case 'month': return [t.slice(0, 8) + '01', t];
    case 'custom': return [from || '1970-01-01', to || t];
    default: return ['0000-01-01', '9999-12-31'];
  }
}
function trxFilter(list, f) {
  const [a, b] = periodRange(f.period, f.from, f.to), q = (f.q || '').trim().toLowerCase();
  return list.filter(t => { const d = t.tanggal.slice(0, 10); return d >= a && d <= b && (f.metode === 'Semua' || t.metode === f.metode) && (f.status === 'Semua' || t.status === f.status) && (f.sumber === 'Semua' || t.sumber === f.sumber) && (!q || [t.id, t.pelanggan, t.deskripsi, t.ref].some(v => String(v || '').toLowerCase().includes(q))); });
}
const statusLabel = s => s === 'Menunggu' ? 'Menunggu Bayar' : s;

/* ---------- Nota (struk 80mm) ---------- */
AD.notaHtml = t => `
  <div class="nota">
    <div class="nota-c"><strong class="nota-brand">FILOSOVET</strong><br>NOTA SIMULASI<br>Petshop &amp; Klinik Hewan<br>Jl. Petshop Raya No. 88, Jakarta<br>(021) 555-0123</div>
    <hr>
    <div class="nota-row"><span>No.</span><span>${esc(t.id)}</span></div>
    <div class="nota-row"><span>Tanggal</span><span>${fmtDateTime(t.tanggal)}</span></div>
    <div class="nota-row"><span>Pelanggan</span><span>${esc(t.pelanggan || '—')}</span></div>
    <div class="nota-row"><span>Sumber</span><span>${esc(t.sumber)}</span></div>
    ${t.ref ? `<div class="nota-row"><span>Booking</span><span>${esc(t.ref)}</span></div>` : ''}
    <hr>
    ${t.items.map(i => `<div class="nota-item"><div>${esc(i.name)}</div><div class="nota-row"><span>${i.qty} × ${i.price ? rp(i.price) : '—'}</span><span>${i.price ? rp(i.price * i.qty) : ''}</span></div></div>`).join('')}
    <hr>
    <div class="nota-row"><span>Subtotal</span><span>${rp(t.subtotal)}</span></div>
    ${t.diskon ? `<div class="nota-row"><span>Diskon</span><span>-${rp(t.diskon)}</span></div>` : ''}
    ${t.ongkir ? `<div class="nota-row"><span>Ongkir</span><span>${rp(t.ongkir)}</span></div>` : ''}
    <div class="nota-row nota-total"><span>TOTAL</span><span>${rp(t.total)}</span></div>
    <div class="nota-row"><span>Metode</span><span>${esc(t.metode)}</span></div>
    <div class="nota-row"><span>Status</span><span>${esc(t.status)}</span></div>
    <hr>
    <div class="nota-c">Terima kasih atas kepercayaan Anda.<br>Semoga anabul selalu sehat!</div>
  </div>`;

AD.openTrx = function (id) {
  const t = AD.trx.get(id); if (!t) return;
  const row = (k, v) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`;
  const dr = UI.drawer({
    title: t.id, subtitle: `${UI.chip(statusLabel(t.status))} ${UI.chip(t.sumber)}`,
    body: `<dl class="kvs">${row('Tanggal & jam', fmtDateTime(t.tanggal))}${row('Pelanggan', esc(t.pelanggan || '—'))}${row('Tipe', esc(t.tipe))}${row('Metode bayar', esc(t.metode))}${t.ref ? row('Booking', `<button type="button" class="link" data-bk="${esc(t.ref)}">${esc(t.ref)}</button>`) : ''}</dl>
      <h3 class="ds-title">Item</h3>
      <div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>Item</th><th style="text-align:right">Jml</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${t.items.map(i => `<tr><td>${esc(i.name)}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${i.price ? rp(i.price * i.qty) : '—'}</td></tr>`).join('')}</tbody></table></div>
      <dl class="kvs totals">${row('Subtotal', rp(t.subtotal))}${t.diskon ? row('Diskon', '-' + rp(t.diskon)) : ''}${t.ongkir ? row('Ongkos kirim', rp(t.ongkir)) : ''}<div class="kv total"><dt>Total</dt><dd>${rp(t.total)}</dd></div></dl>`,
    footer: `${t.status === 'Menunggu' ? '<button type="button" class="btn btn-primary" id="trxPaid">Tandai Lunas</button>' : ''}<button type="button" class="btn btn-outline" id="trxPrint">${ico('printer', 16)} Cetak Nota</button>`
  });
  $q('#trxPrint', dr.el).onclick = () => UI.print(AD.notaHtml(t), 'nota');
  const paid = $q('#trxPaid', dr.el);
  if (paid) paid.onclick = async () => {
    const ok = await UI.confirm({ title: 'Tandai lunas?', message: `Transaksi <strong>${esc(t.id)}</strong> senilai <strong>${rp(t.total)}</strong> akan ditandai lunas.`, confirmLabel: 'Ya, tandai lunas' });
    if (!ok) return; dr.close(); AD.paymentForm(t.id);
  };
  dr.el.addEventListener('click', e => { const b = e.target.closest('[data-bk]'); if (b) { dr.close(); AD.go('booking', { drawer: b.dataset.bk, range: 'all' }); } });
};

Pages.transaksi = {
  title: 'Transaksi',
  render(view, params) {
    if (params.period) TX.period = params.period;
    if (params.q != null) { TX.q = params.q; if (params.q) TX.period = 'all'; }
    const all = AD.trx.all();
    const metodes = [...new Set(all.map(t => t.metode))].sort();
    view.innerHTML = `
      <div class="page-bar"><p class="muted">Transaksi online (INV-…) dan kasir (TRX-…) dalam satu daftar.</p>
        <div class="bar-right"><button type="button" class="btn btn-outline" id="btnExport">${ico('download', 16)} Export Laporan</button><button type="button" class="btn btn-primary" id="btnKasir">${ico('plus', 16)} Transaksi Kasir</button></div></div>
      <section class="panel">
        <div class="filters">
          <div class="search-field"><label class="sr-only" for="txQ">Cari transaksi</label>${ico('search', 16)}<input type="search" id="txQ" placeholder="Cari ID, pelanggan, item…" value="${esc(TX.q)}"></div>
          <div class="sel"><label class="sr-only" for="txPer">Periode</label><select id="txPer">${PERIODS.map(o => `<option value="${o[0]}" ${TX.period === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
          <div class="custom-range" id="txCustom" ${TX.period === 'custom' ? '' : 'hidden'}><input type="date" id="txFrom" value="${TX.from}" aria-label="Dari tanggal"><span>–</span><input type="date" id="txTo" value="${TX.to}" aria-label="Sampai tanggal"></div>
          <div class="sel"><label class="sr-only" for="txMet">Metode bayar</label><select id="txMet"><option value="Semua">Semua metode</option>${metodes.map(m => `<option ${TX.metode === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
          <div class="sel"><label class="sr-only" for="txSt">Status</label><select id="txSt"><option value="Semua">Semua status</option><option value="Lunas" ${TX.status === 'Lunas' ? 'selected' : ''}>Lunas</option><option value="Menunggu" ${TX.status === 'Menunggu' ? 'selected' : ''}>Menunggu bayar</option></select></div>
          <div class="sel"><label class="sr-only" for="txSrc">Sumber</label><select id="txSrc"><option value="Semua">Semua sumber</option><option ${TX.sumber === 'Online' ? 'selected' : ''}>Online</option><option ${TX.sumber === 'Kasir' ? 'selected' : ''}>Kasir</option></select></div>
        </div>
        <p class="sum-line" id="txSum"></p>
        <div id="txBody"></div>
      </section>`;
    const set = (id, key, ev = 'onchange') => { $q('#' + id)[ev] = e => { TX[key] = e.target.value; if (key === 'period') $q('#txCustom').hidden = TX.period !== 'custom'; UI.resetPage('trx'); this.body(); }; };
    set('txQ', 'q', 'oninput'); set('txPer', 'period'); set('txFrom', 'from'); set('txTo', 'to'); set('txMet', 'metode'); set('txSt', 'status'); set('txSrc', 'sumber');
    $q('#btnKasir').onclick = () => AD.kasirModal(); $q('#btnExport').onclick = () => AD.exportModal();
    this.body();
    if (params.drawer) AD.openTrx(params.drawer);
  },
  body() {
    const rows = trxFilter(AD.trx.all(), TX);
    const lunas = rows.filter(t => t.status === 'Lunas').reduce((s, t) => s + t.total, 0);
    $q('#txSum').innerHTML = `<strong>${rows.length}</strong> transaksi · Lunas <strong>${rp(lunas)}</strong>`;
    UI.table($q('#txBody'), {
      id: 'trx', rows, pageSize: window.innerWidth < 700 ? 5 : 10, onRow: t => AD.openTrx(t.id),
      empty: { title: 'Belum ada transaksi', msg: 'Tidak ada transaksi yang cocok dengan filter.', action: 'Reset filter', onAction: () => { Object.assign(TX, { q: '', period: 'all', metode: 'Semua', status: 'Semua', sumber: 'Semua' }); Pages.transaksi.render($q('#view'), {}); } },
      columns: [
        { key: 'id', label: 'ID Transaksi', render: t => `<code class="code">${esc(t.id)}</code>` },
        { key: 'tgl', label: 'Tanggal & Jam', render: t => `<span class="nowrap">${fmtDateShort(t.tanggal)} · ${fmtTime(t.tanggal)}</span>` },
        { key: 'p', label: 'Pelanggan', cls: 'col-name', render: t => `<div class="cell-stack"><strong class="${t.pelanggan && t.pelanggan !== 'Tanpa nama' ? '' : 'dim'}">${esc(t.pelanggan || 'Tanpa nama')}</strong><small class="sub">${esc(t.tipe)}</small></div>` },
        { key: 'd', label: 'Rincian', cls: 'col-wide', render: t => `<span class="clamp" title="${esc(t.deskripsi)}">${esc(t.deskripsi)}</span>` },
        { key: 'tot', label: 'Total', align: 'right', render: t => `<strong class="nowrap">${rp(t.total)}</strong>` },
        { key: 'm', label: 'Metode', render: t => esc(t.metode.replace('Transfer Bank ', 'Transfer ').replace('Kartu Debit/Kredit', 'Debit/Kredit').replace(' (bayar di toko)', '')) },
        { key: 'src', label: 'Sumber', render: t => UI.chip(t.sumber) },
        { key: 'ref', label: 'Booking', render: t => t.ref ? `<code class="code">${esc(t.ref)}</code>` : '<span class="dim">—</span>' },
        { key: 's', label: 'Status', render: t => UI.chip(statusLabel(t.status)) }
      ]
    });
  }
};

/* ---------- Transaksi kasir ---------- */
AD.kasirModal = function () { AD.require(PERM.PAY); AD.go('pos'); };

/* ---------- Export laporan transaksi ---------- */
AD.exportModal = function () {
  const [a0] = periodRange('month'); const t = todayISO();
  UI.modal({
    title: 'Export Laporan Transaksi', size: 'sm', desc: 'Data mengikuti filter yang sedang aktif di daftar transaksi, dibatasi rentang tanggal di bawah.',
    body: `<div class="row2"><div class="field"><label for="exFrom">Dari tanggal</label><input type="date" id="exFrom" value="${a0}"></div><div class="field"><label for="exTo">Sampai tanggal</label><input type="date" id="exTo" value="${t}"></div></div>
      <fieldset class="field fs"><legend>Format</legend><label class="check"><input type="radio" name="exFmt" value="csv" checked> CSV (dibuka di Excel)</label><label class="check"><input type="radio" name="exFmt" value="pdf"> PDF (lewat dialog cetak)</label></fieldset>
      <p class="preview" id="exInfo"></p>`,
    actions: [{ label: 'Batal', kind: 'outline' }, { label: 'Unduh', kind: 'primary', onClick: (close, el) => {
      const rows = rowsFor(el); if (!rows.length) { UI.toast('Tidak ada data pada rentang ini', 'error'); return; }
      const fmt = $q('input[name=exFmt]:checked', el).value, f = $q('#exFrom', el).value, to = $q('#exTo', el).value;
      if (fmt === 'csv') {
        UI.csv(`transaksi-filosovet-${f}_${to}.csv`, [['ID', 'Tanggal', 'Jam', 'Pelanggan', 'Tipe', 'Rincian', 'Subtotal', 'Diskon', 'Ongkir', 'Total', 'Metode', 'Sumber', 'Ref Booking', 'Status'], ...rows.map(t => [t.id, t.tanggal.slice(0, 10), fmtTime(t.tanggal), t.pelanggan, t.tipe, t.deskripsi, t.subtotal, t.diskon, t.ongkir, t.total, t.metode, t.sumber, t.ref || '', t.status])]);
        UI.toast(`${rows.length} transaksi diunduh (CSV)`);
      } else {
        UI.print(`<h1>Laporan Transaksi Filosovet</h1><p>${fmtDate(f)} – ${fmtDate(to)} · ${rows.length} transaksi</p><table class="rpt"><thead><tr><th>ID</th><th>Tanggal</th><th>Pelanggan</th><th>Rincian</th><th>Metode</th><th>Status</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows.map(t => `<tr><td>${esc(t.id)}</td><td>${fmtDateShort(t.tanggal)} ${fmtTime(t.tanggal)}</td><td>${esc(t.pelanggan)}</td><td>${esc(t.deskripsi)}</td><td>${esc(t.metode)}</td><td>${esc(t.status)}</td><td style="text-align:right">${rp(t.total)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="6"><strong>Total lunas</strong></td><td style="text-align:right"><strong>${rp(rows.filter(t => t.status === 'Lunas').reduce((s, t) => s + t.total, 0))}</strong></td></tr></tfoot></table>`, 'a4');
      }
      AD.log.add('Transaksi', `Export laporan transaksi ${fmt.toUpperCase()} (${rows.length} baris)`); close();
    } }],
    onOpen: el => { const upd = () => { $q('#exInfo', el).innerHTML = `<strong>${rowsFor(el).length}</strong> transaksi akan diekspor`; }; el.addEventListener('input', upd); upd(); }
  });
  function rowsFor(el) { const f = $q('#exFrom', el).value, to = $q('#exTo', el).value; return trxFilter(AD.trx.all(), { ...TX, period: 'custom', from: f, to }).sort((a, b) => a.tanggal.localeCompare(b.tanggal)); }
};

/* ============================ LAPORAN ============================ */
function metricsFor(a, b) {
  const t = todayISO();
  const trx = AD.trx.all().filter(x => { const d = x.tanggal.slice(0, 10); return d >= a && d <= b; });
  const lunas = trx.filter(x => x.status === 'Lunas');
  const bks = AD.bookings.all().filter(x => x.tanggal >= a && x.tanggal <= b);
  const selesai = bks.filter(x => x.status === 'Selesai').length;
  const nohow = bks.filter(x => x.tanggal <= t && AD.bookings.eff(x) === 'Tidak Hadir').length;
  const denom = bks.filter(x => x.tanggal <= t && ['Selesai', 'Diproses', 'Tidak Hadir'].includes(AD.bookings.eff(x))).length;
  const days = []; for (let d = a; d <= b && d <= t; d = addDaysISO(d, 1)) days.push(d);
  const occ = days.length ? Math.round(days.reduce((s, d) => s + AD.bookings.hotelOccupied(d) / HOTEL_CAPACITY, 0) / days.length * 100) : 0;
  const prodMap = {}, layMap = {}, metMap = {}; let svcSum = 0, prodSum = 0;
  lunas.forEach(x => {
    (metMap[x.metode] || (metMap[x.metode] = { omset: 0 })).omset += x.total;
    if (x.tipe === 'Layanan') svcSum += x.total; else prodSum += x.total;
    x.items.forEach(i => {
      if (x.tipe === 'Produk') { const m = prodMap[i.name] || (prodMap[i.name] = { qty: 0, omset: 0 }); m.qty += i.qty; m.omset += i.price * i.qty; }
      else { const n = i.name.includes(': ') ? i.name.split(': ')[1].replace(/ × \d+ hari$/, '') : i.name; const m = layMap[n] || (layMap[n] = { qty: 0, omset: 0 }); m.qty += 1; m.omset += i.price * i.qty; }
    });
  });
  const top = (m, k) => Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((x, y) => y[k] - x[k]);
  return { omset: lunas.reduce((s, x) => s + x.total, 0), selesai, rate: denom ? Math.round(nohow / denom * 100) : 0, occ, prod: top(prodMap, 'qty'), lay: top(layMap, 'omset'), met: top(metMap, 'omset').map(x => ({ name: x.name, omset: x.omset })), svcSum, prodSum, lunas };
}
function deltaBadge(cur, prev, unit = '%') {
  if (unit === 'pt') { const d = cur - prev; return `<span class="delta ${d === 0 ? 'flat' : d > 0 ? 'up' : 'down'}">${d === 0 ? 'Sama dengan periode lalu' : `${ico(d > 0 ? 'arrowup' : 'arrowdown', 14)} ${d > 0 ? '+' : ''}${d} poin vs periode lalu`}</span>`; }
  return pctDelta(cur, prev, 'periode lalu');
}

/* Tingkat tidak hadir: turun = baik (hijau), naik = buruk (merah) */
function rateDelta(cur, prev) {
  const d = cur - prev;
  if (d === 0) return '<span class="delta flat">Sama dengan periode lalu</span>';
  return `<span class="delta ${d < 0 ? 'up' : 'down'}">${ico(d < 0 ? 'arrowdown' : 'arrowup', 14)} ${d > 0 ? '+' : ''}${d} poin vs periode lalu</span>`;
}

Pages.laporan = {
  title: 'Laporan',
  render(view) {
    view.innerHTML = `
      <div id="tab-laporan">
        <div class="page-bar">
          <div class="filters inline">
            <div class="sel"><label class="sr-only" for="lpPer">Periode laporan</label><select id="lpPer">${PERIODS.filter(p => p[0] !== 'all').map(o => `<option value="${o[0]}" ${LP.period === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
            <div class="custom-range" id="lpCustom" ${LP.period === 'custom' ? '' : 'hidden'}><input type="date" id="lpFrom" value="${LP.from}" aria-label="Dari tanggal"><span>–</span><input type="date" id="lpTo" value="${LP.to}" aria-label="Sampai tanggal"></div>
            <span class="muted" id="lpRangeLbl"></span>
          </div>
          <div class="bar-right"><button type="button" class="btn btn-outline" id="lpPdf">${ico('printer', 16)} Unduh PDF</button><button type="button" class="btn btn-primary" id="lpCsv">${ico('download', 16)} Unduh Excel/CSV</button></div>
        </div>
        <div id="lpBody"></div>
      </div>`;
    $q('#lpPer').onchange = e => { LP.period = e.target.value; $q('#lpCustom').hidden = LP.period !== 'custom'; this.body(); };
    $q('#lpFrom').onchange = e => { LP.from = e.target.value; this.body(); }; $q('#lpTo').onchange = e => { LP.to = e.target.value; this.body(); };
    $q('#lpPdf').onclick = () => this.pdf(); $q('#lpCsv').onclick = () => this.csv();
    this.body();
  },
  data() {
    let [a, b] = periodRange(LP.period, LP.from, LP.to);
    if (a > b) [a, b] = [b, a];
    const len = diffDays(b, a) + 1;
    return { a, b, len, cur: metricsFor(a, b), prev: metricsFor(addDaysISO(a, -len), addDaysISO(a, -1)) };
  },
  body() {
    const d = this.data(), { cur, prev } = d, t = todayISO();
    $q('#lpRangeLbl').textContent = `${fmtDate(d.a)} – ${fmtDate(d.b)} · dibanding ${d.len} hari sebelumnya`;
    const topP = cur.prod[0];
    $q('#lpBody').innerHTML = `
      <section class="stat-grid stat-grid-5" aria-label="Ringkasan periode">
        <div class="stat stat-card static"><span class="stat-label">Omset</span><span class="stat-value">${rp(cur.omset)}</span>${deltaBadge(cur.omset, prev.omset)}</div>
        <div class="stat stat-card static"><span class="stat-label">Reservasi Selesai</span><span class="stat-value">${cur.selesai}</span>${deltaBadge(cur.selesai, prev.selesai)}</div>
        <div class="stat stat-card static"><span class="stat-label">Produk Terlaris</span><span class="stat-value stat-text" title="${topP ? esc(topP.name) : ''}">${topP ? esc(topP.name) : '—'}</span><span class="delta flat">${topP ? `${topP.qty} unit terjual` : 'Belum ada penjualan'}</span></div>
        <div class="stat stat-card static"><span class="stat-label">Tingkat Tidak Hadir</span><span class="stat-value">${cur.rate}%</span>${rateDelta(cur.rate, prev.rate)}</div>
        <div class="stat stat-card static"><span class="stat-label">Okupansi Pet Hotel</span><span class="stat-value">${cur.occ}%</span>${deltaBadge(cur.occ, prev.occ, 'pt')}</div>
      </section>
      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>Omset per Hari</h2></div><div id="lpDaily"></div></section>
        <section class="panel"><div class="panel-head"><h2>Layanan vs Produk</h2></div><div id="lpSplit"></div></section>
        <section class="panel"><div class="panel-head"><h2>5 Produk Terlaris</h2></div><div id="lpTopP"></div></section>
        <section class="panel"><div class="panel-head"><h2>5 Layanan Teratas</h2></div><div id="lpTopL"></div></section>
        <section class="panel"><div class="panel-head"><h2>Metode Pembayaran</h2></div><div id="lpMet"></div></section>
      </div>`;
    // harian
    const days = []; for (let x = d.a; x <= d.b; x = addDaysISO(x, 1)) days.push(x);
    const dayData = days.map(x => ({ label: d.len > 14 ? String(+x.slice(8)) : DAYS[parseISO(x).getDay()], full: `${DAYS_LONG[parseISO(x).getDay()]}, ${fmtDate(x)}`, value: AD.revenueOn(AD.trx.all(), x) }));
    UI.barChart($q('#lpDaily'), { data: dayData, highlightIndex: days.indexOf(t), ariaLabel: 'Omset per hari', height: 200 });
    // split
    const tot = cur.svcSum + cur.prodSum || 1;
    $q('#lpSplit').innerHTML = `<div class="split" role="img" aria-label="Layanan ${Math.round(cur.svcSum / tot * 100)} persen, produk ${Math.round(cur.prodSum / tot * 100)} persen"><span class="sp-a" style="width:${cur.svcSum / tot * 100}%"></span><span class="sp-b" style="width:${cur.prodSum / tot * 100}%"></span></div>
      <ul class="split-legend"><li><i class="sp-a"></i>Layanan <strong>${rp(cur.svcSum)}</strong> <span class="muted">(${Math.round(cur.svcSum / tot * 100)}%)</span></li><li><i class="sp-b"></i>Produk <strong>${rp(cur.prodSum)}</strong> <span class="muted">(${Math.round(cur.prodSum / tot * 100)}%)</span></li></ul>`;
    $q('#lpTopP').innerHTML = cur.prod.length ? UI.hbars(cur.prod.slice(0, 5).map(p => ({ label: p.name, value: p.qty, text: `${p.qty} unit · ${compactRp(p.omset)}` }))) : '<p class="muted">Belum ada penjualan produk.</p>';
    $q('#lpTopL').innerHTML = cur.lay.length ? UI.hbars(cur.lay.slice(0, 5).map(p => ({ label: p.name, value: p.omset, text: `${p.qty}× · ${compactRp(p.omset)}` }))) : '<p class="muted">Belum ada layanan terbayar.</p>';
    $q('#lpMet').innerHTML = cur.met.length ? UI.hbars(cur.met.map(m => ({ label: m.name, value: m.omset, text: `${rp(m.omset)} (${Math.round(m.omset / (cur.omset || 1) * 100)}%)` }))) : '<p class="muted">Belum ada pembayaran.</p>';
  },
  csv() {
    const d = this.data(), c = d.cur;
    const rows = [['Laporan Filosovet'], ['Periode', `${d.a} s/d ${d.b}`], [], ['Ringkasan'], ['Omset', c.omset], ['Reservasi selesai', c.selesai], ['Tingkat tidak hadir (%)', c.rate], ['Okupansi pet hotel (%)', c.occ], ['Omset layanan', c.svcSum], ['Omset produk', c.prodSum], [], ['Omset per hari'], ['Tanggal', 'Omset']];
    for (let x = d.a; x <= d.b; x = addDaysISO(x, 1)) rows.push([x, AD.revenueOn(AD.trx.all(), x)]);
    rows.push([], ['Produk terlaris'], ['Produk', 'Unit', 'Omset'], ...c.prod.slice(0, 10).map(p => [p.name, p.qty, p.omset]), [], ['Layanan teratas'], ['Layanan', 'Jumlah', 'Omset'], ...c.lay.slice(0, 10).map(p => [p.name, p.qty, p.omset]), [], ['Metode pembayaran'], ['Metode', 'Omset'], ...c.met.map(m => [m.name, m.omset]));
    UI.csv(`laporan-filosovet-${d.a}_${d.b}.csv`, rows); AD.log.add('Laporan', `Mengunduh laporan CSV ${d.a} – ${d.b}`); UI.toast('Laporan CSV diunduh');
  },
  pdf() {
    const d = this.data(), c = d.cur, p = d.prev;
    const li = (arr, f) => `<ol>${arr.slice(0, 5).map(f).join('')}</ol>`;
    UI.print(`<h1>Laporan Operasional & Keuangan Filosovet</h1><p>Periode ${fmtDate(d.a)} – ${fmtDate(d.b)}</p>
      <table class="rpt"><tbody><tr><td>Omset</td><td style="text-align:right">${rp(c.omset)}</td><td>Periode lalu</td><td style="text-align:right">${rp(p.omset)}</td></tr>
      <tr><td>Reservasi selesai</td><td style="text-align:right">${c.selesai}</td><td>Periode lalu</td><td style="text-align:right">${p.selesai}</td></tr>
      <tr><td>Tingkat tidak hadir</td><td style="text-align:right">${c.rate}%</td><td>Periode lalu</td><td style="text-align:right">${p.rate}%</td></tr>
      <tr><td>Okupansi pet hotel</td><td style="text-align:right">${c.occ}%</td><td>Periode lalu</td><td style="text-align:right">${p.occ}%</td></tr>
      <tr><td>Omset layanan</td><td style="text-align:right">${rp(c.svcSum)}</td><td>Omset produk</td><td style="text-align:right">${rp(c.prodSum)}</td></tr></tbody></table>
      <h2>5 Produk Terlaris</h2>${li(c.prod, x => `<li>${esc(x.name)} — ${x.qty} unit (${rp(x.omset)})</li>`)}
      <h2>5 Layanan Teratas</h2>${li(c.lay, x => `<li>${esc(x.name)} — ${x.qty}× (${rp(x.omset)})</li>`)}
      <h2>Metode Pembayaran</h2>${li(c.met, x => `<li>${esc(x.name)} — ${rp(x.omset)}</li>`)}`, 'a4');
    AD.log.add('Laporan', `Mencetak laporan PDF ${d.a} – ${d.b}`);
  }
};
