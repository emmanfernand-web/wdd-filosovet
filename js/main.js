/* ============================================================
   FILOSOVET — main.js (Robust Component Loader & Observer)
   ============================================================ */
/* Konfigurasi situs: ganti nomor di sini, berlaku untuk seluruh halaman */
const FV_CONFIG = {
  whatsapp: '6281200000000',        // format internasional tanpa +, contoh 6281234567890
  whatsappText: 'Halo Filosovet, saya ingin bertanya.',
  emergencyPhone: '+6281200000000', // nomor layanan darurat 24 jam
  clinicHours: { open: 8, close: 21 }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Tandai bahwa JS aktif untuk mendukung observer animasi
  document.documentElement.classList.add('js-observer');

  const isInsidePagesFolder = location.pathname.includes('/pages/');
  const prefix = isInsidePagesFolder ? '../' : '';

  // 1. Muat Header & Footer dari components/ (path di dalamnya relatif terhadap root situs)
  await Promise.all([
    loadComponent('#header-placeholder', prefix),
    loadComponent('#footer-placeholder', prefix)
  ]);

  // 2. Inisialisasi Navigasi & Utility
  setActiveNavLink();
  initHeaderScroll();
  initHamburger();
  updateCartBadge();
  initFooterYear();
  initAuthNav(isInsidePagesFolder);
  initQuickContact();

  // 3. Jalankan Observer Animasi Scroll
  initReveal();

  // 4. Trigger Dark Mode jika script terpasang
  if (typeof initDarkModeToggle === 'function') {
    initDarkModeToggle();
  }

  document.dispatchEvent(new CustomEvent('componentsLoaded'));
});

// Memuat components/header.html atau footer.html ke placeholder.
// Semua href/src relatif di komponen ditulis dari root situs, lalu diberi awalan sesuai folder halaman.
async function loadComponent(selector, prefix) {
  const el = document.querySelector(selector);
  if (!el) return;
  const file = selector.includes('header') ? 'components/header.html' : 'components/footer.html';

  try {
    const res = await fetch(prefix + file);
    if (!res.ok) throw new Error(res.status);
    el.innerHTML = await res.text();
    prefixRelativeUrls(el, prefix);
  } catch (err) {
    console.warn('Komponen tidak dapat dimuat:', file, err);
  }
}

function prefixRelativeUrls(root, prefix) {
  if (!prefix) return;
  root.querySelectorAll('[href], [src]').forEach(node => {
    ['href', 'src'].forEach(attr => {
      const v = node.getAttribute(attr);
      if (v && !/^(https?:|mailto:|tel:|#|\/|\.\.\/)/.test(v)) node.setAttribute(attr, prefix + v);
    });
  });
}

// Inisialisasi Animation Observer
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.02, rootMargin: '0px 0px 50px 0px' });

  reveals.forEach(el => observer.observe(el));
}

function setActiveNavLink() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    const page = a.getAttribute('data-page');
    if (page === currentPage || (currentPage === '' && page === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  // Di Beranda (desktop) yang bergulir adalah .snap-container, bukan window
  const snap = document.querySelector('.snap-container');
  const update = () => {
    const y = Math.max(window.scrollY, snap ? snap.scrollTop : 0);
    header.classList.toggle('scrolled', y > 30);
  };
  window.addEventListener('scroll', update, { passive: true });
  if (snap) snap.addEventListener('scroll', update, { passive: true });
  update();
}

function initHamburger() {
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  if (!burger || !nav) return;
  burger.setAttribute('aria-controls', 'mainNav');
  burger.setAttribute('aria-expanded', 'false');
  nav.id = 'mainNav';
  const setOpen = open => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger.onclick = e => { e.stopPropagation(); setOpen(!nav.classList.contains('open')); };
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !burger.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); burger.focus(); } });
}

const ICON_USER = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const ICON_CLOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const ICON_LOGOUT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
const ICON_PHONE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const ICON_CHAT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

/* Hewan tersimpan: dari localStorage (fv_pets) atau data contoh */
const FV_DEFAULT_PETS = [
  { id: 'momo', name: 'Momo', species: 'Kucing', breed: 'Persia', weight: 3.5, vaksin: 'lengkap', vaksinNote: 'Vaksin lengkap', steril: true },
  { id: 'bubu', name: 'Bubu', species: 'Anjing', breed: 'Golden Retriever', weight: 18, vaksin: 'segera', vaksinNote: 'Vaksin diperbarui 2 bln lagi', steril: false }
];
function getSavedPets() {
  let legacy = FV_DEFAULT_PETS;
  try { const p = JSON.parse(localStorage.getItem('fv_pets')); if (Array.isArray(p)) legacy = p; } catch { }
  if (typeof FVStore === 'undefined') return legacy;
  const ids=FVStore.currentCustomerIds();
  const shared=FVStore.state().pets.filter(p=>ids.includes(p.customerId));
  const result=legacy.map(p=>({...p}));
  shared.forEach(p=>{const old=result.find(x=>x.name===p.nama&&x.species===p.spesie);if(old)Object.assign(old,{name:p.nama,species:p.spesie,breed:p.ras,weight:p.weight??old.weight});else result.push({id:p.id,name:p.nama,species:p.spesie,breed:p.ras,weight:p.weight||'',vaksin:p.vaksin||'belum'});});
  return result;
}

function getUser() { try { return JSON.parse(localStorage.getItem('fv_user')); } catch { return null; } }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* Tombol "Masuk" berubah jadi avatar + dropdown bila user sudah login */
function initAuthNav(isInsidePages) {
  const loginBtn = document.querySelector('.nav-actions .btn-login');
  const user = getUser();
  if (!loginBtn || !user || !user.name) return;

  const base = isInsidePages ? '' : 'pages/';
  const initial = escapeHtml(user.name.trim().charAt(0).toUpperCase() || 'U');
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.innerHTML = `
    <button type="button" class="user-menu-btn" aria-label="Menu akun ${escapeHtml(user.name)}" aria-haspopup="true" aria-expanded="false">${initial}</button>
    <div class="user-menu-list" role="menu">
      <div class="user-menu-head"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email || '')}</span></div>
      <a href="${base}profil-pelanggan.html" role="menuitem">${ICON_USER} Profil</a>
      <a href="${base}profil-pelanggan.html#panelBooking" role="menuitem">${ICON_CLOCK} Riwayat</a>
      <button type="button" class="um-logout" role="menuitem">${ICON_LOGOUT} Keluar</button>
    </div>`;
  loginBtn.replaceWith(menu);

  const btn = menu.querySelector('.user-menu-btn');
  const setOpen = open => { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!menu.classList.contains('open')); });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); btn.focus(); } });
  menu.querySelector('.um-logout').addEventListener('click', () => {
    localStorage.removeItem('fv_user');
    toast('Anda telah keluar');
    setTimeout(() => location.href = isInsidePages ? 'auth.html' : 'pages/auth.html', 700);
  });
}

/* Tombol melayang: WhatsApp & telepon darurat (nomor dari FV_CONFIG) */
function initQuickContact() {
  if (!document.querySelector('.site-header') || document.querySelector('.fv-quick')) return;
  const wa = `https://wa.me/${FV_CONFIG.whatsapp}?text=${encodeURIComponent(FV_CONFIG.whatsappText)}`;
  const box = document.createElement('div');
  box.className = 'fv-quick';
  box.innerHTML = `
    <a class="fv-emergency" href="tel:${FV_CONFIG.emergencyPhone}" aria-label="Telepon darurat 24 jam" title="Telepon darurat 24 jam">${ICON_PHONE}</a>
    <a class="fv-wa" href="${wa}" target="_blank" rel="noopener" aria-label="Chat WhatsApp" title="Chat WhatsApp">${ICON_CHAT}</a>`;
  document.body.appendChild(box);
}

function initFooterYear() {
  document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());
}

/* Helper Utilities */
function rupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function getCart() { try { return JSON.parse(localStorage.getItem('fv_cart')) || []; } catch { return []; } }
function saveCart(c) { localStorage.setItem('fv_cart', JSON.stringify(c)); updateCartBadge(); }
function updateCartBadge() {
  const n = getCart().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = n;
    el.style.display = n > 0 ? 'grid' : 'none';
  });
}
/* Umpan balik tambah ke keranjang: foto produk meluncur ke ikon keranjang */
function flyToCart(sourceEl) {
  const target = document.querySelector('.cart-link');
  if (!target || !sourceEl) return;
  const bump = () => {
    if (!target.animate) return;
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
  };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !sourceEl.animate) { bump(); return; }

  const a = sourceEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) { bump(); return; }
  const size = 56;
  const flyer = document.createElement('div');
  flyer.setAttribute('aria-hidden', 'true');
  flyer.style.cssText = `position:fixed;z-index:3000;pointer-events:none;border-radius:50%;overflow:hidden;
    left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px;
    border:2px solid var(--primary-dark);background:var(--surface-alt) center/cover no-repeat;box-shadow:0 6px 18px rgba(58,51,44,.3);`;
  if (sourceEl.tagName === 'IMG' && sourceEl.currentSrc) flyer.style.backgroundImage = `url("${sourceEl.currentSrc}")`;
  document.body.appendChild(flyer);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = flyer.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 40}px) scale(0.7)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.35, offset: 1 }
  ], { duration: 650, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' });
  let done = false;
  const finish = () => { if (done) return; done = true; flyer.remove(); bump(); };
  anim.onfinish = finish;
  setTimeout(finish, 900); // cadangan bila animasi dijeda (tab di latar belakang)
}

function toast(msg, type = 'success') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), 2800);
}