/* ============================================================
   FILOSOVET — toko.js
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

  // Render produk langsung begitu halaman dibuka
  applyFilter();

  // Listener untuk pencarian & filter
  const searchInput = document.getElementById('searchInput') || document.querySelector('.search-box input');
  const sortSelect = document.getElementById('sortSelect') || document.querySelector('select[id*="sort"]');
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
}

function applyFilter() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid || typeof PRODUCTS === 'undefined') return;

  const searchInput = document.getElementById('searchInput') || document.querySelector('.search-box input');
  const sortSelect = document.getElementById('sortSelect') || document.querySelector('select[id*="sort"]');
  const categoryChecks = document.querySelectorAll('.filter-check input');
  const countEl = document.getElementById('productCount') || document.querySelector('.shop-layout span.muted');

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const selectedCategories = Array.from(categoryChecks)
    .filter(chk => chk.checked)
    .map(chk => {
      const label = chk.closest('label');
      return label ? label.textContent.trim().toLowerCase() : '';
    });

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
      <div class="product-thumb">${p.icon}</div>
      <div class="product-body">
        <span class="product-cat">${p.cat}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-stock ${p.stock < 10 ? 'low' : ''}">✓ ${p.stock} tersedia · ${p.sold || 0} terjual</div>
        <div class="product-price">${rupiah(p.price)}</div>
        <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">+ Keranjang</button>
      </div>
    </div>
  `).join('');
}