/* Shared operational rendering and form event boundary. Reuses incumbent UI components. */
const W = {
  button: (label, action, id = '', kind = 'outline') =>
    `<button type="button" class="btn btn-${kind} btn-sm" data-work="${action}" data-id="${esc(id)}">${esc(label)}</button>`,
  select: (id, label, options, value = '') =>
    `<div class="field"><label for="${id}">${esc(label)}</label><select id="${id}">${options
      .map((o) => {
        const v = Array.isArray(o) ? o[0] : o,
          l = Array.isArray(o) ? o[1] : o;
        return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`;
      })
      .join('')}</select></div>`,
  text: (id, label, value = '') =>
    `<div class="field"><label for="${id}">${esc(label)}</label><textarea id="${id}" rows="3">${esc(value)}</textarea></div>`,
  field: (id, label, value = '', type = 'text', attrs = '') => UI.field({ id, label, value, type, attrs }),
  run(fn) {
    try {
      return fn();
    } catch (error) {
      UI.toast(error.message, 'error');
    }
  },
  form(title, body, save, label = 'Simpan', onOpen) {
    return UI.modal({
      title,
      size: 'lg',
      body: `<form class="work-form">${body}<p class="field-error work-error" role="alert"></p></form>`,
      actions: [
        { label: 'Batal', kind: 'outline' },
        {
          label,
          kind: 'primary',
          onClick: (close, el) => {
            try {
              if (!$q('form', el).reportValidity()) return;
              save((id) => $q('#' + id, el)?.value, el);
              close();
              AD.refresh();
              UI.toast('Data tersimpan');
            } catch (error) {
              $q('.work-error', el).textContent = error.message;
            }
          },
        },
      ],
      onOpen: (el) => {
        $q('form', el).onsubmit = (e) => e.preventDefault();
        onOpen?.(el);
      },
    });
  },
  table(view, title, rows, columns, toolbar = '') {
    view.innerHTML = `<div class="page-bar"><p class="muted">${esc(title)}</p><div class="bar-right">${toolbar}</div></div><section class="panel"><div class="filters"><div class="search-field"><label for="workSearch" class="sr-only">Cari dalam daftar</label>${ico('search', 16)}<input type="search" id="workSearch" placeholder="Cari dalam daftar…"></div></div><div id="workTable"></div></section>`;
    const draw = () => {
      const q = $q('#workSearch', view).value.toLowerCase().trim();
      UI.table($q('#workTable', view), {
        id: 'work-' + AD.current,
        rows: rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q)),
        pageSize: 8,
        columns,
        empty: { title: 'Belum ada data', msg: 'Data yang sesuai akan muncul setelah aktivitas dicatat.' },
      });
    };
    $q('#workSearch', view).oninput = () => {
      UI.resetPage('work-' + AD.current);
      draw();
    };
    draw();
  },
  bookings(view, kind, history = false, mode = '') {
    const rows = AD.bookings
      .all()
      .filter(
        (b) =>
          (mode !== 'today' || b.tanggal === todayISO()) &&
          (mode !== 'active' || !!b.checkedInAt) &&
          (kind ? b.svcKey === kind : true) &&
          AD.scope(b) &&
          (history
            ? ['Selesai', 'Dibatalkan'].includes(b.status)
            : !['Selesai', 'Dibatalkan'].includes(b.status)),
      )
      .sort((a, b) => (a.tanggal + a.waktu).localeCompare(b.tanggal + b.waktu));
    W.table(
      view,
      history ? 'Riwayat layanan tersimpan' : 'Antrean dan jadwal layanan • hanya penugasan yang relevan',
      rows,
      [
        { key: 'pet', label: 'Pelanggan & hewan', render: AD.nameCell },
        { key: 'schedule', label: 'Jadwal', render: (b) => `${fmtDate(b.tanggal)} · ${esc(b.waktu)}` },
        {
          key: 'type',
          label: 'Layanan / petugas',
          render: (b) => `${esc(b.tipe)}<small class="sub">${esc(b.petugas)}</small>`,
        },
        {
          key: 'status',
          label: 'Booking / layanan',
          render: (b) =>
            `${UI.chip(b.status)}<small class="sub">${esc(b.serviceProgress || 'Belum check-in')}</small>`,
        },
        {
          key: 'action',
          label: 'Aksi',
          render: (b) => {
            if (kind === 'konsultasi') return W.button('Buka pasien', 'clinical', b.code);
            if (kind === 'grooming') return W.button('Detail grooming', 'groom', b.code);
            if (kind === 'hotel') return W.button('Kelola penitipan', 'hotel', b.code);
            return (
              W.button('Detail', 'booking', b.code) +
              (b.status === 'Dikonfirmasi' && !b.checkedInAt
                ? W.button('Verifikasi & check-in', 'checkin', b.code)
                : '') +
              (!b.checkedInAt && ['Dikonfirmasi', 'Menunggu Konfirmasi'].includes(b.status)
                ? W.button('Jadwal / petugas', 'schedule', b.code)
                : '')
            );
          },
        },
      ],
      !kind ? W.button('Booking manual', 'manual', '', 'primary') : '',
    );
  },
};
AD.openTrxOriginal = AD.openTrx;
AD.openTrx = (id) => {
  AD.require(PERM.PAY);
  AD.openTrxOriginal(id);
};
AD.exportOriginal = AD.exportModal;
AD.exportModal = () => {
  AD.require(PERM.EXPORT);
  AD.exportOriginal();
};
AD.paymentForm = (id) => {
  AD.require(PERM.PAY);
  const t = AD.trx.get(id);
  FVStore.require(t, 'Invoice tidak ditemukan.');
  W.form(
    'Pembayaran simulasi',
    `<p><strong>${esc(id)}</strong> · ${rp(t.total)}</p><p class="muted">Pencatatan lokal; tidak ada transfer uang atau konfirmasi bank.</p>${W.select(
      'payMethod',
      'Metode bayar',
      PAY_METHODS.filter((m) => !/COD/.test(m)),
    )}`,
    (v) => AD.billing.pay(id, v('payMethod')),
    'Catat pembayaran',
  );
};
AD.registrationForm = (customerId, petId) => {
  const s = FVStore.state(),
    p = s.pets.find((p) => p.id === petId),
    c = s.customers.find((c) => c.id === customerId);
  W.form(
    petId ? 'Edit hewan' : customerId ? 'Edit pelanggan' : 'Daftarkan pelanggan & hewan',
    `${W.field('cuName', 'Nama pelanggan', c?.nama || '', 'text', 'required minlength="2"')}${W.field('cuPhone', 'Nomor HP', c?.hp || '', 'tel', 'required')}${W.field('cuEmail', 'Email (opsional)', c?.email || '', 'email')}${!customerId || petId ? W.field('petName', 'Nama hewan', p?.nama || '', 'text', 'required') + W.select('petSpecies', 'Jenis hewan', ['Kucing', 'Anjing', 'Kelinci', 'Hewan lainnya'], p?.spesie) + W.field('petBreed', 'Ras', p?.ras || '') : ''}`,
    (v) => {
      const c = AD.ops.customer({ id: customerId, nama: v('cuName'), hp: v('cuPhone'), email: v('cuEmail') });
      if (!customerId || petId)
        AD.ops.pet({
          id: petId,
          customerId: c.id,
          nama: v('petName'),
          spesie: v('petSpecies'),
          ras: v('petBreed'),
        });
    },
  );
};
Pages.pelanggan = {
  title: 'Pelanggan & Hewan',
  render(view) {
    const s = FVStore.state();
    W.table(
      view,
      'Satu pelanggan dapat memiliki beberapa hewan. Keluhan awal dicatat melalui booking.',
      s.customers,
      [
        { key: 'nama', label: 'Nama', render: (c) => esc(c.nama) },
        { key: 'hp', label: 'Kontak', render: (c) => esc(c.hp) },
        {
          key: 'pets',
          label: 'Hewan',
          render: (c) =>
            s.pets
              .filter((p) => p.customerId === c.id)
              .map((p) => `${esc(p.nama)} (${esc(p.spesie)}) ${W.button('Edit', 'petedit', p.id)}`)
              .join('<br>') || 'Belum ada hewan',
        },
        {
          key: 'actions',
          label: 'Aksi',
          render: (c) =>
            W.button('Edit pelanggan', 'customeredit', c.id) + W.button('Tambah hewan', 'petnew', c.id),
        },
      ],
      W.button('Daftar pelanggan & hewan', 'register', '', 'primary'),
    );
  },
};
Pages.antrean = { title: 'Antrean / Check-in', render: (view) => W.bookings(view) };
Pages.pasien = { title: 'Pasien Hari Ini', render: (view) => W.bookings(view, 'konsultasi', false, 'today') };
Pages.jadwal = { title: 'Jadwal Konsultasi', render: (view) => W.bookings(view, 'konsultasi') };
Pages.grooming = { title: 'Jadwal Grooming', render: (view) => W.bookings(view, 'grooming') };
Pages.proses = { title: 'Proses Grooming', render: (view) => W.bookings(view, 'grooming', false, 'active') };
Pages.riwayatgrooming = { title: 'Riwayat Grooming', render: (view) => W.bookings(view, 'grooming', true) };
Pages.reservasi = { title: 'Reservasi Hotel', render: (view) => W.bookings(view, 'hotel') };
Pages.riwayathotel = { title: 'Riwayat Penitipan', render: (view) => W.bookings(view, 'hotel', true) };
AD.scheduleForm = (code) => {
  const b = AD.bookings.get(code);
  FVStore.require(b, 'Booking tidak ditemukan.');
  W.form(
    'Jadwal & penugasan',
    `${W.field('newDate', 'Tanggal', b.tanggal, 'date', 'required')}${W.select('newTime', 'Jam', SERVICES[b.svcKey].slots, b.waktu)}${W.select('newStaff', 'Petugas', AD.serviceStaff(b.svcKey), b.petugas)}${W.text('complaint', 'Keluhan awal pelanggan (bukan diagnosis)', b.catatan)}`,
    (v) =>
      AD.ops.schedule(code, {
        tanggal: v('newDate'),
        waktu: v('newTime'),
        petugas: v('newStaff'),
        catatan: v('complaint'),
      }),
  );
};
AD.groomForm = (code) => {
  AD.require(PERM.GROOM);
  const b = AD.bookings.get(code);
  FVStore.require(AD.assigned(b), 'Grooming ini tidak ditugaskan.');
  const g = FVStore.state().grooming.find((g) => g.bookingCode === code);
  if (['Selesai', 'Dibatalkan'].includes(b.status))
    return UI.modal({
      title: 'Riwayat grooming — ' + b.hewan,
      body: `<p>${esc(b.pelanggan)} · ${esc(b.tipe)} · ${esc(b.status)}</p><p>${esc(g?.notes || 'Tidak ada catatan grooming.')}</p>${g?.history.map((h) => `<p>${fmtDateTime(h.at)} · ${esc(h.progress)} · ${esc(h.notes)}</p>`).join('') || ''}`,
      actions: [{ label: 'Tutup' }],
    });
  W.form(
    'Catatan grooming',
    `<p><strong>${esc(b.hewan)}</strong> · ${esc(b.pelanggan)} · ${esc(b.spesie)} · ${esc(b.hp)}</p><p class="note-box">Instruksi: ${esc(b.catatan || 'Tidak ada instruksi khusus.')}</p><p class="muted">Catat kondisi yang terlihat; diagnosis dan resep ditangani dokter.</p>${W.select('gProgress', 'Progres', ['Dalam Proses', 'Selesai'], g?.progress)}${W.text('gNotes', 'Layanan dilakukan, kondisi teramati & catatan', g?.notes || '')}<h3 class="ds-title">Riwayat grooming hewan</h3>${FVStore.state()
      .grooming.filter((x) => x.petId === b.petId)
      .map((x) => `<p>${esc(x.progress)} · ${esc(x.notes)}</p>`)
      .join('')}`,
    (v) => AD.ops.groom(code, v('gProgress'), v('gNotes')),
  );
};
// Role changes close all outstanding forms so previously authorized dialogs cannot survive a switch.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-work]');
  if (!b) return;
  W.run(() => {
    const id = b.dataset.id;
    switch (b.dataset.work) {
      case 'manual':
        return AD.manualBooking();
      case 'booking':
        return AD.openBooking(id);
      case 'register':
        return AD.registrationForm();
      case 'customeredit':
        return AD.registrationForm(id);
      case 'petedit': {
        const p = FVStore.state().pets.find((p) => p.id === id);
        return AD.registrationForm(p.customerId, id);
      }
      case 'petnew':
        return W.form(
          'Tambah hewan',
          `${W.field('newPet', 'Nama hewan', '', 'text', 'required')}${W.select('newSpecies', 'Jenis hewan', ['Kucing', 'Anjing', 'Kelinci', 'Hewan lainnya'])}${W.field('newBreed', 'Ras')}`,
          (v) =>
            AD.ops.pet({ customerId: id, nama: v('newPet'), spesie: v('newSpecies'), ras: v('newBreed') }),
        );
      case 'schedule':
        return AD.scheduleForm(id);
      case 'checkin': {
        const bk = AD.bookings.get(id);
        return UI.confirm({
          title: 'Verifikasi pelanggan & hewan',
          message: `Pastikan pemilik <strong>${esc(bk.pelanggan)}</strong>, HP ${esc(bk.hp)}, membawa <strong>${esc(bk.hewan)}</strong> (${esc(bk.spesie)}). Keluhan: ${esc(bk.catatan || '—')}`,
          confirmLabel: 'Identitas sesuai, check-in',
        }).then(
          (ok) =>
            ok &&
            W.run(() => {
              AD.ops.checkIn(id);
              AD.refresh();
              UI.toast('Check-in tercatat');
            }),
        );
      }
      case 'clinical':
        return AD.clinicalForm(id);
      case 'groom':
        return AD.groomForm(id);
      case 'hotel':
        return AD.hotelForm(id);
      case 'pay':
        return AD.paymentForm(id);
      case 'receipt':
        return AD.openTrx(id);
      case 'dispense':
        return UI.confirm({
          title: 'Serahkan obat?',
          message: AD.dispensingSummary(id),
          confirmLabel: 'Catat penyerahan',
        }).then(
          (ok) =>
            ok &&
            W.run(() => {
              AD.billing.dispense(id);
              AD.refresh();
            }),
        );
      case 'reverse':
        return W.form(
          'Permintaan koreksi / pengembalian',
          W.text('why', 'Alasan dan jumlah yang diminta'),
          (v) => AD.billing.requestAdjustment(id, v('why')),
          'Kirim ke Admin',
        );
    }
  });
});
AD.dispensingSummary = (id) => {
  AD.require(PERM.STOCK);
  const t = AD.trx.get(id),
    s = FVStore.state();
  FVStore.require(t, 'Invoice tidak ditemukan.');
  return `<p>Verifikasi obat dan aturan pakai sebelum penyerahan. Stok batch berkurang setelah konfirmasi.</p><ul>${[
    ...new Set(t.items.map((i) => i.prescriptionId).filter(Boolean)),
  ]
    .map((rxId) => {
      const rx = s.prescriptions.find((r) => r.id === rxId);
      return rx.items
        .map(
          (i) =>
            `<li><strong>${esc(i.name)} × ${i.quantity}</strong><p>${esc(i.dosage)} · ${esc(i.route)} · ${esc(i.frequency)} · ${esc(i.duration)}</p><p>${esc(i.instructions || 'Tanpa instruksi tambahan')}</p><small>${esc(rx.doctor)} · ${esc(rx.id)}</small></li>`,
        )
        .join('');
    })
    .join('')}</ul>`;
};
