/* ============================================================
   FILOSOVET — profil.js (Profil, hewan, riwayat, rekam medis, nota)
   Bergantung pada main.js (getUser, getSavedPets, rupiah, toast, escapeHtml)
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; } };
  const fmtDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} ${MONTH_SHORT[m - 1]} ${y}`; };
  const when = b => new Date(`${b.tanggal}T${b.waktu || '00:00'}`);

  const ICONS = {
    cat: '<path d="M5 9V4l4 3h6l4-3v5a7 7 0 0 1-14 0z"/><path d="M9.5 11.5h.01M14.5 11.5h.01"/><path d="M10 15c.6.5 1.4.5 2 0"/>',
    dog: '<path d="M4 9l2-5 4 3h4l4-3 2 5-2 3v3a6 6 0 0 1-12 0v-3z"/><path d="M9.5 12h.01M14.5 12h.01"/><path d="M10 16c.6.5 1.4.5 2 0"/>',
    paw: '<path d="M11 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M12 12c-3 0-5 3-5 5.5 0 1.5 1.2 2.5 2.5 2.5 1 0 1.700-.5 2.500-.5s1.500.5 2.500.5c1.300 0 2.500-1 2.500-2.500C17 15 15 12 12 12z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  };
  const svg = (name, size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const petIcon = sp => sp === 'Kucing' ? 'cat' : sp === 'Anjing' ? 'dog' : 'paw';

  /* ---------- Identitas & Data Diri ---------- */
  const user = getUser();
  function renderIdentity() {
    const av = $('profilAvatar');
    if (user && user.name) {
      av.textContent = user.name.trim().charAt(0).toUpperCase();
      $('profilName').textContent = user.name;
      $('profilEmail').textContent = user.email || '';
      $('profilLoginCta').hidden = true;
      $('profilBadge').hidden = false;
      $('btnLogout').hidden = false;
    } else {
      av.innerHTML = svg('user', 32);
      $('loginNote').hidden = false;
      document.querySelectorAll('#profileForm input, #profileForm textarea, #btnSaveProfile').forEach(el => { el.disabled = true; });
    }
    const prof = read('fv_profile', {});
    $('pName').value = user ? user.name : '';
    $('pEmail').value = user ? (user.email || '') : '';
    $('pPhone').value = prof.phone || '';
    $('pDob').value = prof.dob || '';
    $('pAddr').value = prof.addr || '';
  }

  function fieldError(id, msg) {
    const input = $(id), out = $('err-' + id);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.classList.toggle('is-invalid', !!msg);
    if (out) out.textContent = msg || '';
    return !msg;
  }

  $('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('pName').value.trim(), email = $('pEmail').value.trim(), phone = $('pPhone').value.trim();
    const okName = fieldError('pName', name.length >= 2 ? '' : 'Nama minimal 2 karakter.');
    const okMail = fieldError('pEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Format email belum benar.');
    const okPhone = fieldError('pPhone', !phone || /^[0-9+\-\s]{8,16}$/.test(phone) ? '' : 'Nomor HP hanya angka, 8–16 digit.');
    if (!(okName && okMail && okPhone)) return;
    try { const ids=FVStore.currentCustomerIds(),shared=FVStore.state();shared.customers.filter(c=>ids.includes(c.id)).forEach(c=>Object.assign(c,{nama:name,email,hp:phone}));FVStore.commit({fv_user:{...user,name,email},fv_profile:{phone,dob:$('pDob').value,addr:$('pAddr').value.trim()},[FVStore.key]:shared}); } catch(error){toast(error.message,'error');return;}
    $('profilName').textContent = name;
    $('profilEmail').textContent = email;
    $('profilAvatar').textContent = name.charAt(0).toUpperCase();
    toast('Profil berhasil diperbarui');
  });

  $('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('fv_user');
    toast('Anda telah keluar');
    setTimeout(() => { location.href = 'auth.html'; }, 700);
  });

  /* ---------- Panel / navigasi samping ---------- */
  function showPanel(id) {
    document.querySelectorAll('.prof-panel').forEach(p => { p.hidden = p.id !== id; });
    document.querySelectorAll('.side-link').forEach(a => {
      const on = a.dataset.panel === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('.side-link').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    showPanel(a.dataset.panel);
    history.replaceState(null, '', '#' + a.dataset.panel);
  }));

  /* ---------- Hewan peliharaan ---------- */
  let pets = getSavedPets().map(p => ({ ...p }));
  const vaccineChip = p => {
    if (p.vaksin === 'lengkap') return `<span class="badge badge-green">${escapeHtml(p.vaksinNote || 'Vaksin lengkap')}</span>`;
    return `<span class="badge badge-amber">${escapeHtml(p.vaksinNote || 'Vaksin belum tercatat')}</span>
      <a class="btn btn-outline btn-sm" href="booking.html?layanan=konsultasi&amp;tipe=vaksinasi&amp;hewan=${encodeURIComponent(p.id)}">Booking vaksin</a>`;
  };
  function renderPets() {
    $('petList').innerHTML = pets.map(p => `
      <article class="pet-card">
        <div class="pet-avatar ${p.species === 'Kucing' ? 'is-cat' : p.species === 'Anjing' ? 'is-dog' : ''}">${svg(petIcon(p.species), 30)}</div>
        <div class="pet-info">
          <h4>${escapeHtml(p.name)}</h4>
          <p class="muted">${escapeHtml(p.species)}${p.breed ? ' ' + escapeHtml(p.breed) : ''}${p.weight ? ', ' + String(p.weight).replace('.', ',') + ' kg' : ''}</p>
          <div class="pet-tags">
            ${vaccineChip(p)}
            ${p.steril ? '<span class="badge badge-blue">Steril</span>' : ''}
          </div>
        </div>
      </article>`).join('') || '<p class="muted">Belum ada hewan tersimpan.</p>';
  }
  $('btnAddPet').addEventListener('click', () => {
    const open = $('petForm').hidden;
    $('petForm').hidden = !open;
    $('btnAddPet').setAttribute('aria-expanded', open);
    if (open) $('npName').focus();
  });
  $('btnCancelPet').addEventListener('click', () => { $('petForm').hidden = true; $('btnAddPet').setAttribute('aria-expanded', 'false'); $('petForm').reset(); });
  $('petForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('npName').value.trim(), w = $('npWeight').value;
    const okName = fieldError('npName', name.length >= 2 ? '' : 'Nama hewan minimal 2 karakter.');
    const okW = fieldError('npWeight', w === '' || (+w >= 0.1 && +w <= 100) ? '' : 'Berat harus antara 0,1 dan 100 kg.');
    if (!(okName && okW)) return;
    pets.push({ id: 'p' + Date.now().toString(36), name, species: $('npSpecies').value, breed: $('npBreed').value.trim(), weight: w === '' ? '' : +w, vaksin: 'belum', vaksinNote: 'Vaksin belum tercatat', steril: false });
    try { FVStore.syncPublicPets(pets); } catch(error) { pets.pop(); toast(error.message,'error'); return; }
    $('petForm').reset(); $('petForm').hidden = true; $('btnAddPet').setAttribute('aria-expanded', 'false');
    renderPets();
    renderMedis();
    toast('Hewan ditambahkan');
  });

  /* ---------- Riwayat booking ---------- */
  const SAMPLE_BOOKINGS = [
    { code: 'FV-8K2M1P', layanan: 'Grooming', tipe: 'Grooming Kucing', tanggal: '2026-08-28', waktu: '10:30', hewan: 'Momo', biaya: 120000, status: 'Selesai', sample: true },
    { code: 'FV-7J4N2Q', layanan: 'Konsultasi Dokter Hewan', tipe: 'Vaksinasi', tanggal: '2026-08-15', waktu: '09:30', hewan: 'Bubu', biaya: 180000, status: 'Selesai', sample: true }
  ];
  const STATUS_CLASS = { 'Menunggu Konfirmasi': 'status-menunggu', 'Dikonfirmasi': 'status-konfirmasi', 'Selesai': 'status-selesai', 'Dibatalkan': 'status-batal', 'Kedaluwarsa': 'status-kedaluwarsa' };
  function effectiveStatus(b) {
    const raw = b.status || 'Menunggu Konfirmasi';
    if (raw === 'Diproses') return 'Dikonfirmasi';
    if (raw.startsWith('Menunggu')) return when(b) < new Date() ? 'Kedaluwarsa' : 'Menunggu Konfirmasi';
    return raw;
  }
  const isUpcoming = b => ['Menunggu Konfirmasi', 'Dikonfirmasi'].includes(effectiveStatus(b)) && !b.checkedInAt && when(b) >= new Date();

  function renderBookings() {
    const ids=FVStore.currentCustomerIds();
    const stored = [...read('fv_bookings', []), ...read('fv_admin_bookings', []).filter(b=>ids.includes(b.customerId))];
    const all = [...stored, ...SAMPLE_BOOKINGS].sort((a, b) => when(b) - when(a));
    $('bookingHistoryBody').innerHTML = all.length ? all.map(b => {
      const st = effectiveStatus(b);
      const actions = isUpcoming(b) && !b.sample
        ? `<a class="btn btn-outline btn-sm" href="booking.html?jadwalUlang=${encodeURIComponent(b.code)}">Jadwal ulang</a>
           <button type="button" class="btn btn-danger btn-sm" data-cancel="${escapeHtml(b.code)}">Batalkan</button>`
        : '<span class="muted">—</span>';
      return `<tr>
        <td data-label="Kode"><strong>${escapeHtml(b.code)}</strong>${b.sample ? '<small class="muted"> · Contoh demo</small>' : ''}</td>
        <td data-label="Layanan">${escapeHtml(b.tipe || b.layanan)}</td>
        <td data-label="Jadwal">${fmtDate(b.tanggal)}, ${escapeHtml(b.waktu || '')}</td>
        <td data-label="Hewan">${escapeHtml(b.hewan || '—')}</td>
        <td data-label="Biaya">${rupiah(b.biaya || 0)}</td>
        <td data-label="Status"><span class="status-chip ${STATUS_CLASS[st] || 'status-menunggu'}">${st}</span></td>
        <td data-label="Aksi" class="cell-actions">${actions}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center muted">Belum ada riwayat booking.</td></tr>';
  }
  $('bookingHistoryBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    if (btn.dataset.armed !== '1') {
      // Konfirmasi dua langkah di tempat, tanpa dialog bawaan browser
      btn.dataset.armed = '1';
      btn.textContent = 'Yakin batalkan?';
      setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = 'Batalkan'; } }, 4000);
      return;
    }
    const list = read('fv_bookings', []);
    const item = list.find(b => b.code === btn.dataset.cancel);
    if (item) { if(item.checkedInAt||!['Dikonfirmasi','Menunggu Konfirmasi'].includes(item.status))return toast('Booking sudah diproses dan tidak dapat dibatalkan.','error'); item.status = 'Dibatalkan'; item.cancelReason='Dibatalkan oleh pelanggan'; item.riwayat=[...(item.riwayat||[]),{status:'Dibatalkan',reason:item.cancelReason,at:new Date().toISOString(),by:'Pelanggan'}]; const shared=FVStore.state();shared.stays.filter(s=>s.bookingCode===item.code&&s.status==='Dipesan').forEach(s=>{s.status='Dibatalkan';s.cancelReason=item.cancelReason;});FVStore.commit({fv_bookings:list,[FVStore.key]:shared}); }
    renderBookings();
    toast('Booking dibatalkan');
  });

  /* ---------- Rekam medis (per hewan) ---------- */
  const MEDICAL = [
    { pet: 'Momo', tgl: '2026-08-28', ket: 'Grooming sehat — kondisi kulit normal, berat stabil 3,5 kg.', oleh: 'Rani (Groomer)' },
    { pet: 'Bubu', tgl: '2026-08-15', ket: 'Vaksin rabies dosis kedua. Tidak ada reaksi. Kontrol 1 tahun.', oleh: 'drh. Andini' },
    { pet: 'Bubu', tgl: '2026-07-02', ket: 'Konsultasi kulit — diberikan shampoo anti-jamur, grooming jamur 2x seminggu.', oleh: 'drh. Prasetyo' }
  ];
  let medFilter = 'Semua';
  function renderMedis() {
    const names = ['Semua', ...new Set([...pets.map(p => p.name), ...MEDICAL.map(m => m.pet)])];
    $('medisTabs').innerHTML = names.map(n => `<button type="button" class="cat-chip${n === medFilter ? ' active' : ''}" data-pet="${escapeHtml(n)}" aria-pressed="${n === medFilter}">${escapeHtml(n)}</button>`).join('');
    const state=FVStore.state(),ids=FVStore.currentCustomerIds();
    const live=state.medical.filter(m=>m.status==='Final'&&ids.includes(m.customerId)).map(m=>({pet:state.pets.find(p=>p.id===m.petId)?.nama||'—',tgl:m.examinationDate,oleh:m.doctor,ket:[m.diagnosis,m.procedures,m.followUp,...state.amendments.filter(a=>a.medicalId===m.id).map(a=>'Addendum: '+a.text)].filter(Boolean).join(' · ')}));
    const rows = [...live,...MEDICAL.map(m=>({...m,ket:'[Contoh demo] '+m.ket}))].filter(m => medFilter === 'Semua' || m.pet === medFilter).sort((a, b) => b.tgl.localeCompare(a.tgl));
    $('medisList').innerHTML = rows.length ? rows.map(m => {
      const [y, mo, d] = m.tgl.split('-').map(Number);
      return `<article class="med-item">
        <div class="med-date"><strong>${d}</strong><span>${MONTH_SHORT[mo - 1]} ${y}</span></div>
        <div class="med-body">
          <div class="med-meta"><span class="med-pet">${escapeHtml(m.pet)}</span><span class="muted">oleh ${escapeHtml(m.oleh)}</span></div>
          <p>${escapeHtml(m.ket)}</p>
        </div>
      </article>`;
    }).join('') : `<p class="muted">Belum ada rekam medis untuk ${escapeHtml(medFilter)}.</p>`;
  }
  $('medisTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-pet]');
    if (!b) return;
    medFilter = b.dataset.pet;
    renderMedis();
  });

  /* ---------- Riwayat transaksi & detail nota ---------- */
  const ownIds=FVStore.currentCustomerIds();
  const orders = [...read('fv_orders', []),...read('fv_admin_trx', []).filter(t=>ownIds.includes(t.customerId)).map(t=>({...t,no:t.id,item:t.items.reduce((n,i)=>n+i.qty,0),rincian:t.items,statusBayar:t.status}))];
  function renderOrders() {
    $('orderHistoryBody').innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td data-label="No. Nota"><button type="button" class="nota-link" data-nota="${escapeHtml(o.no)}" aria-label="Lihat detail nota ${escapeHtml(o.no)}">${escapeHtml(o.no)}</button></td>
        <td data-label="Tanggal">${fmtDate(o.tanggal)}</td>
        <td data-label="Item">${o.item}</td>
        <td data-label="Metode">${escapeHtml(o.metode)}</td>
        <td data-label="Total"><strong>${rupiah(o.total)}</strong></td>
      </tr>`).join('') : '<tr><td colspan="5" class="text-center muted">Belum ada transaksi.</td></tr>';
  }

  let notaOpener = null;
  function parseLine(str) { const m = /^(.*) x(\d+)$/.exec(str); return m ? { name: m[1], qty: +m[2], price: null } : { name: str, qty: 1, price: null }; }
  function openNota(no) {
    const o = orders.find(x => x.no === no);
    if (!o) return;
    notaOpener = document.activeElement;
    const lines = o.rincian || (o.produk || []).map(parseLine);
    $('ndTitle').textContent = 'Nota ' + o.no;
    $('ndDate').textContent = `${fmtDate(o.tanggal)} · ${o.metode}`;
    $('ndItems').innerHTML = lines.map(l => `<tr><td>${escapeHtml(l.name)}</td><td>${l.qty}</td><td>${l.price == null ? '—' : rupiah(l.price)}</td><td>${l.price == null ? '—' : rupiah(l.price * l.qty)}</td></tr>`).join('');
    const rows = [];
    if (o.subtotal != null) rows.push(['Subtotal', rupiah(o.subtotal)]);
    if (o.diskon) rows.push([`Diskon${o.kodePromo ? ' ' + o.kodePromo : ''}`, '-' + rupiah(o.diskon)]);
    if (o.ongkir != null) rows.push([`Ongkos kirim${o.pengiriman ? ' (' + o.pengiriman + ')' : ''}`, o.ongkir ? rupiah(o.ongkir) : 'Gratis']);
    rows.push(['Total dibayar', rupiah(o.total), true]);
    $('ndSum').innerHTML = rows.map(r => `<div class="${r[2] ? 'total' : ''}"><dt>${escapeHtml(r[0])}</dt><dd>${r[1]}</dd></div>`).join('');
    $('notaDetail').hidden = false;
    document.body.style.overflow = 'hidden';
    $('ndClose').focus();
  }
  function closeNota() {
    $('notaDetail').hidden = true;
    document.body.style.overflow = '';
    if (notaOpener && document.contains(notaOpener)) notaOpener.focus();
  }
  $('orderHistoryBody').addEventListener('click', e => { const b = e.target.closest('[data-nota]'); if (b) openNota(b.dataset.nota); });
  $('ndClose').addEventListener('click', closeNota);
  $('ndPrint').addEventListener('click', () => window.print());
  $('notaDetail').addEventListener('click', e => { if (e.target === $('notaDetail')) closeNota(); });
  document.addEventListener('keydown', e => {
    if ($('notaDetail').hidden) return;
    if (e.key === 'Escape') return closeNota();
    if (e.key !== 'Tab') return;
    const f = Array.from($('notaDetail').querySelectorAll('button:not(:disabled)'));
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- Init ---------- */
  renderIdentity();
  renderPets();
  renderBookings();
  renderMedis();
  renderOrders();

  const startPanel = location.hash.slice(1);
  showPanel(document.querySelector(`.side-link[data-panel="${startPanel}"]`) ? startPanel : 'panelProfil');
  window.scrollTo(0, 0); // buka dari tautan #panel tanpa melompat melewati header
  const notaParam = new URLSearchParams(location.search).get('nota');
  if (notaParam) { showPanel('panelTransaksi'); openNota(notaParam); }
})();
