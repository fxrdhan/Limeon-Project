# Archived Item Master Pipeline

Folder ini menyimpan pipeline lama untuk import, normalisasi, enrichment, dan seeding item master.

Status:

- Diarsipkan, bukan workflow aktif repo.
- Alias `package.json` sudah dihapus agar tidak muncul sebagai command resmi.
- File tetap disimpan untuk kebutuhan audit, reproducibility, atau recovery operasional.

Isi:

- `import-item-master-price-list.ts`
- `seed-item-master-from-json.ts`
- `normalize-item-master-seed.ts`
- `enrich-item-types-from-sheet-pdfs.ts`
- `enrich-item-categories-from-kegunaan.ts`
- `export-missing-item-categories-csv.ts`
