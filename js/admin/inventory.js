/* ============================================================
   FILOSOVET ADMIN — inventory.js  (Stok & Farmasi + Produk)
   Satu sumber data: PRODUCTS (cart.js, tersimpan di 'fv_products')
   ============================================================ */
const STK = { q: '', cat: 'Semua', status: 'Semua' };
const PRD = { q: '', cat: 'Semua', status: 'Semua', sort: 'name' };
const IMAGE_FILES = ['animal_antibiotik.jpeg', 'board_guard.jpeg', 'cat_collars.jpeg', 'cat_flea.jpeg', 'dog_toy.jpeg', 'dry_food_cat.jpeg', 'dry_food_dog.jpeg', 'paw_balm.jpeg', 'pet_conditioner.jpeg', 'pet_create.jpeg', 'pet_shampoo.jpeg', 'skin_vitamin.jpeg', 'snack_dental_stick_dog.jpeg', 'wet_food_cat.jpeg'];
const adminImg = p => productImg(p, '../assets/images/');
const thumb = p => `<span class="thumb">${p.image ? `<img src="${esc(adminImg(p))}" alt="" loading="lazy">` : `<span class="thumb-fb">${ico('image', 18)}</span>`}</span>`;
/* Fallback gambar rusak (delegasi, berlaku untuk semua thumbnail) */
document.addEventListener('error', e => {
  const im = e.target;
  if (im instanceof HTMLImageElement && im.closest('.thumb')) im.replaceWith(Object.assign(document.createElement('span'), { className: 'thumb-fb', innerHTML: ico('image', 18) }));
}, true);
const prodName = p => `<div class="prod-cell">${thumb(p)}<div class="cell-stack"><strong>${esc(p.name)}</strong>${p.resep ? ` ${UI.chip('Resep')}` : ''}<small class="sub">${esc(catName(p.cat))}</small></div></div>`;
const catOptions = (sel) => ['makanan', 'obat', 'skincare', 'aksesoris', 'almed'].map(c => `<option value="${c}" ${sel === c ? 'selected' : ''}>${catName(c)}</option>`).join('');

/* ---------- Restock & kurangi stok ---------- */
AD.restockModal = function (id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  const sug = AD.stock.suggested(p);
  UI.modal({
    title: `Restock: ${p.name}`, size: 'sm',
    desc: `Stok saat ini <strong>${p.stock}</strong> · batas minimum <strong>${p.min}</strong>.`,
    body: `${UI.field({ id: 'rsQty', label: 'Jumlah restock', type: 'number', value: sug, attrs: 'min="1" max="9999" inputmode="numeric"', hint: `Saran: ${sug} (batas minimum × 2 − stok saat ini)`, required: true })}
      <div class="field"><label for="rsNote">Catatan distributor <span class="muted">(opsional)</span></label><input id="rsNote" list="rsDist" placeholder="Pilih atau ketik nama distributor"><datalist id="rsDist">${DISTRIBUTORS.map(d => `<option value="${esc(d)}">`).join('')}</datalist></div>
      <p class="preview" id="rsPrev"></p>`,
    actions: [{ label: 'Batal', kind: 'outline' }, { label: 'Konfirmasi Restock', kind: 'primary', onClick: (close, el) => {
      const q = Math.floor(+$q('#rsQty', el).value);
      if (!UI.setError('rsQty', q >= 1 && q <= 9999 ? '' : 'Jumlah harus 1–9999.')) return;
      AD.stock.adjust(id, q, $q('#rsNote', el).value.trim());
      close(); UI.toast(`${p.name}: stok +${q} (kini ${p.stock})`); AD.refresh();
    } }],
    onOpen: el => { const upd = () => { const q = Math.max(0, Math.floor(+$q('#rsQty', el).value) || 0); $q('#rsPrev', el).innerHTML = `Stok setelah restock: <strong>${p.stock + q}</strong>`; }; $q('#rsQty', el).addEventListener('input', upd); upd(); }
  });
};
AD.reduceModal = function (id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  UI.modal({
    title: `Kurangi stok: ${p.name}`, size: 'sm', desc: `Stok saat ini <strong>${p.stock}</strong>.`,
    body: `${UI.field({ id: 'rdQty', label: 'Jumlah dikurangi', type: 'number', value: 1, attrs: `min="1" max="${p.stock}" inputmode="numeric"`, required: true })}
      <div class="field"><label for="rdWhy">Alasan</label><select id="rdWhy"><option>Rusak</option><option>Kedaluwarsa</option><option>Hilang</option><option>Koreksi hitung stok</option></select></div>`,
    actions: [{ label: 'Batal', kind: 'outline' }, { label: 'Kurangi Stok', kind: 'danger-solid', onClick: async (close, el) => {
      const q = Math.floor(+$q('#rdQty', el).value);
      if (!UI.setError('rdQty', q >= 1 && q <= p.stock ? '' : `Jumlah harus 1–${p.stock}.`)) return;
      const why = $q('#rdWhy', el).value;
      close();
      const ok = await UI.confirm({ title: 'Kurangi stok?', message: `Stok <strong>${esc(p.name)}</strong> akan berkurang <strong>${q}</strong> unit (alasan: ${esc(why)}).`, confirmLabel: 'Ya, kurangi', danger: true });
      if (!ok) return;
      AD.stock.adjust(id, -q, why); UI.toast(`Stok ${p.name} dikurangi ${q} (kini ${p.stock})`); AD.refresh();
    } }]
  });
};

/* ---------- Order restock masal ---------- */
AD.massRestock = function () {
  const need = AD.stock.needRestock();
  if (!need.length) { UI.toast('Semua stok dalam kondisi aman'); return; }
  UI.modal({
    title: 'Order Restock Masal', size: 'lg',
    desc: 'Order dikirim ke distributor dan stok bertambah setelah barang diterima.',
    body: `<div class="field"><label for="moDist">Distributor</label><select id="moDist">${DISTRIBUTORS.map(d => `<option>${esc(d)}</option>`).join('')}</select></div>
      <div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>Produk</th><th>Stok</th><th>Min</th><th style="width:120px">Jumlah order</th></tr></thead><tbody>
      ${need.map(p => `<tr><td><strong>${esc(p.name)}</strong> ${UI.stockChip(p)}</td><td>${p.stock}</td><td>${p.min}</td><td><label class="sr-only" for="mo${p.id}">Jumlah ${esc(p.name)}</label><input type="number" class="mo-qty" id="mo${p.id}" data-id="${p.id}" min="0" max="9999" value="${AD.stock.suggested(p)}"></td></tr>`).join('')}
      </tbody></table></div><p class="preview" id="moSum"></p>`,
    actions: [{ label: 'Batal', kind: 'outline' }, { label: 'Kirim Order', kind: 'primary', onClick: (close, el) => {
      const items = $qa('.mo-qty', el).map(i => ({ id: +i.dataset.id, qty: Math.floor(+i.value) || 0 })).filter(i => i.qty > 0).map(i => ({ ...i, name: PRODUCTS.find(p => p.id === i.id).name }));
      if (!items.length) { UI.toast('Isi jumlah order minimal satu produk', 'error'); return; }
      const rec = AD.stock.placeOrder($q('#moDist', el).value, items);
      close(); UI.toast(`Order ${rec.id} dikirim ke ${rec.distributor}`); AD.refresh();
    } }],
    onOpen: el => { const upd = () => { const q = $qa('.mo-qty', el).map(i => Math.max(0, Math.floor(+i.value) || 0)); $q('#moSum', el).innerHTML = `<strong>${q.filter(Boolean).length}</strong> produk · <strong>${q.reduce((a, b) => a + b, 0)}</strong> unit`; }; el.addEventListener('input', upd); upd(); }
  });
};
AD.orderHistory = function () {
  const draw = () => {
    const os = AD.stock.orders();
    return os.length ? `<ul class="order-list">${os.map(o => `<li><div class="o-top"><strong>${esc(o.id)}</strong>${UI.chip(o.status)}</div><p class="muted small">${esc(o.distributor)} · ${fmtDateTime(o.tanggal)}</p><p>${o.items.map(i => `${esc(i.name)} <strong>×${i.qty}</strong>`).join(', ')}</p>${o.status === 'Dipesan' ? `<button type="button" class="btn btn-primary btn-sm" data-recv="${o.id}">${ico('truck', 14)} Terima barang</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Belum ada order restock.</p>';
  };
  const dr = UI.drawer({ title: 'Riwayat Order Restock', body: draw() });
  dr.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-recv]'); if (!b) return;
    const ok = await UI.confirm({ title: 'Terima barang?', message: `Stok produk pada order <strong>${esc(b.dataset.recv)}</strong> akan ditambahkan.`, confirmLabel: 'Ya, terima' });
    if (!ok) return;
    AD.stock.receiveOrder(b.dataset.recv); UI.toast('Barang diterima, stok diperbarui'); dr.setBody(draw()); AD.refresh();
  });
};

/* ---------- Halaman Stok & Farmasi ---------- */
const STATUS_OPTS = [['Semua', 'Semua status'], ['butuh', 'Butuh restock'], ['habis', 'Habis'], ['kurang', 'Kurang'], ['aman', 'Aman'], ['exp', 'Segera / sudah kedaluwarsa']];
Pages.stok = {
  title: 'Stok & Farmasi',
  render(view, params) {
    if (params.status) STK.status = params.status;
    if (params.q != null) { STK.q = params.q; }
    view.innerHTML = `
      <div class="page-bar">
        <p class="muted">Status dihitung otomatis dari stok dan batas minimum. Prioritas teratas: Habis, lalu Kurang.</p>
        <div class="bar-right"><button type="button" class="btn btn-outline" id="btnOrders">${ico('truck', 16)} Riwayat Order</button><button type="button" class="btn btn-primary" id="btnMass">${ico('plus', 16)} Order Restock Masal</button></div>
      </div>
      <section class="panel">
        <div class="filters">
          <div class="search-field"><label class="sr-only" for="stQ">Cari produk</label>${ico('search', 16)}<input type="search" id="stQ" placeholder="Cari produk atau batch…" value="${esc(STK.q)}"></div>
          <div class="sel"><label class="sr-only" for="stCat">Kategori</label><select id="stCat"><option value="Semua">Semua kategori</option>${catOptions(STK.cat).replace(/ selected/, '')}</select></div>
          <div class="sel"><label class="sr-only" for="stSt">Status</label><select id="stSt">${STATUS_OPTS.map(o => `<option value="${o[0]}" ${STK.status === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
        </div>
        <div id="stBody"></div>
      </section>`;
    $q('#stCat').value = STK.cat;
    $q('#stQ').oninput = e => { STK.q = e.target.value; UI.resetPage('stok'); this.body(); };
    $q('#stCat').onchange = e => { STK.cat = e.target.value; UI.resetPage('stok'); this.body(); };
    $q('#stSt').onchange = e => { STK.status = e.target.value; UI.resetPage('stok'); this.body(); };
    $q('#btnMass').onclick = AD.massRestock; $q('#btnOrders').onclick = AD.orderHistory;
    this.body();
  },
  body() {
    const q = STK.q.trim().toLowerCase();
    let rows = PRODUCTS.filter(p => p.aktif !== false && (STK.cat === 'Semua' || p.cat === STK.cat) && (!q || p.name.toLowerCase().includes(q) || (p.batch || '').toLowerCase().includes(q)));
    rows = rows.filter(p => {
      const s = stockStatus(p);
      switch (STK.status) { case 'butuh': return s !== 'aman'; case 'habis': case 'kurang': case 'aman': return s === STK.status; case 'exp': return !!AD.stock.expiry(p); default: return true; }
    }).sort((a, b) => AD.stock.rank(a) - AD.stock.rank(b) || a.name.localeCompare(b.name, 'id'));
    UI.table($q('#stBody'), {
      id: 'stok', rows, pageSize: window.innerWidth < 700 ? 5 : 10, rowClass: p => `row-${stockStatus(p)}`,
      empty: { title: 'Tidak ada produk', msg: 'Tidak ada produk yang cocok dengan filter.', action: 'Reset filter', onAction: () => { STK.q = ''; STK.cat = 'Semua'; STK.status = 'Semua'; Pages.stok.render($q('#view'), {}); } },
      columns: [
        { key: 'name', label: 'Produk', cls: 'col-wide', render: prodName },
        { key: 'stock', label: 'Stok', render: p => { const cap = Math.max(p.min * 2, p.stock, 1); return `<div class="stock-cell"><strong class="${stockStatus(p) !== 'aman' ? 'txt-' + stockStatus(p) : ''}">${p.stock}</strong><div class="meter ${stockStatus(p)}" role="img" aria-label="Stok ${p.stock} dari minimum ${p.min}"><span style="width:${Math.min(100, p.stock / cap * 100)}%"></span><i style="left:${p.min / cap * 100}%"></i></div></div>`; } },
        { key: 'min', label: 'Min.', align: 'right', render: p => p.min },
        { key: 's', label: 'Status', render: p => UI.stockChip(p) },
        { key: 'batch', label: 'No. Batch', render: p => p.batch ? `<code class="code">${esc(p.batch)}</code>` : '<span class="dim">—</span>' },
        { key: 'exp', label: 'Kedaluwarsa', render: p => { if (!p.exp) return '<span class="dim">—</span>'; const e = AD.stock.expiry(p); return `<span class="nowrap">${fmtDate(p.exp)}</span>${e ? `<br>${UI.chip(e === 'kedaluwarsa' ? 'Kedaluwarsa' : 'Segera kedaluwarsa')}` : ''}`; } },
        { key: 'a', label: 'Aksi', align: 'right', cls: 'col-act', render: p => `<div class="row-actions">${stockStatus(p) !== 'aman' ? `<button type="button" class="btn btn-primary btn-sm" data-restock="${p.id}">Restock</button>` : ''}<button type="button" class="icon-btn" data-menu="${p.id}" aria-label="Aksi lain untuk ${esc(p.name)}" aria-haspopup="menu">${ico('more')}</button></div>` }
      ]
    });
    const body = $q('#stBody');
    if (!body.dataset.act) {
      body.dataset.act = '1';
      body.addEventListener('click', e => {
        const r = e.target.closest('[data-restock]'); if (r) return AD.restockModal(+r.dataset.restock);
        const m = e.target.closest('[data-menu]'); if (m) { const id = +m.dataset.menu; UI.menu(m, [{ label: 'Restock', icon: 'plus', onClick: () => AD.restockModal(id) }, { label: 'Kurangi stok', icon: 'minus', danger: true, onClick: () => AD.reduceModal(id) }, { sep: true }, { label: 'Buka di Produk', icon: 'produk', onClick: () => AD.go('produk', { drawer: id }) }]); }
      });
    }
  }
};

/* ---------- Halaman Produk ---------- */
const PRD_SORT = { name: 'Nama A–Z', 'price-asc': 'Harga termurah', 'price-desc': 'Harga termahal', stock: 'Stok tersedikit', sold: 'Terlaris' };
Pages.produk = {
  title: 'Produk',
  render(view, params) {
    if (params.q != null) PRD.q = params.q;
    view.innerHTML = `
      <div class="page-bar"><p class="muted">Produk Nonaktif disembunyikan dari toko publik. Produk Habis tampil “Habis” dan tidak bisa dibeli.</p>
        <button type="button" class="btn btn-primary" id="btnNew">${ico('plus', 16)} Produk Baru</button></div>
      <section class="panel">
        <div class="filters">
          <div class="search-field"><label class="sr-only" for="pdQ">Cari produk</label>${ico('search', 16)}<input type="search" id="pdQ" placeholder="Cari produk…" value="${esc(PRD.q)}"></div>
          <div class="sel"><label class="sr-only" for="pdCat">Kategori</label><select id="pdCat"><option value="Semua">Semua kategori</option>${catOptions('')}</select></div>
          <div class="sel"><label class="sr-only" for="pdSt">Status</label><select id="pdSt"><option value="Semua">Semua status</option><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select></div>
          <div class="sel"><label class="sr-only" for="pdSort">Urutkan</label><select id="pdSort">${Object.entries(PRD_SORT).map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div>
        </div>
        <div id="pdBody"></div>
      </section>`;
    $q('#pdCat').value = PRD.cat; $q('#pdSt').value = PRD.status; $q('#pdSort').value = PRD.sort;
    $q('#pdQ').oninput = e => { PRD.q = e.target.value; UI.resetPage('produk'); this.body(); };
    ['Cat', 'St', 'Sort'].forEach(k => { $q('#pd' + k).onchange = e => { PRD[{ Cat: 'cat', St: 'status', Sort: 'sort' }[k]] = e.target.value; UI.resetPage('produk'); this.body(); }; });
    $q('#btnNew').onclick = () => AD.productForm();
    this.body();
    if (params.drawer) AD.productForm(+params.drawer);
  },
  body() {
    const q = PRD.q.trim().toLowerCase();
    const rows = PRODUCTS.filter(p => (PRD.cat === 'Semua' || p.cat === PRD.cat) && (PRD.status === 'Semua' || (PRD.status === 'Aktif') === (p.aktif !== false)) && (!q || p.name.toLowerCase().includes(q)));
    const sorters = { name: (a, b) => a.name.localeCompare(b.name, 'id'), 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, stock: (a, b) => a.stock - b.stock, sold: (a, b) => (b.sold || 0) - (a.sold || 0) };
    rows.sort(sorters[PRD.sort]);
    UI.table($q('#pdBody'), {
      id: 'produk', rows, pageSize: window.innerWidth < 700 ? 5 : 10, rowClass: p => p.aktif === false ? 'row-off' : '',
      empty: { title: 'Produk tidak ditemukan', msg: 'Coba kata kunci lain atau hapus filter.', action: 'Reset filter', onAction: () => { PRD.q = ''; PRD.cat = 'Semua'; PRD.status = 'Semua'; Pages.produk.render($q('#view'), {}); } },
      columns: [
        { key: 'name', label: 'Produk', cls: 'col-wide', render: prodName },
        { key: 'price', label: 'Harga', align: 'right', render: p => `<span class="inline-edit"><span>${rp(p.price)}</span><button type="button" class="icon-btn icon-sm" data-inline="price" data-id="${p.id}" aria-label="Ubah harga ${esc(p.name)}">${ico('edit', 14)}</button></span>` },
        { key: 'stock', label: 'Stok', render: p => `<span class="inline-edit"><span>${p.stock}</span>${UI.stockChip(p)}<button type="button" class="icon-btn icon-sm" data-inline="stock" data-id="${p.id}" aria-label="Ubah stok ${esc(p.name)}">${ico('edit', 14)}</button></span>` },
        { key: 'sold', label: 'Terjual', align: 'right', render: p => p.sold || 0 },
        { key: 'st', label: 'Status', render: p => UI.chip(p.aktif === false ? 'Nonaktif' : 'Aktif') },
        { key: 'a', label: 'Aksi', align: 'right', cls: 'col-act', render: p => `<div class="row-actions"><button type="button" class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button><button type="button" class="icon-btn" data-menu="${p.id}" aria-label="Aksi lain untuk ${esc(p.name)}" aria-haspopup="menu">${ico('more')}</button></div>` }
      ]
    });
    const body = $q('#pdBody');
    if (!body.dataset.act) {
      body.dataset.act = '1';
      body.addEventListener('click', e => {
        const ed = e.target.closest('[data-edit]'); if (ed) return AD.productForm(+ed.dataset.edit);
        const inl = e.target.closest('[data-inline]'); if (inl) return startInline(inl);
        const m = e.target.closest('[data-menu]'); if (!m) return;
        const p = PRODUCTS.find(x => x.id === +m.dataset.menu);
        UI.menu(m, [
          { label: 'Duplikasi', icon: 'copy', onClick: () => duplicate(p) },
          { label: p.aktif === false ? 'Aktifkan' : 'Arsipkan', icon: 'archive', danger: p.aktif !== false, onClick: () => toggleArchive(p) }
        ]);
      });
    }
  }
};

function startInline(btn) {
  const p = PRODUCTS.find(x => x.id === +btn.dataset.id), field = btn.dataset.inline;
  const wrap = btn.closest('.inline-edit');
  const old = wrap.innerHTML;
  wrap.innerHTML = `<label class="sr-only" for="inl">${field === 'price' ? 'Harga' : 'Stok'}</label><input id="inl" type="number" class="inl-input" min="${field === 'price' ? 100 : 0}" max="${field === 'price' ? 99999999 : 99999}" value="${p[field]}" inputmode="numeric"><small class="field-error" id="err-inl" role="alert"></small>`;
  const inp = $q('#inl', wrap); inp.focus(); inp.select();
  let done = false;
  const finish = save => {
    if (done) return; done = true;
    if (save) {
      const v = Math.floor(+inp.value);
      const bad = field === 'price' ? (!(v >= 100)) : (!(v >= 0));
      if (bad || isNaN(v)) { UI.toast(field === 'price' ? 'Harga minimal Rp 100' : 'Stok tidak boleh negatif', 'error'); wrap.innerHTML = old; return; }
      if (v !== p[field]) {
        AD.log.add('Produk', `${field === 'price' ? 'Mengubah harga' : 'Mengubah stok'} ${p.name}: ${field === 'price' ? rp(p[field]) + ' → ' + rp(v) : p[field] + ' → ' + v}`);
        p[field] = v; saveProducts(); UI.toast(`${field === 'price' ? 'Harga' : 'Stok'} ${p.name} diperbarui`);
      }
      AD.refresh();
    } else wrap.innerHTML = old;
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.stopPropagation(); finish(false); AD.refresh(); } });
  inp.addEventListener('blur', () => finish(true));
}
function duplicate(p) {
  const id = Math.max(...PRODUCTS.map(x => x.id)) + 1;
  const copy = { ...p, id, name: p.name + ' (Salinan)', stock: 0, sold: 0, aktif: false };
  PRODUCTS.push(copy); saveProducts();
  AD.log.add('Produk', `Menduplikasi ${p.name}`); UI.toast('Produk diduplikasi (nonaktif). Lengkapi lalu aktifkan.');
  AD.refresh(); AD.productForm(id);
}
async function toggleArchive(p) {
  if (p.aktif === false) { p.aktif = true; saveProducts(); AD.log.add('Produk', `Mengaktifkan ${p.name}`); UI.toast(`${p.name} diaktifkan`); return AD.refresh(); }
  const ok = await UI.confirm({ title: 'Arsipkan produk?', message: `<strong>${esc(p.name)}</strong> akan dinonaktifkan dan disembunyikan dari toko publik. Data penjualan tetap tersimpan.`, confirmLabel: 'Ya, arsipkan', danger: true });
  if (!ok) return;
  p.aktif = false; saveProducts(); AD.log.add('Produk', `Mengarsipkan ${p.name}`); UI.toast(`${p.name} diarsipkan`); AD.refresh();
}

/* ---------- Drawer form produk ---------- */
AD.productForm = function (id) {
  const isNew = !id;
  const p = isNew ? { id: 0, name: '', cat: 'makanan', price: '', stock: 0, min: 10, sold: 0, resep: false, aktif: true, image: '' } : PRODUCTS.find(x => x.id === id);
  if (!p) return;
  let img = p.image || '';
  const dr = UI.drawer({
    title: isNew ? 'Produk Baru' : 'Edit Produk', subtitle: isNew ? 'Isi data produk lalu simpan.' : esc(p.name),
    body: `<form id="pf" novalidate>
      ${UI.field({ id: 'pfName', label: 'Nama produk', value: p.name, attrs: 'autocomplete="off" maxlength="80"', required: true })}
      <div class="row2"><div class="field"><label for="pfCat">Kategori</label><select id="pfCat">${catOptions(p.cat)}</select></div>
        ${UI.field({ id: 'pfPrice', label: 'Harga (Rp)', type: 'number', value: p.price, attrs: 'min="100" max="99999999" inputmode="numeric"', required: true })}</div>
      <div class="row2">${UI.field({ id: 'pfStock', label: 'Stok', type: 'number', value: p.stock, attrs: 'min="0" max="99999" inputmode="numeric"', required: true })}
        ${UI.field({ id: 'pfMin', label: 'Batas minimum stok', type: 'number', value: p.min, attrs: 'min="0" max="9999" inputmode="numeric"', required: true })}</div>
      <div class="row2">${UI.field({ id: 'pfBatch', label: 'No. batch', value: p.batch || '', attrs: 'autocomplete="off"' })}${UI.field({ id: 'pfExp', label: 'Tanggal kedaluwarsa', type: 'date', value: p.exp || '' })}</div>
      <div class="field"><span class="lbl">Gambar produk</span>
        <div class="img-pick"><span class="thumb thumb-lg" id="pfPrev"></span>
          <div><label class="sr-only" for="pfImgSel">Pilih gambar yang ada</label><select id="pfImgSel"><option value="">Tanpa gambar</option>${IMAGE_FILES.map(f => `<option value="${f}">${f.replace(/_/g, ' ').replace('.jpeg', '')}</option>`).join('')}<option value="__upload" hidden>Unggahan</option></select>
          <label class="btn btn-outline btn-sm file-btn" for="pfFile">${ico('image', 14)} Unggah gambar</label><input type="file" id="pfFile" accept="image/*" class="sr-only"></div></div>
        <small class="field-error" id="err-pfImg" role="alert"></small></div>
      <label class="check"><input type="checkbox" id="pfResep" ${p.resep ? 'checked' : ''}> Butuh resep dokter <small class="muted">(tidak bisa dimasukkan keranjang di toko publik)</small></label>
      <label class="check"><input type="checkbox" id="pfAktif" ${p.aktif !== false ? 'checked' : ''}> Aktif (tampil di toko publik)</label>
    </form>`,
    footer: `<button type="button" class="btn btn-primary" id="pfSave">${isNew ? 'Tambah Produk' : 'Simpan Perubahan'}</button><button type="button" class="btn btn-outline" id="pfCancel">Batal</button>`
  });
  const el = dr.el, $ = i => $q('#' + i, el);
  const prev = () => { $('pfPrev').innerHTML = img ? `<img src="${esc(/^(data:|https?:)/.test(img) ? img : '../assets/images/' + img)}" alt="Pratinjau gambar produk">` : `<span class="thumb-fb">${ico('image', 22)}</span>`; };
  if (img && !IMAGE_FILES.includes(img)) { $('pfImgSel').value = '__upload'; } else $('pfImgSel').value = img;
  prev();
  $('pfImgSel').onchange = () => { img = $('pfImgSel').value === '__upload' ? img : $('pfImgSel').value; prev(); };
  $('pfFile').onchange = () => {
    const f = $('pfFile').files[0]; if (!f) return;
    if (!/^image\//.test(f.type) || f.size > 6e6) { UI.setError('pfImg', 'Pilih file gambar di bawah 6 MB.'); return; }
    UI.setError('pfImg', '');
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 480 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); img = c.toDataURL('image/jpeg', 0.8); $('pfImgSel').value = '__upload'; prev(); }; im.src = rd.result; };
    rd.readAsDataURL(f);
  };
  $('pfCancel').onclick = dr.close;
  $('pf').onsubmit = e => { e.preventDefault(); };
  $('pfSave').onclick = () => {
    const name = $('pfName').value.trim(), price = Math.floor(+$('pfPrice').value), stock = Math.floor(+$('pfStock').value), min = Math.floor(+$('pfMin').value);
    const ok = [
      UI.setError('pfName', name.length >= 3 ? '' : 'Nama minimal 3 karakter.'),
      UI.setError('pfPrice', price >= 100 ? '' : 'Harga minimal Rp 100.'),
      UI.setError('pfStock', stock >= 0 && $('pfStock').value !== '' ? '' : 'Stok tidak boleh kosong atau negatif.'),
      UI.setError('pfMin', min >= 0 && $('pfMin').value !== '' ? '' : 'Batas minimum tidak boleh kosong atau negatif.')
    ].every(Boolean);
    if (!ok) { const bad = $q('.is-invalid', el); bad && bad.focus(); return; }
    const dup = PRODUCTS.find(x => x.id !== p.id && x.name.toLowerCase() === name.toLowerCase());
    if (dup) { UI.setError('pfName', 'Nama produk sudah dipakai.'); $('pfName').focus(); return; }
    const data = { name, cat: $('pfCat').value, price, stock, min, batch: $('pfBatch').value.trim() || undefined, exp: $('pfExp').value || undefined, image: img || undefined, resep: $('pfResep').checked, aktif: $('pfAktif').checked };
    if (isNew) { PRODUCTS.push({ id: Math.max(0, ...PRODUCTS.map(x => x.id)) + 1, sold: 0, ...data }); AD.log.add('Produk', `Menambah produk ${name}`); }
    else { Object.assign(p, data); AD.log.add('Produk', `Mengedit produk ${name}`); }
    saveProducts(); dr.close(); UI.toast(isNew ? 'Produk ditambahkan' : 'Produk diperbarui'); AD.refresh();
  };
  setTimeout(() => $('pfName').focus(), 60);
};
