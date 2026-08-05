# Kalkulator Proteksi Pembangkit

Aplikasi Next.js untuk kalkulator setting proteksi trafo, generator, motor, busbar, feeder, dan kabel, termasuk perhitungan TMS/TCC (IEC 60255-151 / IEEE C37.112), kurva slope differential 87T, dan koordinasi multi-level.

## Menjalankan di komputer sendiri (opsional, untuk cek dulu)

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Menyambungkan Supabase (opsional, untuk auth + riwayat/favorit)

1. Salin `.env.local.example` menjadi `.env.local`
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari Supabase Dashboard → Settings → API
   - **Jangan pernah isi `service_role` key di sini atau di mana pun yang ikut ke GitHub**
3. Buka Supabase Dashboard → SQL Editor → New query, tempel isi file `supabase/schema.sql`, lalu Run — ini membuat tabel `profiles`, `calculation_history`, dan `favorites` beserta aturan keamanannya (Row Level Security)
4. Di Vercel, tambahkan kedua env var yang sama di Project Settings → Environment Variables, lalu redeploy

Catatan: di versi ini, dashboard sudah siap menampilkan statistik/riwayat/favorit, tapi kalkulator individual belum "mencatat" hasil hitungannya ke Supabase — itu tahap berikutnya.

## Deploy ke Vercel (gratis)

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Kalkulator proteksi pembangkit - versi awal"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   (Buat repo kosong dulu di github.com/new, lalu ganti USERNAME/NAMA-REPO di atas.)

2. **Import ke Vercel**
   - Buka vercel.com/new
   - Pilih "Import Git Repository" → Continue with GitHub
   - Pilih repo yang baru di-push
   - Klik Deploy (tidak perlu ubah setting apa pun, Vercel otomatis mendeteksi ini project Next.js)

3. Setelah selesai (1-2 menit), dapat URL seperti `nama-repo.vercel.app`

## Update selanjutnya

Setiap kali ada perubahan kode:
```bash
git add .
git commit -m "keterangan perubahan"
git push
```
Vercel otomatis build ulang dan deploy versi terbaru.

## Struktur project

```
app/
  layout.jsx              - layout global + font
  page.jsx                - redirect ke /kalkulator/trafo
  kalkulator/[key]/page.jsx - halaman tiap alat (dinamis)
  globals.css              - semua styling
components/
  Sidebar.jsx              - navigasi alat
  EquipmentCalculator.jsx  - form + hasil untuk 6 alat (trafo, generator, motor, busbar, feeder, kabel)
  Coordination.jsx         - halaman khusus Koordinasi Multi-Level
  Charts.jsx               - komponen grafik TCC & slope differential
  ResultsPanel.jsx         - render daftar hasil perhitungan
lib/
  equipment.js             - semua rumus & konfigurasi per alat
  curves.js                - kurva IDMT (IEC/IEEE) & fungsi TMS
  charts.js                - perhitungan geometri grafik (SVG)
```

## Tahap berikutnya (belum ada di versi ini)

- Login & database (Supabase) untuk membedakan pengguna gratis/premium
- Integrasi pembayaran langganan (Midtrans/Xendit)
- Halaman harga & dashboard akun

## Pembaruan Grading Motor SEL-749M (v1.1)

Modul **Grading Motor SEL-749M (49T)** telah diperbaiki agar menggunakan persamaan trip-time yang dipublikasikan pada *SEL-749M Instruction Manual*, Appendix F, Equation F.10–F.17.

Perubahan utama:

- Input disesuaikan dengan istilah setting relay: FLA, Service Factor, LRA, LRTHOT, Acceleration Factor TD, RTC, dan Curve Number 1–45.
- Mendukung **Rating Method** dan **Curve Method**.
- Model dibagi menjadi daerah **RUNNING** (`SF < I < 2,5 × FLA`) dan **STARTING** (`2,5 × FLA ≤ I ≤ 12 × FLA`).
- Batas pickup 50S pada `2,5 × FLA` ditampilkan sebagai batas model STARTING; dropout relay `2,4 × FLA` dicatat sebagai histeresis, bukan kurva definite-time 51LR terpisah.
- Setiap motor dapat dipetakan ke perangkat upstream tertentu.
- CTI dihitung di seluruh rentang arus grading menggunakan margin minimum `t_upstream − t_motor`, bukan hanya pada satu titik arus.
- Kurva tidak lagi menggambar kondisi tidak pickup sebagai trip pada batas atas grafik.
- Sumbu waktu TCC diperluas sampai 100.000 detik.

### Batas penggunaan

Modul ini mereplikasi persamaan trip-time publik untuk verifikasi TCC. Modul belum merupakan emulasi firmware lengkap dan belum memasukkan seluruh perilaku dinamis relay, seperti adaptive threshold ramping, %TCU aktual, RTD bias, cooling state, toleransi CT/relay, waktu circuit breaker, dan elemen 50P. Hasil wajib diverifikasi terhadap data motor, studi hubung singkat, setting sheet, dan pengujian sekunder sebelum diterapkan.
