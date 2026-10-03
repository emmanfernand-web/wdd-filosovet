/* ============================================================
   FILOSOVET — dark-mode.js (Clean Floating Switcher)
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

// 2. Inisialisasi Saklar Mode Terang / Gelap
function initDarkModeToggle() {
  const isInsidePagesFolder = location.pathname.includes('/pages/');
  const prefix = isInsidePagesFolder ? '../' : '';

  const PATH_LIGHT_ICON = prefix + 'assets/dark_mode/light.png';
  const PATH_DARK_ICON = prefix + 'assets/dark_mode/dark.png';

  // Cari wadah navigasi publik (.nav-actions) atau topbar admin (.admin-user)
  const targetContainer = document.querySelector('.nav-actions') || document.querySelector('.admin-user');
  if (!targetContainer) return;

  // Cegah duplikasi tombol
  let toggleBtn = document.querySelector('.theme-toggle-btn');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('title', 'Ganti Mode Tampilan');
    
    const toggleImg = document.createElement('img');
    toggleImg.style.cssText = 'width: 24px; height: 24px; object-fit: contain; transition: transform 0.3s ease;';
    toggleBtn.appendChild(toggleImg);
    
    // Sisipkan sebelum elemen pertama
    targetContainer.insertBefore(toggleBtn, targetContainer.firstChild);
  }

  const toggleImg = toggleBtn.querySelector('img');

  function updateIcon() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    if (toggleImg) {
      toggleImg.src = isDark ? PATH_LIGHT_ICON : PATH_DARK_ICON;
      toggleImg.alt = isDark ? 'Mode Terang' : 'Mode Gelap';
    }
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

    if (toggleImg) {
      toggleImg.style.transform = 'scale(0.8) rotate(180deg)';
      setTimeout(() => {
        updateIcon();
        toggleImg.style.transform = 'scale(1) rotate(0deg)';
      }, 150);
    }
  };
}

document.addEventListener('DOMContentLoaded', initDarkModeToggle);
document.addEventListener('componentsLoaded', initDarkModeToggle);