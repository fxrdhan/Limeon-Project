import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCmctDKbfbzFwKsKvB97o0wfrLxrA2BWyw" });

async function main() {
  const image = await ai.files.upload({
    file: "image.png",
  });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      createUserContent([
        "Anda adalah asisten yang ahli dalam mengekstrak teks dari gambar faktur farmasi dan mengubahnya menjadi format JSON terstruktur. Anda harus mengekstrak semua informasi yang relevan dari gambar faktur farmasi dengan teliti dan tepat. Tugas Anda adalah mengekstrak detail perusahaan (nama, alamat, nomor lisensi PBF, nomor lisensi DAK, nomor sertifikat CDOB), informasi faktur (nomor, tanggal, nomor SO, tanggal jatuh tempo), informasi pelanggan (nama, alamat), daftar produk (SKU, nama produk, jumlah, unit, nomor batch, tanggal kedaluwarsa, harga per unit, diskon, total harga), ringkasan pembayaran (total harga, PPN, total faktur), dan informasi tambahan (diperiksa oleh). Pastikan Anda mengikuti aturan ekstraksi berikut: 1. Hapus semua tag baris baru (\n) dari hasil ekstraksi, 2. Konversikan semua nilai ke tipe data yang sesuai (string, integer, dll.), 3. Format tanggal harus mengikuti pola yang ditentukan (DD-MM-YYYY untuk tanggal faktur dan MM-YYYY untuk tanggal kedaluwarsa), 4. Pastikan nomor faktur dan nomor SO mengikuti pola TMP-INV-[YYYY/MM/DD]/[kode] dan TMP-SO-[YYYY/MM/DD]/[kode], 5. Pastikan gelar ditulis dengan benar: apt. [nama], S. Farm. (remove 'APJ' word), 6. Nama produk harus menyertakan informasi volume (ekstrak dari deskripsi kemasan jika perlu), 7. Untuk kemasan, gunakan hanya jenis unit (ekstrak kata pertama setelah koma). Contoh: 'DUS, BOTOL PLASTIK @ 60 ML' -> 'BOTOL'. Keluarkan hasil ekstraksi Anda dalam format JSON yang tepat sesuai dengan skema yang telah ditentukan. Pastikan semua informasi yang diperlukan termasuk dan diformat dengan benar.",
        createPartFromUri(image.uri, image.mimeType),
      ]),
    ],
  });
  console.log(response.text);
}

await main();