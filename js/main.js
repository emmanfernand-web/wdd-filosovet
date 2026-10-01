/* ============================================================
   FILOSOVET — main.js (Server-Side Component Integration & Global Utilities)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Tandai bahwa JS aktif untuk mendukung observer animasi
  document.documentElement.classList.add('js-observer');

  const isInsidePagesFolder = location.pathname.includes('/pages/');

  // 1. Inisialisasi Navigasi & Utility (Komponen sudah di-render server-side oleh PHP)
  fixNavLinks(isInsidePagesFolder);
  setActiveNavLink();
  initHeaderScroll();
  initHamburger();
  updateCartBadge();
  initFooterYear();

  // 2. Jalankan Observer Animasi Scroll
  initReveal();

  // 3. Trigger Dark Mode jika fungsi tersedia
  if (typeof initDarkModeToggle === 'function') {
    initDarkModeToggle();
  }
});

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

// Menyelaraskan Link Navigasi Berdasarkan Posisi Halaman (Root vs Pages)
function fixNavLinks(isInsidePages) {
  const brandLink = document.querySelector('.site-header .brand');
  if (brandLink) {
    brandLink.href = isInsidePages ? '../index.php' : 'index.php';
    const logoImg = brandLink.querySelector('.logo');
    if (logoImg) {
      logoImg.src = isInsidePages ? '../assets/images/logo_filosovet.png' : 'assets/images/logo_filosovet.png';
    }
  }

  document.querySelectorAll('.main-nav a').forEach(a => {
    const page = a.getAttribute('data-page');
    if (!page) return;

    if (page === 'index.php') {
      a.href = isInsidePages ? '../index.php' : 'index.php';
    } else {
      a.href = isInsidePages ? page : 'pages/' + page;
    }
  });

  const cartLink = document.querySelector('.cart-link');
  if (cartLink) {
    cartLink.href = isInsidePages ? 'keranjang.php' : 'pages/keranjang.php';
  }

  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn) {
    loginBtn.href = isInsidePages ? 'auth.php' : 'pages/auth.php';
  }
}

function setActiveNavLink() {
  const currentPage = location.pathname.split('/').pop() || 'index.php';
  document.querySelectorAll('.main-nav a').forEach(a => {
    const page = a.getAttribute('data-page');
    if (page === currentPage || (currentPage === '' && page === 'index.php')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });
}

function initHamburger() {
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  if (burger && nav) {
    burger.onclick = (e) => {
      e.stopPropagation();
      nav.classList.toggle('open');
    };
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !burger.contains(e.target)) nav.classList.remove('open');
    });
  }
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
function toast(msg, type = 'success') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), 2800);
}