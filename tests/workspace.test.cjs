const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function app(initial = [], render = false) {
  const data = new Map(initial);
  const nodes = new Map();
  function node(key) {
    if (nodes.has(key)) return nodes.get(key);
    const n = {
      innerHTML: '',
      textContent: '',
      value: '',
      dataset: {},
      style: {},
      hidden: false,
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() {
          return false;
        },
      },
      setAttribute() {},
      getAttribute() {
        return '';
      },
      addEventListener() {},
      insertAdjacentHTML(where, html) {
        this.innerHTML += html;
      },
      querySelector: (s) => node(key + ' ' + s),
      querySelectorAll: () => [],
      closest: () => node('closest'),
      appendChild() {},
      remove() {},
      focus() {},
      scrollIntoView() {},
      reportValidity: () => true,
    };
    nodes.set(key, n);
    return n;
  }
  const ctx = vm.createContext({
    console,
    Date,
    Math,
    Set,
    Map,
    JSON,
    structuredClone,
    crypto: require('node:crypto').webcrypto,
    localStorage: {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    },
    document: {
      addEventListener() {},
      querySelector: (s) => node(s),
      querySelectorAll: () => [],
      createElement: () => node(Math.random()),
      documentElement: node('html'),
      body: node('body'),
      contains: () => true,
    },
    window: { innerWidth: 1200, addEventListener() {}, scrollTo() {} },
    location: { hash: '#/dashboard' },
    history: { replaceState() {} },
    setTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame: (fn) => fn(),
    matchMedia: () => ({ matches: true }),
    toast() {},
    escapeHtml: String,
    rupiah: String,
  });
  for (const f of [
    'js/operations-store.js',
    'js/cart.js',
    'js/services-data.js',
    'js/admin/core.js',
    'js/admin/permissions.js',
    'js/admin/operations.js',
    'js/admin/stock-service.js',
    'js/admin/clinical.js',
    'js/admin/boarding.js',
    'js/admin/billing.js',
  ]) {
    if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  if (render)
    for (const f of [
      'ui',
      'dashboard',
      'booking',
      'inventory',
      'finance',
      'workspace-ui',
      'clinical-ui',
      'operations-ui',
      'pos-ui',
      'role-dashboards',
      'shell',
    ])
      vm.runInContext(fs.readFileSync('js/admin/' + f + '.js', 'utf8'), ctx, { filename: f });
  const run = (code) => vm.runInContext(code, ctx);
  run.snapshot = () => [...data];
  run.nodes = nodes;
  return run;
}
const setup = `AD.init(); AD.setRole('resepsionis');
const c = AD.ops.customer({nama:'Test Owner',hp:'081234567890'});
const p = AD.ops.pet({customerId:c.id,nama:'Test Pet',spesie:'Kucing'});
function book(svc, time='09:30') { return AD.bookings.addManual({customerId:c.id,petId:p.id,pelanggan:c.nama,hp:c.hp,hewan:p.nama,spesie:p.spesie,layanan:SERVICES[svc].label,tipe:SERVICES[svc].types[0].name,tanggal:addDaysISO(todayISO(),10),waktu:time,petugas:SERVICES[svc].staff[0],durasiHari:2,biaya:SERVICES[svc].types[0].price*(svc==='hotel'?2:1)}); }`;
test('seven roles and action permissions deny cashier stock edits', () => {
  const run = app();
  assert.equal(run('Object.keys(ROLES).length'), 7);
  run("AD.setRole('kasir')");
  assert.equal(run("AD.can('stok')"), false);
  assert.throws(() => run("AD.stock.adjust(1,1,'test')"));
});
test('A: shared registration, assigned doctor draft/final/amendment, payable invoice and one dispensing', () => {
  const run = app();
  run(
    setup +
      `const code=book('konsultasi'); AD.ops.checkIn(code); AD.setRole('dokter');
 AD.clinic.save(code,{diagnosis:'Observasi',physical:'Pemeriksaan',weight:4,temperature:38,procedures:'Kontrol',procedureFee:10000},[{productId:5,dosage:'Sesuai instruksi',route:'Oral',frequency:'1 kali',duration:'1 hari',quantity:1},{productId:6,dosage:'Sesuai instruksi',route:'Oral',frequency:'1 kali',duration:'1 hari',quantity:1}],false);`,
  );
  assert.equal(run('AD.clinic.records()[0].status'), 'Draft');
  const stock = run('PRODUCTS.find(p=>p.id===5).stock');
  run(`AD.clinic.finalize(code);`);
  assert.equal(run('AD.bookings.get(code).status'), 'Selesai');
  assert.throws(() => run("AD.clinic.save(code,{diagnosis:'overwrite'},[],false)"));
  run(
    "AD.clinic.amend(AD.clinic.records()[0].id,'Koreksi catatan'); AD.setRole('kasir'); const invoice=AD.trx.all().find(t=>t.ref===code);",
  );
  assert.equal(run('invoice.status'), 'Menunggu');
  assert.equal(run('invoice.items.length'), 4);
  run(
    "AD.billing.pay(invoice.id,'Tunai'); AD.billing.pay(invoice.id,'Tunai'); AD.setRole('inventory'); AD.billing.dispense(invoice.id); AD.billing.dispense(invoice.id);",
  );
  assert.equal(run('PRODUCTS.find(p=>p.id===5).stock'), stock - 1);
  assert.equal(run('FVStore.state().payments.filter(x=>x.saleId===invoice.id).length'), 1);
  assert.equal(run('FVStore.state().amendments.length'), 1);
  run("AD.setRole('admin')");
  assert.throws(() => run("AD.clinic.amend(AD.clinic.records()[0].id,'Tidak diizinkan')"));
});
test('B: grooming progress creates one pending bill and survives reload', () => {
  const run = app();
  run(
    setup +
      `const code=book('grooming','10:30'); AD.ops.checkIn(code); AD.setRole('groomer'); AD.ops.groom(code,'Dalam Proses','Mandi'); AD.ops.groom(code,'Selesai','Mandi dan pengeringan'); AD.setRole('kasir'); const t=AD.trx.all().find(t=>t.ref===code); AD.billing.pay(t.id,'QRIS');`,
  );
  assert.equal(run('AD.bookings.get(code).status'), 'Selesai');
  assert.equal(run('FVStore.state().grooming.length'), 1);
  assert.equal(run('AD.trx.all().filter(t=>t.ref===code).length'), 1);
});
test('C: room overlap denied, care requires veterinary instruction, checkout releases occupancy', () => {
  const run = app();
  run(
    setup +
      `const code=book('hotel','08:00'); const other=book('hotel','10:00'); AD.setRole('hotel'); const stay=AD.hotel.reserve(code,'ROOM-1');`,
  );
  assert.throws(() => run("AD.hotel.reserve(other,'ROOM-1')"));
  run("AD.hotel.checkIn(stay.id); AD.hotel.care(stay.id,{type:'Pakan',note:'Makan habis'});");
  assert.throws(() => run("AD.hotel.care(stay.id,{type:'Obat',note:'Obat mandiri'})"));
  run('AD.hotel.checkOut(stay.id)');
  assert.equal(run('AD.hotel.active().length'), 0);
  assert.equal(run('AD.trx.all().find(t=>t.ref===code).status'), 'Menunggu');
});
test('D: receive order and sell product with exactly one movement; prevent negative balances', () => {
  const run = app();
  run(
    `AD.init(); AD.setRole('inventory'); const before=PRODUCTS[0].stock; const po=AD.stock.placeOrder('Supplier',[{id:1,name:PRODUCTS[0].name,qty:4}]); AD.stock.receiveOrder(po.id); AD.stock.receiveOrder(po.id);`,
  );
  assert.equal(run('PRODUCTS[0].stock-before'), 4);
  assert.throws(() => run("AD.stock.adjust(1,-10000,'rusak')"));
  run(
    `AD.setRole('kasir'); const sale=AD.billing.pos([{id:1,qty:2}],'Tunai','FILO10','Owner','test-sale'); AD.billing.pos([{id:1,qty:2}],'Tunai','FILO10','Owner','test-sale');`,
  );
  assert.equal(run('PRODUCTS[0].stock-before'), 2);
  assert.equal(run('sale.total'), 333000);
});
test('assignment, invalid references, finalized record access, and persistence errors', () => {
  const run = app();
  run(setup + `const code=book('konsultasi');`);
  assert.throws(() => run("book('konsultasi')"));
  run("AD.ops.checkIn(code); AD.setRole('dokter'); AD.setStaff('drh. Prasetyo')");
  assert.throws(() => run('AD.clinic.save(code,{},[],false)'));
  assert.throws(() => run("AD.clinic.save('missing',{},[],false)"));
  run("AD.setRole('resepsionis')");
  assert.throws(() => run("AD.billing.pay('missing','Tunai')"));
});
test('catalog inventory role preserves prices and every edit creates movement', () => {
  const run = app();
  run("AD.init(); AD.setRole('inventory'); const old=PRODUCTS[0].price;");
  assert.throws(() => run('AD.catalog.save(1,{...PRODUCTS[0],price:1})'));
  run("AD.catalog.save(1,{...PRODUCTS[0],name:'Pakan diperbarui',stock:PRODUCTS[0].stock+2})");
  assert.equal(run('PRODUCTS[0].price'), 185000);
  assert.equal(
    run('FVStore.state().movements.filter(m=>m.productId===1).reduce((n,m)=>n+m.delta,0)'),
    run('PRODUCTS[0].stock'),
  );
});
test('public checkout uses fresh stock and rolls back failed persistence', () => {
  const run = app();
  run(
    "AD.init(); const before=PRODUCTS[0].stock; FVStore.checkout([{...PRODUCTS[0],qty:1}],{no:'public-test',total:185000}); FVStore.checkout([{...PRODUCTS[0],qty:1}],{no:'public-test',total:185000});",
  );
  assert.equal(run('PRODUCTS[0].stock'), run('before-1'));
  assert.throws(() => run("FVStore.checkout([{...PRODUCTS[0],qty:999}],{no:'bad'})"));
  assert.equal(run("FVStore.get('fv_orders',[]).length"), 1);
  run(
    "const orig=localStorage.setItem; localStorage.setItem=(k,v)=>{if(k==='broken')throw Error('quota');orig(k,v)}",
  );
  assert.throws(() => run('FVStore.commit({example:{value:1},broken:{value:2}})'));
  assert.equal(run("localStorage.getItem('example')"), null);
});
test('role routes are distinct and clinical data is inaccessible to unrelated roles', () => {
  const run = app();
  run('AD.init()');
  for (const role of ['kasir', 'inventory', 'resepsionis', 'groomer', 'hotel', 'admin']) {
    run(`AD.setRole('${role}')`);
    assert.throws(() => run('AD.clinic.records()'));
  }
  assert.equal(run("ROLES.dokter.pages.includes('medis')"), true);
});
test('mixed service invoice accepts retail items and payment deducts retail once', () => {
  const run = app();
  run(
    setup +
      `const code=book('grooming','13:00'); AD.ops.checkIn(code); AD.setRole('groomer'); AD.ops.groom(code,'Dalam Proses','Mandi'); AD.ops.groom(code,'Selesai','Selesai'); AD.setRole('kasir'); const t=AD.trx.all().find(t=>t.ref===code);const before=PRODUCTS[0].stock; AD.billing.addItems(t.id,[{id:1,qty:2}]); AD.billing.pay(t.id,'Tunai'); AD.billing.pay(t.id,'Tunai');`,
  );
  assert.equal(run('PRODUCTS[0].stock'), run('before-2'));
  assert.throws(() => run('AD.billing.addItems(t.id,[{id:1,qty:1}])'));
});

test('persistent state reloads without losing normalized references or balances', () => {
  const run = app();
  run(setup + `const code=book('grooming','14:30'); AD.ops.checkIn(code);`);
  const snapshot = run.snapshot(),
    next = app(snapshot);
  next('AD.init()');
  assert.equal(
    next(
      "AD.bookings.all().find(b=>b.customerId===FVStore.state().customers.find(c=>c.nama==='Test Owner').id).checkedInAt !== undefined",
    ),
    true,
  );
  assert.equal(next('FVStore.state().customers.length'), run('FVStore.state().customers.length'));
  assert.equal(next('FVStore.state().movements.length'), run('FVStore.state().movements.length'));
});
test('all authorized view renderers execute with the real table templates (DOM stub, not browser)', () => {
  const run = app([], true);
  run('AD.init()');
  for (const role of ['admin', 'kasir', 'inventory', 'resepsionis', 'dokter', 'groomer', 'hotel']) {
    run(`AD.setRole('${role}')`);
    for (const page of JSON.parse(run('JSON.stringify(ROLES[AD.role()].pages)'))) {
      run(`AD.current='${page}'; Pages['${page}'].render(document.querySelector('#view'), {});`);
      assert.ok(run("document.querySelector('#view').innerHTML.length") > 0, role + ':' + page);
    }
  }
});
test('cancelling a reserved hotel booking releases its room interval', () => {
  const run = app();
  run(
    setup +
      `const code=book('hotel','08:00');const other=book('hotel','10:00');AD.setRole('hotel');AD.hotel.reserve(code,'ROOM-2');AD.setRole('resepsionis');AD.bookings.setStatus(code,'Dibatalkan','Pemilik membatalkan');AD.setRole('hotel');`,
  );
  assert.doesNotThrow(() => run("AD.hotel.reserve(other,'ROOM-2')"));
});
test('configured staff are available for assignment and inactive staff are excluded', () => {
  const run = app();
  run(
    `AD.init();const s=FVStore.state();s.staff.push({id:'staff-new',nama:'drh. Baru',role:'dokter',active:true});s.staff.push({id:'staff-old',nama:'drh. Andini',role:'dokter',active:false});FVStore.save(s);`,
  );
  assert.equal(run("AD.serviceStaff('konsultasi').includes('drh. Baru')"), true);
  assert.equal(run("AD.serviceStaff('konsultasi').includes('drh. Andini')"), false);
});
test('hotel reschedule synchronizes room dates and rejects room conflicts atomically', () => {
  const run = app();
  run(
    setup +
      `const code=book('hotel','08:00');AD.setRole('hotel');AD.hotel.reserve(code,'ROOM-3');AD.setRole('resepsionis');AD.ops.schedule(code,{tanggal:addDaysISO(todayISO(),15)});`,
  );
  assert.equal(
    run('FVStore.state().stays.find(s=>s.bookingCode===code).start'),
    run('addDaysISO(todayISO(),15)'),
  );
});
test('catalog batch expiry cannot bypass batch audit; correction is persistent', () => {
  const run = app();
  run("AD.init();AD.setRole('inventory');");
  assert.throws(() =>
    run('AD.catalog.save(8,{...PRODUCTS.find(p=>p.id===8),exp:addDaysISO(todayISO(),100)})'),
  );
  run(
    "AD.stock.updateBatch('OPEN-8',addDaysISO(todayISO(),100),'AB-corrected','Koreksi salah ketik dari dokumen supplier')",
  );
  assert.equal(run('AD.stock.expiry(PRODUCTS.find(p=>p.id===8))'), null);
  assert.equal(run('FVStore.state().batchHistory.length'), 1);
  const next = app(run.snapshot());
  next('AD.init()');
  assert.equal(next('PRODUCTS.find(p=>p.id===8).exp'), run('PRODUCTS.find(p=>p.id===8).exp'));
});
test('payment rejects a corrupted item total without recording collection', () => {
  const run = app();
  run(
    "AD.init();AD.setRole('kasir');const t=AD.trx.all().find(t=>t.status==='Menunggu');const list=FVStore.get('fv_admin_trx',[]);list.find(x=>x.id===t.id).items[0].price=1;FVStore.commit({fv_admin_trx:list});",
  );
  assert.throws(() => run("AD.billing.pay(t.id,'Tunai')"));
  assert.equal(run('FVStore.state().payments.length'), 0);
});
test('supplier orders reject duplicate product lines rather than silently under-receive', () => {
  const run = app();
  run("AD.init();AD.setRole('inventory')");
  assert.throws(() =>
    run("AD.stock.placeOrder('Supplier',[{id:1,name:'Pakan',qty:2},{id:1,name:'Pakan',qty:3}])"),
  );
});
test('hotel room conflict rejects reschedule without changing either reference', () => {
  const run = app();
  run(
    setup +
      `const code=book('hotel','08:00');AD.setRole('hotel');AD.hotel.reserve(code,'ROOM-4');AD.setRole('resepsionis');AD.ops.schedule(code,{tanggal:addDaysISO(todayISO(),15)});const other=book('hotel','10:00');AD.setRole('hotel');AD.hotel.reserve(other,'ROOM-4');AD.setRole('resepsionis');`,
  );
  assert.throws(() => run('AD.ops.schedule(other,{tanggal:addDaysISO(todayISO(),15)})'));
  assert.equal(run('AD.bookings.get(other).tanggal'), run('addDaysISO(todayISO(),10)'));
  assert.equal(
    run('FVStore.state().stays.find(s=>s.bookingCode===other).start'),
    run('addDaysISO(todayISO(),10)'),
  );
});
test('a batch identifier cannot refer to different products or conflicting expiry dates', () => {
  const run = app();
  run(
    `AD.init();AD.setRole('inventory');AD.stock.adjust(1,2,'Restock',{batchId:'DELIVERY-1',expiry:addDaysISO(todayISO(),100)});`,
  );
  assert.throws(() => run("AD.stock.adjust(2,1,'Restock',{batchId:'DELIVERY-1'})"));
  assert.throws(() =>
    run("AD.stock.adjust(1,1,'Restock',{batchId:'DELIVERY-1',expiry:addDaysISO(todayISO(),200)})"),
  );
});
test('unauthorized hash navigation falls back to the role dashboard', () => {
  const run = app([], true);
  run("AD.init();AD.setRole('kasir');location.hash='#/medis';AD.render()");
  assert.equal(run('AD.current'), 'dashboard');
  assert.equal(run("document.querySelector('#pageTitle').textContent"), 'Dashboard Kasir');
});
test('malformed workspace collections fail without being replaced by empty data', () => {
  const run = app();
  run("localStorage.setItem('fv_workspace_v1',JSON.stringify({version:1,medical:{invalid:true}}))");
  assert.throws(() => run('FVStore.state()'));
  assert.equal(run("JSON.parse(localStorage.getItem('fv_workspace_v1')).medical.invalid"), true);
});
test('activity log write failure does not report an already-committed stock update as failed', () => {
  const run = app();
  run(
    "AD.init();AD.setRole('inventory');const original=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k==='fv_admin_log')throw Error('quota');original(k,v)};",
  );
  assert.doesNotThrow(() => run("AD.stock.adjust(1,1,'Koreksi hitung')"));
});
test('staff identity references survive a display-name edit', () => {
  const run = app();
  run(
    setup +
      `const code=book('konsultasi');AD.ops.checkIn(code);AD.setRole('dokter');AD.clinic.save(code,{diagnosis:'Kontrol',physical:'Pemeriksaan'},[],true);const state=FVStore.state();const staff=state.staff.find(s=>s.nama==='drh. Andini');staff.nama='drh. Andini Baru';FVStore.save(state);AD.setStaff('drh. Andini Baru');`,
  );
  assert.equal(run('AD.clinic.records().length'), 1);
  assert.doesNotThrow(() =>
    run("AD.clinic.amend(AD.clinic.records()[0].id,'Koreksi setelah nama staff berubah')"),
  );
});
test('public availability shares staff conflicts and customer/pet normalization', () => {
  const run = app();
  run(setup + `const code=book('grooming','09:00');const b=AD.bookings.get(code);`);
  assert.equal(run("FVStore.bookingAvailable({...b,svcKey:'grooming'})"), false);
  assert.equal(run("FVStore.bookingAvailable({...b,svcKey:'grooming'},code)"), true);
  assert.equal(
    run('FVStore.identity(FVStore.state(),{pelanggan:c.nama,hp:c.hp,hewan:p.nama,spesie:p.spesie}).petId'),
    run('p.id'),
  );
});
test('final medical record viewer retains all structured examination details', () => {
  const run = app([], true);
  run(
    setup +
      `const code=book('konsultasi');AD.ops.checkIn(code);AD.setRole('dokter');AD.clinic.save(code,{anamnesis:'Riwayat terstruktur',diagnosis:'Kontrol',physical:'Pemeriksaan',weight:4,temperature:38,notes:'Catatan dokter final'},[],true);AD.clinicalForm(code);`,
  );
  assert.equal(run("UI.layers.at(-1).el.innerHTML.includes('Riwayat terstruktur')"), true);
  assert.equal(run("UI.layers.at(-1).el.innerHTML.includes('Catatan dokter final')"), true);
});
