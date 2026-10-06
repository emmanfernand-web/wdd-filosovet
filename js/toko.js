/* ============================================================
   FILOSOVET — js/toko.js (Interactive Filter & Mobile Drawer)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initShop();
});

function initShop() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid) return;

  if (typeof PRODUCTS === 'undefined' || !PRODUCTS.length) {
    console.warn('Data PRODUCTS belum dimuat dari cart.js');
    return;
  }

  // 1. Render Awal Produk
  applyFilter();

  // 2. Event Listener Filter & Search
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryChecks = document.querySelectorAll('.filter-check input');
  const resetBtn = document.getElementById('resetFilter');

  if (searchInput) searchInput.addEventListener('input', applyFilter);
  if (sortSelect) sortSelect.addEventListener('change', applyFilter);
  categoryChecks.forEach(chk => chk.addEventListener('change', applyFilter));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.selectedIndex = 0;
      categoryChecks.forEach(chk => chk.checked = true);
      applyFilter();
    });
  }

  // 3. Handler Toggle Button Filter khusus Mobile View
  const toggleBtn = document.getElementById('toggleFilterBtn');
  const filterSidebar = document.getElementById('filterSidebar');
  const closeFilterBtn = document.getElementById('closeFilterBtn');

  if (toggleBtn && filterSidebar) {
    toggleBtn.addEventListener('click', () => {
      filterSidebar.classList.toggle('open');
    });
  }

  if (closeFilterBtn && filterSidebar) {
    closeFilterBtn.addEventListener('click', () => {
      filterSidebar.classList.remove('open');
    });
  }
}

function applyFilter() {
  const grid = document.getElementById('productGrid');
  if (!grid || typeof PRODUCTS === 'undefined') return;

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryChecks = document.querySelectorAll('.filter-check input');
  const countEl = document.getElementById('resultInfo');

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const selectedCategories = Array.from(categoryChecks)
    .filter(chk => chk.checked)
    .map(chk => chk.value.toLowerCase());

  let filtered = PRODUCTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(keyword) || p.cat.toLowerCase().includes(keyword);
    const matchCategory = selectedCategories.length === 0 || selectedCategories.some(cat => cat.includes(p.cat.toLowerCase()) || p.cat.toLowerCase().includes(cat));
    return matchSearch && matchCategory;
  });

  if (sortSelect) {
    const sortValue = sortSelect.value;
    if (sortValue === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortValue === 'price-desc') filtered.sort((b, a) => b.price - a.price);
    else if (sortValue === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (countEl) countEl.textContent = `Menampilkan ${filtered.length} produk`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem 0; color: var(--muted);">Tidak ada produk yang sesuai filter.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-thumb">
        <img src="${p.img || '../assets/images/pet_store.jpeg'}" alt="${p.name}" class="product-img" onerror="this.onerror=null;this.parentElement.innerHTML='${p.icon||'📦'}';">
      </div>
      <div class="product-body">
        <span class="product-cat">${p.cat}</span>
        <div class="product-name" title="${p.name}">${p.name}</div>
        <div class="product-stock ${p.stock < 10 ? 'low' : ''}">✓ ${p.stock} stok · ${p.sold || 0} terjual</div>
        <div class="product-price">${rupiah(p.price)}</div>
        <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">+ Keranjang</button>
      </div>
    </div>
  `).join('');
}