/* ============================================================
   FILOSOVET ADMIN — pharmacy.js
   Layanan operasional farmasi dan apoteker (Apoteker Role).
   Workflow resep, penyiapan obat, verifikasi stok, klarifikasi dokter,
   dan penyerahan (dispensing) obat independen dari Inventory Staff.
   ============================================================ */
AD.pharmacy = (() => {
  const normStatus = (st) => {
    const s = String(st || '').toLowerCase().trim();
    if (['diterbitkan', 'pending', 'menunggu'].includes(s)) return 'Pending';
    if (['diproses', 'processing', 'disiapkan'].includes(s)) return 'Processing';
    if (['siap', 'ready'].includes(s)) return 'Ready';
    if (['diserahkan', 'dispensed'].includes(s)) return 'Dispensed';
    if (['dibatalkan', 'cancelled'].includes(s)) return 'Cancelled';
    return st || 'Pending';
  };

  const enrichRx = (r, s = FVStore.state()) => {
    const b = AD.bookings.get(r.bookingCode) || {};
    const pet = s.pets.find((p) => p.id === r.petId) || {};
    const customer = s.customers.find((c) => c.id === b.customerId || c.id === pet.customerId) || {};
    const medical = s.medical.find((m) => m.id === r.medicalId || m.bookingCode === r.bookingCode) || {};
    
    return {
      ...r,
      normalizedStatus: normStatus(r.status),
      petName: pet.nama || b.hewan || '—',
      species: pet.spesie || b.spesie || b.spesies || '—',
      breed: pet.ras || b.ras || '—',
      customerName: customer.nama || b.pelanggan || '—',
      customerPhone: customer.hp || b.hp || '—',
      doctor: r.doctor || medical.doctor || b.petugas || 'Dokter Pemeriksa',
      diagnosis: medical.diagnosis || '—',
      physical: medical.physical || '—',
      weight: medical.weight || '—',
      temperature: medical.temperature || '—',
      examinationDate: medical.examinationDate || r.createdAt?.slice(0, 10) || todayISO(),
      chiefComplaint: medical.chiefComplaint || b.catatan || '—',
      booking: b,
      items: (r.items || []).map((it) => {
        const prod = PRODUCTS.find((p) => p.id === it.productId);
        const batches = s.batches.filter((bt) => bt.productId === it.productId && bt.quantity > 0);
        return {
          ...it,
          productStock: prod ? prod.stock : 0,
          productExp: prod ? prod.exp : '',
          availableBatches: batches,
          isSufficient: prod ? prod.stock >= it.quantity : false,
          preparedQuantity: it.preparedQuantity !== undefined ? it.preparedQuantity : it.quantity,
          dispensedQuantity: it.dispensedQuantity !== undefined ? it.dispensedQuantity : (it.preparedQuantity !== undefined ? it.preparedQuantity : it.quantity),
        };
      }),
    };
  };

  const prescriptions = (filter = {}) => {
    const s = FVStore.state();
    let list = (s.prescriptions || []).map((r) => enrichRx(r, s));

    if (filter.status && filter.status !== 'Semua') {
      const target = normStatus(filter.status);
      list = list.filter((r) => r.normalizedStatus === target);
    }

    if (filter.q) {
      const q = filter.q.toLowerCase().trim();
      list = list.filter((r) =>
        [r.id, r.petName, r.species, r.customerName, r.doctor, r.bookingCode, ...(r.items || []).map((i) => i.name)]
          .some((val) => String(val || '').toLowerCase().includes(q))
      );
    }

    if (filter.date) {
      list = list.filter((r) => (r.createdAt || '').slice(0, 10) === filter.date);
    }

    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  };

  const get = (id) => {
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r, 'Resep tidak ditemukan.');
    return enrichRx(r, s);
  };

  const checkStock = (productId, requiredQty = 1) => {
    const s = FVStore.state();
    const prod = PRODUCTS.find((p) => p.id === productId);
    const batches = s.batches.filter((b) => b.productId === productId && b.quantity > 0);
    const stock = prod ? prod.stock : 0;
    return {
      product: prod,
      stock,
      batches,
      isSufficient: stock >= requiredQty,
      missingQty: Math.max(0, requiredQty - stock),
    };
  };

  const startPreparation = (id) => {
    AD.require(PERM.DISPENSE);
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r, 'Resep tidak ditemukan.');
    FVStore.require(
      ['Diterbitkan', 'Pending', 'Menunggu'].includes(r.status),
      'Hanya resep berstatus menunggu yang dapat mulai diproses.'
    );

    r.status = 'Diproses';
    r.prepStartedAt = FVStore.stamp();
    r.pharmacist = AD.actor();
    r.pharmacistId = AD.actorId();
    r.updatedAt = FVStore.stamp();

    FVStore.commit({ [FVStore.key]: s });
    AD.log.add('Farmasi', `Mulai penyiapan resep ${r.id} (${enrichRx(r, s).petName})`);
    return r;
  };

  const savePreparation = (id, { items = [], notes = '' } = {}) => {
    AD.require(PERM.DISPENSE);
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r, 'Resep tidak ditemukan.');
    FVStore.require(
      ['Diproses', 'Pending', 'Diterbitkan', 'Siap'].includes(r.status),
      'Resep tidak dalam status penyiapan.'
    );

    // Update prepared quantities without modifying doctor's original quantity
    if (Array.isArray(items) && items.length) {
      items.forEach((itemInput) => {
        const orig = r.items.find((i) => i.productId === itemInput.productId);
        if (orig) {
          const prepQty = Number(itemInput.preparedQuantity);
          FVStore.require(
            Number.isInteger(prepQty) && prepQty >= 0,
            `Jumlah penyiapan untuk ${orig.name} harus bilangan bulat tidak negatif.`
          );
          orig.preparedQuantity = prepQty;
          if (itemInput.batchId) orig.batchId = itemInput.batchId;
        }
      });
    }

    r.preparationNotes = String(notes || '').trim();
    r.preparedAt = FVStore.stamp();
    r.status = 'Siap';
    r.pharmacist = AD.actor();
    r.pharmacistId = AD.actorId();
    r.updatedAt = FVStore.stamp();

    FVStore.commit({ [FVStore.key]: s });
    AD.log.add('Farmasi', `Penyiapan resep ${r.id} selesai (Siap diserahkan)`);
    return r;
  };

  const flagClarification = (id, note) => {
    AD.require(PERM.DISPENSE);
    FVStore.require(note && String(note).trim(), 'Catatan klarifikasi atau kendala wajib diisi.');
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r, 'Resep tidak ditemukan.');

    r.clarification = {
      requestedAt: FVStore.stamp(),
      pharmacist: AD.actor(),
      pharmacistId: AD.actorId(),
      note: String(note).trim(),
      status: 'Menunggu Tanggapan',
    };
    r.updatedAt = FVStore.stamp();

    FVStore.commit({ [FVStore.key]: s });
    AD.log.add('Farmasi', `Permintaan klarifikasi resep ${r.id} kepada ${r.doctor}: ${note.trim().slice(0, 60)}`);
    return r;
  };

  const resolveClarification = (id, resolutionNote = '') => {
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r && r.clarification, 'Tidak ada klarifikasi aktif pada resep ini.');

    r.clarification.status = 'Selesai';
    r.clarification.resolutionNote = String(resolutionNote || '').trim() || 'Telah diklarifikasi.';
    r.clarification.resolvedAt = FVStore.stamp();
    r.clarification.resolvedBy = AD.actor();
    r.updatedAt = FVStore.stamp();

    FVStore.commit({ [FVStore.key]: s });
    AD.log.add('Farmasi', `Klarifikasi resep ${r.id} diselesaikan`);
    return r;
  };

  const dispense = (id, { items = [], notes = '', recipientName = '' } = {}) => {
    AD.require(PERM.DISPENSE);
    const s = FVStore.state();
    const r = s.prescriptions.find((x) => x.id === id);
    FVStore.require(r, 'Resep tidak ditemukan.');
    
    // Prevent duplicate dispensing
    FVStore.require(
      r.status !== 'Diserahkan',
      'Resep ini sudah diserahkan sebelumnya. Penyerahan ganda dicegah.'
    );

    const rxEnriched = enrichRx(r, s);
    const products = loadProducts();

    // Verify and apply items
    const dispItems = r.items.map((it) => {
      const match = items.find((x) => x.productId === it.productId);
      const dispQty = match && match.dispensedQuantity !== undefined
        ? Number(match.dispensedQuantity)
        : (it.preparedQuantity !== undefined ? it.preparedQuantity : it.quantity);
      
      FVStore.require(
        Number.isInteger(dispQty) && dispQty >= 0,
        `Jumlah penyerahan untuk ${it.name} tidak valid.`
      );
      
      const batchId = match?.batchId || it.batchId;
      return {
        productId: it.productId,
        name: it.name,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        prescribedQuantity: it.quantity,
        preparedQuantity: it.preparedQuantity !== undefined ? it.preparedQuantity : it.quantity,
        dispensedQuantity: dispQty,
        batchId: batchId || '',
        instructions: it.instructions || '',
      };
    });

    // Deduct stock for each dispensed medicine
    dispItems.forEach((it) => {
      if (it.dispensedQuantity > 0) {
        FVStore.movement(s, products, {
          productId: it.productId,
          batchId: it.batchId || undefined,
          delta: -it.dispensedQuantity,
          reason: `Penyerahan resep oleh apoteker (${r.id})`,
          source: 'dispense:' + r.id,
          staff: AD.actor(),
        });
      }
    });

    const dispId = FVStore.uid('DISP');
    const dispRecord = {
      id: dispId,
      prescriptionId: r.id,
      bookingCode: r.bookingCode,
      medicalId: r.medicalId,
      patientName: rxEnriched.petName,
      species: rxEnriched.species,
      customerName: rxEnriched.customerName,
      customerPhone: rxEnriched.customerPhone,
      doctor: r.doctor,
      pharmacist: AD.actor(),
      pharmacistId: AD.actorId(),
      dispensedAt: FVStore.stamp(),
      recipientName: String(recipientName || rxEnriched.customerName).trim(),
      items: dispItems,
      notes: String(notes || r.preparationNotes || '').trim(),
    };

    if (!Array.isArray(s.dispenses)) s.dispenses = [];
    s.dispenses.unshift(dispRecord);

    r.status = 'Diserahkan';
    r.dispensedAt = FVStore.stamp();
    r.dispensedBy = AD.actor();
    r.dispenseId = dispId;
    r.updatedAt = FVStore.stamp();

    FVStore.commit({ [FVStore.key]: s, fv_products: products });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);

    AD.log.add('Farmasi', `Penyerahan obat resep ${r.id} kepada ${dispRecord.recipientName} (${dispRecord.patientName})`);
    return dispRecord;
  };

  const dispenses = () => {
    const s = FVStore.state();
    return (s.dispenses || []).slice().sort((a, b) => (b.dispensedAt || '').localeCompare(a.dispensedAt || ''));
  };

  const medications = (filter = {}) => {
    const s = FVStore.state();
    const today = todayISO();
    let meds = PRODUCTS.filter((p) => p.cat === 'obat').map((p) => {
      const batches = s.batches.filter((b) => b.productId === p.id && b.quantity > 0);
      const isExpSoon = AD.stock.expiry(p) === 'warn';
      const isExpired = batches.some((b) => b.expiry && b.expiry < today);
      const statusKey = stockStatus(p);
      return {
        ...p,
        batches,
        isExpSoon,
        isExpired,
        stockStatusKey: statusKey,
      };
    });

    if (filter.q) {
      const q = filter.q.toLowerCase().trim();
      meds = meds.filter((m) => m.name.toLowerCase().includes(q) || (m.batch && m.batch.toLowerCase().includes(q)));
    }

    if (filter.tab === 'low') {
      meds = meds.filter((m) => m.stockStatusKey === 'kurang' || m.stockStatusKey === 'habis');
    } else if (filter.tab === 'exp') {
      meds = meds.filter((m) => m.isExpSoon || m.isExpired);
    }

    return meds;
  };

  const stats = () => {
    const s = FVStore.state();
    const rxList = (s.prescriptions || []).map((r) => normStatus(r.status));
    const meds = PRODUCTS.filter((p) => p.cat === 'obat');
    const lowStock = meds.filter((p) => p.stock < p.min).length;
    const expSoon = meds.filter((p) => AD.stock.expiry(p) === 'warn').length;

    return {
      total: rxList.length,
      pending: rxList.filter((st) => st === 'Pending').length,
      processing: rxList.filter((st) => st === 'Processing').length,
      ready: rxList.filter((st) => st === 'Ready').length,
      dispensed: rxList.filter((st) => st === 'Dispensed').length,
      cancelled: rxList.filter((st) => st === 'Cancelled').length,
      lowStock,
      expSoon,
      totalDispenses: (s.dispenses || []).length,
    };
  };

  return {
    prescriptions,
    get,
    checkStock,
    startPreparation,
    savePreparation,
    flagClarification,
    resolveClarification,
    dispense,
    dispenses,
    medications,
    stats,
    normStatus,
  };
})();
