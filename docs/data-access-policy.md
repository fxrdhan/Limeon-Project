# Data Access Policy (PharmaSys)

Tujuan dokumen ini:

- Menstandarkan cara akses data tanpa mengubah logic/fungsi yang sudah ada.
- Mengurangi duplikasi query dan error handling yang tidak konsisten.

## 1) Prinsip Umum

- **Semua akses Supabase harus lewat layer data access** (service/repository).
- Hooks/komponen **tidak boleh** melakukan query langsung ke Supabase.
- Query key **wajib** menggunakan `src/constants/queryKeys.ts`.

## 2) Layer yang Diizinkan

- `src/services/api/*` atau `src/services/repositories/*` sebagai pintu akses data.
- Feature-specific data access boleh berada di:
  - `src/features/<feature>/infrastructure/*`

## 3) Pola Error Handling

- Data access layer mengembalikan `{ data, error }` atau throw error konsisten.
- Hook/komponen hanya menampilkan feedback (toast, message) berdasarkan hasil tersebut.

## 4) Target Refactor (Phase 2)

- Semua query/mutation di hooks yang langsung memakai `supabase` akan dipindah ke layer data access.
- API tetap sama, hanya lokasi & batasan akses yang dirapikan.

## 4.1) Target Refactor (Phase 3)

- Semua `queryKey` wajib memakai `QueryKeys` di `src/constants/queryKeys.ts`.
- Service yang tumpang tindih disatukan ke satu entry point (auth, items).
- Shared storage utilities berada di `src/services/api/*` atau feature infrastructure.

## 5) Anti-Pattern

- `supabase.from()` langsung di hook atau komponen UI.
- Membuat query key ad-hoc di luar `QueryKeys`.
- Duplikasi query di banyak tempat tanpa repo/service.
