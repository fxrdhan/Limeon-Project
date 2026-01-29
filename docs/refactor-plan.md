# Refactor Plan (Phase 3)

Tujuan dokumen ini:

- Menetapkan rencana refactor **tanpa mengubah fitur/logika** yang sudah ada.
- Menjaga boundary antar modul sesuai `docs/architecture-map.md`.
- Menuntaskan konsistensi data-access sesuai `docs/data-access-policy.md`.

## 1) Prinsip & Batasan

- **Tidak mengubah behavior** (UI/UX, data flow, hasil bisnis).
- Refactor hanya **memindah lokasi, merapikan boundary, dan konsistensi style**.
- Semua perubahan **harus lulus** `eslint --fix` dan `tsc -b --noEmit`.

## 2) Temuan Kunci (Evidence)

- **Cross-feature import**:
  - `src/features/purchase-management/components/AddPurchasePortal.tsx`
    mengimpor `useItemSelection` dan `ItemModal` dari `item-management`.
- **Shared artifacts dipusatkan di `src/components/` dan `src/utils/`.**
- **Page logic masih berat**:
  - `src/pages/purchases/purchase-list/index.tsx` berisi query + state +
    handler CRUD sekaligus.
  - `src/pages/master-data/item-master/index.tsx` menggunakan shared toolbar.
- **Query keys belum konsisten**:
  - Banyak `queryKey: ['...']` literal di hooks/pages, padahal sudah ada
    `src/constants/queryKeys.ts`.
- **Service duplikatif**:
  - `src/services/authService.ts` vs `src/services/api/auth.service.ts`.
  - Item data lewat `ItemRepository` + `ItemsService` + feature infrastructure.

## 3) Rencana Refactor (Tanpa Ubah Logic)

### A. Boundary & Shared Layer Cleanup

Target: hilangkan cross-feature import dengan memindahkan shared assets.

- Pastikan komponen shared berada di `src/components/`.
- Pastikan utilitas shared berada di `src/utils/`.
- Ekstrak `useItemSelection` (dipakai purchase-management) ke layer shared
  (`src/hooks/` atau `src/services/`) agar **purchase** tidak bergantung pada
  `item-management`.
- Pastikan **feature tidak import feature lain** (sesuai `architecture-map`).

Acceptance:

- Tidak ada import `@/features/<other-feature>/...` di dalam `src/features/*`.

### B. Konsistensi Query Keys

Target: semua query/invalidation memakai `QueryKeys`.

- Ganti semua literal `queryKey: ['...']` di:
  - `src/pages/purchases/purchase-list/index.tsx`
  - `src/pages/settings/profile/index.tsx`
  - `src/hooks/queries/*`
  - `src/hooks/realtime/*`
- Standarisasi invalidation memakai `getInvalidationKeys`.

Acceptance:

- Tidak ada `queryKey: ['literal']` di codebase (kecuali test/example).

### C. Konsolidasi Service & Data Access

Target: satu sumber kebenaran untuk setiap domain.

- Tentukan **satu entry auth**:
  - Pilih `src/services/api/auth.service.ts` **atau**
    `src/services/authService.ts`, lalu jadikan yang lain wrapper/alias.
- Dokumentasikan aturan:
  - `services/api/*` = service API
  - `services/repositories/*` = raw DB access
  - `features/*/infrastructure/*` = data-access spesifik feature
- Untuk items:
  - Pastikan `ItemsService` **menggunakan** `ItemRepository` (sudah),
    dan feature hooks hanya memanggil service (bukan repository langsung).

Acceptance:

- Tidak ada pemakaian repository langsung di hooks/components.
- Tidak ada duplikasi auth service entry point.

### D. Page → Feature Extraction

Target: `src/pages/` hanya orchestration.

- Buat hook/container di feature untuk:
  - `src/pages/purchases/purchase-list/index.tsx`
  - `src/pages/master-data/item-master/index.tsx`
  - `src/pages/settings/profile/index.tsx`
- Pages hanya merangkai container + UI shells.

Acceptance:

- Pages minim logic state/CRUD, fokus pada composition.

### E. Dokumentasi & Checklist

Target: DevEx stabil, aturan jelas.

- Update `docs/architecture-map.md` + `docs/data-access-policy.md`
  untuk refleksikan hasil refactor.
- Tambahkan checklist di `CONTRIBUTING.md`:
  - “No cross-feature import”
  - “QueryKeys only”
  - “No direct Supabase in hooks/components”

## 4) Prioritas Eksekusi

1. **Boundary cleanup** (A)
2. **Query key standardization** (B)
3. **Service consolidation** (C)
4. **Page extraction** (D)
5. **Docs & checklist** (E)

## 5) Risiko & Mitigasi

- **Risiko: kehilangan import path**
  - Mitigasi: lakukan refactor bertahap, update index/barrel export.
- **Risiko: query cache miss**
  - Mitigasi: gunakan `QueryKeys` yang sudah existing.
- **Risiko: auth entry point ganda**
  - Mitigasi: pilih satu sumber, yang lain jadi wrapper.

## 6) Validasi

- Jalankan lint + tsc untuk setiap batch:
  - `npx eslint [paths] --fix`
  - `npx tsc -b --noEmit`
