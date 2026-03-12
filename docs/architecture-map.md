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
    `item-management`, `purchase-management`, `identity`, `chat-sidebar`.

- `src/components/`
  - Komponen UI **shared** lintas fitur (button, dropdown, table, calendar, dll).
  - Tidak boleh berisi komponen yang hanya dipakai satu fitur.

- `src/app/layout/`
  - Layout utama (navbar, sidebar, main).

- `src/services/`
  - Integrasi eksternal (API, repositori, auth). Target: menjadi satu-satunya pintu akses data.
  - Current state: chat sidebar memakai `src/services/api/chat.service.ts`,
    `src/services/api/storage.service.ts`, dan `src/services/realtime/realtime.service.ts`
    lewat gateway feature.

- `src/store/`
  - Zustand stores untuk state global (auth, presence). Gunakan untuk state UI/global, bukan data server.
  - Chat sidebar memakai Zustand hanya untuk shell state (`isOpen`, `targetUser`)
    dan page focus blocking; state runtime percakapan tetap berada di hooks feature.

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
- Exception saat ini: `chat-sidebar` mempertahankan runtime session realtime,
  optimistic send, dan receipt/presence sync di level feature hooks karena
  kebutuhan interaksi live-nya lebih ketat daripada list/detail CRUD biasa.
- **Zustand**: state global UI / auth / presence.
- **IndexedDB persistence**: query cache penting saja (lihat `src/lib/indexedDBPersistence.ts`).

## 5) Routing & Composition

- `src/app/App.tsx` mengatur routing tingkat aplikasi.
- `src/app/routes/` mengikat route ke feature.
- Feature merender komponen internalnya sendiri.
- Chat sidebar di-compose dari `src/app/layout/main/index.tsx` ->
  `src/app/layout/chat-sidebar/index.tsx` -> `src/features/chat-sidebar/index.tsx`.
- Runtime host/sidebar launcher untuk feature chat sekarang dipusatkan di:
  - `src/features/chat-sidebar/hooks/useChatSidebarHost.ts`
  - `src/features/chat-sidebar/hooks/useChatSidebarLauncher.ts`
- Dokumentasi implementasi chat sidebar saat ini ada di
  `docs/chat-sidebar-architecture.md`.

## 6) Test & Quality

- `src/test/` berisi utilities dan contoh test.
- Domain logic idealnya punya unit test (contoh: `features/item-management/domain/use-cases`).

## 7) Refactor Principles (No Logic Change)

- Refactor hanya memindah lokasi, merapikan boundary, dan menyamakan gaya import.
- Tidak mengubah API publik, data flow, atau hasil bisnis.
- Semua perubahan harus lulus lint + tsc.
