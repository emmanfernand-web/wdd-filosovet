/* Responsible-doctor-only clinical drafts, final records, prescriptions and addenda. */
AD.clinic = {
  records: () => {
    AD.require(PERM.CLINIC);
    return FVStore.state().medical.filter(
      (m) => AD.owns(m, 'doctor') || AD.assigned(AD.bookings.get(m.bookingCode)),
    );
  },
  save(code, fields, items = [], final = false) {
    AD.authorize('clinical', final ? ACTIONS.COMPLETE : ACTIONS.EDIT);
    AD.require(PERM.CLINIC);
    const b = AD.bookings.get(code);
    FVStore.require(
      AD.assigned(b) && b.checkedInAt && !['Selesai', 'Dibatalkan'].includes(b.status),
      'Pasien harus ditugaskan kepada dokter ini dan sudah check-in.',
    );
    const s = FVStore.state();
    let m = s.medical.find((m) => m.bookingCode === code);
    FVStore.require(
      !m || (AD.owns(m, 'doctor') && m.status === 'Draft'),
      'Rekam medis final tidak dapat ditimpa; gunakan addendum.',
    );
    FVStore.require(
      (fields.weight == null ||
        fields.weight === '' ||
        (Number.isFinite(+fields.weight) && +fields.weight > 0 && +fields.weight <= 1000)) &&
        (fields.temperature == null ||
          fields.temperature === '' ||
          (Number.isFinite(+fields.temperature) && +fields.temperature >= 20 && +fields.temperature <= 50)),
      'Berat atau suhu tidak valid.',
    );
    FVStore.require(
      !fields.followUpDate || /^\d{4}-\d{2}-\d{2}$/.test(fields.followUpDate),
      'Tanggal kontrol tidak valid.',
    );
    const seen = new Set();
    const validated = items.map((i) => {
      const p = PRODUCTS.find((p) => p.id === +i.productId && p.cat === 'obat' && p.aktif !== false);
      FVStore.require(
        p &&
          !seen.has(p.id) &&
          Number.isInteger(+i.quantity) &&
          +i.quantity > 0 &&
          i.dosage?.trim() &&
          i.route?.trim() &&
          i.frequency?.trim() &&
          i.duration?.trim(),
        'Obat, jumlah, dosis, rute, frekuensi dan durasi wajib valid; gabungkan obat yang sama.',
      );
      seen.add(p.id);
      return {
        productId: p.id,
        name: p.name,
        dosage: i.dosage,
        route: i.route,
        frequency: i.frequency,
        duration: i.duration,
        quantity: +i.quantity,
        instructions: i.instructions || '',
      };
    });
    FVStore.require(
      !final || (fields.diagnosis?.trim() && fields.physical?.trim()),
      'Diagnosis dan pemeriksaan fisik wajib diisi sebelum finalisasi.',
    );
    if (!m) {
      m = {
        id: FVStore.uid('MR'),
        bookingCode: code,
        petId: b.petId,
        customerId: b.customerId,
        doctor: AD.actor(),
        doctorId: AD.actorId(),
        createdAt: FVStore.stamp(),
        examinationDate: todayISO(),
        chiefComplaint: b.catatan,
      };
      s.medical.push(m);
    }
    const allowed = [
      'anamnesis',
      'weight',
      'temperature',
      'physical',
      'diagnosis',
      'procedures',
      'notes',
      'followUp',
      'followUpDate',
    ];
    allowed.forEach((k) => {
      m[k] = fields[k] ?? '';
    });
    m.procedureFee = Number(fields.procedureFee || 0);
    FVStore.require(
      Number.isFinite(m.procedureFee) && m.procedureFee >= 0 && m.procedureFee <= 99999999,
      'Biaya tindakan tidak valid.',
    );
    m.status = final ? 'Final' : 'Draft';
    m.updatedAt = FVStore.stamp();
    let rx = s.prescriptions.find((r) => r.medicalId === m.id);
    if (!rx) {
      rx = {
        id: FVStore.uid('RX'),
        medicalId: m.id,
        bookingCode: code,
        petId: b.petId,
        doctor: AD.actor(),
        doctorId: AD.actorId(),
        createdAt: FVStore.stamp(),
      };
      s.prescriptions.push(rx);
    }
    rx.items = validated;
    rx.status = final ? 'Diterbitkan' : 'Draft';
    rx.updatedAt = FVStore.stamp();
    const changes = AD.ops.bookingChange(b, (o) => {
      o.status = final ? 'Selesai' : 'Diproses';
      o.serviceProgress = final ? 'Selesai' : 'Dalam Pemeriksaan';
      o.riwayat = [...(o.riwayat || []), { status: o.status, at: FVStore.stamp(), by: AD.actor() }];
    });
    if (final) {
      m.finalizedAt = FVStore.stamp();
      const extra = [];
      if (m.procedureFee)
        extra.push({ name: m.procedures || 'Tindakan dokter', qty: 1, price: m.procedureFee });
      validated.forEach((i) =>
        extra.push({
          id: i.productId,
          name: i.name,
          qty: i.quantity,
          price: PRODUCTS.find((p) => p.id === i.productId).price,
          prescriptionId: rx.id,
        }),
      );
      AD.billing.invoiceChanges(s, b, extra, changes);
    }
    FVStore.commit({ ...changes, [FVStore.key]: s });
    AD.log.add('Medis', `${final ? 'Finalisasi' : 'Draft'} rekam ${m.id} (${code})`);
    return m;
  },
  finalize(code) {
    const s = FVStore.state(),
      m = s.medical.find((m) => m.bookingCode === code);
    FVStore.require(m, 'Simpan draft terlebih dahulu.');
    return AD.clinic.save(code, m, s.prescriptions.find((r) => r.medicalId === m.id)?.items || [], true);
  },
  amend(id, text) {
    AD.require(PERM.CLINIC);
    const s = FVStore.state(),
      m = s.medical.find((m) => m.id === id);
    FVStore.require(
      m && m.status === 'Final' && AD.owns(m, 'doctor') && text?.trim(),
      'Hanya dokter penanggung jawab dapat menambahkan koreksi pada rekam final.',
    );
    s.amendments.push({
      id: FVStore.uid('AMD'),
      medicalId: id,
      text: text.trim(),
      doctor: AD.actor(),
      doctorId: AD.actorId(),
      createdAt: FVStore.stamp(),
    });
    FVStore.save(s);
    AD.log.add('Medis', `Addendum ${id}`);
  },
};
