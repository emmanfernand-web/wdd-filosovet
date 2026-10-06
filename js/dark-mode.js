/* ============================================================
   FILOSOVET — dark-mode.js (Clean SVG Theme Switcher)
   ============================================================ */

// 1. Terapkan tema awal langsung dari localStorage
(function applyInitialTheme() {
  const savedTheme = localStorage.getItem('fv_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
})();

// SVG Icons (Mode Malam & Mode Terang)
const SVG_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="theme-svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SVG_SUN = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="theme-svg"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

// 2. Inisialisasi Saklar Mode Terang / Gelap
function initDarkModeToggle() {
  const targetContainer = document.querySelector('.nav-actions') || document.querySelector('.admin-user');
  if (!targetContainer) return;

  // Cegah duplikasi tombol
  let toggleBtn = document.querySelector('.theme-toggle-btn');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Ganti Mode Tampilan');
    toggleBtn.setAttribute('title', 'Ganti Mode Tampilan');
    
    // Sisipkan sebelum elemen pertama
    targetContainer.insertBefore(toggleBtn, targetContainer.firstChild);
  }

  function updateIcon() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    toggleBtn.innerHTML = isDark ? SVG_SUN : SVG_MOON;
    toggleBtn.setAttribute('title', isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap');
  }

  updateIcon();

  toggleBtn.onclick = () => {
    const isDarkNow = document.documentElement.classList.contains('dark-mode');
    
    if (isDarkNow) {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('fv_theme', 'light');
    } else {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('fv_theme', 'dark');
    }

    toggleBtn.style.transform = 'scale(0.8) rotate(180deg)';
    setTimeout(() => {
      updateIcon();
      toggleBtn.style.transform = 'scale(1) rotate(0deg)';
    }, 150);
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkModeToggle);
} else {
  initDarkModeToggle();
}
document.addEventListener('componentsLoaded', initDarkModeToggle);