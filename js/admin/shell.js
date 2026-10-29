/* ============================================================
   FILOSOVET ADMIN — shell.js
   Sidebar, header (cari, notifikasi, akun), routing, tema, peran
   ============================================================ */
const NAV = Object.entries({dashboard:'Dashboard',booking:'Booking & Kalender',pelanggan:'Pelanggan & Hewan',stok:'Stok & Farmasi',produk:'Produk',transaksi:'Riwayat Transaksi',laporan:'Laporan',staff:'Staff & Role',pengaturan:'Pengaturan',pembayaran:'Pembayaran',pos:'Kasir / POS',supplier:'Restock & Supplier',mutasi:'Riwayat Stok',antrean:'Antrean / Check-in',pasien:'Pasien Hari Ini',medis:'Rekam Medis',resep:'Resep Obat',jadwal:'Jadwal Konsultasi',grooming:'Jadwal Grooming',proses:'Proses Grooming',riwayatgrooming:'Riwayat Grooming',reservasi:'Reservasi Hotel',kandang:'Kandang & Okupansi',perawatan:'Perawatan Harian',riwayathotel:'Riwayat Penitipan'}).map(([id,label])=>({id,label}));
AD.current = 'dashboard';
AD.nextParams = null;
AD.params = {};
let navTimer = null;

/* ---------- Routing ---------- */
const hashPage = () => (location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard';
AD.go = (page, params = {}) => {
  AD.nextParams = params;
  if (location.hash === '#/' + page) AD.render(true); else location.hash = '#/' + page;
  closeSidebar();
};
AD.render = function (fromGo) {
  let page = hashPage();
  if (!Pages[page] || !AD.can(page)) { if (Pages[page] && !AD.can(page)) UI.toast('Peran Anda tidak memiliki akses ke halaman itu', 'error'); page = 'dashboard'; if (location.hash !== '#/dashboard') { history.replaceState(null, '', '#/dashboard'); } }
  const params = AD.nextParams || {}; AD.nextParams = null; AD.params = params;
  AD.current = page;
  document.title = `${Pages[page].title} | Admin Filosovet`;
  $q('#pageTitle').textContent = page === 'dashboard' ? ROLES[AD.role()].title : Pages[page].title;
  drawSidebar();
  const view = $q('#view');
  clearTimeout(navTimer);
  view.setAttribute('aria-busy', 'true');
  view.innerHTML = `<div class="panel">${UI.skeletonRows(6, 5)}</div>`;
  navTimer = setTimeout(() => {
    try { Pages[page].render(view, params); } catch(error) { view.innerHTML = '<section class="panel work-pad"><h2>Data tidak dapat dimuat</h2><p>'+esc(error.message)+'</p></section>'; }
    view.setAttribute('aria-busy', 'false');
    if (params.drawer && page === 'booking') AD.openBooking(params.drawer);
    window.scrollTo(0, 0);
  }, 160);
};
/* Render ulang halaman aktif tanpa skeleton (setelah data berubah) */
AD.refresh = function () {
  const view = $q('#view'), y = window.scrollY;
  Pages[AD.current].render(view, {});
  window.scrollTo(0, y);
  drawSidebar(); drawNotifBadge();
};

/* ---------- Sidebar ---------- */
function drawSidebar() {
  const bkBadge = AD.bookings.all().filter(b => AD.bookings.eff(b) === 'Menunggu Konfirmasi').length;
  const sc = AD.stock.counts(), stBadge = sc.habis + sc.kurang;
  const badges = { booking: bkBadge, stok: stBadge };
  $q('#sbNav').innerHTML = ROLES[AD.role()].pages.map(id => NAV.find(n => n.id === id)).map(n => `<a href="#/${n.id}" class="sb-item ${AD.current === n.id ? 'active' : ''}" ${AD.current === n.id ? 'aria-current="page"' : ''} title="${n.label}" data-nav="${n.id}">${ico(['dashboard','booking','stok','produk','transaksi','laporan'].includes(n.id)?n.id:'user', 20)}<span class="sb-label">${n.id === 'dashboard' ? ROLES[AD.role()].title : n.id === 'booking' && AD.role() === 'admin' ? 'Booking' : n.label}</span>${badges[n.id] ? `<span class="sb-badge ${n.id === 'stok' ? 'warn' : ''}" aria-label="${badges[n.id]} ${n.id === 'booking' ? 'menunggu konfirmasi' : 'stok bermasalah'}">${badges[n.id]}</span>` : ''}</a>`).join('');
}
const adm = () => $q('#adm');
function setCollapsed(c) { adm().classList.toggle('collapsed', c); localStorage.setItem('fv_admin_collapsed', c ? '1' : '0'); const b = $q('#btnCollapse'); b.innerHTML = ico(c ? 'expand' : 'collapse', 18); b.setAttribute('aria-label', c ? 'Perluas sidebar' : 'Ciutkan sidebar'); b.setAttribute('aria-expanded', !c); }
function openSidebar() { adm().classList.add('drawer-open'); $q('#btnMenu').setAttribute('aria-expanded', 'true'); const a = $q('.sb-item.active') || $q('.sb-item'); a && a.focus(); }
function closeSidebar() { adm().classList.remove('drawer-open'); const b = $q('#btnMenu'); b && b.setAttribute('aria-expanded', 'false'); }

/* ---------- Tema ---------- */
AD.isDark = () => document.documentElement.classList.contains('dark-mode');
AD.toggleTheme = () => {
  const dark = !AD.isDark();
  document.documentElement.classList.toggle('dark-mode', dark);
  localStorage.setItem('fv_theme', dark ? 'dark' : 'light');
  drawAcct();
};

/* ---------- Notifikasi ---------- */
function drawNotifBadge() {
  const n = AD.notifs.unread(), b = $q('#notifCount');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
  $q('#btnNotif').setAttribute('aria-label', n ? `Notifikasi, ${n} belum dibaca` : 'Notifikasi');
  if (!$q('#notifPanel').hidden) drawNotifList();
}
function drawNotifList() {
  const items = AD.notifs.items();
  $q('#notifList').innerHTML = items.length ? items.map((n, i) => `<li><button type="button" class="notif-item ${n.unread ? 'unread' : ''}" data-i="${i}"><span class="notif-ico ${n.kind}">${ico(n.kind === 'booking' ? 'booking' : 'alert', 16)}</span><span><strong>${esc(n.title)}</strong><small>${esc(n.desc)}</small></span>${n.unread ? '<i class="dot" aria-label="belum dibaca"></i>' : ''}</button></li>`).join('') : '<li class="notif-empty muted">Tidak ada notifikasi baru.</li>';
  $q('#notifList').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const n = items[+b.dataset.i]; AD.notifs.markOne(n.key); closePanels(); drawNotifBadge(); AD.go(n.go[0], n.go[1]); };
}

/* ---------- Akun ---------- */
function drawAcct() {
  const r = AD.roleLabel();
  $q('#acctName').textContent = r;
  $q('#acctAvatar').textContent = r.charAt(0);
  $q('#acctPanel').innerHTML = `
    <div class="acct-head"><span class="avatar">${r.charAt(0)}</span><div><strong>Admin Filosovet</strong><small>Peran: ${r}</small></div></div>
    <button type="button" class="acct-item" data-a="profil">${ico('user', 16)} Profil</button>
    <button type="button" class="acct-item" data-a="theme">${ico(AD.isDark() ? 'sun' : 'moon', 16)} Ganti tema (${AD.isDark() ? 'terang' : 'gelap'})</button>
    <div class="acct-role"><label for="roleSel">${ico('user', 16)} Simulasi peran</label><select id="roleSel">${Object.keys(ROLES).map(k => `<option value="${k}" ${AD.role() === k ? 'selected' : ''}>${ROLES[k].label}</option>`).join('')}</select></div>
    ${AD.role() === 'admin' ? `<button type="button" class="acct-item" data-a="reset">${ico('refresh', 16)} Reset data demo</button>` : ''}
    <div class="acct-role"><label for="staffSel">Identitas staff demo</label><select id="staffSel">${AD.staffChoices().map(n=>`<option ${n===AD.actor()?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
    <hr><button type="button" class="acct-item danger" data-a="logout">${ico('logout', 16)} Keluar</button>`;
}
function acctAction(a) {
  closePanels();
  if (a === 'theme') return AD.toggleTheme();
  if (a === 'profil') return UI.modal({ title: 'Profil', size: 'sm', body: `<div class="prof-box"><span class="avatar avatar-lg">${AD.roleLabel().charAt(0)}</span><div><strong>Admin Filosovet</strong><p class="muted">Peran: ${AD.roleLabel()}</p></div></div><h3 class="ds-title">Akses halaman</h3><ul class="plain">${NAV.map(n => `<li>${AD.can(n.id) ? ico('check', 14) : ico('x', 14)} ${n.label}</li>`).join('')}</ul><p class="muted small">Peran hanya simulasi tampilan; autentikasi sungguhan memerlukan server.</p>`, actions: [{ label: 'Tutup', kind: 'outline' }] });
  if (a === 'reset' && AD.allowed(PERM.STAFF)) return UI.confirm({ title: 'Reset data demo?', message: 'Semua data demo admin, termasuk rekam medis, resep, penitipan, staff, booking, transaksi, stok dan log, dihapus dan dikembalikan ke kondisi awal. Data booking dan pesanan dari situs publik di browser ini juga dihapus.', confirmLabel: 'Ya, reset', danger: true }).then(ok => { if (ok) { AD.resetDemo(); location.reload(); } });
  if (a === 'logout') return UI.confirm({ title: 'Keluar dari panel admin?', message: 'Anda akan diarahkan ke halaman masuk.', confirmLabel: 'Keluar' }).then(ok => { if (ok) location.href = 'auth.html'; });
}
function closePanels() { ['notifPanel', 'acctPanel'].forEach(id => { const p = $q('#' + id); if (!p.hidden) { p.hidden = true; } }); $q('#btnNotif').setAttribute('aria-expanded', 'false'); $q('#btnAcct').setAttribute('aria-expanded', 'false'); }

/* ---------- Pencarian global ---------- */
function searchAll(raw) {
  const q = raw.trim().toLowerCase(); if (q.length < 2) return [];
  const g = [];
  if (AD.can('booking')) {
    const bks = AD.bookings.all().filter(b => [b.code, b.pelanggan, b.hewan, b.hp].some(v => String(v).toLowerCase().includes(q))).slice(0, 4);
    if (bks.length) g.push({ name: 'Booking', items: bks.map(b => ({ icon: 'booking', title: `${b.pelanggan || 'Tanpa nama'} · ${b.hewan || '—'}`, desc: `${b.code} · ${b.tipe} · ${fmtDateShort(b.tanggal)} ${b.waktu}`, run: () => AD.go('booking', { drawer: b.code, range: 'all' }) })) });
    const cs = AD.bookings.customers().filter(c => c.nama.toLowerCase().includes(q) || String(c.hp).includes(q)).slice(0, 3);
    if (cs.length) g.push({ name: 'Pelanggan', items: cs.map(c => ({ icon: 'user', title: c.nama, desc: `${c.hp || '—'} · ${c.pets.map(p => p.nama).join(', ') || 'Tanpa hewan'}`, run: () => AD.go('booking', { q: c.nama, range: 'all' }) })) });
  }
  if (AD.can('transaksi')) {
    const ts = AD.trx.all().filter(t => [t.id, t.pelanggan, t.ref].some(v => String(v || '').toLowerCase().includes(q))).slice(0, 4);
    if (ts.length) g.push({ name: 'Transaksi', items: ts.map(t => ({ icon: 'transaksi', title: `${t.id} · ${rp(t.total)}`, desc: `${t.pelanggan} · ${fmtDateShort(t.tanggal)}`, run: () => AD.go('transaksi', { drawer: t.id, period: 'all' }) })) });
  }
  if (AD.can('produk') || AD.can('stok')) {
    const ps = PRODUCTS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4);
    if (ps.length) g.push({ name: 'Produk', items: ps.map(p => ({ icon: 'produk', title: p.name, desc: `${catName(p.cat)} · stok ${p.stock} · ${rp(p.price)}`, run: () => AD.can('produk') ? AD.go('produk', { drawer: p.id, q: '' }) : AD.go('stok', { q: p.name }) })) });
  }
  return g;
}
function initSearch() {
  const inp = $q('#gSearch'), box = $q('#gResults'); let flat = [], idx = -1;
  const close = () => { box.hidden = true; idx = -1; inp.setAttribute('aria-expanded', 'false'); };
  const mark = () => $qa('.sr-item', box).forEach((b, i) => { b.classList.toggle('hl', i === idx); b.setAttribute('aria-selected', i === idx); if (i === idx) { inp.setAttribute('aria-activedescendant', b.id); b.scrollIntoView({ block: 'nearest' }); } });
  const draw = () => {
    const groups = searchAll(inp.value); flat = []; let n = 0;
    if (inp.value.trim().length < 2) return close();
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
    box.innerHTML = groups.length ? groups.map(gr => `<div class="sr-group" role="presentation">${gr.name}</div>${gr.items.map(it => { flat.push(it); return `<button type="button" role="option" id="sr${n}" class="sr-item" data-n="${n++}"><span class="sr-ico">${ico(it.icon, 16)}</span><span><strong>${esc(it.title)}</strong><small>${esc(it.desc)}</small></span></button>`; }).join('')}`).join('') : `<p class="sr-empty">Tidak ada hasil untuk “${esc(inp.value.trim())}”.</p>`;
    idx = -1;
  };
  inp.addEventListener('input', draw);
  inp.addEventListener('focus', draw);
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) { idx = (idx + 1) % flat.length; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) { idx = (idx - 1 + flat.length) % flat.length; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); const it = flat[idx >= 0 ? idx : 0]; if (it) { close(); inp.value = ''; inp.blur(); it.run(); } }
    else if (e.key === 'Escape') { close(); inp.blur(); }
  });
  box.addEventListener('mousedown', e => { const b = e.target.closest('[data-n]'); if (b) { e.preventDefault(); const it = flat[+b.dataset.n]; close(); inp.value = ''; it.run(); } });
  document.addEventListener('mousedown', e => { if (!e.target.closest('.tb-search')) close(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !UI.layers.length) { e.preventDefault(); inp.focus(); } });
}

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try { AD.init(); } catch(error) { $q('#view').textContent = error.message; return; }
  window.addEventListener('error', e => { if (e.error) UI.toast(e.error.message, 'error'); });
  window.addEventListener('unhandledrejection', e => { UI.toast(e.reason?.message || 'Tindakan gagal', 'error'); e.preventDefault(); });
  window.addEventListener('storage', e => { if(e.key?.startsWith('fv_')) { const products=loadProducts(); PRODUCTS.splice(0,PRODUCTS.length,...products); if(!UI.layers.length) AD.render(); drawNotifBadge(); } });
  const now = new Date();
  $q('#todayLabel').textContent = `Demo lokal · ${DAYS_LONG[now.getDay()]}, ${fmtDate(todayISO())}`;
  $q('#btnMenu').innerHTML = ico('menu', 22);
  $q('#btnNotif').innerHTML = `${ico('bell', 20)}<span class="count" id="notifCount" hidden></span>`;
  $q('#notifMark').innerHTML = `${ico('check', 14)} Tandai semua dibaca`;
  $q('#srIcon').innerHTML = ico('search', 18);

  setCollapsed(localStorage.getItem('fv_admin_collapsed') === '1');
  $q('#btnCollapse').onclick = () => setCollapsed(!adm().classList.contains('collapsed'));
  $q('#btnMenu').onclick = () => adm().classList.contains('drawer-open') ? closeSidebar() : openSidebar();
  $q('#sbScrim').onclick = closeSidebar;
  $q('#sbNav').addEventListener('click', e => { if (e.target.closest('.sb-item')) closeSidebar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!UI.layers.length) { closePanels(); closeSidebar(); } } });
  window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeSidebar(); });

  $q('#btnNotif').onclick = e => { e.stopPropagation(); const p = $q('#notifPanel'); const open = p.hidden; closePanels(); p.hidden = !open; $q('#btnNotif').setAttribute('aria-expanded', open); if (open) drawNotifList(); };
  $q('#notifMark').onclick = () => { AD.notifs.markAll(); drawNotifBadge(); drawNotifList(); };
  $q('#btnAcct').onclick = e => { e.stopPropagation(); const p = $q('#acctPanel'); const open = p.hidden; closePanels(); p.hidden = !open; $q('#btnAcct').setAttribute('aria-expanded', open); };
  $q('#acctPanel').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) acctAction(b.dataset.a); });
  $q('#acctPanel').addEventListener('change', e => { if (e.target.id === 'staffSel') { AD.setStaff(e.target.value); closePanels(); AD.go('dashboard'); drawNotifBadge(); } if (e.target.id === 'roleSel') { while (UI.layers.length) UI.layers[UI.layers.length - 1].close(); AD.setRole(e.target.value); closePanels(); drawAcct(); UI.toast(`Peran diubah ke ${AD.roleLabel()}`); BK.roleApplied = false; BK.layanan = 'Semua'; BK.status = 'Semua'; BK.q = ''; $q('#gSearch').value = ''; $q('#gResults').hidden = true; AD.go('dashboard'); drawNotifBadge(); } });
  document.addEventListener('mousedown', e => { if (!e.target.closest('.tb-notif, .tb-acct')) closePanels(); });

  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); AD.go(g.dataset.go, g.dataset.gp ? JSON.parse(g.dataset.gp) : {}); } });

  initSearch();
  drawAcct(); drawNotifBadge();
  window.addEventListener('hashchange', () => AD.render());
  AD.render();
});
