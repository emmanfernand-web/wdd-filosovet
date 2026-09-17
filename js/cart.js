/* ============================================================
   FILOSOVET — cart.js (katalog produk & keranjang)
   ============================================================ */
const PRODUCTS = [
  { id: 1,  name: 'Dry Food Kucing Premium 1,5kg',  cat: 'makanan',  price: 185000, stock: 24, icon: '🍗', sold: 312 },
  { id: 2,  name: 'Dry Food Anjing Adult 3kg',      cat: 'makanan',  price: 265000, stock: 18, icon: '🦴', sold: 245 },
  { id: 3,  name: 'Wet Food Kucing Tuna 85g',       cat: 'makanan',  price: 22000,  stock: 60, icon: '🥫', sold: 580 },
  { id: 4,  name: 'Snack Dental Stick Anjing',      cat: 'makanan',  price: 48000,  stock: 0,  icon: '🦷', sold: 150 },
  { id: 5,  name: 'Obat Cacing Broad Spectrum',     cat: 'obat',     price: 35000,  stock: 40, icon: '💊', sold: 410 },
  { id: 6,  name: 'Vitamin Bulu & Kulit 60ml',      cat: 'obat',     price: 78000,  stock: 12, icon: '🧪', sold: 198 },
  { id: 7,  name: 'Obat Kutu Spot-On Kucing',       cat: 'obat',     price: 95000,  stock: 5,  icon: '🩹', sold: 265 },
  { id: 8,  name: 'Antibiotik (resep dokter)',      cat: 'obat',     price: 60000,  stock: 3,  icon: '⚕️', sold: 96 },
  { id: 9,  name: 'Shampoo Anti-Jamur 250ml',       cat: 'skincare', price: 65000,  stock: 22, icon: '🧴', sold: 174 },
  { id: 10, name: 'Conditioner Silk Coat 200ml',    cat: 'skincare', price: 58000,  stock: 16, icon: '🫧', sold: 132 },
  { id: 11, name: 'Paw Balm Pelembab Telapak',      cat: 'skincare', price: 42000,  stock: 9,  icon: '🐾', sold: 88 },
  { id: 12, name: 'Kalung Kucing motif',            cat: 'aksesoris',price: 35000,  stock: 30, icon: '🔔', sold: 142 },
  { id: 13, name: 'Mainan Bola & Tali Anjing',      cat: 'aksesoris',price: 29000,  stock: 26, icon: '🎾', sold: 210 },
  { id: 14, name: 'Kandang Travel Size M',          cat: 'aksesoris',price: 320000, stock: 7,  icon: '🧳', sold: 61 },
  { id: 15, name: 'Termometer Digital Hewan',       cat: 'almed',    price: 85000,  stock: 14, icon: '🌡️', sold: 77 },
  { id: 16, name: 'Tabung Pemberi Obat Oral',       cat: 'almed',    price: 25000,  stock: 20, icon: '💉', sold: 93 },
];
const CAT_LABEL = { makanan: 'Makanan', obat: 'Obat & Vitamin', skincare: 'Skincare', aksesoris: 'Aksesoris', almed: 'Alat Medis' };

/* ---------- Keranjang (localStorage) ---------- */
function addToCart(id, qty = 1) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p || p.stock === 0) return toast('Maaf, stok produk habis', 'error');
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (item) item.qty = Math.min(item.qty + qty, p.stock);
  else cart.push({ id, qty: Math.min(qty, p.stock) });
  saveCart(cart);
  toast(`${p.name} ditambahkan ke keranjang`);
}
function setQty(id, qty) {
  const p = PRODUCTS.find(x => x.id === id);
  let cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;
  if (qty <= 0) cart = cart.filter(x => x.id !== id);
  else item.qty = Math.min(qty, p.stock);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}
function getCartDetailed() {
  return getCart().map(i => ({ ...PRODUCTS.find(p => p.id === i.id), qty: i.qty }));
}

/* ---------- Halaman Toko ---------- */
function initToko() {
  const grid = document.getElementById('productGrid');
  const search = document.getElementById('searchInput');
  const sort = document.getElementById('sortSelect');
  const checks = document.querySelectorAll('#catFilters input');

  function render() {
    const q = search.value.toLowerCase();
    const cats = [...checks].filter(c => c.checked).map(c => c.value);
    let list = PRODUCTS.filter(p => cats.includes(p.cat) && p.name.toLowerCase().includes(q));
    if (sort.value === 'murah') list.sort((a, b) => a.price - b.price);
    else if (sort.value === 'mahal') list.sort((a, b) => b.price - a.price);
    else if (sort.value === 'nama') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.sold - a.sold);

    document.getElementById('resultInfo').textContent = `Menampilkan ${list.length} produk`;
    grid.innerHTML = list.length ? list.map(p => `
      <div class="product-card">
        <div class="product-thumb">${p.icon}</div>
        <div class="product-body">
          <span class="product-cat">${CAT_LABEL[p.cat]}</span>
          <div class="product-name">${p.name}</div>
          <div class="product-stock ${p.stock < 5 ? 'low' : ''}">${p.stock === 0 ? '❌ Stok habis' : p.stock < 5 ? `⚠️ Sisa ${p.stock}` : `✔ ${p.stock} tersedia`} · ${p.sold} terjual</div>
          <div class="product-price">${rupiah(p.price)}</div>
          <button class="btn btn-primary btn-sm" ${p.stock === 0 ? 'disabled' : ''} onclick="addToCart(${p.id})">+ Keranjang</button>
        </div>
      </div>`).join('')
      : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div><p>Tidak ada produk yang cocok.</p></div>`;
  }

  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  checks.forEach(c => c.addEventListener('change', render));
  document.getElementById('resetFilter').onclick = () => {
    search.value = ''; sort.value = 'populer';
    checks.forEach(c => c.checked = true);
    render();
  };
  render();
}

/* ---------- Halaman Keranjang ---------- */
let promo = 0;
function initKeranjang() {
  renderCartPage();
  document.getElementById('applyPromo').onclick = () => {
    const v = document.getElementById('promoInput').value.trim().toUpperCase();
    if (v === 'FILO10') { promo = 0.10; toast('Kode promo FILO10 dipakai — diskon 10%'); }
    else { promo = 0; toast('Kode promo tidak valid', 'error'); }
    renderCartPage();
  };
  document.querySelectorAll('input[name=ship]').forEach(r => r.addEventListener('change', renderCartPage));
  document.getElementById('btnCheckout').onclick = checkout;
}

function renderCartPage() {
  const wrap = document.getElementById('cartItems');
  const items = getCartDetailed();
  if (!items.length) {
    wrap.innerHTML = `<div class="empty"><div class="big">🛒</div><h3>Keranjang kosong</h3><p>Belum ada produk yang dipilih.</p><a href="toko.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Mulai Belanja</a></div>`;
  } else {
    wrap.innerHTML = items.map(p => `
      <div class="cart-item">
        <div class="cart-thumb">${p.icon}</div>
        <div>
          <div class="cart-name">${p.name}</div>
          <div class="cart-price">${rupiah(p.price)}</div>
          <div class="qty-control" style="margin-top:.4rem">
            <button class="qty-btn" onclick="setQty(${p.id}, ${p.qty - 1})">−</button>
            <span class="qty-num">${p.qty}</span>
            <button class="qty-btn" onclick="setQty(${p.id}, ${p.qty + 1})">+</button>
          </div>
        </div>
        <div class="cart-right">
          <div class="line-total">${rupiah(p.price * p.qty)}</div>
          <button class="remove-btn" onclick="setQty(${p.id}, 0)">🗑 Hapus</button>
        </div>
      </div>`).join('');
  }

  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const ambil = document.querySelector('input[name=ship]:checked')?.value === 'ambil';
  const ongkir = ambil || subtotal === 0 ? 0 : 15000;
  const diskon = Math.round(subtotal * promo);

  document.getElementById('sumSubtotal').textContent = rupiah(subtotal);
  document.getElementById('rowDiskon').style.display = diskon > 0 ? 'flex' : 'none';
  document.getElementById('sumDiskon').textContent = '-' + rupiah(diskon);
  document.getElementById('sumOngkir').textContent = ongkir === 0 ? 'GRATIS' : rupiah(ongkir);
  document.getElementById('sumTotal').textContent = rupiah(subtotal - diskon + ongkir);
  document.getElementById('btnCheckout').disabled = items.length === 0;
}

function checkout() {
  const items = getCartDetailed();
  if (!items.length) return;
  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const ambil = document.querySelector('input[name=ship]:checked')?.value === 'ambil';
  const ongkir = ambil ? 0 : 15000;
  const total = subtotal - Math.round(subtotal * promo) + ongkir;

  // Simulasi pembayaran
  if (Math.random() < 0.05) { toast('Pembayaran gagal, silakan coba lagi', 'error'); return; }

  const nota = {
    no: 'INV-' + Date.now().toString(36).toUpperCase(),
    tanggal: new Date().toISOString(),
    item: items.reduce((s, p) => s + p.qty, 0),
    total, metode: document.getElementById('payMethod').value,
    produk: items.map(p => `${p.name} x${p.qty}`)
  };
  const hist = JSON.parse(localStorage.getItem('fv_orders') || '[]');
  hist.unshift(nota);
  localStorage.setItem('fv_orders', JSON.stringify(hist));

  // Kurangi stok (simulasi) & kosongkan keranjang
  saveCart([]);
  document.getElementById('notaNo').textContent = nota.no;
  document.getElementById('notaItems').textContent = nota.item + ' produk';
  document.getElementById('notaPay').textContent = nota.metode;
  document.getElementById('notaTotal').textContent = rupiah(total);
  document.getElementById('notaModal').style.display = 'grid';
}
