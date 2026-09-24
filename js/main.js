/* ============================================================
   FILOSOVET — main.js (Robust Component Loader & Observer)
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Tandai bahwa JS aktif untuk mendukung observer animasi
  document.documentElement.classList.add('js-observer');

  const isInsidePagesFolder = location.pathname.includes('/pages/');
  const prefix = isInsidePagesFolder ? '../' : '';

  // 1. Muat Header & Footer sesuai posisi folder
  await loadComponent('#header-placeholder', [
    prefix + 'components/header.html',
    'components/header.html'
  ]);
  await loadComponent('#footer-placeholder', [
    prefix + 'components/footer.html',
    'components/footer.html'
  ]);

  // 2. Inisialisasi Navigasi & Utility
  fixNavLinks(isInsidePagesFolder);
  setActiveNavLink();
  initHeaderScroll();
  initHamburger();
  updateCartBadge();
  initFooterYear();
  
  // 3. Jalankan Observer Animasi Scroll
  initReveal();

  // 4. Trigger Dark Mode jika script terpasang
  if (typeof initDarkModeToggle === 'function') {
    initDarkModeToggle();
  }

  document.dispatchEvent(new CustomEvent('componentsLoaded'));
});

// Helper Loader Komponent dengan Error-Handling
async function loadComponent(selector, filePaths) {
  const el = document.querySelector(selector);
  if (!el) return;

  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        el.innerHTML = await res.text();
        return;
      }
    } catch (err) {}
  }
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

// Menyesuaikan Link Navigasi Berdasarkan Folder
function fixNavLinks(isInsidePages) {
  const brandLink = document.querySelector('.site-header .brand');
  if (brandLink) {
    brandLink.href = isInsidePages ? '../index.html' : 'index.html';
    const logoImg = brandLink.querySelector('.logo');
    if (logoImg) {
      logoImg.src = isInsidePages ? '../assets/images/logo_filosovet.png' : 'assets/images/logo_filosovet.png';
    }
  }

  document.querySelectorAll('.main-nav a').forEach(a => {
    const page = a.getAttribute('data-page');
    if (!page) return;

    if (page === 'index.html') {
      a.href = isInsidePages ? '../index.html' : 'index.html';
    } else {
      a.href = isInsidePages ? page : 'pages/' + page;
    }
  });

  const cartLink = document.querySelector('.cart-link');
  if (cartLink) {
    cartLink.href = isInsidePages ? 'keranjang.html' : 'pages/keranjang.html';
  }

  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn) {
    loginBtn.href = isInsidePages ? 'auth.html' : 'pages/auth.html';
  }
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