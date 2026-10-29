/* Registration, appointment lifecycle and shared inventory business rules. */
AD.ops = {
  customer(data) {
    AD.authorize('customer', data.id ? ACTIONS.EDIT : ACTIONS.CREATE);
    AD.require(PERM.CUSTOMER);
    FVStore.require(
      data.nama?.trim().length >= 2 && /^[0-9+\s-]{8,16}$/.test(data.hp),
      'Nama dan nomor HP yang valid wajib diisi.',
    );
    const s = FVStore.state();
    let c = data.id ? s.customers.find((c) => c.id === data.id) : s.customers.find((c) => c.hp === data.hp);
    FVStore.require(!data.id || c, 'Referensi pelanggan tidak ditemukan.');
    if (!c) {
      c = { id: FVStore.uid('CUS') };
      s.customers.push(c);
    }
    Object.assign(c, { nama: data.nama.trim(), hp: data.hp, email: data.email || '' });
    FVStore.save(s);
    AD.log.add('Pelanggan', `Menyimpan pelanggan ${c.nama}`);
    return c;
  },
  pet(data) {
    AD.require(PERM.CUSTOMER);
    const s = FVStore.state();
    FVStore.require(
      s.customers.some((c) => c.id === data.customerId) && data.nama?.trim() && data.spesie,
      'Pemilik, nama dan jenis hewan wajib diisi.',
    );
    let p = data.id
      ? s.pets.find((p) => p.id === data.id && p.customerId === data.customerId)
      : s.pets.find(
          (p) => p.customerId === data.customerId && p.nama === data.nama && p.spesie === data.spesie,
        );
    FVStore.require(!data.id || p, 'Referensi hewan tidak ditemukan.');
    if (!p) {
      p = { id: FVStore.uid('PET'), customerId: data.customerId };
      s.pets.push(p);
    }
    Object.assign(p, {
      nama: data.nama.trim(),
      spesie: data.spesie,
      ras: data.ras || '',
      notes: data.notes || '',
    });
    FVStore.save(s);
    return p;
  },
  checkIn(code) {
    AD.require(PERM.BOOK);
    const b = AD.bookings.get(code);
    FVStore.require(b && b.status === 'Dikonfirmasi', 'Konfirmasikan booking sebelum check-in.');
    FVStore.require(!b.checkedInAt, 'Pelanggan sudah check-in.');
    AD.bookings.mutate(code, (o) => {
      o.checkedInAt = FVStore.stamp();
      o.serviceProgress = 'Menunggu';
      o.riwayat = [
        ...(o.riwayat || []),
        { status: 'Check-in / identitas diverifikasi', at: FVStore.stamp(), by: AD.actor() },
      ];
    });
    AD.log.add('Booking', `Check-in ${code}: ${b.hewan}`);
  },
  schedule(code, data) {
    AD.require(PERM.BOOK);
    const b = AD.bookings.get(code);
    FVStore.require(
      b && !b.checkedInAt && !['Selesai', 'Dibatalkan', 'Diproses'].includes(b.status),
      'Booking ini tidak dapat dijadwalkan ulang.',
    );
    const safe = {};
    ['tanggal', 'waktu', 'petugas', 'catatan'].forEach((k) => {
      if (data[k] !== undefined) safe[k] = data[k];
    });
    const candidate = { ...b, ...safe };
    AD.ops.validateBooking(candidate, code);
    const s = FVStore.state();
    const stay = s.stays.find((x) => x.bookingCode === code && x.status === 'Dipesan');
    if (stay) {
      const start = candidate.tanggal,
        end = addDaysISO(start, candidate.durasiHari);
      FVStore.require(
        !s.stays.some(
          (x) =>
            x.id !== stay.id &&
            x.status !== 'Dibatalkan' &&
            x.roomId === stay.roomId &&
            x.start < end &&
            x.end > start,
        ),
        'Kandang bertabrakan pada jadwal baru.',
      );
      Object.assign(stay, {
        start,
        end,
        staff: candidate.petugas,
        staffId: AD.staffId(candidate.petugas, 'hotel'),
      });
    }
    const changes = AD.ops.bookingChange(b, (o) => {
      Object.assign(o, safe);
      if (safe.petugas)
        o.staffId = AD.staffId(
          safe.petugas,
          { konsultasi: 'dokter', grooming: 'groomer', hotel: 'hotel' }[b.svcKey],
        );
      o.riwayat = [
        ...(o.riwayat || []),
        { status: 'Jadwal / petugas diperbarui', at: FVStore.stamp(), by: AD.actor() },
      ];
    });
    FVStore.commit({ ...changes, [FVStore.key]: s });
    AD.log.add('Booking', `Memperbarui jadwal ${code}`);
  },
  validateBooking(b, exclude) {
    const key = b.svcKey || svcKeyByLabel(b.layanan),
      cfg = SERVICES[key],
      type = cfg?.types.find((t) => t.name === b.tipe);
    FVStore.require(
      cfg &&
        type &&
        cfg.slots.includes(b.waktu) &&
        /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal) &&
        toISO(parseISO(b.tanggal)) === b.tanggal &&
        b.tanggal >= todayISO(),
      'Layanan, tipe, tanggal atau slot tidak valid.',
    );
    const staff = AD.serviceStaff(key);
    FVStore.require(staff.includes(b.petugas), 'Pilih petugas sesuai layanan.');
    FVStore.require(
      Number.isInteger(b.durasiHari || 1) && (b.durasiHari || 1) >= 1 && (b.durasiHari || 1) <= 60,
      'Durasi harus 1–60 hari.',
    );
    const probe = { ...b, code: exclude || '_new', svcKey: key, durMin: type.min || 60 };
    FVStore.require(!AD.bookings.conflicts(probe).length, 'Jadwal petugas bertabrakan dengan booking lain.');
    if (key === 'hotel')
      for (let i = 0; i < (b.durasiHari || 1); i++) {
        const d = addDaysISO(b.tanggal, i);
        const count = AD.bookings
          .all()
          .filter(
            (o) =>
              o.code !== exclude &&
              o.svcKey === 'hotel' &&
              !['Dibatalkan', 'Tidak Hadir'].includes(o.status) &&
              o.tanggal <= d &&
              addDaysISO(o.tanggal, o.durasiHari) > d,
          ).length;
        FVStore.require(count < HOTEL_CAPACITY, `Kandang penuh pada ${d}.`);
      }
    return type.price * (key === 'hotel' ? b.durasiHari || 1 : 1);
  },
  groom(code, progress, notes) {
    AD.require(PERM.GROOM);
    const b = AD.bookings.get(code);
    FVStore.require(
      AD.assigned(b) && b.checkedInAt && !['Selesai', 'Dibatalkan'].includes(b.status),
      'Hanya grooming yang ditugaskan dan sudah check-in dapat diproses.',
    );
    const s = FVStore.state();
    let g = s.grooming.find((g) => g.bookingCode === code);
    FVStore.require(
      ['Dalam Proses', 'Selesai'].includes(progress) &&
        (progress !== 'Selesai' || g?.progress === 'Dalam Proses'),
      'Mulai grooming sebelum menyelesaikan layanan.',
    );
    if (!g) {
      g = {
        id: FVStore.uid('GR'),
        bookingCode: code,
        petId: b.petId,
        staff: AD.actor(),
        staffId: AD.actorId(),
        createdAt: FVStore.stamp(),
        history: [],
      };
      s.grooming.push(g);
    }
    Object.assign(g, { progress, notes: notes || '', updatedAt: FVStore.stamp() });
    g.history.push({ progress, notes: notes || '', at: FVStore.stamp() });
    const changes = AD.ops.bookingChange(b, (o) => {
      o.status = progress === 'Selesai' ? 'Selesai' : 'Diproses';
      o.serviceProgress = progress;
      o.riwayat = [...(o.riwayat || []), { status: o.status, at: FVStore.stamp(), by: AD.actor() }];
    });
    if (progress === 'Selesai') AD.billing.invoiceChanges(s, b, [], changes);
    FVStore.commit({ ...changes, [FVStore.key]: s });
    AD.log.add('Grooming', `${code}: ${progress}`);
  },
  bookingChange(b, fn) {
    const key = b._src === 'public' ? 'fv_bookings' : 'fv_admin_bookings';
    const list = FVStore.get(key, []);
    const o = list.find((x) => x.code === b.code);
    FVStore.require(o, 'Referensi booking tidak valid.');
    fn(o);
    return { [key]: list };
  },
};
const originalBookingAll = AD.bookings.all;
AD.bookings.all = () => {
  const s = FVStore.state();
  return originalBookingAll().map((b) => ({
    ...b,
    ...FVStore.identity(s, b),
    petugas: s.staff.find((p) => p.id === b.staffId)?.nama || b.petugas,
  }));
};
AD.bookings.customers = () => {
  const s = FVStore.state();
  return s.customers.map((c) => ({ ...c, pets: s.pets.filter((p) => p.customerId === c.id) }));
};
AD.bookings.addManual = (data) => {
  AD.authorize('booking', ACTIONS.CREATE);
  AD.require(PERM.BOOK);
  const biaya = AD.ops.validateBooking(data);
  FVStore.require(
    data.pelanggan?.trim() && data.hewan?.trim() && data.hp,
    'Nama pelanggan, hewan dan nomor HP wajib diisi.',
  );
  const s = FVStore.state();
  if (data.petId)
    FVStore.require(
      s.pets.some((p) => p.id === data.petId && p.customerId === data.customerId),
      'Referensi hewan tidak valid.',
    );
  const refs = FVStore.identity(s, data);
  const code = FVStore.uid('FV');
  const list = FVStore.get('fv_admin_bookings', []);
  list.unshift({
    ...data,
    ...refs,
    staffId: AD.staffId(
      data.petugas,
      { konsultasi: 'dokter', grooming: 'groomer', hotel: 'hotel' }[svcKeyByLabel(data.layanan)],
    ),
    biaya,
    code,
    sumber: 'Manual',
    status: 'Dikonfirmasi',
    serviceProgress: 'Belum check-in',
    riwayat: [{ status: 'Dikonfirmasi', at: FVStore.stamp(), by: AD.actor() }],
  });
  FVStore.commit({ [FVStore.key]: s, fv_admin_bookings: list });
  AD.log.add('Booking', `Booking manual ${code}`);
  return code;
};
AD.bookings.actions = (b) =>
  AD.allowed(PERM.BOOK)
    ? b.status === 'Menunggu Konfirmasi'
      ? [
          { to: 'Dikonfirmasi', label: 'Konfirmasi', kind: 'primary' },
          { to: 'Dibatalkan', label: 'Batalkan', kind: 'danger' },
        ]
      : b.status === 'Dikonfirmasi'
        ? [{ to: 'Dibatalkan', label: 'Batalkan', kind: 'danger' }]
        : []
    : [];
AD.bookings.setStatus = (code, to, reason = '') => {
  AD.authorize('booking', to === 'Dikonfirmasi' ? ACTIONS.CONFIRM : ACTIONS.ARCHIVE);
  AD.require(PERM.BOOK);
  const b = AD.bookings.get(code);
  FVStore.require(b && AD.bookings.actions(b).some((a) => a.to === to), 'Transisi status tidak diizinkan.');
  FVStore.require(to !== 'Dibatalkan' || reason.trim(), 'Alasan pembatalan wajib diisi.');
  const s = FVStore.state();
  if (to === 'Dibatalkan')
    s.stays
      .filter((x) => x.bookingCode === code && x.status === 'Dipesan')
      .forEach((x) => {
        x.status = 'Dibatalkan';
        x.cancelReason = reason;
      });
  const changes = AD.ops.bookingChange(b, (o) => {
    o.status = to;
    o.serviceProgress = to === 'Dibatalkan' ? 'Dibatalkan' : o.serviceProgress || 'Belum check-in';
    o.cancelReason = to === 'Dibatalkan' ? reason : undefined;
    o.riwayat = [...(o.riwayat || []), { status: to, reason, at: FVStore.stamp(), by: AD.actor() }];
  });
  FVStore.commit({ ...changes, [FVStore.key]: s });
  AD.log.add('Booking', `${code}: ${to} ${reason}`);
};
AD.bookings.setNote = (code, note) => {
  AD.require(PERM.BOOK);
  FVStore.require(AD.bookings.get(code), 'Booking tidak ditemukan.');
  AD.bookings.mutate(code, (o) => {
    o.catatanInternal = note;
  });
  AD.log.add('Booking', `Catatan ${code}`);
};
const originalInit = AD.init;
AD.init = () => {
  originalInit();
  const s = FVStore.state();
  const migrated = {};
  Object.entries(SERVICES).forEach(([svc, cfg]) => {
    const role = { konsultasi: 'dokter', grooming: 'groomer', hotel: 'hotel' }[svc];
    cfg.staff.forEach((nama) => {
      const id = AD.baseStaffId(role, nama);
      if (!s.staff.some((p) => p.id === id || (p.nama === nama && p.role === role)))
        s.staff.push({ id, nama, role, active: true, demo: true });
    });
  });
  ['fv_bookings', 'fv_admin_bookings'].forEach((key) => {
    migrated[key] = FVStore.get(key, []).map((b) => ({
      ...b,
      ...FVStore.identity(s, b),
      staffId: b.staffId || s.staff.find((p) => p.nama === b.petugas)?.id,
    }));
  });
  const u = FVStore.get('fv_user', null),
    profile = FVStore.get('fv_profile', {});
  if (u)
    FVStore.get('fv_pets', []).forEach((p) =>
      FVStore.identity(s, {
        pelanggan: u.name,
        email: u.email,
        hp: profile.phone,
        hewan: p.name,
        spesie: p.species,
        ras: p.breed,
      }),
    );
  FVStore.opening(s, PRODUCTS);
  if (!s.rooms.length)
    s.rooms = Array.from({ length: HOTEL_CAPACITY }, (_, i) => ({
      id: 'ROOM-' + (i + 1),
      name: 'Kandang ' + (i + 1),
    }));
  if (!s.suppliers.length)
    s.suppliers = DISTRIBUTORS.map((nama) => ({ id: FVStore.uid('SUP'), nama, hp: '' }));
  FVStore.commit({ ...migrated, [FVStore.key]: s, fv_products: PRODUCTS });
};
