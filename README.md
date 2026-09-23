# Sistem Laporan Piket Harian SD - UPTD SDN Oehendak

Aplikasi manajemen piket harian dan presensi kehadiran siswa berbasis web dan PWA untuk sekolah dasar (UPTD SD Negeri Oehendak), dilengkapi dengan hak akses Guru dan Administrator, cetak PDF/Excel, rekap kehadiran, dan audit log.

---

## 🚀 Panduan Deploy ke GitHub

Ikuti langkah-langkah berikut untuk mengunggah proyek ini ke repository GitHub Anda:

### 1. Buat Repository di GitHub
1. Buka [GitHub](https://github.com/) dan login ke akun Anda.
2. Klik tombol **New** (Buat Repository Baru).
3. Beri nama repository (contoh: `piket-harian-sd`).
4. Pilih visibilitas **Public** atau **Private**.
5. Jangan centang *Add a README file* (karena file sudah ada di proyek ini).
6. Klik **Create repository**.

### 2. Inisialisasi Git dan Push dari Komputer/Terminal
Jalankan perintah berikut di folder proyek:

```bash
# 1. Inisialisasi Git lokal (jika belum)
git init

# 2. Tambahkan semua file ke staging
git add .

# 3. Buat commit pertama
git commit -m "feat: inisialisasi sistem laporan piket harian SD"

# 4. Ubah nama branch utama menjadi main
git branch -M main

# 5. Hubungkan ke remote repository GitHub Anda (ganti URL dengan URL repo Anda)
git remote add origin https://github.com/USERNAME_ANDA/piket-harian-sd.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

## ⚡ Panduan Deploy ke Vercel

Aplikasi ini sudah dilengkapi dengan konfigurasi `vercel.json` dan serverless entrypoint `/api/index.ts`, sehingga backend Express dan frontend Vite akan langsung berjalan otomatis di Vercel.

### Cara 1: Deploy Otomatis via GitHub (Sangat Disarankan)
1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan login (bisa login dengan akun GitHub).
2. Klik tombol **Add New...** lalu pilih **Project**.
3. Pilih repository GitHub Anda (`piket-harian-sd`) lalu klik **Import**.
4. Di bagian pengaturan proyek:
   - **Framework Preset**: Pilih **Vite** (atau biarkan default/auto-detected).
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `dist` (default).
5. Pada bagian **Environment Variables**, tambahkan:
   - `JWT_SECRET` = `piket-sd-oehendak-jwt-secret-key-super-secure` (atau buat kode rahasia unik Anda).
   - `GEMINI_API_KEY` = *(opsional jika menggunakan fitur AI)*.
6. Klik tombol **Deploy**.
7. Tunggu sekitar 1–2 menit hingga build selesai. Aplikasi Anda sudah online dengan domain `https://nama-project.vercel.app`!

> Setiap kali Anda melakukan `git push` ke branch `main`, Vercel akan secara otomatis mendeploy versi terbaru aplikasi Anda.

---

### Cara 2: Deploy Cepat Menggunakan Vercel CLI
Jika ingin mendeploy langsung dari terminal komputer tanpa push ke GitHub terlebih dahulu:

```bash
# 1. Install Vercel CLI secara global
npm install -g vercel

# 2. Login ke akun Vercel
vercel login

# 3. Jalankan deploy preview
vercel

# 4. Deploy ke production
vercel --prod
```

---

## 🔐 Akun Default untuk Pengujian

Aplikasi telah dilengkapi data awal (seed data) yang siap digunakan:

| Peran (Role) | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh: Rekap laporan, master kelas, master guru, master siswa, pengaturan sekolah, & audit log |
| **Guru Piket 1** | `guru1` *(atau `noni`)* | `guru123` | Guru Kelas V B (Noni Retman Nenot'ek, S.Pd) |
| **Guru Piket 2** | `guru2` *(atau `maria`)* | `guru123` | Guru Kelas I A (Maria Magdalena, S.Pd) |
| **Guru Piket 3** | `guru3` *(atau `yohanes`)* | `guru123` | Guru Kelas VI A (Yohanes Bria, S.Pd) |

---

## 📁 Struktur Konfigurasi Deploy

- `vercel.json`: Mengatur routing rewrite untuk mengarahkan `/api/*` ke Vercel Serverless Function dan rute lainnya ke SPA `index.html`.
- `api/index.ts`: Entrypoint serverless function untuk backend Express.
- `server/app.ts`: Modul Express app yang terbagi secara modular antara lingkungan dev, Docker/Cloud Run, dan serverless Vercel.
- `.github/workflows/ci.yml`: GitHub Actions untuk menjalankan type-checking (`npm run lint`) dan `npm run build` otomatis pada setiap push/pull request.
- `.gitignore`: Mengabaikan `node_modules`, `dist`, folder cache `.vercel`, dan file database lokal.
