/* ============================================================
   FILOSOVET ADMIN — core.js
   Lapisan data (localStorage), seed demo, status, peran, log.
   Bergantung pada: cart.js (PRODUCTS, saveProducts, stockStatus),
   services-data.js (SERVICES), main.js (rupiah, escapeHtml, toast)
   ============================================================ */
const AD = {};

/* ---------- Helper umum ---------- */
const pad2 = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseISO = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const todayISO = () => toISO(new Date());
const addDaysISO = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const fmtDate = v => { const iso = String(v).slice(0, 10); return `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`; };
const fmtDateShort = v => { const iso = String(v).slice(0, 10); return `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}`; };
const fmtTime = v => { const d = new Date(v); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmtDateTime = v => `${fmtDate(v)}, ${fmtTime(v)}`;
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = n => `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const esc = s => escapeHtml(s == null ? '' : s);
const rp = n => rupiah(Math.round(n || 0));
const read = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const compactRp = n => { const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : a >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(n); };
function waLink(hp) {
  let n = String(hp || '').replace(/[^0-9+]/g, '');
  if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('0')) n = '62' + n.slice(1);
  return n ? `https://wa.me/${n}` : '';
}

const CAT_NAME = { makanan: 'Makanan', obat: 'Obat', skincare: 'Skincare', aksesoris: 'Aksesoris', almed: 'Alat Medis' };
const catName = c => CAT_NAME[c] || cap(c);
const HOTEL_CAPACITY = 8;
const DISTRIBUTORS = ['PT Satwa Sehat Farma', 'CV Pakan Nusantara', 'Petindo Supply'];
const PAY_METHODS = ['Tunai', 'QRIS', 'Transfer Bank (BCA)', 'Transfer Bank (Mandiri)', 'Kartu Debit/Kredit', 'COD (bayar di toko)'];

/* ---------- Peran ---------- */
const ROLES = {
  admin:   { label: 'Admin',   pages: ['dashboard', 'booking', 'stok', 'produk', 'transaksi', 'laporan'] },
  dokter:  { label: 'Dokter',  pages: ['dashboard', 'booking', 'stok', 'produk'], bookingFilter: 'Konsultasi Dokter Hewan' },
  kasir:   { label: 'Kasir',   pages: ['dashboard', 'booking', 'stok', 'transaksi'] },
  groomer: { label: 'Groomer', pages: ['dashboard', 'booking'], bookingFilter: 'Grooming', compactDashboard: true }
};
AD.role = () => (ROLES[localStorage.getItem('fv_admin_role')] ? localStorage.getItem('fv_admin_role') : 'admin');
AD.setRole = r => localStorage.setItem('fv_admin_role', r);
AD.can = page => ROLES[AD.role()].pages.includes(page);
AD.roleLabel = () => ROLES[AD.role()].label;

/* ---------- Log aktivitas ---------- */
AD.log = {
  all: () => read('fv_admin_log', []),
  add(aksi, ringkas) {
    const l = read('fv_admin_log', []);
    l.unshift({ t: new Date().toISOString(), aktor: AD.roleLabel(), aksi, ringkas });
    write('fv_admin_log', l.slice(0, 200));
  }
};

/* ---------- Seed demo (tanggal selalu relatif terhadap hari ini) ---------- */
const SEED_CUSTOMERS = [
  { nama: 'Rania Putri', hp: '081234500011', pets: [['Mochi', 'Kucing', 'Persia']] },
  { nama: 'Dimas Aditya', hp: '081234500012', pets: [['Rocky', 'Anjing', 'Labrador']] },
  { nama: 'Sinta Wulandari', hp: '081234500013', pets: [['Luna', 'Kucing', 'Domestik']] },
  { nama: 'Bayu Rahmat', hp: '081234500014', pets: [['Bruno', 'Anjing', 'Pomeranian']] },
  { nama: 'Ayu Lestari', hp: '081234500015', pets: [['Momo', 'Kucing', 'Persia'], ['Bubu', 'Anjing', 'Golden Retriever']] },
  { nama: 'Hendra Gunawan', hp: '081234500016', pets: [['Max', 'Anjing', 'Husky']] },
  { nama: 'Maya Anggraini', hp: '081234500017', pets: [['Cleo', 'Kucing', 'Anggora']] },
  { nama: 'Fajar Nugroho', hp: '081234500018', pets: [['Milo', 'Kucing', 'Domestik']] },
  { nama: 'Putri Maharani', hp: '081234500019', pets: [['Kiki', 'Kelinci', 'Lop']] },
  { nama: 'Rizky Pratama', hp: '081234500020', pets: [['Choco', 'Anjing', 'Beagle']] },
  { nama: 'Dewi Safitri', hp: '081234500021', pets: [['Oyen', 'Kucing', 'Domestik']] },
  { nama: 'Budi Santoso', hp: '081234500022', pets: [['Bella', 'Anjing', 'Poodle']] },
  { nama: 'Lina Marlina', hp: '081234500023', pets: [['Simba', 'Kucing', 'Maine Coon']] },
  { nama: 'Agus Setiawan', hp: '081234500024', pets: [['Joy', 'Anjing', 'Corgi']] }
];
const SEED_KELUHAN = ['Kontrol rutin', 'Nafsu makan menurun', 'Bulu rontok', 'Vaksin tahunan', 'Gatal-gatal di telinga', 'Persiapan liburan', 'Check-up awal', ''];

function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

const b_by = r => (r() < 0.7 ? 'Pelanggan' : 'Admin');

function buildSeed() {
  const r = lcg(20261026);
  const now = new Date(), tIso = toISO(now), nowMin = now.getHours() * 60 + now.getMinutes();
  const bookings = [], trx = [];
  const used = new Set();
  let nb = 0;
  const svcKeys = ['grooming', 'konsultasi', 'konsultasi', 'grooming', 'hotel'];

  for (let off = -44; off <= 4; off++) {
    const date = addDaysISO(tIso, off);
    const dow = parseISO(date).getDay();
    const count = off === 0 ? 5 : off > 0 ? 3 : 2 + Math.floor(r() * 3) + (dow === 0 || dow === 6 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const key = pick(r, svcKeys), cfg = SERVICES[key];
      const type = pick(r, cfg.types), staff = pick(r, cfg.staff);
      let time = pick(r, cfg.slots), tries = 0;
      while (used.has(`${date}|${staff}|${time}`) && tries++ < 12) time = pick(r, cfg.slots);
      if (used.has(`${date}|${staff}|${time}`)) continue;
      used.add(`${date}|${staff}|${time}`);
      const cu = pick(r, SEED_CUSTOMERS), pet = pick(r, cu.pets);
      const dur = cfg.perDay ? 1 + Math.floor(r() * 4) : 1;
      let status;
      const startMin = toMin(time);
      if (off < 0) { const x = r(); status = x < 0.78 ? 'Selesai' : x < 0.86 ? 'Dibatalkan' : 'Tidak Hadir'; }
      else if (off === 0) {
        if (startMin + (type.min || 60) < nowMin) status = r() < 0.85 ? 'Selesai' : 'Dibatalkan';
        else if (startMin <= nowMin) status = 'Diproses';
        else status = r() < 0.6 ? 'Dikonfirmasi' : 'Menunggu Konfirmasi';
      } else status = r() < 0.55 ? 'Menunggu Konfirmasi' : 'Dikonfirmasi';
      const code = 'FV-' + (100000 + (++nb) * 37 % 899999).toString(36).toUpperCase().slice(0, 6);
      const b = {
        code, seed: true, sumber: r() < 0.7 ? 'Online' : 'Manual',
        pelanggan: cu.nama, hp: cu.hp, hewan: pet[0], spesie: pet[1], ras: pet[2], berat: '',
        layanan: cfg.label, tipe: type.name, tanggal: date, waktu: time, petugas: staff, durasiHari: dur,
        biaya: type.price * dur, status, catatan: pick(r, SEED_KELUHAN), catatanInternal: '',
        riwayat: [{ status: 'Menunggu Konfirmasi', at: `${addDaysISO(date, -1)}T09:00:00`, by: b_by(r) }]
      };
      if (status !== 'Menunggu Konfirmasi') b.riwayat.push({ status: status === 'Selesai' || status === 'Diproses' ? 'Dikonfirmasi' : status, at: `${addDaysISO(date, -1)}T10:30:00`, by: 'Admin' });
      if (status === 'Selesai') b.riwayat.push({ status: 'Selesai', at: `${date}T${time}:00`, by: 'Admin' });
      bookings.push(b);

      if (status === 'Selesai') {
        const m = pick(r, ['QRIS', 'QRIS', 'Tunai', 'Tunai', 'Transfer Bank (BCA)', 'Kartu Debit/Kredit']);
        trx.push({
          tanggal: `${date}T${fromMin(Math.min(startMin + (type.min || 60), 1230))}:00`, pelanggan: cu.nama, tipe: 'Layanan',
          deskripsi: `${type.name} · ${pet[0]}`, items: [{ name: `${cfg.label}: ${type.name}${dur > 1 ? ` × ${dur} hari` : ''}`, qty: 1, price: type.price * dur }],
          subtotal: type.price * dur, diskon: 0, ongkir: 0, total: type.price * dur, metode: m, status: 'Lunas', sumber: 'Kasir', ref: code
        });
      }
    }
    // Penjualan produk kasir & online harian
    if (off <= 0) {
      const sales = off === 0 ? 2 : 1 + Math.floor(r() * 3);
      for (let i = 0; i < sales; i++) {
        const t = 8 * 60 + Math.floor(r() * 12 * 60);
        if (off === 0 && t > nowMin) continue;
        const cands = DEFAULT_PRODUCTS.filter(p => !p.resep);
        const lines = []; const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) { const p = pick(r, cands); if (!lines.find(l => l.id === p.id)) lines.push({ id: p.id, name: p.name, qty: 1 + Math.floor(r() * 2), price: p.price }); }
        const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
        const online = r() < 0.3, cu = pick(r, SEED_CUSTOMERS);
        trx.push({
          tanggal: `${date}T${fromMin(t)}:00`, pelanggan: online || r() < 0.5 ? cu.nama : 'Pelanggan umum', tipe: 'Produk',
          deskripsi: lines.map(l => l.name).join(', '), items: lines.map(({ name, qty, price }) => ({ name, qty, price })),
          subtotal: sub, diskon: 0, ongkir: online ? 15000 : 0, total: sub + (online ? 15000 : 0),
          metode: online ? pick(r, ['QRIS', 'Transfer Bank (BCA)']) : pick(r, ['Tunai', 'QRIS', 'Tunai', 'Kartu Debit/Kredit']),
          status: 'Lunas', sumber: online ? 'Online' : 'Kasir', ref: '', onlineId: online
        });
      }
    }
  }
  // Satu transaksi menunggu pembayaran (COD / transfer) untuk demo "Tandai Lunas"
  trx.push({ tanggal: `${tIso}T${fromMin(Math.max(480, nowMin - 20))}:00`, pelanggan: 'Sinta Wulandari', tipe: 'Produk', deskripsi: 'Vitamin Bulu & Kulit 60ml', items: [{ name: 'Vitamin Bulu & Kulit 60ml', qty: 1, price: 78000 }], subtotal: 78000, diskon: 0, ongkir: 0, total: 78000, metode: 'COD (bayar di toko)', status: 'Menunggu', sumber: 'Online', ref: '' });

  // Beri ID transaksi berurutan per hari
  const perDay = {};
  trx.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach(t => {
    const d = t.tanggal.slice(0, 10).replace(/-/g, '');
    perDay[d] = (perDay[d] || 0) + 1;
    t.id = t.sumber === 'Online' && t.tipe === 'Produk' ? `INV-${d.slice(2)}${pad2(perDay[d])}` : `TRX-${d}-${pad2(perDay[d])}`;
    t.seed = true;
  });
  // Hubungkan booking selesai -> ID transaksi
  const byRef = {}; trx.forEach(t => { if (t.ref) byRef[t.ref] = t.id; });
  bookings.forEach(b => { if (byRef[b.code]) b.trxId = byRef[b.code]; });

  const orders = [{ id: 'PO-2610-001', tanggal: `${addDaysISO(tIso, -9)}T10:00:00`, distributor: DISTRIBUTORS[0], status: 'Diterima', items: [{ id: 6, name: 'Vitamin Bulu & Kulit 60ml', qty: 30 }], seed: true }];
  const log = [
    { t: new Date(Date.now() - 36e5).toISOString(), aktor: 'Admin', aksi: 'Booking', ringkas: 'Mengonfirmasi booking Dimas Aditya' },
    { t: new Date(Date.now() - 3 * 36e5).toISOString(), aktor: 'Kasir', aksi: 'Transaksi', ringkas: 'Mencatat penjualan produk Rp 94.000' },
    { t: new Date(Date.now() - 20 * 36e5).toISOString(), aktor: 'Admin', aksi: 'Stok', ringkas: 'Restock Vitamin Bulu & Kulit +30' }
  ];
  return { bookings, trx, orders, log };
}

/* Seed dibuat sekali, lalu digeser maju bila hari sudah berganti agar data selalu "hari ini" */
function ensureSeed() {
  const tIso = todayISO();
  let meta = read('fv_admin_seed', null);
  if (!meta) {
    const s = buildSeed();
    write('fv_admin_bookings', s.bookings); write('fv_admin_trx', s.trx);
    write('fv_admin_orders', s.orders);
    if (!read('fv_admin_log', null)) write('fv_admin_log', s.log);
    write('fv_admin_seed', { day: tIso });
    return;
  }
  const delta = diffDays(tIso, meta.day);
  if (delta > 0) {
    const shiftDt = v => { const d = new Date(v); d.setDate(d.getDate() + delta); return `${toISO(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`; };
    write('fv_admin_bookings', read('fv_admin_bookings', []).map(b => b.seed ? { ...b, tanggal: addDaysISO(b.tanggal, delta), riwayat: (b.riwayat || []).map(h => ({ ...h, at: shiftDt(h.at) })) } : b));
    write('fv_admin_trx', read('fv_admin_trx', []).map(t => t.seed ? { ...t, tanggal: shiftDt(t.tanggal) } : t));
    write('fv_admin_orders', read('fv_admin_orders', []).map(o => o.seed ? { ...o, tanggal: shiftDt(o.tanggal) } : o));
    write('fv_admin_seed', { day: tIso });
  }
}
AD.resetDemo = () => {
  ['fv_admin_seed', 'fv_admin_bookings', 'fv_admin_trx', 'fv_admin_orders', 'fv_admin_log', 'fv_products', 'fv_admin_notif_read', 'fv_bookings', 'fv_orders'].forEach(k => localStorage.removeItem(k));
};

/* ---------- Booking ---------- */
const svcKeyByLabel = label => Object.keys(SERVICES).find(k => SERVICES[k].label === label) || null;
function normBooking(b, src) {
  const key = svcKeyByLabel(b.layanan);
  const type = key ? SERVICES[key].types.find(t => t.name === b.tipe) : null;
  const status = !b.status ? 'Menunggu Konfirmasi' : /^Menunggu/.test(b.status) ? 'Menunggu Konfirmasi' : b.status === 'Diproses' || b.status === 'Dikonfirmasi' ? b.status : b.status;
  return {
    code: b.code, _src: src, sumber: b.sumber || (src === 'public' ? 'Online' : 'Manual'),
    pelanggan: (b.pelanggan || b.nama || '').trim(), hp: b.hp || '', hewan: b.hewan || '', spesie: b.spesie || b.spesies || '', ras: b.ras || '', berat: b.berat || '',
    layanan: b.layanan || '', svcKey: key, tipe: b.tipe || '', tanggal: b.tanggal, waktu: b.waktu || '00:00', petugas: b.petugas || '',
    durasiHari: b.durasiHari || 1, durMin: type && type.min ? type.min : (key === 'hotel' ? 60 : 60), biaya: b.biaya || 0, status,
    catatan: b.catatan || '', catatanInternal: b.catatanInternal || '', riwayat: b.riwayat || [], trxId: b.trxId || ''
  };
}
AD.bookings = {
  all() {
    const pub = read('fv_bookings', []).map(b => normBooking(b, 'public'));
    const adm = read('fv_admin_bookings', []).map(b => normBooking(b, 'admin'));
    return [...pub, ...adm];
  },
  get: code => AD.bookings.all().find(b => b.code === code),
  start: b => new Date(`${b.tanggal}T${b.waktu}:00`),
  end: b => new Date(AD.bookings.start(b).getTime() + b.durMin * 60000),
  eff(b) {
    const past = AD.bookings.end(b) < new Date();
    if (b.status === 'Menunggu Konfirmasi' && past) return 'Kedaluwarsa';
    if (b.status === 'Dikonfirmasi' && past) return 'Tidak Hadir';
    return b.status;
  },
  /* Aksi yang tersedia mengikuti status efektif */
  actions(b) {
    switch (AD.bookings.eff(b)) {
      case 'Menunggu Konfirmasi': return [{ to: 'Dikonfirmasi', label: 'Konfirmasi', kind: 'primary' }, { to: 'Dibatalkan', label: 'Batalkan', kind: 'danger' }];
      case 'Dikonfirmasi': return [{ to: 'Diproses', label: 'Proses', kind: 'primary' }, { to: 'Dibatalkan', label: 'Batalkan', kind: 'danger' }];
      case 'Diproses': return [{ to: 'Selesai', label: 'Selesai', kind: 'primary' }];
      default: return [];
    }
  },
  /* Ubah objek booking langsung di store asalnya */
  mutate(code, fn) {
    const upd = (key) => {
      const list = read(key, []); const i = list.findIndex(x => x.code === code);
      if (i < 0) return false;
      fn(list[i]); write(key, list); return true;
    };
    return upd('fv_bookings') || upd('fv_admin_bookings');
  },
  setStatus(code, to) {
    const b0 = AD.bookings.get(code); if (!b0) return;
    AD.bookings.mutate(code, o => {
      o.status = to; o.riwayat = [...(o.riwayat || []), { status: to, at: new Date().toISOString(), by: AD.roleLabel() }];
    });
    AD.log.add('Booking', `${to === 'Selesai' ? 'Menyelesaikan' : to === 'Dibatalkan' ? 'Membatalkan' : 'Mengubah status'} booking ${b0.pelanggan || 'Tanpa nama'} (${code}) → ${to}`);
    if (to === 'Selesai') AD.trx.ensureForBooking(AD.bookings.get(code));
  },
  setNote(code, note) { AD.bookings.mutate(code, o => { o.catatanInternal = note; }); AD.log.add('Booking', `Memperbarui catatan internal ${code}`); },
  addManual(data) {
    const list = read('fv_admin_bookings', []);
    const code = 'FV-' + Date.now().toString(36).toUpperCase().slice(-6);
    list.unshift({ ...data, code, sumber: 'Manual', status: 'Dikonfirmasi', riwayat: [{ status: 'Dikonfirmasi', at: new Date().toISOString(), by: AD.roleLabel() }] });
    write('fv_admin_bookings', list);
    AD.log.add('Booking', `Menambah booking manual ${data.pelanggan} (${code})`);
    return code;
  },
  /* Bentrok: petugas yang sama, tanggal sama, jam bertumpuk */
  conflicts(b, all) {
    if (!b.petugas || b.svcKey === 'hotel') return [];
    const s1 = AD.bookings.start(b).getTime(), e1 = AD.bookings.end(b).getTime();
    return (all || AD.bookings.all()).filter(o => o.code !== b.code && o.tanggal === b.tanggal && o.petugas === b.petugas && !['Dibatalkan', 'Kedaluwarsa'].includes(o.status) &&
      AD.bookings.start(o).getTime() < e1 && AD.bookings.end(o).getTime() > s1);
  },
  customers() {
    const map = new Map();
    SEED_CUSTOMERS.forEach(c => map.set(c.hp, { nama: c.nama, hp: c.hp, pets: c.pets.map(p => ({ nama: p[0], spesie: p[1], ras: p[2] })) }));
    AD.bookings.all().forEach(b => {
      if (!b.pelanggan) return;
      const k = b.hp || b.pelanggan;
      if (!map.has(k)) map.set(k, { nama: b.pelanggan, hp: b.hp, pets: [] });
      const c = map.get(k);
      if (b.hewan && !c.pets.find(p => p.nama === b.hewan)) c.pets.push({ nama: b.hewan, spesie: b.spesie, ras: b.ras });
    });
    return [...map.values()];
  },
  /* Jumlah kandang terisi pada tanggal tertentu */
  hotelOccupied(iso) {
    return AD.bookings.all().filter(b => b.svcKey === 'hotel' && ['Dikonfirmasi', 'Diproses', 'Selesai'].includes(b.status) &&
      b.tanggal <= iso && addDaysISO(b.tanggal, b.durasiHari - 1) >= iso).length;
  }
};

/* ---------- Transaksi ---------- */
function normOrder(o) {
  const lines = o.rincian || (o.produk || []).map(s => { const m = /^(.*) x(\d+)$/.exec(s); return m ? { name: m[1], qty: +m[2], price: 0 } : { name: s, qty: 1, price: 0 }; });
  return {
    id: o.no, tanggal: o.tanggal, pelanggan: o.pelanggan || 'Tanpa nama', tipe: 'Produk', deskripsi: lines.map(l => l.name).join(', '),
    items: lines, subtotal: o.subtotal != null ? o.subtotal : o.total, diskon: o.diskon || 0, ongkir: o.ongkir || 0, total: o.total, metode: o.metode,
    status: o.statusBayar || 'Lunas', sumber: 'Online', ref: '', _src: 'orders'
  };
}
AD.trx = {
  all() {
    const adm = read('fv_admin_trx', []).map(t => ({ ...t, _src: 'admin' }));
    const onl = read('fv_orders', []).map(normOrder);
    return [...adm, ...onl].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  },
  get: id => AD.trx.all().find(t => t.id === id),
  nextId(dateIso) {
    const d = dateIso.slice(0, 10).replace(/-/g, '');
    const n = AD.trx.all().filter(t => t.id.startsWith(`TRX-${d}`)).length + 1;
    return `TRX-${d}-${pad2(n)}`;
  },
  add(t) {
    const list = read('fv_admin_trx', []);
    const local = `${todayISO()}T${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}:00`;
    const rec = { ...t, tanggal: t.tanggal || local, id: t.id || AD.trx.nextId(t.tanggal || local), sumber: t.sumber || 'Kasir' };
    list.unshift(rec); write('fv_admin_trx', list);
    return rec;
  },
  /* Transaksi otomatis saat booking selesai (jika belum ada) */
  ensureForBooking(b) {
    if (!b || b.trxId || AD.trx.all().some(t => t.ref === b.code)) return;
    const rec = AD.trx.add({
      pelanggan: b.pelanggan || 'Tanpa nama', tipe: 'Layanan', deskripsi: `${b.tipe} · ${b.hewan}`,
      items: [{ name: `${b.layanan}: ${b.tipe}${b.durasiHari > 1 ? ` × ${b.durasiHari} hari` : ''}`, qty: 1, price: b.biaya }],
      subtotal: b.biaya, diskon: 0, ongkir: 0, total: b.biaya, metode: 'Tunai', status: 'Lunas', ref: b.code
    });
    AD.bookings.mutate(b.code, o => { o.trxId = rec.id; });
    AD.log.add('Transaksi', `Transaksi ${rec.id} dibuat otomatis dari booking ${b.code}`);
  },
  markPaid(id) {
    const t = AD.trx.get(id); if (!t) return;
    if (t._src === 'orders') { const l = read('fv_orders', []); const o = l.find(x => x.no === id); if (o) { o.statusBayar = 'Lunas'; write('fv_orders', l); } }
    else { const l = read('fv_admin_trx', []); const o = l.find(x => x.id === id); if (o) { o.status = 'Lunas'; write('fv_admin_trx', l); } }
    AD.log.add('Transaksi', `Menandai ${id} lunas (${rp(t.total)})`);
  }
};

/* ---------- Stok & produk ---------- */
AD.stock = {
  status: p => stockStatus(p),
  rank: p => ({ habis: 0, kurang: 1, aman: 2 })[stockStatus(p)],
  expiry(p) {
    if (!p.exp) return null;
    const d = diffDays(p.exp, todayISO());
    return d < 0 ? 'kedaluwarsa' : d <= 60 ? 'segera' : null;
  },
  counts() {
    const act = PRODUCTS.filter(p => p.aktif !== false);
    return { habis: act.filter(p => stockStatus(p) === 'habis').length, kurang: act.filter(p => stockStatus(p) === 'kurang').length };
  },
  needRestock: () => PRODUCTS.filter(p => p.aktif !== false && stockStatus(p) !== 'aman').sort((a, b) => AD.stock.rank(a) - AD.stock.rank(b) || a.name.localeCompare(b.name, 'id')),
  suggested: p => Math.max(1, p.min * 2 - p.stock),
  adjust(id, delta, note) {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    p.stock = Math.max(0, p.stock + delta); saveProducts();
    AD.log.add('Stok', `${delta >= 0 ? 'Restock' : 'Mengurangi stok'} ${p.name} ${delta >= 0 ? '+' : ''}${delta}${note ? ' (' + note + ')' : ''}`);
  },
  orders: () => read('fv_admin_orders', []),
  placeOrder(distributor, items) {
    const l = read('fv_admin_orders', []);
    const d = new Date(); const n = l.length + 1;
    const rec = { id: `PO-${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}-${String(n).padStart(3, '0')}`, tanggal: `${todayISO()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`, distributor, status: 'Dipesan', items };
    l.unshift(rec); write('fv_admin_orders', l);
    AD.log.add('Stok', `Order restock ${rec.id} ke ${distributor} (${items.length} produk, ${items.reduce((s, i) => s + i.qty, 0)} unit)`);
    return rec;
  },
  receiveOrder(id) {
    const l = read('fv_admin_orders', []); const o = l.find(x => x.id === id); if (!o || o.status === 'Diterima') return;
    o.status = 'Diterima'; o.diterima = new Date().toISOString(); write('fv_admin_orders', l);
    o.items.forEach(it => { const p = PRODUCTS.find(x => x.id === it.id); if (p) p.stock += it.qty; });
    saveProducts();
    AD.log.add('Stok', `Menerima order ${id}: stok ditambahkan`);
  }
};

/* ---------- Notifikasi (diturunkan dari data) ---------- */
AD.notifs = {
  items() {
    const out = [];
    AD.bookings.all().filter(b => AD.bookings.eff(b) === 'Menunggu Konfirmasi').sort((a, b) => AD.bookings.start(a) - AD.bookings.start(b)).slice(0, 6)
      .forEach(b => out.push({ key: `bk:${b.code}`, kind: 'booking', title: `Booking baru: ${b.pelanggan || 'Tanpa nama'}`, desc: `${b.tipe} · ${fmtDateShort(b.tanggal)} ${b.waktu}`, go: ['booking', { drawer: b.code }] }));
    AD.stock.needRestock().slice(0, 6).forEach(p => out.push({ key: `st:${p.id}:${stockStatus(p)}`, kind: 'stok', title: `${stockStatus(p) === 'habis' ? 'Stok habis' : 'Stok kurang'}: ${p.name}`, desc: `Sisa ${p.stock} · minimum ${p.min}`, go: ['stok', { q: p.name }] }));
    const read_ = read('fv_admin_notif_read', []);
    return out.map(n => ({ ...n, unread: !read_.includes(n.key) }));
  },
  unread: () => AD.notifs.items().filter(n => n.unread).length,
  markAll() { write('fv_admin_notif_read', AD.notifs.items().map(n => n.key)); },
  markOne(key) { const r = read('fv_admin_notif_read', []); if (!r.includes(key)) { r.push(key); write('fv_admin_notif_read', r); } }
};

AD.init = ensureSeed;
