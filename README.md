# JKI Home Church Official Website

Website resmi JKI Home Church sebagai pusat informasi, publikasi, dan pengelolaan konten digital gereja.

## Tentang Proyek

Proyek ini dikembangkan untuk menyediakan website gereja yang modern, responsif, informatif, dan mudah dikelola oleh administrator.

Website terdiri dari dua bagian utama:

- **Public Website:** menyediakan informasi dan publikasi gereja bagi pengunjung.
- **Admin Dashboard:** digunakan untuk mengelola konten dan informasi website.

## Fitur Utama

### Public Website

- **Home:** halaman utama dan informasi pilihan gereja.
- **About Us:** profil, visi dan misi, gembala, dan pelayanan gereja.
- **Worship Schedule:** jadwal ibadah mingguan dan khusus.
- **Daily Devotional:** renungan harian dan arsip bulanan.
- **Sermons:** publikasi khotbah dan video YouTube.
- **Gallery:** dokumentasi foto kegiatan gereja.
- **Announcements:** informasi dan pengumuman gereja.
- **Contact:** alamat, peta lokasi, dan media sosial.

### Admin Dashboard

- Pengelolaan renungan harian dan tema gereja.
- Pengelolaan jadwal ibadah dan pembicara.
- Pengelolaan khotbah dan galeri.
- Pengelolaan pengumuman.
- Pengaturan homepage dan informasi gereja.
- Manajemen media dan keamanan akun.

Pengunjung hanya dapat melihat konten yang telah dipublikasikan. Seluruh pengelolaan konten dilakukan melalui Admin Dashboard oleh administrator yang memiliki akses resmi.

## Teknologi

### Frontend

- React.js
- Vite
- Tailwind CSS v4
- React Router
- ESLint

### Backend

- Node.js
- Express.js
- PostgreSQL
- REST API
- JWT Authentication
- bcrypt

### Media Storage

- Cloudinary atau layanan penyimpanan media setara.
- YouTube untuk penyimpanan dan pemutaran video khotbah.

## Struktur Repository

```text
web-jkihome/
├── asset/          # Aset resmi gereja
├── frontend/       # Aplikasi React
├── backend/        # Server dan REST API
├── .gitignore
└── README.md
```

## Instalasi dan Menjalankan Frontend

Masuk ke direktori frontend:

```bash
cd frontend
```

Pasang seluruh dependency:

```bash
npm install
```

Jalankan aplikasi dalam mode pengembangan:

```bash
npm run dev
```

Buka alamat lokal yang ditampilkan oleh Vite di terminal.

### Pemeriksaan Kode

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

## Arah Desain

Website menggunakan pendekatan **Cinematic Dark Modern / Modern Worship** dengan karakteristik:

- Dominasi warna hitam dan charcoal.
- Aksen warm gold.
- Fotografi dengan nuansa cinematic.
- Tipografi modern dan minimalis.
- Tampilan responsif untuk desktop, tablet, dan perangkat mobile.

Logo resmi JKI Home Church dipertahankan dalam bentuk aslinya.

## Status Pengembangan

- **Phase 1 — Perencanaan dan UI/UX:** selesai dan disetujui.
- **Phase 2 — Project Setup:** sedang berlangsung.
- **Phase 3 — Frontend Development:** belum dimulai.
- **Phase 4 — Backend Development:** belum dimulai.
- **Phase 5 — Integrasi:** belum dimulai.
- **Phase 6 — Testing:** belum dimulai.
- **Phase 7 — Deployment:** belum dimulai.

Status akan diperbarui sesuai perkembangan implementasi.

## Repository GitHub

<https://github.com/willbealrite/web-jkihome>

---

### JKI Home Church Official Web

Dikembangkan untuk mendukung pelayanan dan informasi digital gereja.
