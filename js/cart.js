/* ============================================================
   FILOSOVET — cart.js (katalog produk & keranjang)
   ============================================================ */
/* Data bawaan produk. min = batas minimum stok, resep = butuh resep dokter,
   exp = jam kedaluwarsa dalam hari dari hari ini (hanya obat & skincare). */
const DEFAULT_PRODUCTS = [
  { id: 1,  name: 'Dry Food Kucing Premium 1,5kg',  cat: 'makanan',  price: 185000, stock: 24, min: 10, image: 'dry_food_cat.jpeg', sold: 312 },
  { id: 2,  name: 'Dry Food Anjing Adult 3kg',      cat: 'makanan',  price: 265000, stock: 18, min: 10, image: 'dry_food_dog.jpeg', sold: 245 },
  { id: 3,  name: 'Wet Food Kucing Tuna 85g',       cat: 'makanan',  price: 22000,  stock: 60, min: 30, image: 'wet_food_cat.jpeg', sold: 580 },
  { id: 4,  name: 'Snack Dental Stick Anjing',      cat: 'makanan',  price: 48000,  stock: 0,  min: 12, image: 'snack_dental_stick_dog.jpeg', sold: 150 },
  { id: 5,  name: 'Obat Cacing Broad Spectrum',     cat: 'obat',     price: 35000,  stock: 40, min: 15, image: 'board_guard.jpeg', sold: 410, expDays: 25,  batch: 'BG-2504-07' },
  { id: 6,  name: 'Vitamin Bulu & Kulit 60ml',      cat: 'obat',     price: 78000,  stock: 12, min: 15, image: 'skin_vitamin.jpeg', sold: 198, expDays: 50,  batch: 'VB-2505-02' },
  { id: 7,  name: 'Obat Kutu Spot-On Kucing',       cat: 'obat',     price: 95000,  stock: 5,  min: 10, image: 'cat_flea.jpeg', sold: 265, expDays: 400, batch: 'SK-2510-11' },
  { id: 8,  name: 'Antibiotik (resep dokter)',      cat: 'obat',     price: 60000,  stock: 3,  min: 10, image: 'animal_antibiotik.jpeg', sold: 96, resep: true, expDays: -4, batch: 'AB-2412-03' },
  { id: 9,  name: 'Shampoo Anti-Jamur 250ml',       cat: 'skincare', price: 65000,  stock: 22, min: 12, image: 'pet_shampoo.jpeg', sold: 174, expDays: 500, batch: 'SH-2509-04' },
  { id: 10, name: 'Conditioner Silk Coat 200ml',    cat: 'skincare', price: 58000,  stock: 16, min: 10, image: 'pet_conditioner.jpeg', sold: 132, expDays: 480, batch: 'CO-2509-09' },
  { id: 11, name: 'Paw Balm Pelembab Telapak',      cat: 'skincare', price: 42000,  stock: 9,  min: 12, image: 'paw_balm.jpeg', sold: 88, expDays: 300, batch: 'PB-2506-01' },
  { id: 12, name: 'Kalung Kucing motif',            cat: 'aksesoris',price: 35000,  stock: 30, min: 10, image: 'cat_collars.jpeg', sold: 142 },
  { id: 13, name: 'Mainan Bola & Tali Anjing',      cat: 'aksesoris',price: 29000,  stock: 26, min: 10, image: 'dog_toy.jpeg', sold: 210 },
  { id: 14, name: 'Kandang Travel Size M',          cat: 'aksesoris',price: 320000, stock: 7,  min: 5,  image: 'pet_create.jpeg', sold: 61 }
];

function isoPlusDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* Satu sumber data produk & stok: localStorage 'fv_products' (diubah dari panel admin),
   atau data bawaan bila belum pernah diubah. */
function loadProducts() {
  let list = null;
  try { const st = JSON.parse(localStorage.getItem('fv_products')); if (Array.isArray(st) && st.length) list = st; } catch { }
  if (!list) {
    list = DEFAULT_PRODUCTS.map(d => {
      const p = { ...d };
      if (p.expDays != null) { p.exp = isoPlusDays(p.expDays); delete p.expDays; }
      return p;
    });
  }
  return list.map(p => ({ min: 10, resep: false, aktif: true, ...p }));
}
const PRODUCTS = loadProducts();
function saveProducts() { localStorage.setItem('fv_products', JSON.stringify(PRODUCTS)); }
/* Status stok: 'habis' (0), 'kurang' (di bawah minimum), 'aman' */
function stockStatus(p) { return p.stock <= 0 ? 'habis' : (p.stock < p.min ? 'kurang' : 'aman'); }
/* Sumber gambar produk: file di assets/images atau data URL hasil unggahan admin */
function productImg(p, base) {
  if (!p.image) return '';
  return /^(data:|https?:)/.test(p.image) ? p.image : (base === undefined ? '../assets/images/' : base) + p.image;
}
const CAT_LABEL = { makanan: 'Makanan', obat: 'Obat & Vitamin', skincare: 'Skincare', aksesoris: 'Aksesoris', almed: 'Alat Medis' };

/* ---------- Keranjang (localStorage) ---------- */
function addToCart(id, qty = 1) {
  const p = PRODUCTS.find(x => x.id === id);
  if (p && p.resep) { toast('Produk ini membutuhkan resep dokter', 'error'); return; }
  if (!p || p.aktif === false || p.stock <= 0) {
    toast('Maaf, barang ini sedang habis', 'error');
    return;
  }
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (item) {
    if (item.qty >= p.stock) {
      toast(`Stok maksimum (${p.stock}) tercapai`, 'error');
      return;
    }
    item.qty = Math.min(item.qty + qty, p.stock);
  } else {
    cart.push({ id, qty: Math.min(qty, p.stock) });
  }

  saveCart(cart);
  toast('Ditambahkan ke keranjang');
}

function setQty(id, qty) {
  const p = PRODUCTS.find(x => x.id === id);
  let cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;
  if (qty <= 0) cart = cart.filter(x => x.id !== id);
  else item.qty = Math.min(qty, p ? p.stock : qty);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function getCartDetailed() {
  return getCart().map(i => {
    const p = PRODUCTS.find(prod => prod.id === i.id);
    return p && p.aktif !== false ? { ...p, qty: i.qty } : null;
  }).filter(Boolean);
}

/* ---------- Halaman Keranjang ---------- */
const PROMOS = { FILO10: 0.10 };
const SHIPPING_FEE = 15000;
const ICON_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const ICON_BOX = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><line x1="12" y1="13" x2="12" y2="21"/></svg>';
let promo = 0;
let promoCode = '';
let notaOpener = null;

function initKeranjang() {
  renderCartPage();
  const input = document.getElementById('promoInput');
  const msg = document.getElementById('promoMsg');
  const applyPromoBtn = document.getElementById('applyPromo');
  const applyCode = () => {
    const v = (input?.value || '').trim().toUpperCase();
    if (PROMOS[v]) {
      promo = PROMOS[v]; promoCode = v;
      if (msg) { msg.textContent = ''; msg.classList.remove('error'); }
      if (input) input.value = '';
      toast(`Kode promo ${v} dipakai`);
    } else {
      if (msg) { msg.textContent = v ? 'Kode promo tidak valid.' : 'Masukkan kode promo terlebih dahulu.'; msg.classList.add('error'); }
    }
    renderCartPage();
  };
  if (applyPromoBtn) applyPromoBtn.onclick = applyCode;
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } });
  const removeBtn = document.getElementById('removePromo');
  if (removeBtn) removeBtn.onclick = () => { promo = 0; promoCode = ''; renderCartPage(); };

  document.querySelectorAll('input[name=ship]').forEach(r => r.addEventListener('change', renderCartPage));
  const btnCheckout = document.getElementById('btnCheckout');
  if (btnCheckout) btnCheckout.onclick = checkout;
  document.addEventListener('keydown', trapNotaKeys);
}

function cartTotals(items) {
  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const ambil = document.querySelector('input[name=ship]:checked')?.value === 'ambil';
  const ongkir = ambil || subtotal === 0 ? 0 : SHIPPING_FEE;
  const diskon = Math.round(subtotal * promo);
  return { subtotal, ambil, ongkir, diskon, total: subtotal - diskon + ongkir };
}

function renderCartPage() {
  const wrap = document.getElementById('cartItems');
  if (!wrap) return;
  const items = getCartDetailed();
  if (!items.length) {
    wrap.innerHTML = `
      <div class="empty">
        <div class="empty-icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h3>Keranjang masih kosong</h3>
        <p class="muted">Belum ada produk yang dipilih. Yuk lihat pakan, obat, dan aksesori untuk anabul Anda.</p>
        <a href="toko.html" class="btn btn-primary">Mulai Belanja</a>
      </div>`;
  } else {
    wrap.innerHTML = items.map(p => `
      <div class="cart-item">
        <div class="cart-thumb">${p.image ? `<img src="${productImg(p)}" alt="${p.name}" class="cart-img">` : ICON_BOX}</div>
        <div class="cart-info">
          <div class="cart-name">${p.name}</div>
          <div class="cart-unit-price">${rupiah(p.price)} / item</div>
          <div class="qty-control" role="group" aria-label="Jumlah ${p.name}">
            <button type="button" class="qty-btn" onclick="setQty(${p.id}, ${p.qty - 1})" aria-label="Kurangi jumlah ${p.name}">−</button>
            <span class="qty-num" aria-live="polite">${p.qty}</span>
            <button type="button" class="qty-btn" onclick="setQty(${p.id}, ${p.qty + 1})" aria-label="Tambah jumlah ${p.name}" ${p.qty >= p.stock ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="cart-right">
          <div class="line-total">${rupiah(p.price * p.qty)}</div>
          <button type="button" class="remove-btn" onclick="setQty(${p.id}, 0)" aria-label="Hapus ${p.name} dari keranjang">${ICON_TRASH} Hapus</button>
        </div>
      </div>`).join('');
  }

  const t = cartTotals(items);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('sumSubtotal', rupiah(t.subtotal));
  set('sumOngkir', t.subtotal === 0 ? '—' : (t.ongkir === 0 ? 'Gratis' : rupiah(t.ongkir)));
  set('sumTotal', rupiah(t.total));

  // Diskon hanya tampil setelah kode promo valid dipakai
  const rowDiskon = document.getElementById('rowDiskon');
  const applied = document.getElementById('promoApplied');
  const hasPromo = promo > 0 && items.length > 0;
  if (rowDiskon) rowDiskon.hidden = !hasPromo;
  if (applied) applied.hidden = !hasPromo;
  if (hasPromo) {
    set('diskonLabel', `Diskon ${promoCode} (${Math.round(promo * 100)}%)`);
    set('sumDiskon', '-' + rupiah(t.diskon));
    set('promoCodeName', promoCode);
  }

  const btnCheckout = document.getElementById('btnCheckout');
  if (btnCheckout) btnCheckout.disabled = items.length === 0;
}

function checkout() {
  const latest = loadProducts(); PRODUCTS.splice(0, PRODUCTS.length, ...latest);
  const items = getCartDetailed();
  if (!items.length) return;
  const t = cartTotals(items);

  const payMethodEl = document.getElementById('payMethod');
  const nota = {
    no: 'INV-' + Date.now().toString(36).toUpperCase(),
    tanggal: new Date().toISOString(),
    item: items.reduce((s, p) => s + p.qty, 0),
    total: t.total, metode: payMethodEl ? payMethodEl.value : 'Transfer Bank',
    produk: items.map(p => `${p.name} x${p.qty}`),
    sumber: 'Online', pelanggan: (typeof getUser === 'function' && getUser() || {}).name || '',
    statusBayar: /COD/i.test(payMethodEl ? payMethodEl.value : '') ? 'Menunggu' : 'Lunas',
    // Rincian untuk halaman Riwayat Transaksi
    rincian: items.map(p => ({ id: p.id, name: p.name, qty: p.qty, price: p.price })),
    subtotal: t.subtotal, diskon: t.diskon, kodePromo: t.diskon ? promoCode : '',
    ongkir: t.ongkir, pengiriman: t.ambil ? 'Ambil di toko' : 'Dikirim ke alamat'
  };
  try { FVStore.checkout(items, nota); }
  catch (error) { toast(error.message, 'error'); return; }

  saveCart([]);
  promo = 0; promoCode = '';
  renderCartPage();

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('notaNo', nota.no);
  set('notaItems', nota.item + ' produk');
  set('notaPay', nota.metode);
  set('notaTotal', rupiah(nota.total));
  const view = document.getElementById('btnNotaView');
  if (view) view.href = 'profil-pelanggan.html?nota=' + encodeURIComponent(nota.no) + '#panelTransaksi';
  openNota();
}

/* ---------- Modal pembayaran: Esc menutup, fokus terkunci ---------- */
function openNota() {
  const modal = document.getElementById('notaModal');
  if (!modal) return;
  notaOpener = document.activeElement;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  modal.onclick = e => { if (e.target === modal) closeNota(); };
  const done = document.getElementById('btnNotaClose');
  if (done) done.onclick = closeNota;
  const first = document.getElementById('btnNotaView');
  if (first) first.focus();
}
function closeNota() {
  const modal = document.getElementById('notaModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  if (notaOpener && document.contains(notaOpener)) notaOpener.focus();
}
function trapNotaKeys(e) {
  const modal = document.getElementById('notaModal');
  if (!modal || !modal.classList.contains('is-open')) return;
  if (e.key === 'Escape') return closeNota();
  if (e.key !== 'Tab') return;
  const f = Array.from(modal.querySelectorAll('a[href], button:not(:disabled)'));
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
