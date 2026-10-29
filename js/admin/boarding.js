/* Boarding occupancy uses half-open date intervals [arrival, departure). */
AD.hotel = {
  active: () => FVStore.state().stays.filter((s) => s.status === 'Menginap'),
  reserve(code, roomId) {
    AD.require(PERM.HOTEL);
    const b = AD.bookings.get(code);
    FVStore.require(
      AD.assigned(b) && ['Dikonfirmasi', 'Diproses'].includes(b.status),
      'Reservasi hotel harus dikonfirmasi dan ditugaskan.',
    );
    const s = FVStore.state(),
      existing = s.stays.find((x) => x.bookingCode === code);
    FVStore.require(!existing, 'Booking sudah memiliki penempatan kandang.');
    FVStore.require(
      s.rooms.some((r) => r.id === roomId),
      'Kandang tidak ditemukan.',
    );
    const start = b.tanggal,
      end = addDaysISO(start, b.durasiHari);
    FVStore.require(
      !s.stays.some(
        (x) => x.roomId === roomId && x.status !== 'Dibatalkan' && x.start < end && x.end > start,
      ),
      'Kandang sudah ditempati/dipesan pada rentang tersebut.',
    );
    const stay = {
      id: FVStore.uid('STAY'),
      bookingCode: code,
      petId: b.petId,
      roomId,
      start,
      end,
      status: 'Dipesan',
      staff: AD.actor(),
      staffId: AD.actorId(),
      feeding: 'Pagi dan sore',
      createdAt: FVStore.stamp(),
    };
    s.stays.push(stay);
    FVStore.save(s);
    AD.log.add('Hotel', `Penempatan ${code} ke ${roomId}`);
    return stay;
  },
  owned(s) {
    const b = AD.bookings.get(s?.bookingCode);
    FVStore.require(s && AD.assigned(b) && AD.owns(s), 'Penitipan tidak ditugaskan kepada staff ini.');
    return b;
  },
  checkIn(id) {
    AD.require(PERM.HOTEL);
    const s = FVStore.state(),
      stay = s.stays.find((x) => x.id === id),
      b = AD.hotel.owned(stay);
    FVStore.require(stay.status === 'Dipesan' && b.status !== 'Dibatalkan', 'Status penitipan tidak valid.');
    FVStore.require(
      !s.stays.some((x) => x.id !== id && x.roomId === stay.roomId && x.status === 'Menginap'),
      'Kandang masih ditempati.',
    );
    stay.status = 'Menginap';
    stay.checkedInAt = FVStore.stamp();
    const changes = AD.ops.bookingChange(b, (o) => {
      o.status = 'Diproses';
      o.serviceProgress = 'Menginap';
      o.checkedInAt = stay.checkedInAt;
    });
    FVStore.commit({ ...changes, [FVStore.key]: s });
    AD.log.add('Hotel', `Check-in ${stay.bookingCode}`);
  },
  care(id, data) {
    AD.require(PERM.HOTEL);
    const s = FVStore.state(),
      stay = s.stays.find((x) => x.id === id);
    AD.hotel.owned(stay);
    FVStore.require(
      stay.status === 'Menginap' &&
        ['Pakan', 'Air minum', 'Kebersihan', 'Aktivitas', 'Insiden', 'Obat'].includes(data.type) &&
        data.note?.trim(),
      'Pilih aktivitas dan isi catatan untuk hewan yang sedang menginap.',
    );
    if (data.type === 'Obat') {
      const rx = s.prescriptions.find(
        (r) => r.id === data.prescriptionId && r.petId === stay.petId && r.status === 'Diserahkan',
      );
      FVStore.require(
        rx && rx.items.some((i) => i.productId === +data.productId),
        'Pemberian obat harus merujuk resep dokter untuk hewan ini yang sudah diserahkan.',
      );
    }
    s.care.push({
      id: FVStore.uid('CARE'),
      stayId: id,
      type: data.type,
      note: data.note,
      prescriptionId: data.prescriptionId || '',
      productId: +data.productId || null,
      staff: AD.actor(),
      staffId: AD.actorId(),
      timestamp: FVStore.stamp(),
    });
    FVStore.save(s);
    AD.log.add('Hotel', `${stay.bookingCode}: ${data.type}`);
  },
  checkOut(id) {
    AD.require(PERM.HOTEL);
    const s = FVStore.state(),
      stay = s.stays.find((x) => x.id === id),
      b = AD.hotel.owned(stay);
    FVStore.require(stay.status === 'Menginap', 'Hewan belum check-in atau sudah check-out.');
    stay.status = 'Selesai';
    stay.checkedOutAt = FVStore.stamp();
    stay.reservedEnd = stay.end;
    if (todayISO() > stay.start && todayISO() < stay.end) stay.end = todayISO();
    const changes = AD.ops.bookingChange(b, (o) => {
      o.status = 'Selesai';
      o.serviceProgress = 'Selesai';
    });
    AD.billing.invoiceChanges(s, b, [], changes);
    FVStore.commit({ ...changes, [FVStore.key]: s });
    AD.log.add('Hotel', `Check-out ${b.code}`);
  },
};
AD.bookings.hotelOccupied = (iso) =>
  FVStore.state().stays.filter(
    (s) =>
      s.status !== 'Dibatalkan' &&
      s.start <= iso &&
      s.end > iso &&
      (s.status === 'Menginap' || (iso < todayISO() && s.status === 'Selesai')),
  ).length;
