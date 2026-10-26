/* ============================================================
   FILOSOVET — auth.js (Masuk & Daftar, simulasi tanpa server)
   Bergantung pada main.js: getUser(), toast()
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- Sudah masuk ---------- */
  const user = getUser();
  if (user && user.name) {
    $('authForms').hidden = true;
    $('authLoggedIn').hidden = false;
    $('authLoggedAs').textContent = `Masuk sebagai ${user.name}${user.email ? ' (' + user.email + ')' : ''}.`;
    $('authLogout').addEventListener('click', () => {
      localStorage.removeItem('fv_user');
      toast('Anda telah keluar');
      setTimeout(() => location.reload(), 600);
    });
  }

  /* ---------- Tab Masuk / Daftar ---------- */
  const tabs = { login: $('tabLogin'), register: $('tabRegister') };
  const forms = { login: $('formLogin'), register: $('formRegister') };
  function showTab(name, focus) {
    Object.keys(tabs).forEach(k => {
      const on = k === name;
      tabs[k].classList.toggle('active', on);
      tabs[k].setAttribute('aria-selected', on);
      tabs[k].tabIndex = on ? 0 : -1;
      forms[k].hidden = !on;
    });
    if (focus) tabs[name].focus();
  }
  tabs.login.addEventListener('click', () => showTab('login'));
  tabs.register.addEventListener('click', () => showTab('register'));
  Object.values(tabs).forEach(t => t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') showTab(t === tabs.login ? 'register' : 'login', true);
  }));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    showTab(b.dataset.go);
    const first = forms[b.dataset.go].querySelector('input');
    if (first) first.focus();
  }));
  if (new URLSearchParams(location.search).get('tab') === 'daftar') showTab('register');

  /* ---------- Tampilkan / sembunyikan kata sandi ---------- */
  document.querySelectorAll('.pass-toggle').forEach(btn => {
    btn.innerHTML = EYE;
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute('aria-pressed', show);
      btn.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    });
  });

  /* ---------- Validasi inline ---------- */
  function setError(id, msg) {
    const input = $(id), out = $('err-' + id);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.classList.toggle('is-invalid', !!msg);
    if (out) out.textContent = msg || '';
    return !msg;
  }
  const rules = {
    loginEmail: () => EMAIL_RE.test($('loginEmail').value.trim()) ? '' : 'Masukkan email yang valid, mis. nama@email.com.',
    loginPass: () => $('loginPass').value ? '' : 'Kata sandi wajib diisi.',
    regName: () => $('regName').value.trim().length >= 2 ? '' : 'Nama minimal 2 karakter.',
    regPhone: () => /^[0-9+\-\s]{8,16}$/.test($('regPhone').value.trim()) ? '' : 'Nomor HP hanya angka, 8–16 digit.',
    regEmail: () => EMAIL_RE.test($('regEmail').value.trim()) ? '' : 'Masukkan email yang valid, mis. nama@email.com.',
    regPass: () => $('regPass').value.length >= 8 ? '' : 'Kata sandi minimal 8 karakter.',
    regPass2: () => $('regPass2').value === $('regPass').value && $('regPass2').value ? '' : 'Kata sandi tidak sama.',
    regAgree: () => $('regAgree').checked ? '' : 'Setujui Syarat & Ketentuan untuk melanjutkan.'
  };
  Object.keys(rules).forEach(id => {
    const el = $(id);
    el.addEventListener('blur', () => { if (id !== 'regAgree') setError(id, rules[id]()); });
    el.addEventListener('input', () => { if (el.classList.contains('is-invalid')) setError(id, rules[id]()); });
  });
  $('regAgree').addEventListener('change', () => { if ($('err-regAgree').textContent) setError('regAgree', rules.regAgree()); });
  $('regPass').addEventListener('input', () => {
    const n = $('regPass').value.length;
    $('passHint').textContent = n >= 8 ? 'Kata sandi cukup panjang.' : `Minimal 8 karakter (${n}/8).`;
    $('passHint').classList.toggle('ok', n >= 8);
  });

  function validate(ids) {
    let firstBad = null;
    ids.forEach(id => { if (!setError(id, rules[id]()) && !firstBad) firstBad = $(id); });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* ---------- Submit ---------- */
  $('formLogin').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(['loginEmail', 'loginPass'])) return;
    const email = $('loginEmail').value.trim();
    localStorage.setItem('fv_user', JSON.stringify({ name: email.split('@')[0], email }));
    toast('Berhasil masuk! Mengalihkan...');
    setTimeout(() => { location.href = 'profil-pelanggan.html'; }, 900);
  });

  $('formRegister').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(['regName', 'regPhone', 'regEmail', 'regPass', 'regPass2', 'regAgree'])) return;
    localStorage.setItem('fv_user', JSON.stringify({ name: $('regName').value.trim(), email: $('regEmail').value.trim() }));
    localStorage.setItem('fv_profile', JSON.stringify({ phone: $('regPhone').value.trim() }));
    toast('Akun berhasil dibuat! Mengalihkan...');
    setTimeout(() => { location.href = 'profil-pelanggan.html'; }, 900);
  });

  $('forgotPass').addEventListener('click', () => toast('Reset kata sandi belum tersedia pada versi demo.', 'error'));
})();
