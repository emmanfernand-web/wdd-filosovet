/* ============================================================
   FILOSOVET — home.js (interaksi Beranda)
   Bergantung pada FV_CONFIG di main.js
   ============================================================ */
(function () {
  /* Status buka/tutup klinik, dihitung dari jam saat ini */
  function renderOpenStatus() {
    const { open, close } = FV_CONFIG.clinicHours;
    const h = new Date().getHours();
    const fmt = n => String(n).padStart(2, '0') + '.00';
    const isOpen = h >= open && h < close;
    document.querySelectorAll('.js-open-pill').forEach(pill => {
      pill.classList.toggle('is-closed', !isOpen);
      pill.querySelector('.js-open-text').textContent = isOpen ? 'Buka sekarang' : 'Klinik tutup';
      pill.querySelector('.js-open-note').textContent = isOpen ? 'sampai ' + fmt(close) : 'buka ' + fmt(open) + ' · darurat 24 jam';
    });
  }

  /* Nomor darurat dari konfigurasi */
  function renderEmergency() {
    document.querySelectorAll('.js-emergency').forEach(a => { a.href = 'tel:' + FV_CONFIG.emergencyPhone; });
  }

  /* Tab aksesibel: klik atau panah kiri/kanan/atas/bawah; opsional sinkron ke gambar */
  function initTabs(root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const syncEl = root.dataset.sync ? document.getElementById(root.dataset.sync) : null;
    const scope = root.closest('section') || document;

    function select(tab, focus) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (syncEl) syncEl.querySelectorAll('img').forEach(img => img.classList.toggle('active', img.dataset.key === tab.dataset.key));
      if (focus) tab.focus();
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in keys) { e.preventDefault(); select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true); }
        else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  }

  /* Tab Testimoni berada di luar elemen [role=tablist] data-tabs; tangani lewat kontainer .testi */
  function init() {
    renderOpenStatus();
    renderEmergency();
    document.querySelectorAll('[data-tabs]').forEach(root => {
      if (root.classList.contains('testi')) {
        const list = root.querySelector('[role="tablist"]');
        list.dataset.tabs = '';
        initTabs(list);
      } else {
        initTabs(root);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
