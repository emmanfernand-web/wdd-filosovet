/* All role/page/action policy lives here. This is UI simulation, never real authorization. */
const PERM = Object.freeze({
  BOOK: 'booking.edit',
  CUSTOMER: 'customer.edit',
  STOCK: 'stock.edit',
  PRODUCT: 'product.edit',
  PRICE: 'product.price',
  PAY: 'payment.complete',
  CLINIC: 'clinical.edit',
  GROOM: 'grooming.complete',
  HOTEL: 'hotel.edit',
  APPROVE: 'adjustment.approve',
  STAFF: 'staff.edit',
  EXPORT: 'report.export',
});
Object.assign(ROLES, {
  admin: {
    label: 'Admin',
    title: 'Dashboard',
    pages: [
      'dashboard',
      'booking',
      'pelanggan',
      'stok',
      'produk',
      'transaksi',
      'laporan',
      'staff',
      'pengaturan',
    ],
    permissions: [
      PERM.BOOK,
      PERM.CUSTOMER,
      PERM.STOCK,
      PERM.PRODUCT,
      PERM.PRICE,
      PERM.PAY,
      PERM.APPROVE,
      PERM.STAFF,
      PERM.EXPORT,
    ],
  },
  kasir: {
    label: 'Kasir',
    title: 'Dashboard Kasir',
    pages: ['dashboard', 'pembayaran', 'pos', 'transaksi'],
    permissions: [PERM.PAY, PERM.EXPORT],
  },
  inventory: {
    label: 'Inventory Staff',
    title: 'Dashboard Inventory',
    pages: ['dashboard', 'stok', 'produk', 'supplier', 'mutasi'],
    permissions: [PERM.STOCK, PERM.PRODUCT],
  },
  resepsionis: {
    label: 'Resepsionis',
    title: 'Dashboard Front Desk',
    pages: ['dashboard', 'booking', 'antrean', 'pelanggan'],
    permissions: [PERM.BOOK, PERM.CUSTOMER],
  },
  dokter: {
    label: 'Dokter',
    title: 'Dashboard Dokter',
    pages: ['dashboard', 'pasien', 'medis', 'resep', 'jadwal'],
    permissions: [PERM.CLINIC],
    service: 'konsultasi',
  },
  groomer: {
    label: 'Groomer',
    title: 'Dashboard Groomer',
    pages: ['dashboard', 'grooming', 'proses', 'riwayatgrooming'],
    permissions: [PERM.GROOM],
    service: 'grooming',
  },
  hotel: {
    label: 'Pet Hotel Staff',
    title: 'Dashboard Pet Hotel',
    pages: ['dashboard', 'reservasi', 'kandang', 'perawatan', 'riwayathotel'],
    permissions: [PERM.HOTEL],
    service: 'hotel',
  },
});
AD.can = (page) => ROLES[AD.role()].pages.includes(page);
AD.allowed = (permission) => ROLES[AD.role()].permissions.includes(permission);
AD.require = (permission) =>
  FVStore.require(AD.allowed(permission), 'Peran ini tidak memiliki izin untuk tindakan tersebut.');
AD.baseStaffId = (role, name) => 'STAFF-' + FVStore.stable(role + '|' + name);
AD.staffId = (name, role = AD.role()) =>
  FVStore.state().staff.find((s) => s.nama === name && s.role === role)?.id || AD.baseStaffId(role, name);
AD.serviceStaff = (service) => FVStore.serviceStaff(service);
AD.staffChoices = () =>
  ROLES[AD.role()].service
    ? AD.serviceStaff(ROLES[AD.role()].service)
    : [
        AD.roleLabel(),
        ...FVStore.state()
          .staff.filter((s) => s.role === AD.role() && s.active !== false)
          .map((s) => s.nama),
      ];
AD.actor = () => {
  const saved = localStorage.getItem('fv_staff_' + AD.role());
  return AD.staffChoices().includes(saved) ? saved : AD.staffChoices()[0];
};
AD.setStaff = (name) => {
  FVStore.require(AD.staffChoices().includes(name), 'Staff tidak valid.');
  localStorage.setItem('fv_staff_' + AD.role(), name);
};
AD.actorId = () => AD.staffId(AD.actor());
AD.owns = (record, field = 'staff') =>
  record?.[field + 'Id'] ? record[field + 'Id'] === AD.actorId() : record?.[field] === AD.actor();
AD.assigned = (b) =>
  !!b &&
  b.svcKey === ROLES[AD.role()].service &&
  (b.staffId ? b.staffId === AD.actorId() : b.petugas === AD.actor());
AD.scope = (b) => ['admin', 'resepsionis'].includes(AD.role()) || AD.assigned(b);
AD.setRole = (role) => {
  FVStore.require(!!ROLES[role], 'Peran tidak valid.');
  localStorage.setItem('fv_admin_role', role);
};
/* Fine-grained verbs supplement the workspace capabilities above. */
const ACTIONS = Object.freeze({
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  ARCHIVE: 'archive',
  CONFIRM: 'confirm',
  COMPLETE: 'complete',
  APPROVE: 'approve',
  EXPORT: 'export',
});
const ACTION_POLICY = {
  booking: {
    admin: ['view', 'create', 'edit', 'archive', 'confirm'],
    resepsionis: ['view', 'create', 'edit', 'archive', 'confirm'],
    dokter: ['view'],
    groomer: ['view'],
    hotel: ['view'],
  },
  customer: { admin: ['view', 'create', 'edit'], resepsionis: ['view', 'create', 'edit'] },
  clinical: { dokter: ['view', 'create', 'edit', 'complete'] },
  prescription: { dokter: ['view', 'create', 'edit', 'complete'], inventory: ['view'] },
  product: { admin: ['view', 'create', 'edit', 'archive'], inventory: ['view', 'edit', 'archive'] },
  stock: { admin: ['view', 'create', 'edit', 'complete'], inventory: ['view', 'create', 'edit', 'complete'] },
  sale: {
    admin: ['view', 'create', 'edit', 'complete', 'export'],
    kasir: ['view', 'create', 'edit', 'complete', 'export'],
  },
  adjustment: { admin: ['view', 'create', 'approve'], kasir: ['view', 'create'] },
  staff: { admin: ['view', 'create', 'edit', 'archive'] },
};
AD.permitted = (resource, action) => (ACTION_POLICY[resource]?.[AD.role()] || []).includes(action);
AD.authorize = (resource, action) =>
  FVStore.require(AD.permitted(resource, action), 'Tindakan ini tidak diizinkan untuk peran aktif.');
