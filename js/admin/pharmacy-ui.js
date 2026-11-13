/* ============================================================
   FILOSOVET ADMIN — pharmacy-ui.js
   Antarmuka pengguna (UI) Dashboard Apoteker / Farmasi.
   Halaman antrean resep, visibilitas stok obat baca-saja,
   riwayat dispensing, serta modal penyiapan dan penyerahan obat.
   ============================================================ */
AD.pharmacyUI = (() => {
  let activeTab = 'Semua';
  let activeMedTab = 'all';
  const openPharmacyModal = (options) => UI.modal({
    ...options,
    onOpen: (el, close) => {
      $q('.modal', el)?.classList.add('pharmacy-modal');
      options.onOpen?.(el, close);
    },
  });

  /* ---------- Halaman Antrean Resep ---------- */
  const renderQueue = (view, params = {}) => {
    AD.require(PERM.DISPENSE);
    if (params.status) activeTab = params.status;

    const stats = AD.pharmacy.stats();
    const tabs = [
      ['Semua', `Semua (${stats.total})`],
      ['Pending', `Menunggu (${stats.pending})`],
      ['Processing', `Diproses (${stats.processing})`],
      ['Ready', `Siap Diserahkan (${stats.ready})`],
      ['Dispensed', `Diserahkan (${stats.dispensed})`],
    ];

    view.innerHTML = `<div class="pharmacy-module pharmacy-page pharmacy-queue">
      <div class="page-bar">
        <div>
          <p class="muted">Antrean resep masuk dari dokter pemeriksaan klinis</p>
        </div>
      </div>
      <section class="panel">
        <div class="tabs" role="tablist" style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">
          ${tabs
            .map(
              ([key, label]) =>
                `<button type="button" class="btn btn-${activeTab === key ? 'primary' : 'outline'} btn-sm" data-ptab="${key}">${esc(label)}</button>`
            )
            .join('')}
        </div>
        <div class="filters" style="display:flex;gap:12px;margin-bottom:16px;">
          <div class="search-field" style="flex:1;">
            <label for="rxSearch" class="sr-only">Cari resep, pasien, dokter, atau obat</label>
            ${ico('search', 16)}
            <input type="search" id="rxSearch" placeholder="Cari kode resep, pasien, pemilik, dokter, atau nama obat…" autocomplete="off">
          </div>
        </div>
        <div id="rxTableWrap"></div>
      </section>
    </div>`;

    const draw = () => {
      const q = $q('#rxSearch', view)?.value || '';
      const list = AD.pharmacy.prescriptions({ status: activeTab, q });

      UI.table($q('#rxTableWrap', view), {
        id: 'rx-queue-table',
        rows: list,
        pageSize: 8,
        empty: {
          title: 'Tidak ada resep yang sesuai',
          msg: activeTab === 'Semua'
            ? 'Belum ada resep yang diterbitkan oleh dokter.'
            : `Tidak ada resep berstatus "${activeTab}".`,
        },
        columns: [
          {
            key: 'id',
            label: 'ID Resep & Tgl',
            render: (r) => `<strong>${esc(r.id)}</strong><small class="sub">${fmtDateTime(r.createdAt || todayISO())}</small>`,
          },
          {
            key: 'patient',
            label: 'Pasien & Pemilik',
            render: (r) => `<strong>${esc(r.petName)}</strong> (${esc(r.species)})<small class="sub">${esc(r.customerName)} · ${esc(r.customerPhone)}</small>`,
          },
          {
            key: 'doctor',
            label: 'Dokter Peresep',
            render: (r) => `<strong>${esc(r.doctor)}</strong><small class="sub">Ref: ${esc(r.bookingCode || '—')}</small>`,
          },
          {
            key: 'items',
            label: 'Obat & Aturan Pakai',
            render: (r) =>
              (r.items || [])
                .map(
                  (i) =>
                    `${esc(i.name)} × ${i.quantity}<small class="sub">${esc(i.dosage || '')} · ${esc(i.frequency || '')}</small>`
                )
                .join('<br>'),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => {
              let chipHtml = UI.chip(r.normalizedStatus);
              if (r.clarification && r.clarification.status === 'Menunggu Tanggapan') {
                chipHtml += `<br><span class="chip chip-bad-outline" style="margin-top:4px;font-size:11px;">Perlu Klarifikasi</span>`;
              }
              return chipHtml;
            },
          },
          {
            key: 'action',
            label: 'Aksi',
            render: (r) => {
              const acts = [];
              if (r.normalizedStatus === 'Pending') {
                acts.push(W.button('Proses', 'rxprep', r.id, 'primary'));
              } else if (r.normalizedStatus === 'Processing') {
                acts.push(W.button('Lanjut Siapkan', 'rxprep', r.id, 'primary'));
              } else if (r.normalizedStatus === 'Ready') {
                acts.push(W.button('Serahkan Obat', 'rxdispense', r.id, 'primary'));
              } else if (r.normalizedStatus === 'Dispensed') {
                acts.push(W.button('Bukti', 'dispenseproof', r.dispenseId || r.id, 'outline'));
              }
              acts.push(W.button('Detail', 'rxopen', r.id, 'outline'));
              return acts.join(' ');
            },
          },
        ],
      });
    };

    $qa('[data-ptab]', view).forEach((btn) => {
      btn.onclick = () => {
        activeTab = btn.dataset.ptab;
        $qa('[data-ptab]', view).forEach((b) => {
          b.className = `btn btn-${b.dataset.ptab === activeTab ? 'primary' : 'outline'} btn-sm`;
        });
        UI.resetPage('rx-queue-table');
        draw();
      };
    });

    $q('#rxSearch', view).oninput = () => {
      UI.resetPage('rx-queue-table');
      draw();
    };

    draw();
  };

  /* ---------- Halaman Visibilitas Stok Obat (Read-Only) ---------- */
  const renderMedicationStock = (view) => {
    AD.require(PERM.DISPENSE);
    const stats = AD.pharmacy.stats();
    const tabs = [
      ['all', 'Semua Obat'],
      ['low', `Stok Menipis / Habis (${stats.lowStock})`],
      ['exp', `Mendekati Kedaluwarsa (${stats.expSoon})`],
    ];

    view.innerHTML = `<div class="pharmacy-module pharmacy-page pharmacy-stock">
      <div class="page-bar">
        <div>
          <p class="muted">Ketersediaan obat, batch aktif, dan masa kedaluwarsa</p>
        </div>
      </div>
      <div class="banner info" style="margin-bottom:16px;padding:12px 16px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius);">
        <p class="small muted" style="margin:0;">
          <strong>Akses Visibilitas Farmasi (Read-Only):</strong> Apoteker memiliki hak baca penuh untuk memverifikasi stok, batch, dan tanggal kedaluwarsa sebelum peracikan. Pengelolaan katalog produk, pemesanan supplier, dan penyesuaian stok opname manual dikelola secara eksklusif oleh <strong>Inventory Staff</strong>.
        </p>
      </div>
      <section class="panel">
        <div class="tabs" role="tablist" style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">
          ${tabs
            .map(
              ([key, label]) =>
                `<button type="button" class="btn btn-${activeMedTab === key ? 'primary' : 'outline'} btn-sm" data-mtab="${key}">${esc(label)}</button>`
            )
            .join('')}
        </div>
        <div class="filters" style="display:flex;gap:12px;margin-bottom:16px;">
          <div class="search-field" style="flex:1;">
            <label for="medSearch" class="sr-only">Cari obat atau batch</label>
            ${ico('search', 16)}
            <input type="search" id="medSearch" placeholder="Cari nama obat atau nomor batch…" autocomplete="off">
          </div>
        </div>
        <div id="medTableWrap"></div>
      </section>
    </div>`;

    const draw = () => {
      const q = $q('#medSearch', view)?.value || '';
      const list = AD.pharmacy.medications({ tab: activeMedTab, q });

      UI.table($q('#medTableWrap', view), {
        id: 'med-stock-table',
        rows: list,
        pageSize: 8,
        empty: {
          title: 'Tidak ada data obat',
          msg: 'Semua obat dalam kondisi normal atau tidak ada obat yang sesuai filter.',
        },
        columns: [
          {
            key: 'name',
            label: 'Nama Obat & Kemasan',
            render: (m) => `<strong>${esc(m.name)}</strong><small class="sub">Harga: ${rp(m.price)} · ${m.resep ? 'Wajib Resep Dokter' : 'Bebas Terbatas'}</small>`,
          },
          {
            key: 'stock',
            label: 'Stok Tersedia',
            render: (m) => `<strong>${m.stock}</strong> unit<small class="sub">Min: ${m.min}</small>`,
          },
          {
            key: 'status',
            label: 'Status Stok',
            render: (m) => UI.stockChip(m),
          },
          {
            key: 'batch',
            label: 'Batch Aktif & Expired',
            render: (m) => {
              const b = m.batches[0];
              if (!b) return '<span class="muted">—</span>';
              const expChip = m.isExpSoon
                ? `<br><span class="chip chip-warn" style="font-size:11px;">Mendekati Exp (${fmtDate(b.expiry)})</span>`
                : `<small class="sub">Exp: ${fmtDate(b.expiry || m.exp || '—')}</small>`;
              return `<code>${esc(b.id)}</code> (${b.quantity} unit)${expChip}`;
            },
          },
          {
            key: 'action',
            label: 'Rincian',
            render: (m) => W.button('Lihat Batch', 'medbatches', String(m.id), 'outline'),
          },
        ],
      });
    };

    $qa('[data-mtab]', view).forEach((btn) => {
      btn.onclick = () => {
        activeMedTab = btn.dataset.mtab;
        $qa('[data-mtab]', view).forEach((b) => {
          b.className = `btn btn-${b.dataset.mtab === activeMedTab ? 'primary' : 'outline'} btn-sm`;
        });
        UI.resetPage('med-stock-table');
        draw();
      };
    });

    $q('#medSearch', view).oninput = () => {
      UI.resetPage('med-stock-table');
      draw();
    };

    draw();
  };

  /* ---------- Halaman Riwayat Dispensing ---------- */
  const renderDispensingHistory = (view) => {
    AD.require(PERM.DISPENSE);
    view.innerHTML = `<div class="pharmacy-module pharmacy-page pharmacy-history">
      <div class="page-bar">
        <div>
          <p class="muted">Catatan penyerahan obat resep kepada pasien / pemilik</p>
        </div>
      </div>
      <section class="panel">
        <div class="filters" style="display:flex;gap:12px;margin-bottom:16px;">
          <div class="search-field" style="flex:1;">
            <label for="dispSearch" class="sr-only">Cari riwayat dispensing</label>
            ${ico('search', 16)}
            <input type="search" id="dispSearch" placeholder="Cari ID dispensing, nomor resep, pasien, atau penerima…" autocomplete="off">
          </div>
        </div>
        <div id="dispTableWrap"></div>
      </section>
    </div>`;

    const draw = () => {
      const q = $q('#dispSearch', view)?.value.toLowerCase().trim() || '';
      let list = AD.pharmacy.dispenses();
      if (q) {
        list = list.filter((d) =>
          [d.id, d.prescriptionId, d.patientName, d.customerName, d.recipientName, d.pharmacist]
            .some((val) => String(val || '').toLowerCase().includes(q))
        );
      }

      UI.table($q('#dispTableWrap', view), {
        id: 'disp-history-table',
        rows: list,
        pageSize: 8,
        empty: {
          title: 'Belum ada riwayat penyerahan',
          msg: 'Catatan penyerahan obat akan tercatat di sini setelah resep diserahkan.',
        },
        columns: [
          {
            key: 'id',
            label: 'ID & Waktu',
            render: (d) => `<strong>${esc(d.id)}</strong><small class="sub">${fmtDateTime(d.dispensedAt)}</small>`,
          },
          {
            key: 'rx',
            label: 'Resep Terkait',
            render: (d) => `<code>${esc(d.prescriptionId)}</code><small class="sub">Dokter: ${esc(d.doctor || '—')}</small>`,
          },
          {
            key: 'patient',
            label: 'Pasien & Penerima',
            render: (d) => `<strong>${esc(d.patientName)}</strong><small class="sub">Penerima: ${esc(d.recipientName || d.customerName)}</small>`,
          },
          {
            key: 'items',
            label: 'Obat yang Diserahkan',
            render: (d) =>
              (d.items || [])
                .map((i) => `${esc(i.name)} × ${i.dispensedQuantity || i.quantity || 1}`)
                .join('<br>'),
          },
          {
            key: 'pharmacist',
            label: 'Apoteker',
            render: (d) => `${esc(d.pharmacist)}<small class="sub">Status: Selesai</small>`,
          },
          {
            key: 'action',
            label: 'Aksi',
            render: (d) => W.button('Bukti Penyerahan', 'dispenseproof', d.id, 'outline'),
          },
        ],
      });
    };

    $q('#dispSearch', view).oninput = () => {
      UI.resetPage('disp-history-table');
      draw();
    };

    draw();
  };

  /* ---------- Modal: Detail Resep ---------- */
  const openPrescription = (id) => {
    const rx = AD.pharmacy.get(id);

    let itemsTable = `
      <div class="tbl-wrap" style="margin:16px 0;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Obat & Dosis</th>
              <th>Aturan Pakai</th>
              <th>Jml Resep</th>
              <th>Stok Tersedia</th>
              <th>Status Stok</th>
            </tr>
          </thead>
          <tbody>
            ${rx.items
              .map((it) => {
                const stockCheck = AD.pharmacy.checkStock(it.productId, it.quantity);
                const isSufficient = stockCheck.isSufficient;
                const statusBadge = isSufficient
                  ? `<span class="chip chip-ok" style="font-size:11px;">Tersedia (${stockCheck.stock})</span>`
                  : `<span class="chip chip-bad" style="font-size:11px;">Kurang (${stockCheck.stock}/${it.quantity})</span>`;
                return `
                  <tr>
                    <td><strong>${esc(it.name)}</strong><small class="sub">${esc(it.dosage || 'Sesuai resep')} · Rute: ${esc(it.route || 'Oral')}</small></td>
                    <td>${esc(it.frequency || '—')}<small class="sub">Durasi: ${esc(it.duration || '—')}</small></td>
                    <td><strong>${it.quantity}</strong> unit</td>
                    <td>${stockCheck.stock} unit</td>
                    <td>${statusBadge}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    let clarificationBox = '';
    if (rx.clarification) {
      clarificationBox = `
        <div class="banner ${rx.clarification.status === 'Selesai' ? 'ok' : 'warn'}" style="margin:16px 0;padding:12px 14px;border-radius:var(--radius);border:1px solid var(--border);">
          <strong>Catatan Klarifikasi dengan Dokter (${esc(rx.clarification.status)}):</strong>
          <p style="margin:4px 0 0 0;">${esc(rx.clarification.note)}</p>
          <small class="sub">Diajukan oleh: ${esc(rx.clarification.pharmacist)} · ${fmtDateTime(rx.clarification.requestedAt)}</small>
          ${rx.clarification.resolutionNote ? `<p style="margin:6px 0 0 0;color:var(--text);"><strong>Tanggapan Dokter:</strong> ${esc(rx.clarification.resolutionNote)}</p>` : ''}
        </div>
      `;
    }

    const body = `
      <div class="pharmacy-info-grid">
        <div class="pharmacy-info-card">
          <h3 style="margin-top:0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);">Informasi Pasien</h3>
          <p><strong>Nama Hewan:</strong> ${esc(rx.petName)} (${esc(rx.species)} - ${esc(rx.breed)})</p>
          <p><strong>Pemilik:</strong> ${esc(rx.customerName)} (${esc(rx.customerPhone)})</p>
          <p><strong>Keluhan Awal:</strong> ${esc(rx.chiefComplaint)}</p>
        </div>
        <div class="pharmacy-info-card">
          <h3 style="margin-top:0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text);">Informasi Dokter & Diagnosa</h3>
          <p><strong>Dokter Peresep:</strong> ${esc(rx.doctor)}</p>
          <p><strong>Tanggal Pemeriksaan:</strong> ${fmtDate(rx.examinationDate)}</p>
          <p><strong>Diagnosa Dokter:</strong> <em>${esc(rx.diagnosis)}</em></p>
          <p><small class="sub">BB: ${esc(rx.weight)} kg · Suhu: ${esc(rx.temperature)} °C</small></p>
        </div>
      </div>

      <div style="margin-top:16px;">
        <h3 style="margin-bottom:8px;font-size:15px;">Daftar Obat yang Diresepkan</h3>
        <p class="muted small">Apoteker tidak diperkenankan mengubah resep asli dokter secara sepihak. Jika stok obat tidak memadai atau membutuhkan konfirmasi, ajukan klarifikasi.</p>
        ${itemsTable}
      </div>

      ${rx.preparationNotes ? `<div class="panel work-pad" style="margin-top:12px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);"><strong>Catatan Penyiapan / Racikan Apoteker:</strong><p style="margin:4px 0 0 0;">${esc(rx.preparationNotes)}</p></div>` : ''}

      ${clarificationBox}
    `;

    const actions = [{ label: 'Tutup', kind: 'outline' }];

    if (rx.normalizedStatus === 'Pending') {
      actions.push({
        label: 'Minta Klarifikasi Dokter',
        kind: 'outline',
        onClick: (close) => {
          close();
          openClarificationModal(rx.id);
        },
      });
      actions.push({
        label: 'Mulai Penyiapan',
        kind: 'primary',
        onClick: (close) => {
          close();
          openPreparationModal(rx.id);
        },
      });
    } else if (rx.normalizedStatus === 'Processing') {
      actions.push({
        label: 'Minta Klarifikasi Dokter',
        kind: 'outline',
        onClick: (close) => {
          close();
          openClarificationModal(rx.id);
        },
      });
      actions.push({
        label: 'Lanjutkan & Selesaikan Penyiapan',
        kind: 'primary',
        onClick: (close) => {
          close();
          openPreparationModal(rx.id);
        },
      });
    } else if (rx.normalizedStatus === 'Ready') {
      actions.push({
        label: 'Konfirmasi Penyerahan Obat',
        kind: 'primary',
        onClick: (close) => {
          close();
          openDispenseModal(rx.id);
        },
      });
    } else if (rx.normalizedStatus === 'Dispensed') {
      actions.push({
        label: 'Lihat Bukti Penyerahan',
        kind: 'primary',
        onClick: (close) => {
          close();
          openDispenseDetail(rx.dispenseId || rx.id);
        },
      });
    }

    openPharmacyModal({
      title: `Detail Resep: ${rx.id}`,
      titleBadge: {
        text: ({ Pending: 'Menunggu', Processing: 'Diproses', Ready: 'Siap', Dispensed: 'Diserahkan', Cancelled: 'Dibatalkan' }[rx.normalizedStatus] || rx.normalizedStatus),
        className: `chip-${({ Pending: 'warn', Processing: 'solid', Ready: 'ok-outline', Dispensed: 'ok', Cancelled: 'bad' }[rx.normalizedStatus] || 'neutral')}`,
      },
      size: 'lg',
      body,
      actions,
    });
  };

  /* ---------- Modal: Penyiapan Obat (Preparation) ---------- */
  const openPreparationModal = (id) => {
    AD.require(PERM.DISPENSE);
    const rx = AD.pharmacy.get(id);

    // If still pending, transition to processing automatically
    if (rx.normalizedStatus === 'Pending') {
      AD.pharmacy.startPreparation(rx.id);
    }

    const itemsFields = rx.items
      .map((it, idx) => {
        const stockCheck = AD.pharmacy.checkStock(it.productId, it.quantity);
        const usableBatches = stockCheck.batches.filter((b) => !b.expiry || b.expiry >= todayISO());
        const batchOptions = usableBatches.length
          ? usableBatches.map((b) => `<option value="${esc(b.id)}" ${b.id === it.batchId ? 'selected' : ''}>${esc(b.id)} (Sisa: ${b.quantity}, Exp: ${fmtDate(b.expiry)})</option>`).join('')
          : '<option value="">Tidak ada batch terdaftar</option>';

        return `
          <div class="pharmacy-form-card" style="padding:12px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <strong>${idx + 1}. ${esc(it.name)}</strong>
                <p class="muted small" style="margin:2px 0 0 0;">Dosis: ${esc(it.dosage || '—')} · ${esc(it.frequency || '—')} (${esc(it.duration || '—')})</p>
                <p class="small" style="margin:2px 0 0 0;color:var(--muted);">Jumlah diresepkan dokter: <strong>${it.quantity}</strong> unit</p>
              </div>
              <div>
                ${stockCheck.isSufficient
                  ? `<span class="chip chip-ok" style="font-size:11px;">Stok Cukup (${stockCheck.stock})</span>`
                  : `<span class="chip chip-bad" style="font-size:11px;">Stok Kurang (${stockCheck.stock}/${it.quantity})</span>`}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
              <div class="field">
                <label for="prepQty_${it.productId}">Jumlah Disiapkan (unit)</label>
                <input type="number" id="prepQty_${it.productId}" min="0" max="${stockCheck.stock}" value="${it.preparedQuantity !== undefined ? it.preparedQuantity : it.quantity}" required>
              </div>
              <div class="field">
                <label for="prepBatch_${it.productId}">Pilih Batch Obat</label>
                <select id="prepBatch_${it.productId}">
                  ${batchOptions}
                </select>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const body = `
      <form id="formPreparation" class="work-form">
        <p class="muted small" style="margin-top:0;">Pastikan obat disiapkan sesuai etiket dan dosis resep. Apoteker mencatat jumlah aktual yang disiapkan tanpa mengubah data resep asli dokter.</p>
        <div style="margin-bottom:16px;">
          ${itemsFields}
        </div>
        <div class="field">
          <label for="prepNotes">Catatan Penyiapan / Instruksi Peracikan</label>
          <textarea id="prepNotes" rows="3" placeholder="Contoh: Diracik puyer 10 bungkus, etiket putih diminum sesudah makan...">${esc(rx.preparationNotes || '')}</textarea>
        </div>
        <p class="field-error prep-error" role="alert"></p>
      </form>
    `;

    openPharmacyModal({
      title: `Penyiapan Obat — Resep ${rx.id}`,
      size: 'lg',
      body,
      actions: [
        { label: 'Batal', kind: 'outline' },
        {
          label: 'Minta Klarifikasi Dokter',
          kind: 'outline',
          onClick: (close) => {
            close();
            openClarificationModal(rx.id);
          },
        },
        {
          label: 'Tandai Siap Diserahkan',
          kind: 'primary',
          onClick: (close, el) => {
            try {
              const form = $q('#formPreparation', el);
              if (!form.reportValidity()) return;

              const itemsToSave = rx.items.map((it) => {
                const prepInput = $q(`#prepQty_${it.productId}`, el);
                const batchInput = $q(`#prepBatch_${it.productId}`, el);
                return {
                  productId: it.productId,
                  preparedQuantity: Number(prepInput?.value || 0),
                  batchId: batchInput?.value || '',
                };
              });

              const notes = $q('#prepNotes', el)?.value || '';
              AD.pharmacy.savePreparation(rx.id, { items: itemsToSave, notes });

              close();
              AD.refresh();
              UI.toast('Resep selesai disiapkan dan ditandai Siap diserahkan.');
            } catch (err) {
              $q('.prep-error', el).textContent = err.message;
            }
          },
        },
      ],
    });
  };

  /* ---------- Modal: Konfirmasi Penyerahan Obat (Dispensing) ---------- */
  const openDispenseModal = (id) => {
    AD.require(PERM.DISPENSE);
    const rx = AD.pharmacy.get(id);

    const itemsSummary = rx.items
      .map(
        (it) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <strong>${esc(it.name)}</strong>
            <small class="sub">${esc(it.dosage || '')} · ${esc(it.frequency || '')}</small>
          </div>
          <div style="text-align:right;">
            <strong>${it.preparedQuantity ?? it.quantity} unit</strong>
            <small class="sub">Batch: ${esc(it.batchId || 'Default')}</small>
          </div>
        </div>
      `
      )
      .join('');

    const body = `
      <form id="formDispense" class="work-form">
        <div class="banner ok" style="margin-bottom:16px;padding:12px;border-radius:var(--radius);border:1px solid var(--border);">
          <strong>Verifikasi Identitas Pasien Sebelum Penyerahan:</strong>
          <p style="margin:4px 0 0 0;">Pasien: <strong>${esc(rx.petName)}</strong> (${esc(rx.species)}) · Pemilik: <strong>${esc(rx.customerName)}</strong></p>
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="margin:0 0 8px 0;font-size:14px;">Ringkasan Obat yang Diserahkan:</h4>
          ${itemsSummary}
        </div>

        <div class="field">
          <label for="dispRecipient">Nama Penerima Obat</label>
          <input type="text" id="dispRecipient" value="${esc(rx.customerName)}" required>
        </div>

        <div class="field">
          <label for="dispNotes">Catatan Konseling / Penyerahan</label>
          <textarea id="dispNotes" rows="2" placeholder="Konfirmasi pemahaman aturan pakai, penyimpanan obat, efek samping...">${esc(rx.preparationNotes || 'Aturan pakai dan cara penyimpanan obat telah dijelaskan kepada pemilik.')}</textarea>
        </div>

        <p class="field-error disp-error" role="alert"></p>
      </form>
    `;

    openPharmacyModal({
      title: `Konfirmasi Penyerahan Obat — Resep ${rx.id}`,
      size: 'md',
      body,
      actions: [
        { label: 'Batal', kind: 'outline' },
        {
          label: 'Konfirmasi Penyerahan (Dispense)',
          kind: 'primary',
          onClick: (close, el) => {
            try {
              const form = $q('#formDispense', el);
              if (!form.reportValidity()) return;

              const recipient = $q('#dispRecipient', el)?.value || rx.customerName;
              const notes = $q('#dispNotes', el)?.value || '';

              const dispRecord = AD.pharmacy.dispense(rx.id, {
                items: rx.items.map((it) => ({
                  productId: it.productId,
                  dispensedQuantity: it.preparedQuantity ?? it.quantity,
                  batchId: it.batchId,
                })),
                recipientName: recipient,
                notes,
              });

              close();
              AD.refresh();
              UI.toast(`Penyerahan obat resep ${rx.id} berhasil dicatat.`);
              openDispenseDetail(dispRecord.id);
            } catch (err) {
              $q('.disp-error', el).textContent = err.message;
            }
          },
        },
      ],
    });
  };

  /* ---------- Modal: Minta Klarifikasi Dokter ---------- */
  const openClarificationModal = (id) => {
    AD.require(PERM.DISPENSE);
    const rx = AD.pharmacy.get(id);

    const body = `
      <form id="formClarify" class="work-form">
        <p class="muted small">Jika terdapat kendala stok, dosis meragukan, atau potensi interaksi obat, ajukan klarifikasi ke dokter peresep tanpa mengubah resep asli.</p>
        <p><strong>Dokter Tujuan:</strong> ${esc(rx.doctor)}</p>
        <p><strong>Pasien:</strong> ${esc(rx.petName)} (${esc(rx.species)})</p>
        <div class="field">
          <label for="clarifyNote">Isi Catatan Kendala / Permintaan Klarifikasi</label>
          <textarea id="clarifyNote" rows="4" placeholder="Contoh: Stok Antibiotik drop 15ml habis. Apakah dapat diganti dengan sediaan tablet 100mg dosis disesuaikan?..." required></textarea>
        </div>
        <p class="field-error clarify-error" role="alert"></p>
      </form>
    `;

    openPharmacyModal({
      title: `Klarifikasi Resep ${rx.id}`,
      size: 'md',
      body,
      actions: [
        { label: 'Batal', kind: 'outline' },
        {
          label: 'Kirim Klarifikasi ke Dokter',
          kind: 'primary',
          onClick: (close, el) => {
            try {
              const form = $q('#formClarify', el);
              if (!form.reportValidity()) return;

              const note = $q('#clarifyNote', el)?.value || '';
              AD.pharmacy.flagClarification(rx.id, note);

              close();
              AD.refresh();
              UI.toast('Permintaan klarifikasi berhasil dikirim dan dicatat pada resep.');
            } catch (err) {
              $q('.clarify-error', el).textContent = err.message;
            }
          },
        },
      ],
    });
  };

  /* ---------- Modal: Bukti Penyerahan Obat (Receipt/Proof) ---------- */
  const openDispenseDetail = (dispId) => {
    const s = FVStore.state();
    let disp = (s.dispenses || []).find((d) => d.id === dispId);
    if (!disp) {
      // Find by prescriptionId if dispId is prescriptionId
      disp = (s.dispenses || []).find((d) => d.prescriptionId === dispId);
    }
    FVStore.require(disp, 'Catatan penyerahan obat tidak ditemukan.');

    const body = `
      <div id="dispenseProofPrint" class="pharmacy-proof">
        <div style="text-align:center;border-bottom:2px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <h2 style="margin:0 0 4px 0;font-size:18px;">KLINIK HEWAN FILOSOVET</h2>
          <p class="muted small" style="margin:0;">Instalasi Farmasi & Pelayanan Resep Hewan</p>
          <p class="small" style="margin:2px 0 0 0;">Bukti Resmi Penyerahan Obat (Dispensing Proof)</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;margin-bottom:14px;">
          <div>
            <p style="margin:2px 0;"><strong>No. Dispensing:</strong> <code>${esc(disp.id)}</code></p>
            <p style="margin:2px 0;"><strong>No. Resep:</strong> <code>${esc(disp.prescriptionId)}</code></p>
            <p style="margin:2px 0;"><strong>Waktu Penyerahan:</strong> ${fmtDateTime(disp.dispensedAt)}</p>
          </div>
          <div>
            <p style="margin:2px 0;"><strong>Pasien:</strong> ${esc(disp.patientName)} (${esc(disp.species || '—')})</p>
            <p style="margin:2px 0;"><strong>Pemilik / Penerima:</strong> ${esc(disp.recipientName || disp.customerName)}</p>
            <p style="margin:2px 0;"><strong>Dokter Peresep:</strong> ${esc(disp.doctor)}</p>
            <p style="margin:2px 0;"><strong>Apoteker:</strong> ${esc(disp.pharmacist)}</p>
          </div>
        </div>

        <table class="tbl" style="width:100%;font-size:12px;margin-bottom:14px;">
          <thead>
            <tr>
              <th style="padding:6px 8px;text-align:left;">Nama Obat</th>
              <th style="padding:6px 8px;text-align:left;">Dosis & Aturan</th>
              <th style="padding:6px 8px;text-align:center;">Jml Resep</th>
              <th style="padding:6px 8px;text-align:center;">Jml Diserahkan</th>
              <th style="padding:6px 8px;text-align:left;">Batch</th>
            </tr>
          </thead>
          <tbody>
            ${(disp.items || [])
              .map(
                (i) => `
                <tr>
                  <td style="padding:6px 8px;"><strong>${esc(i.name)}</strong></td>
                  <td style="padding:6px 8px;">${esc(i.dosage || '—')} (${esc(i.frequency || '—')})</td>
                  <td style="padding:6px 8px;text-align:center;">${i.prescribedQuantity ?? i.quantity}</td>
                  <td style="padding:6px 8px;text-align:center;"><strong>${i.dispensedQuantity ?? i.preparedQuantity ?? i.quantity}</strong></td>
                  <td style="padding:6px 8px;"><code>${esc(i.batchId || '—')}</code></td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>

        ${disp.notes ? `<div class="proof-note"><strong>Catatan Penyerahan:</strong> ${esc(disp.notes)}</div>` : ''}

        <div style="display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:20px;padding-top:10px;">
          <div style="width:40%;">
            <p style="margin-bottom:45px;">Penerima Obat,</p>
            <p style="margin:0;font-weight:bold;">( ${esc(disp.recipientName || disp.customerName)} )</p>
          </div>
          <div style="width:40%;">
            <p style="margin-bottom:45px;">Apoteker Penanggung Jawab,</p>
            <p style="margin:0;font-weight:bold;">( ${esc(disp.pharmacist)} )</p>
          </div>
        </div>
      </div>
    `;

    openPharmacyModal({
      title: 'Bukti Penyerahan Obat',
      size: 'lg',
      body,
      actions: [
        {
          label: 'Cetak Bukti',
          kind: 'outline',
          onClick: () => UI.print(body, 'a4'),
        },
        { label: 'Tutup', kind: 'primary' },
      ],
    });
  };

  /* ---------- Modal: Rincian Batch Obat ---------- */
  const openBatchDetail = (productId) => {
    const p = PRODUCTS.find((x) => x.id === Number(productId));
    FVStore.require(p, 'Obat tidak ditemukan.');
    const s = FVStore.state();
    const batches = s.batches.filter((b) => b.productId === p.id);

    const body = `
      <div style="margin-bottom:12px;">
        <h3 style="margin:0 0 4px 0;">${esc(p.name)}</h3>
        <p class="muted small" style="margin:0;">Total Stok Tersedia: <strong>${p.stock}</strong> unit · Minimum Stok: ${p.min} unit</p>
      </div>

      <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>ID Batch</th>
              <th>Jumlah Stok</th>
              <th>Tgl Kedaluwarsa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${batches.length
              ? batches
                  .map((b) => {
                    const isExp = b.expiry && b.expiry < todayISO();
                    const isSoon = b.expiry && b.expiry <= addDaysISO(todayISO(), 60);
                    const statusChip = isExp
                      ? '<span class="chip chip-bad">Kedaluwarsa</span>'
                      : isSoon
                      ? '<span class="chip chip-warn">Segera Exp</span>'
                      : '<span class="chip chip-ok">Aktif</span>';

                    return `
                      <tr>
                        <td><code>${esc(b.id)}</code></td>
                        <td><strong>${b.quantity}</strong> unit</td>
                        <td>${fmtDate(b.expiry || '—')}</td>
                        <td>${statusChip}</td>
                      </tr>
                    `;
                  })
                  .join('')
              : '<tr><td colspan="4" class="muted text-center">Belum ada batch terdaftar untuk produk ini.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="small muted" style="margin-top:14px;">Penambahan batch baru atau penyesuaian tanggal kedaluwarsa dilakukan oleh <strong>Inventory Staff</strong> melalui penerimaan pesanan supplier atau audit batch.</p>
    `;

    openPharmacyModal({
      title: `Informasi Batch: ${p.name}`,
      size: 'md',
      body,
      actions: [{ label: 'Tutup', kind: 'outline' }],
    });
  };

  return {
    renderQueue,
    renderMedicationStock,
    renderDispensingHistory,
    openPrescription,
    openPreparationModal,
    openDispenseModal,
    openClarificationModal,
    openDispenseDetail,
    openBatchDetail,
  };
})();

/* Daftarkan halaman ke router Pages */
Pages.antreanfarmasi = {
  title: 'Antrean Resep Farmasi',
  render: AD.pharmacyUI.renderQueue,
};

Pages.stokobat = {
  title: 'Stok Obat (Farmasi)',
  render: AD.pharmacyUI.renderMedicationStock,
};

Pages.riwayatdispensing = {
  title: 'Riwayat Penyerahan Obat',
  render: AD.pharmacyUI.renderDispensingHistory,
};

/* Listener klik delegasi untuk tombol data-work farmasi */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-work]');
  if (!b) return;
  const act = b.dataset.work;
  const id = b.dataset.id;

  switch (act) {
    case 'rxopen':
      e.preventDefault();
      AD.pharmacyUI.openPrescription(id);
      break;
    case 'rxprep':
      e.preventDefault();
      AD.pharmacyUI.openPreparationModal(id);
      break;
    case 'rxdispense':
      e.preventDefault();
      AD.pharmacyUI.openDispenseModal(id);
      break;
    case 'rxclarify':
      e.preventDefault();
      AD.pharmacyUI.openClarificationModal(id);
      break;
    case 'dispenseproof':
      e.preventDefault();
      AD.pharmacyUI.openDispenseDetail(id);
      break;
    case 'medbatches':
      e.preventDefault();
      AD.pharmacyUI.openBatchDetail(id);
      break;
  }
});
