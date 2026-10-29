/* Invoices and payments are independent of service progress and dispensing. */
AD.billing = {
  invoiceChanges(s, b, extra, changes) {
    const list = FVStore.get('fv_admin_trx', []);
    if (AD.trx.all().some((t) => t.ref === b.code)) return;
    const items = [{ name: b.layanan + ': ' + b.tipe, qty: 1, price: b.biaya }, ...extra];
    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
    const t = {
      id: FVStore.uid('TRX'),
      tanggal: FVStore.stamp(),
      pelanggan: b.pelanggan,
      customerId: b.customerId,
      petId: b.petId,
      tipe: 'Layanan',
      deskripsi: items.map((i) => i.name).join(', '),
      items,
      subtotal,
      diskon: 0,
      ongkir: 0,
      total: subtotal,
      metode: 'Belum dipilih',
      status: 'Menunggu',
      sumber: 'Kasir',
      ref: b.code,
      simulation: true,
    };
    list.unshift(t);
    changes.fv_admin_trx = list;
    const key = b._src === 'public' ? 'fv_bookings' : 'fv_admin_bookings';
    if (!changes[key]) changes[key] = FVStore.get(key, []);
    const rec = changes[key].find((o) => o.code === b.code);
    if (rec) rec.trxId = t.id;
  },
  pay(id, method) {
    AD.authorize('sale', ACTIONS.COMPLETE);
    AD.require(PERM.PAY);
    FVStore.require(PAY_METHODS.includes(method), 'Metode pembayaran tidak valid.');
    const t = AD.trx.get(id);
    FVStore.require(t, 'Invoice tidak ditemukan.');
    if (t.status === 'Lunas') return t;
    FVStore.require(
      t.status === 'Menunggu' &&
        Number.isFinite(t.total) &&
        t.total > 0 &&
        Number.isFinite(t.subtotal) &&
        t.total === t.subtotal - (t.diskon || 0) + (t.ongkir || 0),
      'Total atau status invoice tidak valid.',
    );
    FVStore.require(
      t.items.every(
        (i) => Number.isInteger(i.qty) && i.qty > 0 && Number.isFinite(i.price) && i.price >= 0,
      ) && t.items.reduce((n, i) => n + i.qty * i.price, 0) === t.subtotal,
      'Rincian item tidak sesuai total invoice.',
    );
    const s = FVStore.state();
    if (!s.payments.some((p) => p.saleId === id))
      s.payments.push({
        id: FVStore.uid('PAY'),
        saleId: id,
        amount: t.total,
        method,
        staff: AD.actor(),
        timestamp: FVStore.stamp(),
        simulation: true,
      });
    const products = loadProducts();
    if (t._src !== 'orders' && !t.stockHandled)
      t.items
        .filter((i) => i.retail)
        .forEach((i) => {
          FVStore.movement(s, products, {
            productId: i.id,
            delta: -i.qty,
            reason: 'Produk tambahan invoice',
            source: t.id,
            staff: AD.actor(),
          });
          const p = products.find((p) => p.id === i.id);
          p.sold = (p.sold || 0) + i.qty;
        });
    const key = t._src === 'orders' ? 'fv_orders' : 'fv_admin_trx',
      list = FVStore.get(key, []),
      o = list.find((o) => (o.id || o.no) === id);
    FVStore.require(o, 'Invoice tidak ditemukan.');
    if (t._src === 'orders') o.statusBayar = 'Lunas';
    else o.status = 'Lunas';
    o.metode = method;
    o.paidAt = FVStore.stamp();
    o.stockHandled = true;
    FVStore.commit({ [FVStore.key]: s, [key]: list, fv_products: products });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
    AD.log.add('Transaksi', `Pembayaran simulasi ${id} ${rp(t.total)}`);
    return AD.trx.get(id);
  },
  pos(lines, method, promo = '', name = 'Pelanggan umum', requestId = FVStore.uid('POS')) {
    AD.require(PERM.PAY);
    const prior = AD.trx.all().find((t) => t.requestId === requestId);
    if (prior) return prior;
    FVStore.require(
      PAY_METHODS.includes(method) && (!promo || PROMOS[promo]) && lines.length,
      'Pilih produk, promo dan metode yang valid.',
    );
    const products = loadProducts(),
      s = FVStore.state(),
      map = new Map();
    lines.forEach((i) => {
      FVStore.require(Number.isInteger(i.qty) && i.qty > 0, 'Jumlah harus bilangan bulat positif.');
      map.set(i.id, (map.get(i.id) || 0) + i.qty);
    });
    const id = FVStore.uid('TRX'),
      items = [];
    for (const [productId, qty] of map) {
      const p = products.find((p) => p.id === productId);
      FVStore.require(
        p && p.aktif !== false && !p.resep,
        'Produk tidak tersedia atau membutuhkan resep dokter.',
      );
      FVStore.movement(s, products, {
        productId,
        delta: -qty,
        reason: 'Penjualan POS (simulasi)',
        source: id,
        staff: AD.actor(),
      });
      p.sold = (p.sold || 0) + qty;
      items.push({ id: p.id, name: p.name, qty, price: p.price });
    }
    const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0),
      diskon = Math.round(subtotal * (PROMOS[promo] || 0)),
      pending = /COD/.test(method);
    const t = {
      id,
      requestId,
      tanggal: FVStore.stamp(),
      pelanggan: name || 'Pelanggan umum',
      tipe: 'Produk',
      deskripsi: items.map((i) => i.name).join(', '),
      items,
      subtotal,
      diskon,
      ongkir: 0,
      total: subtotal - diskon,
      metode: method,
      status: pending ? 'Menunggu' : 'Lunas',
      sumber: 'Kasir',
      simulation: true,
      stockHandled: true,
    };
    if (!pending)
      s.payments.push({
        id: FVStore.uid('PAY'),
        saleId: id,
        amount: t.total,
        method,
        staff: AD.actor(),
        timestamp: FVStore.stamp(),
        simulation: true,
      });
    const list = FVStore.get('fv_admin_trx', []);
    list.unshift(t);
    FVStore.commit({ [FVStore.key]: s, fv_products: products, fv_admin_trx: list });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
    AD.log.add('Transaksi', `POS simulasi ${id}`);
    return t;
  },
  dispense(id) {
    AD.require(PERM.STOCK);
    const t = AD.trx.get(id);
    FVStore.require(t && t.status === 'Lunas', 'Lunasi invoice sebelum penyerahan obat.');
    const s = FVStore.state(),
      products = loadProducts(),
      rxIds = [...new Set(t.items.map((i) => i.prescriptionId).filter(Boolean))];
    FVStore.require(rxIds.length, 'Invoice ini tidak memuat obat resep.');
    rxIds.forEach((rxId) => {
      const rx = s.prescriptions.find((r) => r.id === rxId);
      FVStore.require(rx && ['Diterbitkan', 'Diserahkan'].includes(rx.status), 'Resep tidak valid.');
      if (rx.status === 'Diserahkan') return;
      rx.items.forEach((i) =>
        FVStore.movement(s, products, {
          productId: i.productId,
          delta: -i.quantity,
          reason: 'Penyerahan resep dibayar',
          source: 'dispense:' + rx.id,
          staff: AD.actor(),
        }),
      );
      rx.status = 'Diserahkan';
      rx.dispensedAt = FVStore.stamp();
      rx.dispensedBy = AD.actor();
    });
    FVStore.commit({ [FVStore.key]: s, fv_products: products });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
    AD.log.add('Stok', `Penyerahan resep ${id}`);
  },
  requestAdjustment(saleId, reason) {
    AD.require(PERM.PAY);
    FVStore.require(
      AD.trx.get(saleId)?.status === 'Lunas' && reason?.trim(),
      'Pilih transaksi lunas dan isi alasan.',
    );
    const s = FVStore.state();
    FVStore.require(
      !s.approvals.some((a) => a.saleId === saleId && a.status === 'Menunggu'),
      'Permintaan sudah menunggu persetujuan.',
    );
    s.approvals.push({
      id: FVStore.uid('APP'),
      saleId,
      reason,
      status: 'Menunggu',
      requestedBy: AD.actor(),
      timestamp: FVStore.stamp(),
    });
    FVStore.save(s);
  },
  approve(id, accept) {
    AD.require(PERM.APPROVE);
    const s = FVStore.state(),
      a = s.approvals.find((a) => a.id === id);
    FVStore.require(a && a.status === 'Menunggu', 'Permintaan tidak valid.');
    a.status = accept ? 'Disetujui demo' : 'Ditolak';
    a.reviewedBy = AD.actor();
    a.reviewedAt = FVStore.stamp();
    FVStore.save(s);
    AD.log.add('Persetujuan', `${a.status}: ${a.saleId}`);
  },
};
AD.trx.markPaid = (id) =>
  AD.billing.pay(id, AD.trx.get(id)?.metode === 'Belum dipilih' ? 'Tunai' : AD.trx.get(id)?.metode);
AD.trx.ensureForBooking = (b) => {
  AD.require(PERM.PAY);
  FVStore.require(b?.status === 'Selesai', 'Layanan harus selesai.');
  const s = FVStore.state(),
    changes = {};
  AD.billing.invoiceChanges(s, b, [], changes);
  FVStore.commit({ ...changes, [FVStore.key]: s });
};

AD.billing.addItems = (id, lines) => {
  AD.require(PERM.PAY);
  const list = FVStore.get('fv_admin_trx', []),
    t = list.find((t) => t.id === id);
  FVStore.require(
    t && t.status === 'Menunggu' && t.ref,
    'Hanya invoice layanan belum dibayar dapat ditambah produk.',
  );
  const products = loadProducts();
  lines.forEach((i) => {
    const p = products.find((p) => p.id === i.id);
    FVStore.require(
      p && p.aktif !== false && !p.resep && Number.isInteger(i.qty) && i.qty > 0,
      'Produk dan jumlah tidak valid. Obat resep ditambahkan dokter.',
    );
    const old = t.items.find((x) => x.retail && x.id === i.id);
    FVStore.require((old?.qty || 0) + i.qty <= p.stock, 'Stok tidak cukup.');
    if (old) old.qty += i.qty;
    else t.items.push({ id: p.id, name: p.name, qty: i.qty, price: p.price, retail: true });
  });
  t.subtotal = t.items.reduce((n, i) => n + i.qty * i.price, 0);
  t.total = t.subtotal - (t.diskon || 0) + (t.ongkir || 0);
  t.deskripsi = t.items.map((i) => i.name).join(', ');
  FVStore.commit({ fv_admin_trx: list });
  AD.log.add('Transaksi', `Menambah produk invoice ${id}`);
};
