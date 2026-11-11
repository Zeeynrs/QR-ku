/*
 * Konfigurasi QRku. Semua nilai di sini aman untuk publik (tidak ada rahasia).
 * Lihat README.md untuk cara mendapatkan setiap nilai.
 */
window.QRKU = window.QRKU || {};

window.QRKU.config = {
  auth: {
    // Client ID OAuth dari Google Cloud Console, berakhiran ".apps.googleusercontent.com".
    // Kosong = tombol Masuk menampilkan pesan "belum aktif".
    googleClientId: ''
  },

  ads: {
    // ID penerbit AdSense, formatnya "ca-pub-XXXXXXXXXXXXXXXX". Kosong = iklan belum aktif.
    adsenseClient: '',
    // ID unit iklan per slot. Nama slot cocok dengan atribut data-ad-slot di index.html.
    slots: {
      'below-tool': ''
    },
    // Tampilkan kotak penanda di posisi iklan selama AdSense belum diisi.
    // Ubah ke false sebelum rilis jika iklan belum aktif.
    showPlaceholders: true
  },

  pro: {
    // Pro masih dalam pengembangan. Salah satu dari dua nilai ini mengaktifkan tombol daftar tunggu.
    // waitlistUrl: tautan formulir (misalnya Google Form). Diprioritaskan jika keduanya diisi.
    waitlistUrl: '',
    // contactEmail: alamat email pemilik situs, dipakai untuk tautan mailto.
    contactEmail: ''
  }
};
