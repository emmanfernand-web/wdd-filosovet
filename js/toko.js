/* ============================================================
   FILOSOVET — js/toko.js (Filter, stepper keranjang, state kosong)
   Bergantung pada cart.js (PRODUCTS, addToCart, setQty) & main.js
   ============================================================ */
const LOW_STOCK = 5;
const ICON_IMG = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
const ICON_EMPTY = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

const shop = { search: '', cats: new Set(), sort: 'populer' };
const $s = id => document.getElementById(id);
const catLabel = c => (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[c]) || c;
const cartQty = id => (getCart().find(i => i.id === id) || { qty: 0 }).qty;
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function initShop() {
  const grid = $s('productGrid');
  if (!grid) return;
  if (typeof PRODUCTS === 'undefined' || !PRODUCTS.length) {
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '<div class="shop-empty"><p>Data produk belum tersedia.</p></div>';
    return;
  }

  // Sembunyikan kategori yang belum punya produk
  const used = new Set(PRODUCTS.map(p => p.cat));
  document.querySelectorAll('#catFilters .filter-check').forEach(l => {
    if (!used.has(l.querySelector('input').value)) l.remove();
  });

  // Chip kategori (mobile) dibuat dari checkbox sidebar
  $s('catChips').innerHTML = Array.from(document.querySelectorAll('#catFilters input')).map(i =>
    `<button type="button" class="cat-chip" data-cat="${i.value}" aria-pressed="false">${i.parentElement.textContent.trim()}</button>`).join('');

  // Kategori awal dari URL (?cat=makanan)
  const initCat = new URLSearchParams(location.search).get('cat');
  if (initCat && used.has(initCat)) shop.cats.add(initCat);

  $s('searchInput').addEventListener('input', e => { shop.search = e.target.value.toLowerCase().trim(); render(); });
  ['sortSelect', 'sortSelectM'].forEach(id => $s(id).addEventListener('change', e => { shop.sort = e.target.value; render(); }));
  document.querySelectorAll('#catFilters input').forEach(i => i.addEventListener('change', () => {
    i.checked ? shop.cats.add(i.value) : shop.cats.delete(i.value);
    render();
  }));
  $s('catChips').addEventListener('click', e => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    shop.cats.has(chip.dataset.cat) ? shop.cats.delete(chip.dataset.cat) : shop.cats.add(chip.dataset.cat);
    render();
  });
  $s('resetFilter').addEventListener('click', resetFilters);

  grid.addEventListener('click', onGridClick);
  grid.addEventListener('error', onImgError, true);
  window.addEventListener('pageshow', render);

  render();
}

function resetFilters() {
  shop.search = ''; shop.cats.clear(); shop.sort = 'populer';
  $s('searchInput').value = '';
  render();
}

function filteredProducts() {
  const list = PRODUCTS.filter(p => {
    const text = (p.name + ' ' + catLabel(p.cat)).toLowerCase();
    return text.includes(shop.search) && (!shop.cats.size || shop.cats.has(p.cat));
  });
  const sorts = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'id'),
    populer: (a, b) => (b.sold || 0) - (a.sold || 0)
  };
  return list.sort(sorts[shop.sort] || sorts.populer);
}

function stockBadge(p) {
  if (p.stock === 0) return '<span class="stock-badge out">Barang habis</span>';
  if (p.stock <= LOW_STOCK) return '<span class="stock-badge low">Stok menipis</span>';
  return '<span class="stock-badge ok">Tersedia</span>';
}

function actionHtml(p) {
  if (p.stock === 0) return '<button type="button" class="btn btn-primary btn-sm btn-block" disabled>Barang Habis</button>';
  const q = cartQty(p.id);
  if (q > 0) {
    return `<div class="card-stepper" role="group" aria-label="Jumlah ${esc(p.name)} di keranjang">
      <button type="button" data-act="dec" aria-label="Kurangi jumlah">−</button>
      <span aria-live="polite">${q}</span>
      <button type="button" data-act="inc" aria-label="Tambah jumlah" ${q >= p.stock ? 'disabled' : ''}>+</button>
    </div>`;
  }
  return '<button type="button" class="btn btn-primary btn-sm btn-block" data-act="add">+ Keranjang</button>';
}

function cardHtml(p) {
  const img = p.image
    ? `<img src="../assets/images/${p.image}" alt="${esc(p.name)}" class="product-img" loading="lazy">`
    : `<span class="thumb-fallback">${ICON_IMG}</span>`;
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-thumb">${img}</div>
      <div class="product-body">
        <span class="product-cat">${catLabel(p.cat)}</span>
        <h3 class="product-name" title="${esc(p.name)}">${esc(p.name)}</h3>
        <div class="product-meta">${stockBadge(p)}<span class="product-sold">${p.sold || 0} terjual</span></div>
        <div class="product-foot">
          <div class="product-price">${rupiah(p.price)}</div>
          <div class="card-action">${actionHtml(p)}</div>
        </div>
      </div>
    </article>`;
}

function render() {
  const grid = $s('productGrid');
  const list = filteredProducts();

  // Sinkronkan kontrol filter
  document.querySelectorAll('#catFilters input').forEach(i => { i.checked = shop.cats.has(i.value); });
  document.querySelectorAll('#catChips .cat-chip').forEach(c => {
    const on = shop.cats.has(c.dataset.cat);
    c.classList.toggle('active', on);
    c.setAttribute('aria-pressed', on);
  });
  $s('sortSelect').value = shop.sort;
  $s('sortSelectM').value = shop.sort;
  $s('resultInfo').textContent = `Menampilkan ${list.length} produk`;

  grid.setAttribute('aria-busy', 'false');
  if (!list.length) {
    grid.innerHTML = `<div class="shop-empty">${ICON_EMPTY}<h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain atau hapus filter yang aktif.</p><button type="button" class="btn btn-outline btn-sm" id="emptyReset">Reset Filter</button></div>`;
    $s('emptyReset').addEventListener('click', resetFilters);
    return;
  }
  grid.innerHTML = list.map(cardHtml).join('');
}

function refreshCard(id) {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const p = PRODUCTS.find(x => x.id === id);
  if (!card || !p) return;
  const hadFocus = card.contains(document.activeElement);
  card.querySelector('.card-action').innerHTML = actionHtml(p);
  if (hadFocus) {
    const target = card.querySelector('[data-act="inc"]:not(:disabled), [data-act="dec"], [data-act="add"]');
    if (target) target.focus();
  }
}

function onGridClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const id = +btn.closest('.product-card').dataset.id;
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const act = btn.dataset.act;
  if (act === 'add') {
    const before = cartQty(id);
    addToCart(id, 1);
    if (cartQty(id) > before) flyToCart(btn.closest('.product-card').querySelector('.product-thumb img, .product-thumb'));
  }
  else if (act === 'inc') { if (cartQty(id) < p.stock) setQty(id, cartQty(id) + 1); }
  else if (act === 'dec') setQty(id, cartQty(id) - 1);
  refreshCard(id);
}

/* Fallback bila gambar gagal dimuat */
function onImgError(e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('product-img')) return;
  img.replaceWith(Object.assign(document.createElement('span'), { className: 'thumb-fallback', innerHTML: ICON_IMG }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShop);
} else {
  initShop();
}
