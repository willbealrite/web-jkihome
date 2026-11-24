# Backend — JKI Home Church Official Website

Backend ini merupakan layanan REST API untuk JKI Home Church Official Website. Backend dibangun menggunakan Node.js dan Express.js dengan PostgreSQL sebagai database utama.

## 1. Teknologi

Teknologi yang digunakan:

- **Node.js** — runtime JavaScript.
- **Express.js** — framework REST API.
- **PostgreSQL** — sistem manajemen database.
- **node-postgres (`pg`)** — koneksi dan komunikasi dengan PostgreSQL.
- **dotenv** — pengelolaan environment variables.
- **CORS** — pengaturan akses lintas origin.
- **Helmet** — pengamanan HTTP response headers.
- **bcrypt** — dependency untuk hashing password.
- **jsonwebtoken** — dependency untuk autentikasi berbasis JWT.
- **cookie-parser** — dependency untuk pengelolaan cookies.
- **Nodemon** — menjalankan server development secara otomatis.

## 2. Struktur Folder

```text
backend/
├── .env
├── .env.example
├── package.json
├── package-lock.json
├── sql/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── database.js
    │   └── env.js
    ├── middleware/
    │   ├── error.middleware.js
    │   ├── notFound.middleware.js
    │   └── validate.middleware.js
    └── scripts/
        └── test-db.js
```

## 3. Persyaratan Sistem

Pastikan perangkat sudah memiliki:

- Node.js
- npm
- PostgreSQL

## 4. Instalasi

Masuk ke direktori backend dari root repository:

```bash
cd backend
```

Instal seluruh dependency:

```bash
npm install
```

## 5. Konfigurasi Environment

Buat file `.env` berdasarkan template yang tersedia:

```bash
cp .env.example .env
```

Isi konfigurasi `.env` sesuai lingkungan lokal:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jki_home_church
DB_USER=postgres
DB_PASSWORD=

# Authentication
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Frontend
CLIENT_ORIGIN=http://localhost:5173
```

**Catatan:**

- Sesuaikan `DB_NAME`, `DB_USER`, dan `DB_PASSWORD` dengan konfigurasi PostgreSQL lokal.
- Gunakan secret JWT yang kuat dan unik ketika fitur autentikasi diimplementasikan.
- Jangan pernah memasukkan file `.env` ke repository GitHub.
- Gunakan `.env.example` sebagai template konfigurasi tanpa kredensial rahasia.

## 6. Database

Backend menggunakan PostgreSQL sebagai database utama.

Pastikan PostgreSQL aktif dan database sudah tersedia sebelum menjalankan server.

Konfigurasi koneksi database dikelola melalui:

```text
src/config/database.js
```

Koneksi menggunakan PostgreSQL connection pool dari package `pg`.

## 7. Menjalankan Backend

### Development

Jalankan server menggunakan Nodemon:

```bash
npm run dev
```

### Production

Jalankan server menggunakan Node.js:

```bash
npm start
```

Server berjalan pada port yang ditentukan melalui environment variable `PORT`. Secara default menggunakan port `3000`.

## 8. API Endpoint

### Health Check

| Method | Endpoint       | Keterangan            |
| :----- | :------------- | :-------------------- |
| GET    | `/api/health`  | Memeriksa status API  |

Contoh:

```bash
curl -i http://localhost:3000/api/health
```

Response berhasil:

```json
{
  "status": "success",
  "message": "JKI Home Church API is running",
  "timestamp": "2026-11-24T00:00:00.000Z"
}
```

## 9. Middleware

Backend menggunakan middleware untuk memisahkan tanggung jawab penanganan request.

### Security Middleware

Menggunakan Helmet untuk menambahkan HTTP security headers dan CORS untuk mengatur akses dari frontend.

### Error Handling Middleware

File:

```text
src/middleware/error.middleware.js
```

Menangani error secara terpusat dan mengembalikan response JSON dengan HTTP status yang sesuai.

Detail internal server tidak ditampilkan kepada client untuk error 500.

### Not Found Middleware

File:

```text
src/middleware/notFound.middleware.js
```

Menangani request ke endpoint yang tidak tersedia dan menghasilkan HTTP `404 Not Found`.

### Request Validation Middleware

File:

```text
src/middleware/validate.middleware.js
```

Menyediakan validasi request yang dapat digunakan kembali pada setiap route.

Validasi yang saat ini tersedia:

- Field wajib.
- Tipe data string, number, dan boolean.
- Panjang minimum string.
- Panjang maksimum string.
- Format email.

Request yang tidak memenuhi aturan validasi menghasilkan HTTP `400 Bad Request`.

## 10. Keamanan Repository

Pastikan file dan informasi berikut tidak dimasukkan ke repository:

- `.env`
- Password database.
- JWT secrets.
- Kredensial dan informasi rahasia lainnya.

Gunakan `.env.example` untuk membagikan struktur konfigurasi tanpa membagikan nilai rahasia.

---

**Status Pengembangan:** Fondasi aplikasi backend, koneksi database, health check, dan middleware dasar telah diimplementasikan.
