/* Hotel, inventory, staff, settings and cashier operational pages. */
AD.hotelForm = (code) => {
  AD.require(PERM.HOTEL);
  const b = AD.bookings.get(code);
  FVStore.require(AD.assigned(b), 'Reservasi ini tidak ditugaskan.');
  const s = FVStore.state(),
    stay = s.stays.find((x) => x.bookingCode === code);
  const info = `<p><strong>${esc(b.hewan)}</strong> · ${esc(b.pelanggan)} · ${esc(b.hp)}</p><p>${fmtDate(b.tanggal)} – ${fmtDate(addDaysISO(b.tanggal, b.durasiHari))} (${b.durasiHari} hari)</p><p class="note-box">Instruksi pemilik: ${esc(b.catatan || '—')}</p>`;
  if (!stay)
    return W.form(
      'Penempatan kandang',
      `${info}${W.select(
        'room',
        'Kandang',
        s.rooms.map((r) => [r.id, r.name]),
      )}`,
      (v) => AD.hotel.reserve(code, v('room')),
      'Pesan kandang',
    );
  const care = s.care.filter((c) => c.stayId === stay.id);
  const rx = s.prescriptions.filter((r) => r.petId === stay.petId && r.status === 'Diserahkan');
  const body = `${info}<p>${esc(stay.roomId)} · ${UI.chip(stay.status)}</p><p>Jadwal pakan: ${esc(stay.feeding)}</p><h3 class="ds-title">Log perawatan</h3>${care.map((c) => `<p><strong>${esc(c.type)}</strong> · ${fmtDateTime(c.timestamp)} · ${esc(c.staff)}<br>${esc(c.note)}</p>`).join('') || '<p class="muted">Belum ada catatan.</p>'}${stay.status === 'Menginap' ? W.select('careType', 'Aktivitas', ['Pakan', 'Air minum', 'Kebersihan', 'Aktivitas', 'Insiden', 'Obat']) + W.text('careNote', 'Catatan makan, minum, kebersihan, perilaku atau insiden') + W.select('careRx', 'Instruksi dokter (wajib untuk obat)', [['', 'Pilih resep yang sudah diserahkan'], ...rx.map((r) => [r.id, r.id])]) + W.select('careProduct', 'Obat sesuai instruksi', [['', 'Pilih obat'], ...rx.flatMap((r) => r.items.map((i) => [String(i.productId), `${i.name} · ${i.dosage} · ${i.frequency} · ${i.duration}`]))]) : ''}`;
  if (stay.status === 'Dipesan')
    return W.form('Check-in hotel', body, () => AD.hotel.checkIn(stay.id), 'Catat check-in');
  if (stay.status === 'Selesai')
    return UI.modal({ title: 'Riwayat penitipan', body, actions: [{ label: 'Tutup' }] });
  W.form(
    'Perawatan harian',
    `${body}<div class="field"><label class="check"><input type="checkbox" id="hotelOut"> Check-out, bebaskan kandang dan kirim tagihan</label></div>`,
    (v, el) => {
      if ($q('#hotelOut', el).checked) AD.hotel.checkOut(stay.id);
      else
        AD.hotel.care(stay.id, {
          type: v('careType'),
          note: v('careNote'),
          prescriptionId: v('careRx'),
          productId: v('careProduct'),
        });
    },
    'Simpan aktivitas',
  );
};
Pages.kandang = {
  title: 'Kandang & Okupansi',
  render(view) {
    const s = FVStore.state();
    W.table(view, 'Delapan kandang bersama. Reservasi ditolak jika rentang tanggal bertumpuk.', s.rooms, [
      { key: 'name', label: 'Kandang', render: (r) => esc(r.name) },
      {
        key: 'status',
        label: 'Okupansi saat ini',
        render: (r) => {
          const stay = s.stays.find((x) => x.roomId === r.id && x.status === 'Menginap');
          return stay
            ? `${UI.chip('Menginap')} ${esc(s.pets.find((p) => p.id === stay.petId)?.nama || '')} ${W.button('Kelola', 'hotel', stay.bookingCode)}`
            : UI.chip('Tersedia');
        },
      },
      {
        key: 'reserved',
        label: 'Penempatan / reservasi',
        render: (r) =>
          s.stays
            .filter((x) => x.roomId === r.id && x.status === 'Dipesan')
            .map((x) => `${esc(x.start)} – ${esc(x.end)} ${W.button('Check-in', 'hotel', x.bookingCode)}`)
            .join('<br>') || '—',
      },
    ]);
  },
};
Pages.perawatan = {
  title: 'Perawatan Harian',
  render(view) {
    const s = FVStore.state();
    W.table(
      view,
      'Catat pakan pagi/sore, air minum, kebersihan dan kondisi setiap hewan. Obat memerlukan instruksi dokter.',
      AD.hotel.active().filter((x) => AD.owns(x)),
      [
        {
          key: 'pet',
          label: 'Hewan / kandang',
          render: (x) => `${esc(s.pets.find((p) => p.id === x.petId)?.nama || '—')} · ${esc(x.roomId)}`,
        },
        { key: 'feeding', label: 'Jadwal pakan', render: (x) => esc(x.feeding) },
        {
          key: 'care',
          label: 'Aktivitas hari ini',
          render: (x) =>
            s.care
              .filter((c) => c.stayId === x.id && c.timestamp.slice(0, 10) === todayISO())
              .map((c) => `${esc(c.type)} · ${esc(c.note)}`)
              .join('<br>') || 'Belum dicatat',
        },
        {
          key: 'actions',
          label: 'Aksi',
          render: (x) => W.button('Catat perawatan / check-out', 'hotel', x.bookingCode),
        },
      ],
    );
  },
};
Pages.mutasi = {
  title: 'Riwayat Stok',
  render(view) {
    AD.require(PERM.STOCK);
    W.table(
      view,
      'Saldo produk ditopang mutasi IN, OUT dan ADJUSTMENT. Saldo awal ditandai sebagai migrasi.',
      FVStore.state().movements.slice().reverse(),
      [
        {
          key: 'time',
          label: 'Waktu / ID',
          render: (m) => `${fmtDateTime(m.timestamp)}<small class="sub">${esc(m.id)}</small>`,
        },
        {
          key: 'product',
          label: 'Produk / batch',
          render: (m) =>
            `${esc(PRODUCTS.find((p) => p.id === m.productId)?.name || m.productId)}<small class="sub">${esc(m.batchId)}</small>`,
        },
        {
          key: 'type',
          label: 'Mutasi',
          render: (m) => `${UI.chip(m.type)} ${m.delta > 0 ? '+' : ''}${m.delta}`,
        },
        {
          key: 'reason',
          label: 'Alasan / referensi',
          render: (m) => `${esc(m.reason)}<small class="sub">${esc(m.source)}</small>`,
        },
        { key: 'staff', label: 'Staff', render: (m) => esc(m.staff) },
      ],
    );
  },
};
Pages.supplier = {
  title: 'Restock & Supplier',
  render(view) {
    AD.require(PERM.STOCK);
    const s = FVStore.state();
    W.table(
      view,
      'Kelola supplier, buat order dan terima stok per batch.',
      AD.stock.orders(),
      [
        { key: 'id', label: 'Order', render: (o) => esc(o.id) },
        { key: 'supplier', label: 'Supplier', render: (o) => esc(o.distributor) },
        {
          key: 'items',
          label: 'Produk',
          render: (o) => o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>'),
        },
        { key: 'status', label: 'Status', render: (o) => UI.chip(o.status) },
        {
          key: 'actions',
          label: 'Aksi',
          render: (o) => (o.status === 'Dipesan' ? W.button('Terima barang', 'receive', o.id) : '—'),
        },
      ],
      W.button('Kelola supplier', 'suppliers') + W.button('Order restock', 'newpo', '', 'primary'),
    );
  },
};
AD.orderForm = () => {
  AD.require(PERM.STOCK);
  W.form(
    'Order restock supplier',
    `${W.select(
      'poSupplier',
      'Supplier',
      FVStore.state().suppliers.map((s) => s.nama),
    )}${W.select(
      'poProduct',
      'Produk',
      PRODUCTS.map((p) => [String(p.id), p.name]),
    )}${W.field('poQty', 'Jumlah', 1, 'number', 'required min="1" step="1"')}${W.field('poBatch', 'Nomor batch', '', 'text', 'required')}${W.field('poExpiry', 'Tanggal kedaluwarsa (obat wajib)', '', 'date')}`,
    (v) => {
      const p = PRODUCTS.find((p) => p.id === +v('poProduct'));
      FVStore.require(p.cat !== 'obat' || v('poExpiry'), 'Obat harus memiliki tanggal kedaluwarsa.');
      AD.stock.placeOrder(v('poSupplier'), [
        { id: p.id, name: p.name, qty: +v('poQty'), batchId: v('poBatch'), expiry: v('poExpiry') },
      ]);
    },
  );
};
Pages.staff = {
  title: 'Staff & Role',
  render(view) {
    AD.require(PERM.STAFF);
    W.table(
      view,
      'Profil staff demo dan peran yang ditugaskan. Identitas aktif dapat dipilih melalui menu Simulasi peran.',
      FVStore.state().staff,
      [
        { key: 'nama', label: 'Staff', render: (s) => esc(s.nama) },
        { key: 'role', label: 'Peran', render: (s) => esc(ROLES[s.role]?.label || s.role) },
        { key: 'active', label: 'Status', render: (s) => UI.chip(s.active === false ? 'Nonaktif' : 'Aktif') },
        { key: 'action', label: 'Aksi', render: (s) => W.button('Edit profil', 'staffedit', s.id) },
      ],
      W.button('Tambah staff', 'staffnew', '', 'primary'),
    );
  },
};
Pages.pengaturan = {
  title: 'Pengaturan & Persetujuan',
  render(view) {
    AD.require(PERM.STAFF);
    const s = FVStore.state();
    W.table(
      view,
      'Persetujuan demo mencatat keputusan saja. Pengembalian dana/penyesuaian invoice tidak dijalankan otomatis; tidak ada uang yang dipindahkan.',
      s.approvals,
      [
        { key: 'sale', label: 'Transaksi', render: (a) => esc(a.saleId) },
        { key: 'reason', label: 'Alasan', render: (a) => esc(a.reason) },
        { key: 'status', label: 'Status', render: (a) => UI.chip(a.status) },
        {
          key: 'actions',
          label: 'Keputusan',
          render: (a) =>
            a.status === 'Menunggu'
              ? W.button('Setujui demo', 'approve', a.id) + W.button('Tolak', 'reject', a.id)
              : esc(a.reviewedBy),
        },
      ],
    );
    view.insertAdjacentHTML(
      'beforeend',
      `<section class="panel work-pad"><h2>Kebijakan workspace</h2><p class="muted">Akses klinis: hanya Dokter penanggung jawab. Admin mengawasi operasi tanpa membuka diagnosis/resep. Kapasitas hotel: ${HOTEL_CAPACITY} kandang. Penyimpanan: localStorage di browser ini. Pembayaran: simulasi.</p><h3 class="ds-title">Log operasional</h3><ul class="log-list">${AD.log
        .all()
        .slice(0, 40)
        .map(
          (l) =>
            `<li><div><p>${esc(l.ringkas)}</p><small class="muted">${esc(l.aktor)} · ${fmtDateTime(l.t)}</small></div></li>`,
        )
        .join('')}</ul></section>`,
    );
  },
};
AD.staffForm = (id) => {
  AD.require(PERM.STAFF);
  const person = FVStore.state().staff.find((s) => s.id === id);
  W.form(
    'Profil staff',
    `${W.field('staffName', 'Nama staff', person?.nama || '', 'text', 'required minlength="2"')}${W.select(
      'staffRole',
      'Peran',
      Object.entries(ROLES).map(([k, r]) => [k, r.label]),
      person?.role,
    )}${W.select(
      'staffActive',
      'Status',
      [
        ['yes', 'Aktif'],
        ['no', 'Nonaktif'],
      ],
      person?.active === false ? 'no' : 'yes',
    )}`,
    (v) => {
      AD.require(PERM.STAFF);
      const s = FVStore.state();
      let p = s.staff.find((p) => p.id === id);
      if (!p) {
        p = { id: FVStore.uid('STAFF') };
        s.staff.push(p);
      }
      FVStore.require(
        !s.staff.some((x) => x.id !== p.id && x.nama === v('staffName').trim() && x.role === v('staffRole')),
        'Nama staff sudah digunakan untuk peran ini.',
      );
      FVStore.require(
        !AD.bookings
          .all()
          .some((b) => b.staffId === p.id && !['Selesai', 'Dibatalkan', 'Tidak Hadir'].includes(b.status)) ||
          (p.role === v('staffRole') && v('staffActive') === 'yes'),
        'Alihkan booking aktif sebelum menonaktifkan atau mengganti peran staff.',
      );
      Object.assign(p, {
        nama: v('staffName').trim(),
        role: v('staffRole'),
        active: v('staffActive') === 'yes',
      });
      FVStore.require(p.nama.length >= 2 && ROLES[p.role], 'Nama/peran tidak valid.');
      FVStore.save(s);
      AD.log.add('Staff', `Memperbarui profil ${p.nama}`);
    },
  );
};
AD.supplierForm = () => {
  AD.require(PERM.STOCK);
  const s = FVStore.state();
  W.form(
    'Supplier',
    `${W.select('supplierId', 'Edit supplier / tambah baru', [['', 'Supplier baru'], ...s.suppliers.map((x) => [x.id, x.nama])])}${W.field('supplierName', 'Nama supplier', '', 'text', 'required')}${W.field('supplierPhone', 'Kontak')}`,
    (v) => {
      AD.require(PERM.STOCK);
      const state = FVStore.state();
      let supplier = state.suppliers.find((x) => x.id === v('supplierId'));
      if (!supplier) {
        supplier = { id: FVStore.uid('SUP') };
        state.suppliers.push(supplier);
      }
      Object.assign(supplier, { nama: v('supplierName').trim(), hp: v('supplierPhone') });
      FVStore.require(supplier.nama, 'Nama supplier wajib diisi.');
      FVStore.save(state);
    },
    'Simpan',
    (el) => {
      $q('#supplierId', el).onchange = () => {
        const x = s.suppliers.find((x) => x.id === $q('#supplierId', el).value);
        $q('#supplierName', el).value = x?.nama || '';
        $q('#supplierPhone', el).value = x?.hp || '';
      };
    },
  );
};
AD.opnameForm = () => {
  AD.require(PERM.STOCK);
  W.form(
    'Stock opname / koreksi batch',
    `${W.select(
      'opProduct',
      'Produk',
      PRODUCTS.map((p) => [String(p.id), `${p.name} — saldo ${p.stock}`]),
    )}${W.field('opBalance', 'Jumlah fisik hasil hitung', 0, 'number', 'required min="0" step="1"')}${W.select('opReason', 'Alasan', ['Stock opname', 'Rusak', 'Kedaluwarsa', 'Koreksi hitung'])}${W.field('opBatch', 'ID batch (opsional; wajib untuk write-off batch tertentu)')}${W.field('opExpiry', 'Kedaluwarsa batch baru', '', 'date')}`,
    (v) => {
      const p = loadProducts().find((p) => p.id === +v('opProduct'));
      AD.stock.adjust(p.id, +v('opBalance') - p.stock, v('opReason'), {
        batchId: v('opBatch') || undefined,
        expiry: v('opExpiry') || undefined,
      });
    },
  );
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-work]');
  if (!b) return;
  W.run(() => {
    switch (b.dataset.work) {
      case 'staffnew':
        return AD.staffForm();
      case 'staffedit':
        return AD.staffForm(b.dataset.id);
      case 'suppliers':
        return AD.supplierForm();
      case 'newpo':
        return AD.orderForm();
      case 'opname':
        return AD.opnameForm();
      case 'receive':
        return UI.confirm({
          title: 'Terima order supplier?',
          message:
            'Pastikan jumlah, nomor batch dan kedaluwarsa barang sesuai order. Penerimaan akan mencatat stok masuk.',
          confirmLabel: 'Terima barang',
        }).then(
          (ok) =>
            ok &&
            W.run(() => {
              AD.stock.receiveOrder(b.dataset.id);
              AD.refresh();
            }),
        );
      case 'approve':
      case 'reject':
        return UI.confirm({
          title: 'Catat keputusan demo?',
          message: 'Keputusan disimpan dalam riwayat persetujuan; pengembalian dana tidak diproses otomatis.',
          confirmLabel: 'Simpan keputusan',
        }).then(
          (ok) =>
            ok &&
            W.run(() => {
              AD.billing.approve(b.dataset.id, b.dataset.work === 'approve');
              AD.refresh();
            }),
        );
    }
  });
});
const stockRender = Pages.stok.render;
Pages.stok.render = function (view, params) {
  stockRender.call(Pages.stok, view, params);
  $q('.bar-right', view).insertAdjacentHTML('beforeend', W.button('Stock opname / batch', 'opname'));
  const s = FVStore.state();
  const pending = AD.trx
    .all()
    .filter(
      (t) =>
        t.status === 'Lunas' &&
        t.items.some(
          (i) =>
            i.prescriptionId &&
            s.prescriptions.some((r) => r.id === i.prescriptionId && r.status === 'Diterbitkan'),
        ),
    );
  view.insertAdjacentHTML(
    'beforeend',
    `<section class="panel work-pad"><h2>Penyerahan obat</h2><p class="muted">Obat resep menunggu penyerahan setelah pembayaran kasir.</p>${pending.length ? pending.map((t) => `<p>${esc(t.pelanggan)} · ${esc(t.id)} ${W.button('Serahkan sesuai resep', 'dispense', t.id)}</p>`).join('') : '<p class="muted">Tidak ada resep dibayar yang menunggu penyerahan.</p>'}<h3 class="ds-title">Batch tersedia</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Produk</th><th>Batch</th><th>Sisa</th><th>Kedaluwarsa</th></tr></thead><tbody>${s.batches
      .filter((b) => b.quantity > 0)
      .map(
        (b) =>
          `<tr><td>${esc(PRODUCTS.find((p) => p.id === b.productId)?.name || b.productId)}</td><td>${esc(b.id)}</td><td>${b.quantity}</td><td>${esc(b.expiry || '—')} ${W.button('Koreksi batch', 'batchedit', b.id)}</td></tr>`,
      )
      .join('')}</tbody></table></div></section>`,
  );
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-work="invoiceitems"]');
  if (!b) return;
  W.run(() =>
    W.form(
      'Produk tambahan invoice',
      `${W.select(
        'invoiceProduct',
        'Produk',
        PRODUCTS.filter((p) => p.aktif !== false && !p.resep).map((p) => [
          String(p.id),
          p.name + ' — ' + rp(p.price),
        ]),
      )}${W.field('invoiceQty', 'Jumlah', 1, 'number', 'required min="1" step="1"')}`,
      (v) => AD.billing.addItems(b.dataset.id, [{ id: +v('invoiceProduct'), qty: +v('invoiceQty') }]),
    ),
  );
});

document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-work="batchedit"]');
  if (!button) return;
  W.run(() => {
    AD.require(PERM.STOCK);
    const b = FVStore.state().batches.find((b) => b.id === button.dataset.id);
    W.form(
      'Koreksi metadata batch',
      `${W.field('batchLabel', 'Label batch', b.label, 'text', 'required')}${W.field('batchExpiry', 'Tanggal kedaluwarsa', b.expiry, 'date')}${W.text('batchReason', 'Alasan koreksi (wajib)')}`,
      (v) => AD.stock.updateBatch(b.id, v('batchExpiry'), v('batchLabel'), v('batchReason')),
    );
  });
});
