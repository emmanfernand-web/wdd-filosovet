/* ============================================================
   FILOSOVET — cart.js (katalog produk & keranjang)
   ============================================================ */
const PRODUCTS = [
  { id: 1,  name: 'Dry Food Kucing Premium 1,5kg',  cat: 'makanan',  price: 185000, stock: 24, icon: '🍗', image: 'dry_food_cat.jpeg', sold: 312 },
  { id: 2,  name: 'Dry Food Anjing Adult 3kg',      cat: 'makanan',  price: 265000, stock: 18, icon: '🦴', image: 'dry_food_dog.jpeg', sold: 245 },
  { id: 3,  name: 'Wet Food Kucing Tuna 85g',       cat: 'makanan',  price: 22000,  stock: 60, icon: '🥫', image: 'wet_food_cat.jpeg', sold: 580 },
  { id: 4,  name: 'Snack Dental Stick Anjing',      cat: 'makanan',  price: 48000,  stock: 0,  icon: '🦷', image: 'snack_dental_stick_dog.jpeg', sold: 150 },
  { id: 5,  name: 'Obat Cacing Broad Spectrum',     cat: 'obat',     price: 35000,  stock: 40, icon: '💊', image: 'board_guard.jpeg', sold: 410 },
  { id: 6,  name: 'Vitamin Bulu & Kulit 60ml',      cat: 'obat',     price: 78000,  stock: 12, icon: '🧪', image: 'skin_vitamin.jpeg', sold: 198 },
  { id: 7,  name: 'Obat Kutu Spot-On Kucing',       cat: 'obat',     price: 95000,  stock: 5,  icon: '🩹', image: 'cat_flea.jpeg', sold: 265 },
  { id: 8,  name: 'Antibiotik (resep dokter)',      cat: 'obat',     price: 60000,  stock: 3,  icon: '⚕️', image: 'animal_antibiotik.jpeg', sold: 96 },
  { id: 9,  name: 'Shampoo Anti-Jamur 250ml',       cat: 'skincare', price: 65000,  stock: 22, icon: '🧴', image: 'pet_shampoo.jpeg', sold: 174 },
  { id: 10, name: 'Conditioner Silk Coat 200ml',    cat: 'skincare', price: 58000,  stock: 16, icon: '🫧', image: 'pet_conditioner.jpeg', sold: 132 },
  { id: 11, name: 'Paw Balm Pelembab Telapak',      cat: 'skincare', price: 42000,  stock: 9,  icon: '🐾', image: 'paw_balm.jpeg', sold: 88 },
  { id: 12, name: 'Kalung Kucing motif',            cat: 'aksesoris',price: 35000,  stock: 30, icon: '🔔', image: 'cat_collars.jpeg', sold: 142 },
  { id: 13, name: 'Mainan Bola & Tali Anjing',      cat: 'aksesoris',price: 29000,  stock: 26, icon: '🎾', image: 'dog_toy.jpeg', sold: 210 },
  { id: 14, name: 'Kandang Travel Size M',          cat: 'aksesoris',price: 320000, stock: 7,  icon: '🧳', image: 'pet_create.jpeg', sold: 61 },
  
  
];
const CAT_LABEL = { makanan: 'Makanan', obat: 'Obat & Vitamin', skincare: 'Skincare', aksesoris: 'Aksesoris', almed: 'Alat Medis' };

/* ---------- Animasi Terbang ke Keranjang ---------- */
function animateFlyToCart(sourceEl) {
  if (!sourceEl) return;
  
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const targetEl = document.querySelector('.cart-link');
  if (!targetEl) return;

  const cardEl = sourceEl.closest('.product-card') || sourceEl;
  const thumbEl = cardEl.querySelector('.product-thumb img') || cardEl.querySelector('.product-thumb') || sourceEl;

  const srcRect = (thumbEl || sourceEl).getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'cart-flyer';
  flyer.style.cssText = `
    position: fixed;
    z-index: 99999;
    left: ${srcRect.left + srcRect.width / 2 - 24}px;
    top: ${srcRect.top + srcRect.height / 2 - 24}px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    pointer-events: none;
    transition: left 700ms cubic-bezier(0.2, 0.8, 0.25, 1),
                top 700ms cubic-bezier(0.2, 0.8, 0.25, 1),
                width 700ms cubic-bezier(0.2, 0.8, 0.25, 1),
                height 700ms cubic-bezier(0.2, 0.8, 0.25, 1),
                opacity 700ms ease,
                transform 700ms ease;
    border: 2px solid var(--primary, #6B8F71);
    background: var(--surface, #FAF6F0);
  `;

  const img = thumbEl.tagName === 'IMG' ? thumbEl : (thumbEl.querySelector ? thumbEl.querySelector('img') : null);
  if (img && img.src) {
    flyer.innerHTML = `<img src="${img.src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    flyer.innerHTML = `<div style="display:grid;place-items:center;height:100%;font-size:1.3rem;background:var(--primary,#6B8F71);color:#fff">🛒</div>`;
  }

  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    flyer.style.left = `${targetRect.left + targetRect.width / 2 - 12}px`;
    flyer.style.top = `${targetRect.top + targetRect.height / 2 - 12}px`;
    flyer.style.width = '24px';
    flyer.style.height = '24px';
    flyer.style.opacity = '0.3';
    flyer.style.transform = 'scale(0.3) rotate(360deg)';
  });

  setTimeout(() => {
    flyer.remove();
    if (targetEl.animate) {
      targetEl.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.35) rotate(-8deg)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' }
      ], { duration: 350, easing: 'ease-out' });
    }
  }, 700);
}

/* ---------- Keranjang (localStorage) ---------- */
function addToCart(id, qty = 1, triggerEl = null) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p || p.stock <= 0) {
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

  const sourceEl = triggerEl || (window.event ? window.event.target : null);
  animateFlyToCart(sourceEl);

  saveCart(cart);
  toast(`${p.name} ditambahkan ke keranjang`);
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
    return p ? { ...p, qty: i.qty } : null;
  }).filter(Boolean);
}

/* ---------- Halaman Keranjang ---------- */
let promo = 0;
function initKeranjang() {
  renderCartPage();
  const applyPromoBtn = document.getElementById('applyPromo');
  if (applyPromoBtn) {
    applyPromoBtn.onclick = () => {
      const v = document.getElementById('promoInput')?.value.trim().toUpperCase() || '';
      if (v === 'FILO10') { promo = 0.10; toast('Kode promo FILO10 dipakai — diskon 10%'); }
      else { promo = 0; toast('Kode promo tidak valid', 'error'); }
      renderCartPage();
    };
  }
  document.querySelectorAll('input[name=ship]').forEach(r => r.addEventListener('change', renderCartPage));
  const btnCheckout = document.getElementById('btnCheckout');
  if (btnCheckout) btnCheckout.onclick = checkout;
}

function renderCartPage() {
  const wrap = document.getElementById('cartItems');
  if (!wrap) return;
  const items = getCartDetailed();
  if (!items.length) {
    wrap.innerHTML = `<div class="empty" style="text-align:center;padding:2.5rem 0"><div class="big" style="font-size:3rem;margin-bottom:0.5rem">🛒</div><h3>Keranjang kosong</h3><p class="muted">Belum ada produk yang dipilih.</p><a href="toko.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Mulai Belanja</a></div>`;
  } else {
    wrap.innerHTML = items.map(p => `
      <div class="cart-item">
        <div class="cart-thumb">${p.image ? `<img src="../assets/images/${p.image}" alt="${p.name}" class="cart-img">` : (p.icon || '📦')}</div>
        <div class="cart-info">
          <div class="cart-name">${p.name}</div>
          <div class="cart-unit-price">${rupiah(p.price)} / item</div>
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="setQty(${p.id}, ${p.qty - 1})" aria-label="Kurangi kuantitas">−</button>
            <span class="qty-num">${p.qty}</span>
            <button type="button" class="qty-btn" onclick="setQty(${p.id}, ${p.qty + 1})" aria-label="Tambah kuantitas">+</button>
          </div>
        </div>
        <div class="cart-right">
          <div class="line-total">${rupiah(p.price * p.qty)}</div>
          <button type="button" class="remove-btn" onclick="setQty(${p.id}, 0)">🗑 Hapus</button>
        </div>
      </div>`).join('');
  }

  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const ambil = document.querySelector('input[name=ship]:checked')?.value === 'ambil';
  const ongkir = ambil || subtotal === 0 ? 0 : 15000;
  const diskon = Math.round(subtotal * promo);

  const sumSub = document.getElementById('sumSubtotal');
  if (sumSub) sumSub.textContent = rupiah(subtotal);

  const rowDiskon = document.getElementById('rowDiskon');
  if (rowDiskon) rowDiskon.style.display = diskon > 0 ? 'flex' : 'none';

  const sumDiskon = document.getElementById('sumDiskon');
  if (sumDiskon) sumDiskon.textContent = '-' + rupiah(diskon);

  const sumOngkir = document.getElementById('sumOngkir');
  if (sumOngkir) sumOngkir.textContent = ongkir === 0 ? 'GRATIS' : rupiah(ongkir);

  const sumTotal = document.getElementById('sumTotal');
  if (sumTotal) sumTotal.textContent = rupiah(subtotal - diskon + ongkir);

  const btnCheckout = document.getElementById('btnCheckout');
  if (btnCheckout) btnCheckout.disabled = items.length === 0;
}

function checkout() {
  const items = getCartDetailed();
  if (!items.length) return;
  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const ambil = document.querySelector('input[name=ship]:checked')?.value === 'ambil';
  const ongkir = ambil ? 0 : 15000;
  const total = subtotal - Math.round(subtotal * promo) + ongkir;

  const payMethodEl = document.getElementById('payMethod');
  const nota = {
    no: 'INV-' + Date.now().toString(36).toUpperCase(),
    tanggal: new Date().toISOString(),
    item: items.reduce((s, p) => s + p.qty, 0),
    total, metode: payMethodEl ? payMethodEl.value : 'Transfer Bank',
    produk: items.map(p => `${p.name} x${p.qty}`)
  };
  const hist = JSON.parse(localStorage.getItem('fv_orders') || '[]');
  hist.unshift(nota);
  localStorage.setItem('fv_orders', JSON.stringify(hist));

  saveCart([]);
  const notaNo = document.getElementById('notaNo');
  if (notaNo) notaNo.textContent = nota.no;
  const notaItems = document.getElementById('notaItems');
  if (notaItems) notaItems.textContent = nota.item + ' produk';
  const notaPay = document.getElementById('notaPay');
  if (notaPay) notaPay.textContent = nota.metode;
  const notaTotal = document.getElementById('notaTotal');
  if (notaTotal) notaTotal.textContent = rupiah(total);
  const notaModal = document.getElementById('notaModal');
  if (notaModal) {
    notaModal.classList.add('is-open');
    // Close on overlay click (outside sheet)
    notaModal.onclick = (e) => { if (e.target === notaModal) notaModal.classList.remove('is-open'); };
  }
  const btnClose = document.getElementById('btnNotaClose');
  if (btnClose) btnClose.onclick = () => notaModal && notaModal.classList.remove('is-open');
}
