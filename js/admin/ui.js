/* ============================================================
   FILOSOVET ADMIN — ui.js
   Komponen bersama: ikon, chip, modal, drawer, menu, tabel, grafik,
   cetak, CSV, skeleton. Tanpa library tambahan.
   ============================================================ */
const UI = {};
const $q = (s, el = document) => el.querySelector(s);
const $qa = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Ikon line (satu set, sama dengan situs publik) ---------- */
const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  booking: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  stok: '<path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
  produk: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  transaksi: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  laporan: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chatbubble: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  chevleft: '<polyline points="15 18 9 12 15 6"/>', chevright: '<polyline points="9 18 15 12 9 6"/>', chevdown: '<polyline points="6 9 12 15 18 9"/>',
  arrowup: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>', arrowdown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  timeline: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  collapse: '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>',
  expand: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  heart: '<path d="M3 12h4l3-8 4 16 3-8h4"/>'
};
const ico = (n, size = 18) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[n] || ''}</svg>`;
UI.ico = ico;

/* ---------- Chip status (satu gaya) ---------- */
const CHIP = {
  'Menunggu Konfirmasi': ['warn', 'Menunggu'], 'Dikonfirmasi': ['ok-outline', 'Dikonfirmasi'], 'Diproses': ['solid', 'Diproses'],
  'Selesai': ['ok', 'Selesai'], 'Dibatalkan': ['bad', 'Dibatalkan'], 'Tidak Hadir': ['bad-outline', 'Tidak Hadir'], 'Kedaluwarsa': ['neutral', 'Kedaluwarsa'],
  'Lunas': ['ok', 'Lunas'], 'Menunggu Bayar': ['warn', 'Menunggu'], 'Aktif': ['ok', 'Aktif'], 'Nonaktif': ['neutral', 'Nonaktif'],
  'Habis': ['bad', 'Habis'], 'Kurang': ['warn', 'Kurang'], 'Aman': ['ok', 'Aman'], 'Dipesan': ['warn', 'Dipesan'], 'Diterima': ['ok', 'Diterima'],
  'Segera kedaluwarsa': ['warn', 'Segera kedaluwarsa'], 'Resep': ['info', 'Resep'], 'Online': ['neutral', 'Online'], 'Kasir': ['neutral', 'Kasir'], 'Manual': ['neutral', 'Manual']
};
UI.chip = (label, text) => { const c = CHIP[label] || ['neutral', label]; return `<span class="chip chip-${c[0]}">${esc(text || c[1])}</span>`; };
UI.stockChip = p => UI.chip({ habis: 'Habis', kurang: 'Kurang', aman: 'Aman' }[stockStatus(p)]);

/* ---------- Layer (modal / drawer / menu) dengan focus-trap & Esc ---------- */
UI.layers = [];
function trapKeys(e) {
  const top = UI.layers[UI.layers.length - 1];
  if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
  if (e.key !== 'Tab' || !top.trap) return;
  const f = $qa('a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', top.el).filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !top.el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !top.el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}
document.addEventListener('keydown', trapKeys);
function lockScroll() { document.body.classList.toggle('no-scroll', UI.layers.some(l => l.trap)); }

function openLayer(root, el, { trap = true, onClose } = {}) {
  const opener = document.activeElement;
  const layer = { el, trap, close() {
    if (!UI.layers.includes(layer)) return;
    UI.layers = UI.layers.filter(l => l !== layer);
    el.classList.remove('open');
    const done = () => { el.remove(); lockScroll(); if (opener && document.contains(opener)) opener.focus(); onClose && onClose(); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 180);
  } };
  root.appendChild(el);
  UI.layers.push(layer); lockScroll();
  requestAnimationFrame(() => el.classList.add('open'));
  return layer;
}

/* Modal: UI.modal({title, body, actions:[{label, kind, onClick(close, el)}], size, onOpen}) */
UI.modal = function ({ title, body, actions = [], size = 'md', onOpen, desc }) {
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `<div class="modal modal-${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Tutup">${ico('x')}</button></div>
    ${desc ? `<p class="modal-desc">${desc}</p>` : ''}
    <div class="modal-body">${body || ''}</div>
    ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button type="button" class="btn btn-${a.kind || 'outline'}" data-act="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
  </div>`;
  const layer = openLayer($q('#layerRoot'), el);
  el.addEventListener('mousedown', e => { if (e.target === el) layer.close(); });
  $q('[data-close]', el).onclick = layer.close;
  actions.forEach((a, i) => { $q(`[data-act="${i}"]`, el).onclick = () => a.onClick ? a.onClick(layer.close, el) : layer.close(); });
  const first = $q('input:not([type=hidden]), select, textarea', el) || $q('[data-act]:last-child', el) || $q('[data-close]', el);
  setTimeout(() => first && first.focus(), 30);
  onOpen && onOpen(el, layer.close);
  return { el, close: layer.close };
};

/* Konfirmasi (Promise<boolean>) */
UI.confirm = ({ title, message, confirmLabel = 'Ya, lanjutkan', cancelLabel = 'Batal', danger = false }) => new Promise(res => {
  let done = false; const fin = v => { if (!done) { done = true; res(v); } };
  const m = UI.modal({
    title, size: 'sm', body: `<p class="confirm-msg">${message}</p>`,
    actions: [{ label: cancelLabel, kind: 'outline', onClick: close => { fin(false); close(); } }, { label: confirmLabel, kind: danger ? 'danger-solid' : 'primary', onClick: close => { fin(true); close(); } }]
  });
  const obs = new MutationObserver(() => { if (!document.contains(m.el)) { fin(false); obs.disconnect(); } });
  obs.observe($q('#layerRoot'), { childList: true });
});

/* Drawer samping */
UI.drawer = function ({ title, subtitle, body, footer, width, onOpen }) {
  UI.layers.filter(l => l.el.classList.contains('overlay-drawer')).forEach(l => l.close());
  const el = document.createElement('div');
  el.className = 'overlay overlay-drawer';
  el.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${width ? `style="--dw:${width}px"` : ''}>
    <div class="drawer-head"><div><h2>${esc(title)}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div><button type="button" class="icon-btn" data-close aria-label="Tutup">${ico('x')}</button></div>
    <div class="drawer-body">${body || ''}</div>
    ${footer ? `<div class="drawer-foot">${footer}</div>` : ''}
  </aside>`;
  const layer = openLayer($q('#layerRoot'), el);
  el.addEventListener('mousedown', e => { if (e.target === el) layer.close(); });
  $q('[data-close]', el).onclick = layer.close;
  setTimeout(() => { const f = $q('[data-close]', el); f && f.focus(); }, 30);
  const api = { el, close: layer.close, setBody: html => { $q('.drawer-body', el).innerHTML = html; }, setFooter: html => { let f = $q('.drawer-foot', el); if (!f) { f = document.createElement('div'); f.className = 'drawer-foot'; $q('.drawer', el).appendChild(f); } f.innerHTML = html; } };
  onOpen && onOpen(el, api);
  return api;
};

/* Menu popover (⋯) */
UI.menu = function (anchor, items) {
  const el = document.createElement('div');
  el.className = 'popmenu';
  el.setAttribute('role', 'menu');
  el.innerHTML = items.map((it, i) => it.sep ? '<hr>' : `<button type="button" role="menuitem" class="${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? ico(it.icon, 16) : ''}<span>${esc(it.label)}</span></button>`).join('');
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  el.style.top = (r.bottom + h + 12 > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  const layer = { el, trap: false, close() { UI.layers = UI.layers.filter(l => l !== layer); el.remove(); document.removeEventListener('mousedown', outside, true); anchor.focus && anchor.focus(); } };
  const outside = e => { if (!el.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) layer.close(); };
  setTimeout(() => document.addEventListener('mousedown', outside, true));
  UI.layers.push(layer);
  el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; layer.close(); items[+b.dataset.i].onClick(); });
  const first = $q('button', el); first && first.focus();
  el.addEventListener('keydown', e => {
    const bs = $qa('button', el), i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
  });
  return layer;
};

/* ---------- Toast & helper form ---------- */
UI.toast = (msg, type) => toast(msg, type || 'success');
UI.field = ({ id, label, type = 'text', value = '', attrs = '', hint = '', required = false }) =>
  `<div class="field"><label for="${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label><input type="${type}" id="${id}" value="${esc(value)}" ${attrs} ${required ? 'required' : ''} aria-describedby="err-${id}">${hint ? `<small class="hint">${hint}</small>` : ''}<small class="field-error" id="err-${id}" role="alert"></small></div>`;
UI.setError = (id, msg) => {
  const el = document.getElementById(id), out = document.getElementById('err-' + id);
  if (!el) return !msg;
  el.setAttribute('aria-invalid', msg ? 'true' : 'false'); el.classList.toggle('is-invalid', !!msg);
  if (out) out.textContent = msg || '';
  return !msg;
};

/* ---------- Skeleton & empty state ---------- */
UI.skeletonRows = (rows = 6, cols = 5) => `<div class="tbl-skel" aria-hidden="true">${Array.from({ length: rows }, () => `<div class="skel-row">${Array.from({ length: cols }, (_, i) => `<span class="skel" style="width:${[24, 34, 18, 14, 10][i % 5]}%"></span>`).join('')}</div>`).join('')}</div>`;
UI.empty = ({ title, msg, action } = {}) => `<div class="empty-state">${ico('search', 32)}<h3>${esc(title || 'Belum ada data')}</h3><p>${esc(msg || '')}</p>${action ? `<button type="button" class="btn btn-outline btn-sm" data-empty-action>${esc(action)}</button>` : ''}</div>`;

/* ---------- Tabel bersama ---------- */
UI.tableState = {};
/* opts: {id, columns:[{key,label,align,sortable,sort(row),render(row),cls}], rows, pageSize, empty:{title,msg,action,onAction}, onRow(row), rowClass(row)} */
UI.table = function (container, opts) {
  const st = UI.tableState[opts.id] || (UI.tableState[opts.id] = { page: 1, size: opts.pageSize || 10, sort: opts.defaultSort || null });
  container._tbl = opts;
  const rows = [...opts.rows];
  if (st.sort) {
    const col = opts.columns.find(c => c.key === st.sort.key);
    if (col) { const f = col.sort || (r => r[col.key]); rows.sort((a, b) => { const x = f(a), y = f(b); return (typeof x === 'string' ? x.localeCompare(y, 'id') : x - y) * (st.sort.dir === 'asc' ? 1 : -1); }); }
  }
  const total = rows.length, pages = Math.max(1, Math.ceil(total / st.size));
  st.page = Math.min(st.page, pages);
  const from = (st.page - 1) * st.size, view = rows.slice(from, from + st.size);
  const head = opts.columns.map(c => `<th class="${c.cls || ''}" style="${c.align ? 'text-align:' + c.align : ''}" ${c.sortable ? `aria-sort="${st.sort && st.sort.key === c.key ? (st.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}>${c.sortable ? `<button type="button" class="th-sort" data-sort="${c.key}">${esc(c.label)}${st.sort && st.sort.key === c.key ? ico(st.sort.dir === 'asc' ? 'arrowup' : 'arrowdown', 13) : ''}</button>` : esc(c.label)}</th>`).join('');
  const body = view.map((r, i) => `<tr data-row="${from + i}" class="${opts.onRow ? 'clickable' : ''} ${opts.rowClass ? opts.rowClass(r) : ''}">${opts.columns.map(c => `<td class="${c.cls || ''}" data-label="${esc(c.label)}" style="${c.align ? 'text-align:' + c.align : ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  container._view = rows;
  container.innerHTML = total ? `
    <div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="tbl-foot">
      <span class="muted">Menampilkan ${from + 1}–${Math.min(total, from + st.size)} dari ${total}</span>
      <div class="tbl-pager">
        <label class="sr-only" for="ps-${opts.id}">Baris per halaman</label>
        <select id="ps-${opts.id}" data-size>${[...new Set([5, 10, 25, 50, st.size])].sort((a, b) => a - b).filter(n => n !== 5 || st.size === 5).map(n => `<option value="${n}" ${st.size === n ? 'selected' : ''}>${n} / hal</option>`).join('')}</select>
        <button type="button" class="icon-btn" data-page="${st.page - 1}" ${st.page <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">${ico('chevleft')}</button>
        <span class="pg-num">${st.page} / ${pages}</span>
        <button type="button" class="icon-btn" data-page="${st.page + 1}" ${st.page >= pages ? 'disabled' : ''} aria-label="Halaman berikutnya">${ico('chevright')}</button>
      </div>
    </div>` : UI.empty(opts.empty);
  if (!container.dataset.bound) {
    container.dataset.bound = '1';
    container.addEventListener('click', e => {
      const o = container._tbl, s = UI.tableState[o.id];
      const sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) { const k = sortBtn.dataset.sort; s.sort = s.sort && s.sort.key === k ? { key: k, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }; UI.table(container, o); return; }
      const pg = e.target.closest('[data-page]');
      if (pg && !pg.disabled) { s.page = +pg.dataset.page; UI.table(container, o); container.scrollIntoView({ block: 'nearest' }); return; }
      if (e.target.closest('[data-empty-action]')) { o.empty && o.empty.onAction && o.empty.onAction(); return; }
      if (e.target.closest('a, button, input, select, label, [data-stop]')) return;
      const tr = e.target.closest('tr[data-row]');
      if (tr && o.onRow) o.onRow(container._view[+tr.dataset.row]);
    });
    container.addEventListener('change', e => { if (e.target.matches('[data-size]')) { const o = container._tbl, s = UI.tableState[o.id]; s.size = +e.target.value; s.page = 1; UI.table(container, o); } });
    container.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr.clickable')) e.target.click(); });
  }
};
UI.resetPage = id => { if (UI.tableState[id]) UI.tableState[id].page = 1; };

/* ---------- Grafik ringan (HTML/CSS) ---------- */
UI.barChart = function (el, { data, format = rp, height = 190, highlightIndex = -1, ariaLabel = 'Grafik batang' }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const niceMax = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p * 2) / 2 * p || 1; })();
  el.innerHTML = `<div class="chart" role="group" aria-label="${esc(ariaLabel)}" style="--h:${height}px">
    <div class="chart-axis">${[1, 0.5, 0].map(f => `<span>${compactRp(niceMax * f)}</span>`).join('')}</div>
    <div class="chart-plot"><div class="chart-grid"><i></i><i></i><i></i></div>
      <div class="chart-bars">${data.map((d, i) => `<button type="button" class="bar-col ${i === highlightIndex ? 'is-hl' : ''}" data-i="${i}" aria-label="${esc(d.label)}: ${esc(format(d.value))}"><span class="bar-val">${d.value ? compactRp(d.value) : ''}</span><span class="bar-wrap"><span class="bar" style="height:${Math.max(d.value ? 3 : 0, d.value / niceMax * 100)}%"></span></span><span class="bar-lbl">${esc(d.label)}</span></button>`).join('')}</div>
      <div class="chart-tip" hidden></div></div></div>`;
  const tip = $q('.chart-tip', el), plot = $q('.chart-plot', el);
  const show = btn => { const d = data[+btn.dataset.i]; tip.hidden = false; tip.innerHTML = `<strong>${esc(d.full || d.label)}</strong><br>${esc(format(d.value))}`; const pr = plot.getBoundingClientRect(), br = btn.getBoundingClientRect(); tip.style.left = Math.min(pr.width - 130, Math.max(0, br.left - pr.left + br.width / 2 - 60)) + 'px'; };
  $qa('.bar-col', el).forEach(b => { b.addEventListener('mouseenter', () => show(b)); b.addEventListener('focus', () => show(b)); b.addEventListener('mouseleave', () => { tip.hidden = true; }); b.addEventListener('blur', () => { tip.hidden = true; }); });
};
UI.hbars = (items, format = rp) => { const max = Math.max(1, ...items.map(i => i.value)); return `<ul class="hbars">${items.map(i => `<li><div class="hb-top"><span class="hb-name" title="${esc(i.label)}">${esc(i.label)}</span><strong>${esc(i.text || format(i.value))}</strong></div><div class="hb-track"><span style="width:${Math.max(2, i.value / max * 100)}%"></span></div></li>`).join('')}</ul>`; };

/* ---------- Cetak & unduh ---------- */
UI.print = function (html, paper = 'a4') {
  let area = $q('#printArea');
  if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
  area.className = `print-${paper}`; area.innerHTML = html;
  let st = $q('#printPage');
  if (!st) { st = document.createElement('style'); st.id = 'printPage'; document.head.appendChild(st); }
  st.textContent = paper === 'nota' ? '@page { size: 80mm auto; margin: 4mm; }' : '@page { size: A4; margin: 14mm; }';
  const cleanup = () => { area.innerHTML = ''; window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 50);
};
UI.download = (filename, mime, content) => {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
UI.csv = (filename, rows) => {
  const cell = v => { const s = String(v == null ? '' : v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  UI.download(filename, 'text/csv;charset=utf-8', '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n'));
};

/* ---------- Segmented / tab ---------- */
UI.segmented = (id, items, active) => `<div class="seg" id="${id}" role="group">${items.map(i => `<button type="button" class="seg-btn ${i.value === active ? 'active' : ''}" data-v="${esc(i.value)}" aria-pressed="${i.value === active}">${esc(i.label)}${i.count != null ? `<span class="seg-count">${i.count}</span>` : ''}</button>`).join('')}</div>`;
