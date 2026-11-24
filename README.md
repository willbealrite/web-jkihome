# JKI Home Church Official Website

Website resmi JKI Home Church sebagai pusat informasi, publikasi, dan pengelolaan konten digital gereja.

## Tentang Proyek

Proyek ini dikembangkan untuk menyediakan website gereja yang modern, responsif, informatif, dan mudah dikelola oleh administrator.

Website terdiri dari dua bagian utama:

- **Public Website:** menyediakan informasi, jadwal ibadah, renungan, khotbah, galeri, dan publikasi gereja bagi pengunjung.
- **Admin Dashboard:** digunakan untuk mengelola konten, informasi, dan pengaturan website.

Pengunjung hanya dapat melihat konten yang telah dipublikasikan. Seluruh pengelolaan konten dilakukan melalui Admin Dashboard oleh administrator yang memiliki akses resmi.

## Fitur Utama

### Public Website

- **Home:** halaman utama dan informasi pilihan gereja.
- **About Us:** profil, visi dan misi, gembala, dan pelayanan gereja.
- **Services Schedule:** jadwal ibadah mingguan dan khusus.
- **Daily Devotional:** renungan harian dan arsip bulanan.
- **Sermons:** publikasi khotbah dan video YouTube.
- **Gallery:** dokumentasi foto kegiatan gereja.
- **Announcements:** informasi dan pengumuman gereja.
- **Contact:** alamat, peta lokasi, dan media sosial.

### Admin Dashboard

- Pengelolaan renungan harian dan tema gereja.
- Pengelolaan Services Schedule dan pembicara.
- Pengelolaan khotbah dan galeri.
- Pengelolaan pengumuman.
- Pengaturan homepage dan informasi gereja.
- Pengaturan sistem dan keamanan akun Admin.
- Manajemen media dan konten website.

Fitur-fitur tersebut merupakan ruang lingkup pengembangan. Ketersediaannya akan mengikuti tahapan implementasi.

## Teknologi

### Frontend

- React.js 19
- Vite
- Tailwind CSS v4
- React Router
- ESLint

### Backend

- Node.js
- Express.js 5
- PostgreSQL
- REST API
- JWT Authentication
- bcrypt
- express-rate-limit

### Media

- Cloudinary atau layanan penyimpanan media setara untuk pengelolaan aset gambar.
- YouTube untuk penyimpanan dan pemutaran video khotbah.

## Arsitektur Aplikasi

Aplikasi menggunakan pemisahan frontend dan backend.

### Frontend Responsibilities

- Menangani tampilan Public Website dan Admin Dashboard.
- Mengelola interaksi pengguna.
- Berkomunikasi dengan backend melalui REST API.

### Backend Responsibilities

- Menangani request dan response API.
- Mengelola autentikasi dan otorisasi Admin.
- Menjalankan validasi dan business logic.
- Berkomunikasi dengan PostgreSQL.

Struktur backend menggunakan pemisahan tanggung jawab:

`Routes → Controllers → Services → PostgreSQL`

## Struktur Repository

```text
web-jkihome/
├── asset/                  # Aset resmi gereja
├── frontend/               # Aplikasi React dan Vite
├── backend/                # Server Express dan REST API
│   ├── sql/                # Database schema dan migrations
│   └── src/
│       ├── config/         # Konfigurasi aplikasi dan database
│       ├── controllers/    # Pengendali request API
│       ├── middleware/     # Middleware autentikasi dan keamanan
│       ├── routes/         # Definisi endpoint API
│       ├── scripts/        # Script administrasi dan database
│       └── services/       # Business logic aplikasi
├── .gitignore
└── README.md
```

## Persyaratan Pengembangan

Pastikan perangkat pengembangan sudah memiliki:

- Node.js
- npm
- PostgreSQL
- Git

## Instalasi dan Menjalankan Frontend

Masuk ke direktori frontend:

```bash
cd frontend
```

Pasang dependency:

```bash
npm install
```

Jalankan aplikasi dalam mode pengembangan:

```bash
npm run dev
```

Buka alamat lokal yang ditampilkan oleh Vite di terminal.

### Pemeriksaan Kode Frontend

Jalankan ESLint:

```bash
npm run lint
```

Jalankan production build:

```bash
npm run build
```

Jalankan preview hasil build:

```bash
npm run preview
```

## Backend dan Database

Backend menggunakan Express.js dan PostgreSQL.

Konfigurasi environment disimpan di `backend/.env` dan tidak boleh dimasukkan ke repository Git.

Backend membutuhkan konfigurasi berikut:

- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`

Pastikan database PostgreSQL sudah tersedia dan konfigurasi environment telah disiapkan sebelum menjalankan backend.

## Autentikasi dan Keamanan Admin

Backend telah memiliki fondasi autentikasi Admin dengan kemampuan:

- Login dan logout Admin.
- JWT access token dan refresh token.
- Refresh token rotation.
- Deteksi penggunaan ulang refresh token.
- Manajemen dan pencabutan session.
- Perubahan password dengan verifikasi password saat ini.
- Pencabutan seluruh session dan refresh token setelah perubahan password.
- Password hashing menggunakan bcrypt.
- Rate limiting pada endpoint autentikasi.
- Perlindungan Origin untuk request berbasis cookie.
- Pencatatan aktivitas keamanan melalui Admin Activity Logs.

Refresh token disimpan menggunakan cookie HttpOnly dan Secure dengan kebijakan SameSite Strict.

Fitur perubahan password akan disediakan melalui System Settings pada Admin Dashboard.

## Arah Desain

Website menggunakan pendekatan **Cinematic Dark Modern / Modern Worship** dengan karakteristik:

- Dominasi warna hitam dan charcoal.
- Aksen warm gold.
- Fotografi dengan nuansa cinematic.
- Tipografi modern dan minimalis.
- Tampilan responsif untuk desktop, tablet, dan perangkat mobile.

Logo resmi JKI Home Church dipertahankan dalam bentuk aslinya.

## Status Pengembangan

Pengembangan dilakukan secara bertahap:

- **Phase 1 — Perencanaan dan UI/UX:** fondasi perencanaan dan arah desain telah disiapkan.
- **Phase 2 — Project Setup:** fondasi repository, frontend, backend, dan database telah disiapkan.
- **Phase 3 — Frontend Development:** persiapan frontend tersedia; implementasi fitur Public Website dan Admin Dashboard dilanjutkan.
- **Phase 4 — Backend Development:** fondasi backend dan autentikasi Admin telah diimplementasikan; modul API lainnya dilanjutkan sesuai kebutuhan website.
- **Phase 5 — Integrasi:** menunggu implementasi fitur frontend dan backend.
- **Phase 6 — Testing:** pengujian fitur dan integrasi secara menyeluruh.
- **Phase 7 — Deployment:** persiapan dan publikasi website.

Status akan diperbarui mengikuti perkembangan implementasi.

## Repository GitHub

[web-jkihome](https://github.com/willbealrite/web-jkihome)

---

JKI Home Church Official Website

Dikembangkan untuk mendukung pelayanan dan informasi digital JKI Home Church.
