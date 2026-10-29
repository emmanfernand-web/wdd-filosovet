/* Shared persistence and stock ledger. Classic script, also used by public checkout. */
const FVStore = (() => {
  const key = 'fv_workspace_v1';
  const collections = [
    'customers',
    'pets',
    'medical',
    'amendments',
    'prescriptions',
    'grooming',
    'rooms',
    'stays',
    'care',
    'batches',
    'movements',
    'payments',
    'suppliers',
    'staff',
    'approvals',
  ];
  const get = (k, fallback) => {
    const raw = localStorage.getItem(k);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      throw Error(`Data ${k} tidak dapat dibaca. Ekspor/perbaiki data sebelum melanjutkan.`);
    }
  };
  const state = () => {
    const s = get(key, { version: 1 });
    if (!s || Array.isArray(s) || typeof s !== 'object' || s.version !== 1)
      throw Error('Versi/struktur workspace tidak dikenali. Data tidak diubah.');
    collections.forEach((k) => {
      if (s[k] === undefined) s[k] = [];
      else if (!Array.isArray(s[k])) throw Error('Struktur ' + k + ' tidak valid. Data tidak diubah.');
    });
    return s;
  };
  const uid = (prefix) => prefix + '-' + crypto.randomUUID();
  const stamp = () => new Date().toISOString();
  const day = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };
  const requireValue = (ok, message) => {
    if (!ok) throw Error(message);
  };
  // Roll back a quota/write failure before showing success. Not a cross-tab/database transaction.
  function commit(changes) {
    const old = Object.fromEntries(Object.keys(changes).map((k) => [k, localStorage.getItem(k)]));
    try {
      Object.entries(changes).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    } catch (err) {
      Object.entries(old).forEach(([k, v]) => {
        try {
          v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
        } catch {}
      });
      throw Error('Penyimpanan gagal. Ruang browser mungkin penuh; data belum disimpan.');
    }
  }
  const save = (s) => commit({ [key]: s });
  const stable = (s) => {
    let h = 2166136261;
    for (const c of String(s).toLowerCase().trim()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(36);
  };
  function identity(s, b) {
    const match = s.customers.find((c) => (b.hp && c.hp === b.hp) || (b.email && c.email === b.email));
    const customerId = b.customerId || match?.id || 'CUS-' + stable(b.hp || b.email || b.pelanggan || b.nama);
    const petMatch = s.pets.find(
      (p) => p.customerId === customerId && p.nama === b.hewan && p.spesie === (b.spesie || b.spesies || ''),
    );
    const petId =
      b.petId ||
      petMatch?.id ||
      'PET-' + stable(customerId + '|' + b.hewan + '|' + (b.spesie || b.spesies || ''));
    if (!s.customers.some((c) => c.id === customerId))
      s.customers.push({
        id: customerId,
        nama: b.pelanggan || b.nama || '',
        hp: b.hp || '',
        email: b.email || '',
        demo: !!b.seed,
      });
    if (!s.pets.some((p) => p.id === petId))
      s.pets.push({
        id: petId,
        customerId,
        nama: b.hewan || '',
        spesie: b.spesie || b.spesies || '',
        ras: b.ras || '',
        demo: !!b.seed,
      });
    return { customerId, petId };
  }
  function opening(s, products) {
    products.forEach((p) => {
      if (s.movements.some((m) => m.productId === p.id)) return;
      const batch = {
        id: 'OPEN-' + p.id,
        productId: p.id,
        quantity: p.stock,
        expiry: p.exp || '',
        label: p.batch || 'Saldo migrasi',
      };
      s.batches.push(batch);
      s.movements.push({
        id: uid('MOV'),
        productId: p.id,
        batchId: batch.id,
        type: 'IN',
        quantity: p.stock,
        delta: p.stock,
        reason: 'Saldo awal migrasi (riwayat lama tidak direkonstruksi)',
        source: 'opening:' + p.id,
        staff: 'Migrasi',
        timestamp: stamp(),
      });
    });
  }
  function movement(s, products, { productId, delta, reason, source, staff, batchId, expiry, type }) {
    opening(s, products);
    requireValue(Number.isInteger(delta) && delta !== 0, 'Jumlah stok harus bilangan bulat bukan nol.');
    requireValue(reason && source, 'Alasan dan referensi stok wajib diisi.');
    if (s.movements.some((m) => m.source === source && m.productId === productId)) return;
    const p = products.find((p) => p.id === productId);
    requireValue(p && p.stock + delta >= 0, 'Produk tidak ditemukan atau stok tidak cukup.');
    let batches = s.batches.filter((b) => b.productId === productId && (!batchId || b.id === batchId));
    if (delta > 0) {
      const existing = batchId && s.batches.find((b) => b.id === batchId);
      requireValue(
        !existing || existing.productId === productId,
        'ID batch sudah digunakan untuk produk lain.',
      );
      requireValue(
        !existing || !expiry || existing.expiry === expiry,
        'Tanggal kedaluwarsa batch berbeda; gunakan ID batch baru atau koreksi metadata.',
      );
      let b = batchId && batches.find((b) => b.id === batchId);
      if (!b) {
        b = {
          id: batchId || uid('BATCH'),
          productId,
          quantity: 0,
          expiry: expiry || p.exp || '',
          label: batchId || source,
        };
        s.batches.push(b);
      }
      requireValue(!expiry || /^\d{4}-\d{2}-\d{2}$/.test(expiry), 'Tanggal kedaluwarsa tidak valid.');
      b.quantity += delta;
      batches = [{ batch: b, qty: delta }];
    } else {
      const usable = batches
        .filter((b) => b.quantity > 0 && (type === 'ADJUSTMENT' || !b.expiry || b.expiry >= day()))
        .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
      requireValue(
        usable.reduce((n, b) => n + b.quantity, 0) >= -delta,
        'Stok batch tersedia tidak cukup (periksa kedaluwarsa).',
      );
      let remain = -delta;
      batches = [];
      usable.forEach((b) => {
        const qty = Math.min(remain, b.quantity);
        if (qty) {
          b.quantity -= qty;
          remain -= qty;
          batches.push({ batch: b, qty: -qty });
        }
      });
    }
    batches.forEach(({ batch, qty }) =>
      s.movements.push({
        id: uid('MOV'),
        productId,
        batchId: batch.id,
        type: type || (delta > 0 ? 'IN' : 'OUT'),
        quantity: Math.abs(qty),
        delta: qty,
        reason,
        source,
        staff,
        timestamp: stamp(),
      }),
    );
    p.stock += delta;
  }
  function checkout(items, nota) {
    const products = get('fv_products', null) || PRODUCTS.map((p) => ({ ...p }));
    const s = state();
    const orders = get('fv_orders', []);
    if (orders.some((o) => o.no === nota.no)) return;
    items.forEach((it) => {
      const p = products.find((p) => p.id === it.id);
      requireValue(
        p && p.aktif !== false && !p.resep && p.price === it.price && Number.isInteger(it.qty) && it.qty > 0,
        'Keranjang berubah. Muat ulang dan periksa produk.',
      );
      movement(s, products, {
        productId: p.id,
        delta: -it.qty,
        reason: 'Pembelian toko (simulasi)',
        source: nota.no,
        staff: 'Pelanggan',
      });
      p.sold = (p.sold || 0) + it.qty;
    });
    const owner = get('fv_user', null),
      profile = get('fv_profile', {});
    if (owner) {
      const match = s.customers.find(
        (c) => (owner.email && c.email === owner.email) || (profile.phone && c.hp === profile.phone),
      );
      nota.customerId = match?.id || 'CUS-' + stable(profile.phone || owner.email || owner.name);
      if (!match)
        s.customers.push({
          id: nota.customerId,
          nama: owner.name,
          email: owner.email || '',
          hp: profile.phone || '',
        });
    }
    nota.simulation = true;
    if (nota.statusBayar === 'Lunas')
      s.payments.push({
        id: uid('PAY'),
        saleId: nota.no,
        amount: nota.total,
        method: nota.metode,
        staff: 'Pelanggan',
        timestamp: stamp(),
        simulation: true,
      });
    orders.unshift(nota);
    commit({ [key]: s, fv_products: products, fv_orders: orders });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
  }
  return {
    key,
    get,
    state,
    save,
    commit,
    uid,
    stamp,
    require: requireValue,
    stable,
    identity,
    opening,
    movement,
    checkout,
  };
})();
/* Shared availability for public calendar and final submission. */
FVStore.bookingAvailable = (b, exclude = '') => {
  const list = [...FVStore.get('fv_bookings', []), ...FVStore.get('fv_admin_bookings', [])].filter(
    (o) => o.code !== exclude && !['Dibatalkan', 'Tidak Hadir'].includes(o.status),
  );
  const cfg = SERVICES[b.svcKey],
    type = cfg?.types.find((t) => t.name === b.tipe);
  if (!cfg || !type || !FVStore.serviceStaff(b.svcKey).includes(b.petugas)) return false;
  const plus = (d, n) => {
    const dt = new Date(d + 'T12:00:00');
    dt.setDate(dt.getDate() + n);
    return (
      dt.getFullYear() +
      '-' +
      String(dt.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(dt.getDate()).padStart(2, '0')
    );
  };
  if (b.svcKey === 'hotel') {
    for (let i = 0; i < b.durasiHari; i++) {
      const d = plus(b.tanggal, i);
      if (
        list.filter(
          (o) => o.layanan === cfg.label && o.tanggal <= d && plus(o.tanggal, o.durasiHari || 1) > d,
        ).length >= 8
      )
        return false;
    }
    return true;
  }
  const minute = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const start = minute(b.waktu),
    end = start + (type.min || 60);
  return !list.some(
    (o) =>
      (o.staffId ? FVStore.state().staff.find((s) => s.id === o.staffId)?.nama || o.petugas : o.petugas) ===
        b.petugas &&
      o.tanggal === b.tanggal &&
      minute(o.waktu) < end &&
      minute(o.waktu) +
        (Object.values(SERVICES)
          .flatMap((s) => s.types)
          .find((t) => t.name === o.tipe)?.min || 60) >
        start,
  );
};
FVStore.currentCustomerIds = () => {
  const u = FVStore.get('fv_user', null),
    p = FVStore.get('fv_profile', {});
  if (!u) return [];
  return FVStore.state()
    .customers.filter((c) => (u.email && c.email === u.email) || (p.phone && c.hp === p.phone))
    .map((c) => c.id);
};
FVStore.syncPublicPets = (pets) => {
  const u = FVStore.get('fv_user', null),
    profile = FVStore.get('fv_profile', {});
  if (!u) return;
  const s = FVStore.state();
  pets.forEach((p) => {
    const refs = FVStore.identity(s, {
      pelanggan: u.name,
      email: u.email,
      hp: profile.phone,
      hewan: p.name,
      spesie: p.species,
      ras: p.breed,
    });
    const pet = s.pets.find((x) => x.id === refs.petId);
    Object.assign(pet, { weight: p.weight, vaksin: p.vaksin });
  });
  FVStore.commit({ [FVStore.key]: s, fv_pets: pets });
};

FVStore.serviceStaff = (service) => {
  const role = { konsultasi: 'dokter', grooming: 'groomer', hotel: 'hotel' }[service],
    staff = FVStore.state().staff;
  const base = SERVICES[service].staff.flatMap((name) => {
    const configured =
      staff.find((s) => s.id === 'STAFF-' + FVStore.stable(role + '|' + name)) ||
      staff.find((s) => s.nama === name && s.role === role);
    return configured
      ? configured.active !== false && configured.role === role
        ? [configured.nama]
        : []
      : [name];
  });
  return [
    ...new Set([...base, ...staff.filter((s) => s.role === role && s.active !== false).map((s) => s.nama)]),
  ].filter((name) => !staff.some((s) => s.nama === name && s.role === role && s.active === false));
};
