/* ============================================================
   FILOSOVET — dark-mode.js (Safe Component Binding)
   ============================================================ */
(function() {
  const isDark = localStorage.getItem('fv_theme') === 'dark' || 
    (!('fv_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark-mode');
  }
})();

function initDarkModeToggle() {
  const PATH_LIGHT_ICON = 'assets/dark_mode/light.png';
  const PATH_DARK_ICON = 'assets/dark_mode/dark.png';

  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.querySelector('.theme-toggle-btn')) return; // Mencegah penggandaan tombol

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.setAttribute('title', 'Ganti Mode Tampilan');
  
  const toggleImg = document.createElement('img');
  toggleImg.style.cssText = 'width: 22px; height: 22px; object-fit: contain; transition: transform 0.3s ease;';
  
  const isDark = document.documentElement.classList.contains('dark-mode');
  toggleImg.src = isDark ? PATH_LIGHT_ICON : PATH_DARK_ICON;
  toggleImg.alt = isDark ? 'Mode Terang' : 'Mode Gelap';

  toggleBtn.appendChild(toggleImg);
  navActions.insertBefore(toggleBtn, navActions.firstChild);

  toggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    if (document.body) document.body.classList.toggle('dark-mode');

    const activeDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('fv_theme', activeDark ? 'dark' : 'light');

    toggleImg.style.transform = 'scale(0.8) rotate(180deg)';
    setTimeout(() => {
      toggleImg.src = activeDark ? PATH_LIGHT_ICON : PATH_DARK_ICON;
      toggleImg.style.transform = 'scale(1) rotate(0deg)';
    }, 150);
  });
}

// Jalankan saat DOM awal & saat komponen header selesai di-fetch
document.addEventListener('DOMContentLoaded', initDarkModeToggle);
document.addEventListener('componentsLoaded', initDarkModeToggle);