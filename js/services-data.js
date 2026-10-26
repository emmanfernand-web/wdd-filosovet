/* ============================================================
   FILOSOVET — services-data.js
   Data layanan (tipe, harga, durasi, petugas, slot). Dipakai halaman
   Booking publik dan panel admin sebagai satu sumber data.
   ============================================================ */
const SERVICES = {
  grooming: {
    label: 'Grooming', icon: '',
    types: [
      { key: 'kucing', name: 'Grooming Kucing', price: 120000, min: 90 },
      { key: 'anjing-kecil', name: 'Grooming Anjing <10kg', price: 150000, min: 90 },
      { key: 'anjing-besar', name: 'Grooming Anjing >10kg', price: 200000, min: 90 },
      { key: 'jamur', name: 'Grooming Jamur', price: 220000, min: 90 },
    ],
    staff: ['Paramedis bebas', 'Rani — Groomer', 'Bagas — Groomer'],
    slots: ['09:00', '10:30', '13:00', '14:30', '16:00'],
    hint: 'Durasi grooming ± 90 menit per slot.'
  },
  konsultasi: {
    label: 'Konsultasi Dokter Hewan', icon: '',
    types: [
      { key: 'konsultasi-umum', name: 'Konsultasi Umum', price: 150000, min: 30 },
      { key: 'medical-check-up', name: 'Medical Check-Up', price: 350000, min: 60 },
      { key: 'vaksinasi', name: 'Vaksinasi', price: 180000, min: 20 },
      { key: 'kontrol', name: 'Kontrol / Tindak Lanjut', price: 100000, min: 20 },
    ],
    staff: ['drh. Andini', 'drh. Prasetyo', 'drh. Larasati'],
    slots: ['08:30', '09:30', '10:30', '11:30', '13:30', '15:00', '16:30'],
    hint: 'Bawa kartu vaksin & riwayat kesehatan bila ada. Durasi bersifat estimasi.'
  },
  hotel: {
    label: 'Pet Hotel', icon: '',
    types: [
      { key: 'reguler', name: 'Kandang Reguler', price: 150000 },
      { key: 'premium', name: 'Kandang Premium', price: 250000 },
      { key: 'suite', name: 'Kandang Suite', price: 400000 },
    ],
    staff: ['Paramedis Rawat Inap'],
    slots: ['08:00', '10:00', '13:00', '15:00'], // jam check-in
    hint: 'Wajib lampirkan bukti vaksin lengkap, bebas kutu & cacing saat check-in.',
    perDay: true
  }
};
