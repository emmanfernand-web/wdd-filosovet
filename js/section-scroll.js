/* ============================================================
   FILOSOVET — js/section-scroll.js
   Smooth "1 gesture = 1 section" scrolling for .snap-container.
   Uses a lightweight custom rAF animation (fixed 500ms duration,
   cached section offsets) instead of native scrollIntoView, to
   avoid layout-thrash jank and give consistent transition speed.
   ============================================================ */
(function () {
  const container = document.querySelector('.snap-container');
  if (!container) return;

  const BREAKPOINT = 900;   // matches the CSS media query in index.css
  const DURATION = 500;     // ms — transition speed between sections
  const WHEEL_THRESHOLD = 2;
  const GESTURE_QUIET_MS = 150;  // no wheel events for this long = gesture truly ended
  const MAX_LOCK_MS = DURATION + 200; // hard cap so the lock can never hang indefinitely
  const TOUCH_THRESHOLD = 40;

  let sections = [];
  let offsets = [];
  let currentIndex = 0;
  let isAnimating = false;
  let gestureLocked = false;
  let unlockTimer = null;
  let hardUnlockTimer = null;
  let touchStartY = 0;
  let rafId = null;

  function isDesktopMode() {
    return window.innerWidth > BREAKPOINT;
  }

  function refresh() {
    sections = Array.from(container.querySelectorAll('.fullscreen-section'));
    offsets = sections.map((sec) => sec.offsetTop);
  }

  function getCurrentIndex() {
    const scrollPos = container.scrollTop;
    let idx = 0;
    for (let i = 0; i < offsets.length; i++) {
      if (scrollPos >= offsets[i] - 10) idx = i;
    }
    return idx;
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function animateScrollTo(target) {
    const start = container.scrollTop;
    const distance = target - start;
    cancelAnimationFrame(rafId);

    if (Math.abs(distance) < 1) {
      isAnimating = false;
      return;
    }

    isAnimating = true;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / DURATION, 1);
      container.scrollTop = start + distance * easeInOutQuad(progress);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        isAnimating = false;
      }
    }
    rafId = requestAnimationFrame(step);
  }

  function releaseLock() {
    gestureLocked = false;
    clearTimeout(unlockTimer);
    clearTimeout(hardUnlockTimer);
  }

  function refreshQuietTimer() {
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(releaseLock, GESTURE_QUIET_MS);
  }

  function lockGesture() {
    gestureLocked = true;
    clearTimeout(hardUnlockTimer);
    hardUnlockTimer = setTimeout(releaseLock, MAX_LOCK_MS); // never refreshed — hard ceiling
    refreshQuietTimer();
  }

  function goToSection(index) {
    if (index < 0 || index >= sections.length) return;
    currentIndex = index;
    animateScrollTo(offsets[index]);
  }

  container.addEventListener(
    'wheel',
    function (e) {
      if (!isDesktopMode()) return; // let mobile scroll normally
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;

      e.preventDefault();

      if (isAnimating || gestureLocked) {
        refreshQuietTimer(); // keep swallowing the momentum tail, but hard cap still applies
        return;
      }

      lockGesture();
      currentIndex = getCurrentIndex();
      goToSection(e.deltaY > 0 ? currentIndex + 1 : currentIndex - 1);
    },
    { passive: false }
  );

  container.addEventListener(
    'touchstart',
    function (e) {
      if (!isDesktopMode()) return;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  container.addEventListener(
    'touchend',
    function (e) {
      if (!isDesktopMode() || isAnimating) return;

      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < TOUCH_THRESHOLD) return;

      currentIndex = getCurrentIndex();
      goToSection(diff > 0 ? currentIndex + 1 : currentIndex - 1);
    },
    { passive: true }
  );

  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  refresh();
})();