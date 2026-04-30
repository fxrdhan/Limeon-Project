# convert-to-oklch

CLI lokal untuk mengonversi warna `hex`, `rgb()`, `rgba()`, `hsl()`, dan `hsla()` ke `oklch()` secara otomatis.

## Pemakaian

```sh
npx ./dev-tools/convert-to-oklch ./src/**/*.css
npx ./dev-tools/convert-to-oklch ./src/**/*.css -p 2
npx ./dev-tools/convert-to-oklch src/App.css src/components
```

Alternatif dengan Bun:

```sh
bunx --package "$PWD/dev-tools/convert-to-oklch" convert-to-oklch ./src/**/*.css
```

Default-nya langsung menulis perubahan ke file seperti `convert-to-oklch` upstream. Tambahkan `--dry-run` untuk preview tanpa menulis.

## Argumen

- `--all` atau `all`: pindai semua file teks dari current working directory.
- `<file-or-folder-or-glob>`: pindai file, folder, atau glob tertentu, misalnya `./src/**/*.css`.
- `-p`, `--precision <1-21>`: atur precision output OKLCH. Default `1`.
- `--dry-run`: tampilkan file yang akan berubah tanpa menulis.
- `--check`: keluar dengan kode `1` jika masih ada warna yang perlu dimigrasikan.
- `--help`, `-h`: tampilkan bantuan.

Folder seperti `node_modules`, `.git`, `.agents`, `.claude`, `dist`, `coverage`, dan output generated umum dilewati saat pemindaian folder.
