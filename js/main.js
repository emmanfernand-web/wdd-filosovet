/* ============================================================
   FILOSOVET — main.js (Fixed Component Loader & Race-Condition Fix)
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Muat Header & Footer (Auto fallback path jika folder components/ atau root)
  await loadComponent('#header-placeholder', ['components/header.html']);
  await loadComponent('#footer-placeholder', ['components/footer.html']);

  // 2. Tandai Link Navigasi yang Aktif Sesuai Halaman
  setActiveNavLink();

  // 3. Inisialisasi Fitur Navbar Setelah HTML Selesai Dimuat
  initHeaderScroll();
  initHamburger();
  updateCartBadge();
  initFooterYear();

  // 4. Panggil Ulang Dark Mode Switcher (Jika dark-mode.js terpasang)
  if (typeof initDarkModeToggle === 'function') {
    initDarkModeToggle();
  }
  
  // Kirim Custom Event bahwa Komponen Header/Footer Sudah Ready
  document.dispatchEvent(new CustomEvent('componentsLoaded'));
});

// Fungsi pemanggil file HTML terpisah dengan Fallback Path
async function loadComponent(selector, filePaths) {
  const el = document.querySelector(selector);
  if (!el) return;

  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        el.innerHTML = await res.text();
        return; // Berhasil dimuat, keluar fungsi
      }
    } catch (err) {
      // Mengabaikan error fetch lokal untuk mencobapath selanjutnya
    }
  }
  console.warn(`Gagal memuat komponen untuk ${selector}. Pastikan membuka web menggunakan Live Server.`);
}

// Highlights Navigasi Aktif
function setActiveNavLink() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    const page = a.getAttribute('href') || a.getAttribute('data-page');
    if (page === currentPage || (currentPage === '' && page === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

// Efek Scroll pada Header Kapsul
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });
}

// Hamburger Menu (Mobile)
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

/* ---------- Helper Utilities ---------- */
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