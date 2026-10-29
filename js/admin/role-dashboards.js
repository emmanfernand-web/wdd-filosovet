/* Seven separate dashboard compositions from live operational records. */
const adminDashboardRender = Pages.dashboard.render;
const roleKpis = (items) =>
  `<section class="stat-grid" aria-label="Ringkasan operasional">${items.map(([label, value]) => `<div class="stat stat-card"><span class="stat-label">${esc(label)}</span><strong class="stat-value">${typeof value === 'number' ? value : esc(value)}</strong></div>`).join('')}</section>`;
Pages.dashboard.render = function (view) {
  const role = AD.role(),
    s = FVStore.state(),
    today = todayISO(),
    bookings = AD.bookings.all(),
    assigned = bookings.filter(AD.assigned),
    daily = assigned.filter((b) => b.tanggal === today),
    trx = AD.trx.all(),
    paid = trx.filter((t) => t.status === 'Lunas'),
    pending = trx.filter((t) => t.status === 'Menunggu'),
    active = PRODUCTS.filter((p) => p.aktif !== false);
  const counts = (list) => [
    ['Menunggu', list.filter((b) => b.checkedInAt && b.status === 'Dikonfirmasi').length],
    ['Dalam proses', list.filter((b) => b.status === 'Diproses').length],
    ['Selesai', list.filter((b) => b.status === 'Selesai').length],
  ];
  if (role === 'admin') {
    adminDashboardRender.call(Pages.dashboard, view);
    const month = paid
      .filter((t) => t.tanggal.slice(0, 7) === today.slice(0, 7))
      .reduce((n, t) => n + t.total, 0);
    view.insertAdjacentHTML(
      'afterbegin',
      roleKpis([
        ['Pendapatan bulan ini', rp(month)],
        ['Tagihan belum dibayar', pending.length],
        ['Obat mendekati kedaluwarsa', active.filter((p) => p.cat === 'obat' && AD.stock.expiry(p)).length],
        ['Persetujuan menunggu', s.approvals.filter((a) => a.status === 'Menunggu').length],
      ]),
    );
    view.insertAdjacentHTML(
      'beforeend',
      `<section class="panel"><div class="panel-head"><h2>Transaksi Terbaru</h2></div><div class="work-pad">${trx
        .slice(0, 6)
        .map(
          (t) =>
            `<p>${esc(t.pelanggan)} · ${rp(t.total)} ${UI.chip(t.status)} ${W.button('Nota', 'receipt', t.id)}</p>`,
        )
        .join('')}</div></section>`,
    );
    return;
  }
  let kpis = [],
    headline = '',
    body = '';
  if (role === 'kasir') {
    const daily = trx.filter((t) => t.tanggal.slice(0, 10) === today);
    kpis = [
      ['Transaksi hari ini', daily.length],
      ['Pendapatan terkumpul hari ini', rp(AD.revenueOn(trx, today))],
      ['Menunggu pembayaran', pending.length],
      ['Pembayaran selesai hari ini', daily.filter((t) => t.status === 'Lunas').length],
    ];
    headline = 'Pembayaran & penjualan hari ini';
    body = `<section class="panel work-pad"><h2>Prioritas pembayaran</h2>${
      pending
        .slice(0, 8)
        .map((t) => `<p>${esc(t.pelanggan)} · ${rp(t.total)} ${W.button('Bayar simulasi', 'pay', t.id)}</p>`)
        .join('') || '<p class="muted">Semua tagihan telah dibayar.</p>'
    }<button class="btn btn-primary" type="button" data-go="pos">Buka Kasir / POS</button></section><section class="panel work-pad"><h2>Metode pembayaran hari ini</h2>${[...new Set(daily.map((t) => t.metode))].map((m) => `<p>${esc(m)}: ${rp(daily.filter((t) => t.status === 'Lunas' && t.metode === m).reduce((n, t) => n + t.total, 0))}</p>`).join('') || '<p class="muted">Belum ada pembayaran.</p>'}<h3 class="ds-title">Transaksi terbaru</h3>${trx
      .slice(0, 6)
      .map((t) => `<p>${esc(t.pelanggan)} · ${rp(t.total)} ${W.button('Nota', 'receipt', t.id)}</p>`)
      .join('')}</section>`;
  } else if (role === 'inventory') {
    kpis = [
      ['Produk aktif', active.length],
      ['Stok menipis', active.filter((p) => p.stock > 0 && p.stock < p.min).length],
      ['Stok habis', active.filter((p) => p.stock === 0).length],
      [
        'Mendekati kedaluwarsa',
        s.batches.filter((b) => b.quantity && b.expiry && b.expiry <= addDaysISO(today, 60)).length,
      ],
      ['Order masuk', AD.stock.orders().filter((o) => o.status === 'Dipesan').length],
    ];
    headline = 'Prioritas stok & penerimaan';
    body = `<section class="panel work-pad"><h2>Perlu perhatian</h2>${AD.stock
      .needRestock()
      .map((p) => `<p>${esc(p.name)} · Stok ${p.stock} ${UI.stockChip(p)}</p>`)
      .join(
        '',
      )}<button class="btn btn-primary" data-go="stok" type="button">Kelola stok & penyerahan obat</button> <button class="btn btn-outline" data-go="supplier" type="button">Restock & Supplier</button></section><section class="panel work-pad"><h2>Mutasi terbaru</h2>${s.movements
      .slice(-8)
      .reverse()
      .map(
        (m) =>
          `<p>${esc(PRODUCTS.find((p) => p.id === m.productId)?.name || m.productId)} · ${m.delta > 0 ? '+' : ''}${m.delta}<small class="sub">${esc(m.reason)} · ${esc(m.staff)}</small></p>`,
      )
      .join('')}</section>`;
  } else if (role === 'resepsionis') {
    const d = bookings.filter((b) => b.tanggal === today);
    kpis = [
      ['Booking hari ini', d.length],
      ['Menunggu konfirmasi', d.filter((b) => b.status === 'Menunggu Konfirmasi').length],
      ['Sudah check-in', d.filter((b) => b.checkedInAt).length],
      ['Selesai', d.filter((b) => b.status === 'Selesai').length],
      ['Dibatalkan', d.filter((b) => b.status === 'Dibatalkan').length],
    ];
    headline = 'Kedatangan & jadwal layanan';
  } else if (role === 'dokter') {
    kpis = [
      ['Konsultasi hari ini', daily.length],
      ...counts(daily),
      ['Draft medis', s.medical.filter((m) => AD.owns(m, 'doctor') && m.status === 'Draft').length],
    ];
    headline = 'Pasien & tindak lanjut dokter';
    body = `<section class="panel work-pad"><h2>Rekam medis terbaru</h2>${
      s.medical
        .filter((m) => AD.owns(m, 'doctor'))
        .slice(-5)
        .reverse()
        .map(
          (m) =>
            `<p>${esc(s.pets.find((p) => p.id === m.petId)?.nama || '—')} · ${esc(m.status)} ${W.button('Buka', 'clinical', m.bookingCode)}</p>`,
        )
        .join('') || '<p class="muted">Mulai pemeriksaan dari antrean pasien yang sudah check-in.</p>'
    }</section>`;
  } else if (role === 'groomer') {
    kpis = [
      ['Grooming hari ini', daily.length],
      ...counts(daily),
      [
        'Jadwal mendatang',
        assigned.filter((b) => b.tanggal > today && !['Selesai', 'Dibatalkan'].includes(b.status)).length,
      ],
    ];
    headline = 'Antrean grooming & pekerjaan aktif';
  } else {
    const stays = s.stays.filter((x) => AD.owns(x));
    const live = AD.hotel.active();
    kpis = [
      ['Hewan menginap', live.length],
      ['Kandang terisi', new Set(live.map((x) => x.roomId)).size],
      ['Kandang tersedia', HOTEL_CAPACITY - new Set(live.map((x) => x.roomId)).size],
      ['Check-in hari ini', stays.filter((x) => x.checkedInAt?.slice(0, 10) === today).length],
      ['Check-out hari ini', stays.filter((x) => x.checkedOutAt?.slice(0, 10) === today).length],
      [
        'Perlu perhatian',
        new Set(
          s.care
            .filter((c) => c.type === 'Insiden' && c.timestamp.slice(0, 10) === today)
            .map((c) => c.stayId),
        ).size,
      ],
    ];
    headline = 'Penitipan & perawatan harian';
    body = `<section class="panel work-pad"><h2>Tugas perawatan hari ini</h2>${
      live
        .filter((x) => AD.owns(x))
        .map((x) => {
          const done = s.care.filter((c) => c.stayId === x.id && c.timestamp.slice(0, 10) === today);
          return `<p>${esc(s.pets.find((p) => p.id === x.petId)?.nama || '—')} · ${esc(x.roomId)}<small class="sub">Pakan pagi/sore, air minum, kebersihan · ${done.length} aktivitas tercatat</small>${W.button('Catat aktivitas', 'hotel', x.bookingCode)}</p>`;
        })
        .join('') || '<p class="muted">Belum ada hewan menginap.</p>'
    }</section>`;
  }
  view.innerHTML = `<div class="page-bar"><p class="muted">${esc(headline)} · ${esc(AD.actor())}</p></div>${roleKpis(kpis)}<div class="work-split">${body}</div><section class="panel"><div class="panel-head"><h2>${role === 'resepsionis' ? 'Jadwal harian & mendatang' : 'Jadwal penugasan'}</h2></div><div id="roleQueue"></div></section><section class="panel work-pad"><h2>Aktivitas peran</h2>${
    AD.log
      .all()
      .filter((l) => l.aktor === AD.roleLabel())
      .slice(0, 6)
      .map((l) => `<p>${esc(l.ringkas)}<small class="sub">${fmtDateTime(l.t)}</small></p>`)
      .join('') || '<p class="muted">Belum ada aktivitas peran ini.</p>'
  }</section>`;
  const rows = (role === 'resepsionis' ? bookings : assigned)
    .filter((b) => b.tanggal >= today && !['Selesai', 'Dibatalkan'].includes(b.status))
    .sort((a, b) => (a.tanggal + a.waktu).localeCompare(b.tanggal + b.waktu));
  if (['kasir', 'inventory'].includes(role))
    $q('#roleQueue', view).innerHTML =
      '<p class="panel-note muted">Gunakan navigasi untuk melanjutkan pekerjaan harian.</p>';
  else
    UI.table($q('#roleQueue', view), {
      id: 'role-queue',
      rows,
      pageSize: 8,
      empty: {
        title: 'Belum ada penugasan',
        msg: 'Booking yang ditugaskan kepada staff aktif akan tampil di sini.',
      },
      columns: [
        { key: 'pet', label: 'Pelanggan & hewan', render: AD.nameCell },
        {
          key: 'date',
          label: 'Jadwal / layanan',
          render: (b) => `${fmtDate(b.tanggal)} ${esc(b.waktu)}<small class="sub">${esc(b.tipe)}</small>`,
        },
        {
          key: 'status',
          label: 'Status',
          render: (b) =>
            `${UI.chip(b.status)}<small class="sub">${esc(b.serviceProgress || 'Belum check-in')}</small>`,
        },
        {
          key: 'actions',
          label: 'Aksi',
          render: (b) =>
            W.button(
              'Buka',
              role === 'dokter'
                ? 'clinical'
                : role === 'groomer'
                  ? 'groom'
                  : role === 'hotel'
                    ? 'hotel'
                    : 'booking',
              b.code,
            ) +
            (role === 'resepsionis' && b.status === 'Dikonfirmasi' && !b.checkedInAt
              ? W.button('Check-in', 'checkin', b.code)
              : ''),
        },
      ],
    });
};
const originalNotifications = AD.notifs.items;
AD.notifs.items = () => {
  let items = originalNotifications().filter((n) => AD.can(n.go[0]));
  const role = AD.role(),
    readIds = read('fv_admin_notif_read', []);
  if (['dokter', 'groomer', 'hotel'].includes(role)) {
    const page = role === 'dokter' ? 'pasien' : role === 'groomer' ? 'grooming' : 'reservasi';
    items = AD.bookings
      .all()
      .filter(
        (b) => AD.assigned(b) && !['Selesai', 'Dibatalkan'].includes(b.status) && b.tanggal >= todayISO(),
      )
      .slice(0, 8)
      .map((b) => ({
        key: `${role}:${b.code}:${b.status}:${b.checkedInAt || ''}`,
        kind: 'booking',
        title: `${b.hewan} · ${b.checkedInAt ? 'Sudah check-in' : 'Jadwal mendatang'}`,
        desc: `${fmtDate(b.tanggal)} ${b.waktu}`,
        go: [page, {}],
      }));
  }
  if (AD.allowed(PERM.PAY))
    AD.trx
      .all()
      .filter((t) => t.status === 'Menunggu')
      .slice(0, 6)
      .forEach((t) =>
        items.push({
          key: 'pay:' + t.id,
          kind: 'booking',
          title: 'Pembayaran menunggu',
          desc: `${t.pelanggan} · ${rp(t.total)}`,
          go: [AD.can('pembayaran') ? 'pembayaran' : 'transaksi', {}],
        }),
      );
  return items.map((n) => ({ ...n, unread: !readIds.includes(n.key) }));
};
