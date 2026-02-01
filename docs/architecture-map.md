# Architecture Map (PharmaSys)

Tujuan dokumen ini:

- Menjelaskan struktur modul saat ini.
- Menetapkan batasan yang jelas antara feature dan shared.
- Menjadi rujukan untuk refactor tanpa mengubah logic/fitur.

## 1) Struktur Direktori Inti

- `src/app/`
  - Entry point aplikasi, routing, dan layout.
  - Berisi `App.tsx`, `main.tsx`, `routes/`, dan `layout/`.

- `src/features/`
  - Implementasi per fitur (domain, hooks, components, templates, screens).
  - Contoh saat ini: `auth`, `dashboard`, `master-data`,
    `item-management`, `purchase-management`, `identity`.

- `src/components/`
  - Komponen UI **shared** lintas fitur (button, dropdown, table, calendar, dll).
  - Tidak boleh berisi komponen yang hanya dipakai satu fitur.

- `src/app/layout/`
  - Layout utama (navbar, sidebar, main).

- `src/services/`
  - Integrasi eksternal (API, repositori, auth). Target: menjadi satu-satunya pintu akses data.

- `src/store/`
  - Zustand stores untuk state global (auth, presence). Gunakan untuk state UI/global, bukan data server.

- `src/hooks/`
  - Shared hooks lintas fitur.

- `src/lib/` dan `src/utils/`
  - Helpers dan utilitas umum.

- `src/schemas/` dan `src/types/`
  - Source of truth tipe dan validasi.

## 2) Batasan Modul (Boundary Rules)

- **Feature tidak boleh mengimpor langsung dari feature lain.**
  - Jika butuh, pindahkan ke `src/components/` (shared UI) atau `src/utils/` / `src/lib/` (shared logic).

- **Pages hanya merangkai komponen**, tidak mengandung bisnis logic berat.

- **Shared components** harus generik, tidak mengandung logika spesifik domain.

## 3) Lokasi Komponen Feature-Specific (Perubahan Phase 1)

- Komponen khusus Purchase sekarang berada di:
  - `src/features/purchase-management/components/purchase-form/*`

- Komponen khusus Identity sekarang berada di:
  - `src/features/identity/components/*`

Tujuan: `src/components/` hanya berisi komponen lintas fitur.

## 3.1) Shared Artifacts (Phase 3)

- Komponen lintas fitur dipusatkan di `src/components/` (contoh: SearchToolbar).
- Utilitas lintas fitur dipusatkan di `src/utils/` (contoh: gridStateManager).
- Tidak ada lagi folder `src/features/shared`.

## 4) State Management

- **React Query**: data server (CRUD, list, cache, sync).
- **Zustand**: state global UI / auth / presence.
- **IndexedDB persistence**: query cache penting saja (lihat `src/lib/indexedDBPersistence.ts`).

## 5) Routing & Composition

- `src/app/App.tsx` mengatur routing tingkat aplikasi.
- `src/app/routes/` mengikat route ke feature.
- Feature merender komponen internalnya sendiri.

## 6) Test & Quality

- `src/test/` berisi utilities dan contoh test.
- Domain logic idealnya punya unit test (contoh: `features/item-management/domain/use-cases`).

## 7) Refactor Principles (No Logic Change)

- Refactor hanya memindah lokasi, merapikan boundary, dan menyamakan gaya import.
- Tidak mengubah API publik, data flow, atau hasil bisnis.
- Semua perubahan harus lulus lint + tsc.
