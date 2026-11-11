# QRku - Generator QR Code

Aplikasi web statis untuk membuat QR code dari link atau teks. QR dibuat di browser: isi QR tidak dikirim ke server, dan tidak ada backend.

## Fitur

- QR dari link atau teks, mendukung UTF-8 (emoji, huruf dengan aksen)
- Ukuran, margin, koreksi error, warna, dan preset warna
- Unduh PNG atau SVG
- Panel "Kesiapan pindai": kontras warna, versi QR, ukuran gambar, margin, dan kapasitas terpakai, dengan peringatan jika QR berisiko sulit dipindai
- Login Google (opsional, perlu Client ID)
- Slot iklan AdSense (perlu ID penerbit)
- Halaman Paket: perbandingan Gratis dan Pro. Pro masih dalam pengembangan dan belum bisa dibeli

## Menjalankan

```bash
npx serve .
```

Lalu buka alamat yang ditampilkan, misalnya `http://localhost:3000`.

Membuka `index.html` langsung sebagai file juga bisa untuk membuat QR, tetapi login Google hanya berfungsi lewat `http` atau `https`.

## Konfigurasi

Semua pengaturan ada di `config.js`. Tidak ada nilai rahasia di sana.

### Login Google

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat project.
2. Isi layar persetujuan OAuth (nama aplikasi, email dukungan, tautan kebijakan privasi).
3. Buat kredensial **OAuth client ID** dengan jenis **Web application**.
4. Di **Authorized JavaScript origins**, tambahkan alamat situs. Untuk pengembangan lokal tambahkan `http://localhost` dan `http://localhost:3000` (sesuaikan port).
5. Salin Client ID ke `auth.googleClientId` di `config.js`.

Selama Client ID kosong, tombol Masuk menampilkan pesan "Login Google belum aktif".

**Batasan penting:** login ini berjalan sepenuhnya di browser. Token Google tidak diverifikasi oleh server, dan profil pengguna disimpan di `localStorage`. Ini cukup untuk menampilkan akun, tetapi tidak aman untuk mengunci fitur berbayar. Sebelum Pro dijual, verifikasi token di server.

### Iklan (AdSense)

1. Daftarkan situs di [Google AdSense](https://adsense.google.com/) dan tunggu persetujuan.
2. Isi `ads.adsenseClient` dengan ID penerbit (`ca-pub-...`).
3. Buat unit iklan, lalu isi ID-nya di `ads.slots['below-tool']`.
4. Tambahkan file `ads.txt` di root situs dengan isi dari dasbor AdSense.

Selama ID kosong, posisi iklan menampilkan kotak penanda. Ubah `ads.showPlaceholders` ke `false` untuk menyembunyikannya.

Slot iklan ditandai dengan atribut `data-ad-slot` di `index.html`. Saat ini ada satu slot, di bawah generator, sengaja dipisah dari tombol unduh supaya tidak memancing klik tidak sengaja.

### Daftar tunggu Pro

Tombol daftar tunggu di halaman Paket nonaktif sampai salah satu nilai ini diisi:

- `pro.waitlistUrl`: tautan formulir, misalnya Google Form
- `pro.contactEmail`: alamat email, dipakai sebagai tautan `mailto`

## Sebelum rilis

- Tinjau `privacy.html`, isi alamat kontak, lalu hapus kotak "Draf" di bagian atasnya.
- Ganti nama "QRku" jika perlu (muncul di `index.html`, `privacy.html`, dan `ui.js`).
- Putuskan nilai `ads.showPlaceholders`.

## Struktur

```
index.html      Generator dan halaman Paket (pindah lewat #generator dan #paket)
privacy.html    Kebijakan privasi (draf)
style.css       Tampilan, mendukung dark mode
config.js       Client ID Google, ID AdSense, daftar tunggu Pro
app.js          Pembuatan QR, unduhan, dan kesiapan pindai
auth.js         Login Google (Google Identity Services)
ui.js           Navigasi, dialog akun, slot iklan, daftar tunggu
fonts/          IBM Plex Sans (lisensi OFL)
vendor/         qrcode-generator 1.4.4 (lisensi MIT)
```

Font dan library disimpan di project supaya generator tetap berjalan tanpa CDN. Skrip Google (login dan iklan) baru dimuat setelah ID-nya diisi.
