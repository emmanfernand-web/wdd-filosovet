/* ============================================================
   FILOSOVET — js/toko.js (Interactive Filter & Mobile Drawer)
   ============================================================ */

function initShop() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid) return;

  if (typeof PRODUCTS === 'undefined' || !PRODUCTS.length) {
    console.warn('Data PRODUCTS belum dimuat dari cart.js');
    return;
  }

  // 1. Event Listener Filter & Search
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryChecks = document.querySelectorAll('.filter-check input, #catFilters input');
  const resetBtn = document.getElementById('resetFilter');

  if (searchInput) searchInput.addEventListener('input', applyFilter);
  if (sortSelect) sortSelect.addEventListener('change', applyFilter);
  categoryChecks.forEach(chk => chk.addEventListener('change', applyFilter));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'populer';
      categoryChecks.forEach(chk => { chk.checked = false; });
      applyFilter();
    });
  }

  // 2. Handler Toggle Button Filter khusus Mobile View
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

  // 3. Render Awal Produk
  applyFilter();
}

function applyFilter() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid || typeof PRODUCTS === 'undefined') return;

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryChecks = document.querySelectorAll('.filter-check input, #catFilters input');
  const countEl = document.getElementById('resultInfo');

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const selectedCategories = Array.from(categoryChecks)
    .filter(chk => chk.checked)
    .map(chk => chk.value.toLowerCase());

  let filtered = PRODUCTS.filter(p => {
    const catText = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[p.cat]) ? CAT_LABEL[p.cat] : p.cat;
    const matchSearch = p.name.toLowerCase().includes(keyword) || catText.toLowerCase().includes(keyword);
    // Kosong (length 0) berarti tidak ada filter aktif => semua produk tampil
    const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(p.cat.toLowerCase());
    return matchSearch && matchCategory;
  });

  if (sortSelect) {
    const sortValue = sortSelect.value;
    if (sortValue === 'price-asc' || sortValue === 'murah') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-desc' || sortValue === 'mahal') {
      filtered.sort((a, b) => b.price - a.price); // Urutan harga tertinggi ke terendah
    } else if (sortValue === 'name-asc' || sortValue === 'nama') {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    } else if (sortValue === 'populer') {
      filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    }
  }

  if (countEl) countEl.textContent = `Menampilkan ${filtered.length} produk`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem 0; color: var(--muted);">Tidak ada produk yang sesuai filter.</div>`;
    return;
  }

  const svgCrossIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:2px"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  grid.innerHTML = filtered.map(p => {
    const isOutOfStock = p.stock === 0;
    const catText = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[p.cat]) ? CAT_LABEL[p.cat] : p.cat;
    
    const stockHtml = isOutOfStock
      ? `<div class="product-stock out-of-stock">${svgCrossIcon}Barang Habis · ${p.sold || 0} terjual</div>`
      : `<div class="product-stock ${p.stock < 5 ? 'low' : ''}">✓ ${p.stock} tersedia · ${p.sold || 0} terjual</div>`;

    const buttonHtml = isOutOfStock
      ? `<button type="button" class="btn btn-primary btn-sm" disabled style="opacity:0.55;cursor:not-allowed;" title="Barang Habis">Barang Habis</button>`
      : `<button type="button" class="btn btn-primary btn-sm" onclick="addToCart(${p.id}, 1, event.target)">+ Keranjang</button>`;

    return `
      <div class="product-card">
        <div class="product-thumb">
          ${p.image 
            ? `<img src="../assets/images/${p.image}" alt="${p.name}" class="product-img" onerror="this.onerror=null;this.parentElement.innerHTML='${p.icon || '📦'}';">`
            : (p.icon || '📦')
          }
        </div>
        <div class="product-body">
          <span class="product-cat">${catText}</span>
          <div class="product-name" title="${p.name}">${p.name}</div>
          ${stockHtml}
          <div class="product-price">${rupiah(p.price)}</div>
          ${buttonHtml}
        </div>
      </div>
    `;
  }).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShop);
} else {
  initShop();
}