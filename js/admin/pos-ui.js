/* Cashier invoice queue and searchable point of sale. */
Pages.pembayaran = {
  title: 'Pembayaran',
  render(view) {
    AD.require(PERM.PAY);
    W.table(
      view,
      'Tagihan layanan dan pembelian. Pembayaran yang dicatat adalah simulasi lokal.',
      AD.trx.all(),
      [
        {
          key: 'id',
          label: 'Invoice / pelanggan',
          render: (t) => `${esc(t.id)}<small class="sub">${esc(t.pelanggan)}</small>`,
        },
        {
          key: 'items',
          label: 'Item',
          render: (t) => t.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>'),
        },
        { key: 'total', label: 'Total', render: (t) => rp(t.total) },
        { key: 'status', label: 'Pembayaran', render: (t) => UI.chip(t.status) },
        {
          key: 'actions',
          label: 'Aksi',
          render: (t) =>
            `${t.status === 'Menunggu' ? W.button('Bayar simulasi', 'pay', t.id) + (t.ref ? W.button('Tambah produk', 'invoiceitems', t.id) : '') : W.button('Ajukan koreksi', 'reverse', t.id)}${W.button('Nota', 'receipt', t.id)}`,
        },
      ],
    );
  },
};
Pages.pos = {
  title: 'Kasir / POS',
  render(view) {
    AD.require(PERM.PAY);
    const cart = [];
    const requestId = FVStore.uid('POS');
    view.innerHTML = `<div class="page-bar"><p class="muted">Pembayaran simulasi • harga mengikuti katalog • promo FILO10 (10%).</p></div><div class="work-split"><section class="panel"><div class="filters"><label class="sr-only" for="posSearch">Cari produk</label><input type="search" id="posSearch" placeholder="Cari produk…"></div><div id="posCatalog"></div></section><section class="panel work-pad"><h2>Keranjang POS</h2><div id="posCart"></div>${W.field('posName', 'Nama pelanggan (opsional)')}${W.field('posPromo', 'Kode promo (opsional)')}${W.select('posMethod', 'Metode pembayaran', PAY_METHODS)}<p class="preview" id="posTotal"></p><p class="field-error" id="posError" role="alert"></p><button type="button" class="btn btn-primary" id="posComplete">Selesaikan pembayaran simulasi</button></section></div>`;
    const draw = () => {
      const q = $q('#posSearch', view).value.toLowerCase();
      $q('#posCatalog', view).innerHTML = `<ul class="alert-list">${PRODUCTS.filter(
        (p) => p.aktif !== false && !p.resep && p.name.toLowerCase().includes(q),
      )
        .map(
          (p) =>
            `<li><div><strong>${esc(p.name)}</strong><small class="sub">${rp(p.price)} · Stok ${p.stock}</small></div><button class="btn btn-outline btn-sm" type="button" data-pos="${p.id}" ${p.stock < 1 ? 'disabled' : ''}>Tambah</button></li>`,
        )
        .join('')}</ul>`;
      const promo = $q('#posPromo', view).value.trim().toUpperCase();
      const sub = cart.reduce((n, i) => n + PRODUCTS.find((p) => p.id === i.id).price * i.qty, 0);
      $q('#posCart', view).innerHTML = cart.length
        ? cart
            .map(
              (i) =>
                `<div class="field"><label for="qty${i.id}">${esc(PRODUCTS.find((p) => p.id === i.id).name)}</label><input id="qty${i.id}" data-posqty="${i.id}" type="number" min="0" max="${PRODUCTS.find((p) => p.id === i.id).stock}" step="1" value="${i.qty}"></div>`,
            )
            .join('')
        : '<p class="muted">Cari produk dan tambahkan ke keranjang.</p>';
      $q('#posTotal', view).textContent = 'Total: ' + rp(sub - Math.round(sub * (PROMOS[promo] || 0)));
    };
    view.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pos]');
      if (!b) return;
      const p = PRODUCTS.find((p) => p.id === +b.dataset.pos),
        i = cart.find((i) => i.id === p.id);
      if ((i?.qty || 0) >= p.stock) return UI.toast('Stok tidak cukup', 'error');
      if (i) i.qty++;
      else cart.push({ id: p.id, qty: 1 });
      draw();
    });
    view.addEventListener('change', (e) => {
      if (e.target.matches('[data-posqty]')) {
        const i = cart.find((i) => i.id === +e.target.dataset.posqty);
        i.qty = +e.target.value;
        if (!i.qty) cart.splice(cart.indexOf(i), 1);
        draw();
      }
    });
    $q('#posSearch', view).oninput = draw;
    $q('#posPromo', view).oninput = draw;
    $q('#posComplete', view).onclick = () => {
      W.run(() => {
        const sale = AD.billing.pos(
          cart,
          $q('#posMethod', view).value,
          $q('#posPromo', view).value.trim().toUpperCase(),
          $q('#posName', view).value,
          requestId,
        );
        UI.toast('Transaksi simulasi tersimpan');
        AD.go('transaksi', { drawer: sale.id });
      });
    };
    draw();
  },
};
