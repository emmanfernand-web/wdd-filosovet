/* ============================================================
   FILOSOVET — main.js (interaksi global)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menu
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // Badge jumlah keranjang
  updateCartBadge();

  // Tahun footer
  document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());

  // Reveal on scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
});

/* ---------- Util ---------- */
function rupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

function getCart() {
  try { return JSON.parse(localStorage.getItem('fv_cart')) || []; } catch { return []; }
}
function saveCart(c) {
  localStorage.setItem('fv_cart', JSON.stringify(c));
  updateCartBadge();
}
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
  t._to = setTimeout(() => t.classList.remove('show'), 2600);
}
