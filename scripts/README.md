# Scripts Inventory

Direktori ini sekarang dibatasi untuk script yang masih menjadi bagian dari workflow aktif repo.

## Script yang dipertahankan

- `dev-local.ts`, `dev-remote.ts`, `dev-strict.ts`, `preview-remote.ts`, `network-exposure.ts`
  Dipakai oleh entrypoint development dan preview di `package.json`.
- `check-coverage-100.ts`, `coverage/generate-non-runtime-files.ts`, `coverage/non-runtime-files.json`
  Dipakai oleh workflow coverage dan konfigurasi [vite.config.ts](/home/fxrdhan/Documents/PharmaSys/vite.config.ts).
- `check-chat-schema-types.ts`
  Dipakai oleh `bun run check:chat-schema` dan validasi kontrak chat.
- `seed-codex.ts`
  Dipakai oleh `bun run codex:seed` dan hook `prepare`.
- `add-admin-user.ts`, `update-user-password.ts`
  Utility admin yang masih diekspos lewat `package.json`.
- `backfill-chat-image-previews.ts`, `backfill-profile-photo-thumbnails.ts`
  Script maintenance Supabase yang masih punya entrypoint resmi.
- `export.ts`, `loc-stats.ts`
  Utility repo yang masih diekspos lewat `package.json`.

## Yang dihapus dari folder aktif

- `apply-item-price-overrides.ts`
  Tidak punya entrypoint `package.json`, tidak diimpor script lain, dan tidak punya referensi repo selain usage string internal.
- `repair-item-master-dedupe.ts`
  Script operasi sekali jalan tanpa entrypoint aktif dan tanpa referensi pemakaian lain di repo.
- `refactor-naming.sh`
  Tool refactor lama yang tidak terhubung ke workflow aktif repo.
- `db-migrations/`
  Bukan source of truth migrasi. Migrasi aktif repo ada di `supabase/migrations/`, dan isi folder ini sudah tersupersede di sana.
- `archive/item-master/`
  Pipeline item master lama dipindahkan ke arsip. Script-nya masih disimpan untuk reproducibility atau recovery ad-hoc, tapi tidak lagi diekspos sebagai workflow aktif di `package.json`.

## Aturan lanjut

- Script baru yang memang bagian dari workflow repo harus punya jalur pemakaian yang jelas, idealnya lewat `package.json`.
- Operasi sekali jalan sebaiknya disimpan di luar `scripts/` aktif atau dihapus setelah pekerjaan selesai.
