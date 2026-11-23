# Dokumentasi Frontend — JKI Home Church

Dokumentasi konfigurasi dan pengembangan aplikasi frontend JKI Home Church Official Website.

## Teknologi

- **React.js** — membangun antarmuka aplikasi.
- **Vite** — development server dan proses build.
- **Tailwind CSS v4** — styling antarmuka.
- **React Router** — navigasi dan pengelolaan halaman.
- **ESLint** — pemeriksaan kualitas kode.

## Struktur Folder

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Instalasi

Pastikan Node.js dan npm sudah terpasang.

Dari direktori utama proyek, masuk ke folder frontend:

```bash
cd frontend
```

Pasang dependency:

```bash
npm install
```

## Menjalankan Aplikasi

Jalankan development server:

```bash
npm run dev
```

Buka alamat lokal yang ditampilkan Vite di terminal.

## Pemeriksaan dan Build

Memeriksa kualitas kode menggunakan ESLint:

```bash
npm run lint
```

Membuat production build:

```bash
npm run build
```

Menjalankan preview hasil build:

```bash
npm run preview
```

## Konfigurasi Saat Ini

Frontend telah memiliki konfigurasi awal berikut:

- React menggunakan StrictMode.
- BrowserRouter digunakan untuk navigasi halaman.
- Tailwind CSS v4 terintegrasi melalui plugin Vite.
- ESLint digunakan untuk pemeriksaan kode.
- Styling dasar menggunakan warna dan tipografi sesuai arah desain JKI Home Church.

## Routing Halaman Publik

| URL | Halaman |
| --- | --- |
| `/` | Home |
| `/about` | About Us |
| `/worship` | Worship Schedule |
| `/devotional` | Daily Devotional |
| `/devotional/:slug` | Detail Devotional |
| `/sermons` | Sermons |
| `/sermons/:slug` | Detail Sermon |
| `/gallery` | Gallery |
| `/gallery/:slug` | Detail Album |
| `/announcements` | Announcements |
| `/announcements/:slug` | Detail Announcement |
| `/contact` | Contact |

Halaman tersebut saat ini masih menggunakan komponen placeholder sebagai fondasi pengujian routing. Pengembangan antarmuka final dilakukan pada tahap Frontend Development.

## Catatan

- Dependency dikelola menggunakan npm.
- `package-lock.json` harus dipertahankan untuk konsistensi instalasi.
- Folder `node_modules/` dan hasil build `dist/` tidak disertakan dalam Git.
- Konfigurasi dan pengembangan frontend mengikuti spesifikasi proyek utama.

---

Dokumentasi ini diperbarui mengikuti perkembangan implementasi frontend JKI Home Church.
