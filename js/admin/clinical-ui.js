/* Clinical forms remain unavailable to Admin and nonclinical roles by explicit policy. */
AD.clinicalForm = (code) => {
  AD.require(PERM.CLINIC);
  const b = AD.bookings.get(code);
  FVStore.require(
    AD.assigned(b) || FVStore.state().medical.some((m) => m.bookingCode === code && AD.owns(m, 'doctor')),
    'Pasien ini ditugaskan kepada dokter lain.',
  );
  const s = FVStore.state(),
    m = s.medical.find((m) => m.bookingCode === code),
    rx = s.prescriptions.find((r) => r.medicalId === m?.id);
  const history = s.medical.filter((x) => x.petId === b.petId && x.status === 'Final');
  const historyHtml = `<h3 class="ds-title">Riwayat medis pasien</h3>${
    history.length
      ? history
          .map(
            (x) =>
              `<article class="note-box"><strong>${esc(x.examinationDate)} · ${esc(x.doctor)}</strong><p>Diagnosis: ${esc(x.diagnosis)}</p><p>Pemeriksaan: ${esc(x.physical)}</p><p>Tindakan: ${esc(x.procedures)}</p><p>Instruksi: ${esc(x.followUp)}</p>${s.amendments
                .filter((a) => a.medicalId === x.id)
                .map((a) => `<p>Addendum ${fmtDateTime(a.createdAt)}: ${esc(a.text)} — ${esc(a.doctor)}</p>`)
                .join('')}</article>`,
          )
          .join('')
      : '<p class="muted">Belum ada rekam medis final.</p>'
  }`;
  const patient = `<dl class="kvs"><div class="kv"><dt>Hewan</dt><dd>${esc(b.hewan)} · ${esc(b.spesie)} · ${esc(b.ras || '—')}</dd></div><div class="kv"><dt>Pemilik</dt><dd>${esc(b.pelanggan)} · ${esc(b.hp)}</dd></div><div class="kv"><dt>Booking / dokter</dt><dd>${esc(code)} · ${esc(b.petugas)}</dd></div></dl><h3 class="ds-title">Keluhan awal</h3><p class="note-box">${esc(b.catatan || 'Tidak ada keluhan tercatat.')}</p>`;
  if (m?.status === 'Final') {
    const details = `${patient}${historyHtml}<h3 class="ds-title">Pemeriksaan final — ${esc(m.id)}</h3><dl class="kvs">${[
      ['Anamnesis', m.anamnesis],
      ['Berat badan (kg)', m.weight],
      ['Suhu tubuh (°C)', m.temperature],
      ['Catatan dokter', m.notes],
      ['Tanggal kontrol', m.followUpDate],
      ['Dibuat', fmtDateTime(m.createdAt)],
      ['Diperbarui', fmtDateTime(m.updatedAt)],
    ]
      .map(([label, value]) => `<div class="kv"><dt>${esc(label)}</dt><dd>${esc(value || '—')}</dd></div>`)
      .join(
        '',
      )}</dl><h3 class="ds-title">Resep</h3>${rx?.items.map((i) => `<p>${esc(i.name)} × ${i.quantity} · ${esc(i.dosage)} · ${esc(i.route)} · ${esc(i.frequency)} · ${esc(i.duration)} · ${esc(i.instructions)}</p>`).join('') || '<p>Tanpa obat.</p>'}`;
    if (!AD.owns(m, 'doctor'))
      return UI.modal({ title: 'Rekam medis final', body: details, actions: [{ label: 'Tutup' }] });
    return W.form(
      'Rekam medis final — ' + m.id,
      details + W.text('addendum', 'Addendum koreksi (rekam asli tetap tersimpan)'),
      (v) => AD.clinic.amend(m.id, v('addendum')),
      'Tambah addendum',
    );
  }
  const medicineOptions = PRODUCTS.filter((p) => p.cat === 'obat' && p.aktif !== false).map((p) => [
    String(p.id),
    p.name,
  ]);
  let counter = 0;
  const line = (i) => {
    const n = counter++;
    return `<fieldset class="rx-line" data-rx="${n}"><legend>Obat ${n + 1}</legend>${W.select('rxProduct' + n, 'Obat dari katalog', medicineOptions, String(i?.productId || medicineOptions[0]?.[0] || ''))}<div class="row2">${W.field('rxDose' + n, 'Dosis', i?.dosage || '', 'text', 'required')}${W.field('rxRoute' + n, 'Rute', i?.route || '', 'text', 'required')}</div><div class="row2">${W.field('rxFreq' + n, 'Frekuensi', i?.frequency || '', 'text', 'required')}${W.field('rxDuration' + n, 'Durasi', i?.duration || '', 'text', 'required')}</div><div class="row2">${W.field('rxQty' + n, 'Jumlah unit', i?.quantity || 1, 'number', 'min="1" step="1" required')}${W.field('rxInstructions' + n, 'Instruksi khusus', i?.instructions || '')}</div><button type="button" class="btn btn-outline btn-sm" data-remove-rx>Hapus obat</button></fieldset>`;
  };
  let final = false;
  W.form(
    'Pemeriksaan — ' + b.hewan,
    `${patient}${historyHtml}<h3 class="ds-title">Pemeriksaan terstruktur</h3><p class="muted">Dokter: ${esc(AD.actor())} · ${todayISO()} · ${m ? esc(m.id) : 'Nomor rekam dibuat saat menyimpan'}. Draft boleh dilengkapi bertahap.</p>${W.text('anamnesis', 'Anamnesis / riwayat', m?.anamnesis)}<div class="row2">${W.field('weight', 'Berat badan (kg)', m?.weight || b.berat || '', 'number', 'min="0.1" max="1000" step="0.1"')}${W.field('temperature', 'Suhu tubuh (°C)', m?.temperature || '', 'number', 'min="20" max="50" step="0.1"')}</div>${W.text('physical', 'Pemeriksaan fisik', m?.physical)}${W.text('diagnosis', 'Diagnosis / asesmen', m?.diagnosis)}${W.text('procedures', 'Tindakan / prosedur', m?.procedures)}${W.field('procedureFee', 'Biaya tindakan tambahan (Rp)', m?.procedureFee || 0, 'number', 'min="0" step="1"')}${W.text('notes', 'Catatan dokter', m?.notes)}${W.text('followUp', 'Instruksi tindak lanjut', m?.followUp)}${W.field('followUpDate', 'Rekomendasi tanggal kontrol', m?.followUpDate || '', 'date')}<h3 class="ds-title">Resep obat</h3><p class="muted">Resep tidak mengurangi stok. Inventory menyerahkan obat setelah invoice dibayar.</p><div id="rxLines">${rx?.items.map(line).join('') || ''}</div><button type="button" class="btn btn-outline" id="rxAdd">Tambah obat</button><div class="field"><label class="check"><input type="checkbox" id="finalRecord"> Finalisasi pemeriksaan & kirim tagihan ke kasir</label><p class="muted small">Rekam final tidak dapat ditimpa. Koreksi berikutnya menggunakan addendum.</p></div>`,
    (v, el) => {
      const fields = {};
      [
        'anamnesis',
        'weight',
        'temperature',
        'physical',
        'diagnosis',
        'procedures',
        'procedureFee',
        'notes',
        'followUp',
        'followUpDate',
      ].forEach((k) => (fields[k] = v(k)));
      const items = $qa('[data-rx]', el).map((row) => {
        const n = row.dataset.rx;
        return {
          productId: +v('rxProduct' + n),
          dosage: v('rxDose' + n),
          route: v('rxRoute' + n),
          frequency: v('rxFreq' + n),
          duration: v('rxDuration' + n),
          quantity: +v('rxQty' + n),
          instructions: v('rxInstructions' + n),
        };
      });
      final = $q('#finalRecord', el).checked;
      AD.clinic.save(code, fields, items, final);
    },
    'Simpan pemeriksaan',
    (el) => {
      $q('#rxAdd', el).onclick = () => {
        $q('#rxLines', el).insertAdjacentHTML('beforeend', line());
      };
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-rx]')) e.target.closest('[data-rx]').remove();
      });
    },
  );
};
Pages.medis = {
  title: 'Rekam Medis',
  render(view) {
    W.table(
      view,
      'Rekam dokter aktif dan riwayat pasien yang ditugaskan. Koreksi rekam final melalui addendum.',
      AD.clinic.records(),
      [
        {
          key: 'id',
          label: 'Rekam',
          render: (m) => `${esc(m.id)}<small class="sub">${esc(m.examinationDate)}</small>`,
        },
        {
          key: 'pet',
          label: 'Pasien / dokter',
          render: (m) =>
            `${esc(FVStore.state().pets.find((p) => p.id === m.petId)?.nama || m.petId)}<small class="sub">${esc(m.doctor)}</small>`,
        },
        { key: 'diagnosis', label: 'Diagnosis', render: (m) => esc(m.diagnosis || 'Draft belum dilengkapi') },
        { key: 'status', label: 'Status', render: (m) => UI.chip(m.status) },
        { key: 'actions', label: 'Aksi', render: (m) => W.button('Buka pasien', 'clinical', m.bookingCode) },
      ],
    );
  },
};
Pages.resep = {
  title: 'Resep Obat',
  render(view) {
    AD.require(PERM.CLINIC);
    const s = FVStore.state();
    W.table(
      view,
      'Resep dibuat melalui pemeriksaan. Stok berkurang hanya saat obat diserahkan.',
      s.prescriptions.filter((r) => AD.owns(r, 'doctor')),
      [
        { key: 'id', label: 'Resep', render: (r) => esc(r.id) },
        {
          key: 'items',
          label: 'Obat & aturan pakai',
          render: (r) =>
            r.items
              .map(
                (i) =>
                  `${esc(i.name)} × ${i.quantity}<small class="sub">${esc(i.dosage)} · ${esc(i.route)} · ${esc(i.frequency)} · ${esc(i.duration)}</small>`,
              )
              .join('<br>'),
        },
        { key: 'status', label: 'Status', render: (r) => UI.chip(r.status) },
        {
          key: 'actions',
          label: 'Aksi',
          render: (r) => W.button('Rekam terkait', 'clinical', r.bookingCode),
        },
      ],
    );
  },
};
