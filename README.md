# PharmaSys - Sistem Manajemen Farmasi & Klinik

PharmaSys adalah aplikasi berbasis web modern yang dirancang untuk menyederhanakan manajemen operasional farmasi dan klinik. Aplikasi ini menyediakan rangkaian alat yang komprehensif untuk mengelola data master, pembelian, inventori, penjualan, dan lainnya, semua dalam antarmuka yang ramah pengguna.

## Fitur Utama

-   **Dashboard Interaktif:** Dapatkan gambaran cepat tentang metrik dan aktivitas kunci.
-   **Manajemen Data Master:** Kontrol terpusat atas data penting:
    -   Barang, Kategori, Unit, dan Jenis
    -   Supplier, Pasien, dan Dokter
-   **Manajemen Pembelian:**
    -   Ekstraksi data faktur otomatis dari gambar.
    -   Kelola pesanan pembelian dan lacak statusnya.
    -   Lihat dan cetak detail pembelian.
-   **Autentikasi:** Login aman untuk personel yang berwenang.
-   **Manajemen Profil Pengguna:** Pengguna dapat mengelola informasi profil mereka sendiri.
-   **Sinkronisasi Data Real-time:** Data diperbarui secara otomatis di semua sesi pengguna aktif. Ketika satu pengguna membuat perubahan, yang lain melihat pembaruan secara instan tanpa perlu me-refresh halaman. Ini digabungkan dengan fitur kehadiran pengguna untuk menunjukkan siapa yang sedang online.
-   **Dioptimalkan untuk Performa:** Dibangun dengan code-splitting dan lazy loading untuk memastikan waktu muat yang cepat.

*(Catatan: Beberapa fitur seperti Inventori, Penjualan, Klinik, dan Laporan saat ini sedang dalam pengembangan seperti yang ditunjukkan oleh halaman "Coming Soon".)*

---

## Tech Stack

Proyek ini dibangun dengan teknologi modern dan robust:

-   **Library:** [React](https://react.dev/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database:** [Supabase](https://supabase.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Routing:** [React Router DOM](https://reactrouter.com/)
-   **Data Fetching & Caching:** [TanStack Query](https://tanstack.com/query/latest)
-   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)

---

## Integrasi Supabase

PharmaSys memanfaatkan kekuatan penuh [Supabase](https://supabase.com/) sebagai backend-nya, menyediakan solusi yang skalabel dan terintegrasi.

-   **Database:** Database PostgreSQL untuk menyimpan semua data aplikasi, dari data master (barang, supplier) hingga data transaksional (pembelian, penjualan).
-   **Authentication:** Mengelola autentikasi dan otorisasi pengguna, memastikan akses yang aman ke aplikasi.
-   **Realtime:** Fitur ini menjadi inti dari sifat kolaboratif aplikasi.
    -   **Live Data Sync:** Aplikasi berlangganan ke event `postgres_changes` dari Supabase Realtime API. Ketika pengguna membuat, memperbarui, atau menghapus data, backend memberitahu semua klien yang terhubung.
    -   **Automatic UI Updates:** Hook React khusus (`useRealtimeSubscription`) menerima event ini dan secara otomatis membatalkan cache data yang relevan di TanStack Query. Ini memicu refetch yang mulus dan efisien, memastikan UI selalu mencerminkan state database terbaru tanpa perlu refresh manual.
    -   **User Presence:** Channel Realtime yang sama digunakan untuk melacak pengguna mana yang sedang aktif di aplikasi, menampilkan jumlah pengguna online secara langsung.
-   **Storage:** Digunakan untuk menangani upload file, khususnya untuk gambar faktur yang kemudian diproses.
-   **Edge Functions:** Fungsi serverless yang menjalankan logika backend yang kompleks. Fungsi utama meliputi:
    -   `extract-invoice`: Memproses gambar faktur yang diunggah untuk mengekstrak data.
    -   `confirm-invoice`: Menyimpan data faktur yang diekstrak ke database.
    -   `regenerate-invoice`: Memproses ulang faktur yang sudah ada dari storage.
    -   `metrics`: Mengumpulkan dan melaporkan penggunaan dan performa fungsi.

### Database Migrations

Semua perubahan skema database (misalnya, menambahkan tabel atau kolom) dikelola melalui skrip migrasi SQL manual. Penting untuk menulis skrip ini secara defensif menggunakan `IF NOT EXISTS` atau pemeriksaan serupa untuk mencegah kesalahan di lingkungan yang berbeda. Terapkan skrip ini langsung melalui Supabase SQL Editor.

**Penting:** Direktori `supabase/**` digunakan untuk ekspor data dan state pengembangan lokal; tidak boleh dimodifikasi secara langsung untuk migrasi skema.

---

## Memulai

Ikuti petunjuk ini untuk mendapatkan salinan lokal dan menjalankannya untuk tujuan pengembangan dan pengujian.

### Persyaratan

-   [Node.js](https://nodejs.org/) (v18 atau yang lebih baru direkomendasikan)
-   [Yarn](https://yarnpkg.com/) (v3.x)

### Instalasi

1.  **Clone repository:**
    ```sh
    git clone <repository-url>
    cd PharmaSys
    ```

2.  **Install dependencies:**
    ```sh
    yarn install
    ```

3.  **Set up environment variables:**
    Buat file `.env` di root proyek dengan menyalin file contoh:
    ```sh
    cp .env.example .env
    ```
    Anda perlu mengisi file ini dengan kredensial proyek Supabase Anda.
    ```ini
    # .env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

4.  **Run the development server:**
    Perintah ini memulai server pengembangan Vite dan watcher Tailwind CSS secara bersamaan.
    ```sh
    yarn dev
    ```
    Aplikasi akan tersedia di `http://localhost:5173` (atau port yang tersedia berikutnya).

---

## Script Yang Tersedia

File `package.json` mencakup beberapa script untuk membantu pengembangan:

-   `yarn dev`: Memulai aplikasi dalam mode pengembangan dengan hot-reloading.
-   `yarn build`: Mengompilasi dan mem-bundle aplikasi untuk produksi.
-   `yarn preview`: Menyajikan build produksi secara lokal untuk preview.
-   `yarn lint`: Menjalankan ESLint untuk memeriksa masalah kualitas kode dan gaya.

### Utility Scripts

Script ini berinteraksi dengan backend dan memerlukan `tsx` untuk menjalankan.

-   `yarn add-admin`: Script CLI untuk membuat pengguna admin baru.
-   `yarn update-password`: Script CLI untuk memperbarui kata sandi pengguna.
-   `yarn export`: Script CLI untuk mengekspor data.

Untuk bantuan dengan script ini, Anda dapat menjalankan `yarn <script-name>:help`.

---

## Struktur Proyek

Kode sumber terletak di direktori `src/` dan mengikuti organisasi berbasis fitur.

```
src/
├── components/      # Komponen UI yang dapat digunakan kembali (Alerts, Dialogs, Loaders, dll.)
├── hooks/           # Hook React khusus
├── layout/          # Layout aplikasi utama (sidebar, header)
├── lib/             # Konfigurasi library (misalnya, klien Supabase)
├── pages/           # Komponen halaman, diorganisir berdasarkan fitur
│   ├── auth/
│   ├── dashboard/
│   ├── master-data/
│   └── ...
├── services/        # Logika panggilan API untuk berinteraksi dengan Supabase
├── store/           # Store manajemen state Zustand
├── types/           # Definisi tipe TypeScript global
├── utils/           # Fungsi utilitas
├── App.css          # Stylesheet utama untuk Tailwind CSS
├── App.tsx          # Komponen root dengan setup routing
└── main.tsx         # Entry point aplikasi
```
