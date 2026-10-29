/* Inventory/catalog services: movements, suppliers, batches and audited metadata. */
AD.stock.adjust = (id, delta, note, batch = {}) => {
  AD.require(PERM.STOCK);
  FVStore.require(note?.trim(), 'Alasan perubahan stok wajib diisi.');
  const s = FVStore.state(),
    products = loadProducts();
  FVStore.movement(s, products, {
    productId: id,
    delta,
    reason: note,
    source: FVStore.uid('ADJ'),
    staff: AD.actor(),
    type: 'ADJUSTMENT',
    ...batch,
  });
  FVStore.commit({ [FVStore.key]: s, fv_products: products });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  AD.log.add('Stok', `${id}: ${delta} (${note})`);
};
AD.stock.placeOrder = (distributor, items) => {
  AD.require(PERM.STOCK);
  FVStore.require(
    distributor?.trim() &&
      items.length &&
      new Set(items.map((i) => i.id)).size === items.length &&
      items.every((i) => PRODUCTS.some((p) => p.id === i.id) && Number.isInteger(i.qty) && i.qty > 0),
    'Supplier dan item order tidak valid.',
  );
  const s = FVStore.state();
  let supplier = s.suppliers.find((x) => x.nama === distributor);
  if (!supplier) {
    supplier = { id: FVStore.uid('SUP'), nama: distributor, hp: '' };
    s.suppliers.push(supplier);
  }
  const list = FVStore.get('fv_admin_orders', []);
  const rec = {
    id: FVStore.uid('PO'),
    tanggal: FVStore.stamp(),
    distributor,
    supplierId: supplier.id,
    items,
    status: 'Dipesan',
  };
  list.unshift(rec);
  FVStore.commit({ fv_admin_orders: list, [FVStore.key]: s });
  AD.log.add('Stok', `Order ${rec.id}`);
  return rec;
};
AD.stock.receiveOrder = (id) => {
  AD.require(PERM.STOCK);
  const list = FVStore.get('fv_admin_orders', []),
    o = list.find((o) => o.id === id);
  FVStore.require(o, 'Order tidak ditemukan.');
  if (o.status === 'Diterima') return;
  const s = FVStore.state(),
    products = loadProducts();
  o.items.forEach((i) =>
    FVStore.movement(s, products, {
      productId: i.id,
      delta: i.qty,
      reason: 'Penerimaan supplier',
      source: id,
      staff: AD.actor(),
      batchId: i.batchId || id + '-' + i.id,
      expiry: i.expiry || '',
    }),
  );
  o.status = 'Diterima';
  o.diterima = FVStore.stamp();
  FVStore.commit({ [FVStore.key]: s, fv_products: products, fv_admin_orders: list });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  AD.log.add('Stok', `Menerima ${id}`);
};
AD.catalog = {
  save(id, data) {
    AD.require(PERM.PRODUCT);
    const products = loadProducts();
    let p = products.find((p) => p.id === id);
    const isNew = !p;
    FVStore.require(p || AD.allowed(PERM.PRICE), 'Produk baru memerlukan Admin untuk menetapkan harga.');
    FVStore.require(
      data.name?.trim().length >= 3 &&
        Number.isInteger(data.stock) &&
        data.stock >= 0 &&
        Number.isInteger(data.min) &&
        data.min >= 0 &&
        Number.isFinite(data.price) &&
        data.price >= 100,
      'Nama, harga, stok dan batas minimum tidak valid.',
    );
    FVStore.require(
      !p || AD.allowed(PERM.PRICE) || data.price === p.price,
      'Hanya Admin dapat mengubah harga dasar.',
    );
    FVStore.require(
      !products.some((x) => x.id !== id && x.name.toLowerCase() === data.name.toLowerCase()),
      'Nama produk sudah dipakai.',
    );
    const s = FVStore.state();
    FVStore.require(
      !p || (data.exp === p.exp && data.batch === p.batch),
      'Ubah kedaluwarsa melalui Koreksi batch agar metadata tetap konsisten.',
    );
    if (isNew) {
      p = { id: Math.max(0, ...products.map((p) => p.id)) + 1, sold: 0, stock: 0 };
      products.push(p);
    }
    const target = data.stock;
    const old = p.stock;
    Object.assign(p, {
      name: data.name,
      cat: data.cat,
      price: data.price,
      min: data.min,
      batch: data.batch,
      exp: data.exp,
      image: data.image,
      resep: !!data.resep,
      aktif: data.aktif !== false,
    });
    if (target !== old)
      FVStore.movement(s, products, {
        productId: p.id,
        delta: target - old,
        reason: 'Koreksi stok melalui form produk / opname',
        source: FVStore.uid('CAT'),
        staff: AD.actor(),
        staffId: AD.actorId(),
        type: 'ADJUSTMENT',
      });
    FVStore.commit({ [FVStore.key]: s, fv_products: products });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
    AD.log.add('Produk', `Menyimpan ${p.name}`);
    return p;
  },
};
AD.stock.updateBatch = (id, expiry, label, reason) => {
  AD.require(PERM.STOCK);
  const s = FVStore.state(),
    batch = s.batches.find((b) => b.id === id);
  FVStore.require(
    batch && reason?.trim() && (!expiry || /^\d{4}-\d{2}-\d{2}$/.test(expiry)),
    'Batch, tanggal dan alasan koreksi wajib valid.',
  );
  const old = { expiry: batch.expiry, label: batch.label };
  Object.assign(batch, { expiry, label: label || batch.label });
  s.batchHistory = s.batchHistory || [];
  s.batchHistory.push({
    id: FVStore.uid('BATCHEDIT'),
    batchId: id,
    before: old,
    after: { expiry: batch.expiry, label: batch.label },
    reason,
    staff: AD.actor(),
    timestamp: FVStore.stamp(),
  });
  const products = loadProducts(),
    p = products.find((p) => p.id === batch.productId),
    batches = s.batches
      .filter((b) => b.productId === p.id && b.quantity > 0 && b.expiry)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
  p.exp = batches[0]?.expiry || '';
  FVStore.commit({ [FVStore.key]: s, fv_products: products });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  AD.log.add('Stok', `Koreksi batch ${id}: ${reason}`);
};

AD.stock.expiry = (product) => {
  const batches = FVStore.state().batches.filter(
    (b) => b.productId === product.id && b.quantity > 0 && b.expiry,
  );
  const expiry = batches.length ? batches.map((b) => b.expiry).sort()[0] : product.exp;
  if (!expiry) return null;
  const d = diffDays(expiry, todayISO());
  return d < 0 ? 'kedaluwarsa' : d <= 60 ? 'segera' : null;
};
