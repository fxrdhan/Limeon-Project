import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SeedItem = {
  code: string;
  fk_lookup: {
    type_code?: string;
    source_golongan_obat?: string;
    source_kegunaan_obat?: string;
  };
};

type SeedFile = {
  source?: {
    notes?: string[];
  };
  items: SeedItem[];
};

const DEFAULT_INPUT = path.resolve(
  '/home/fxrdhan/Downloads/MASTER - PRICE LIST December 17, 2025 (1) - supabase-seed.normalized.json'
);
const DEFAULT_PDF_DIR = path.resolve('/tmp/tmp.soJY4oCstj');

const TYPE_CODE_MAP = new Map<string, string>([
  ['Alat Kesehatan', 'ALK'],
  ['Suplemen', 'SUP'],
  ['Obat Keras', 'POM'],
  ['Obat Bebas', 'OTC'],
  ['Obat Bebas Terbatas', 'OBT'],
  ['Obat Prekursor', 'PRE'],
  ['Obat Psikotropika', 'PSY'],
  ['Narkotika', 'NAR'],
  ['Obat Tradisional', 'OBA'],
  ['PKRT', 'PKR'],
  ['Kosmetik', 'COS'],
  ['Obat Kuasi', 'OKS'],
  ['Produk Pangan', 'PPG'],
  ['Vitamin', 'VIT'],
  ['Jamu', 'JAM'],
  ['CCP', 'CCP'],
  ['Other', 'UKN'],
  ['Obat Obat Tertentu (OOT)', 'POM'],
]);

const parseArgs = () => {
  const args = process.argv.slice(2);

  return {
    inputPath: path.resolve(args[0] ?? DEFAULT_INPUT),
    pdfDir: path.resolve(args[1] ?? DEFAULT_PDF_DIR),
    outputPath: path.resolve(args[2] ?? args[0] ?? DEFAULT_INPUT),
  };
};

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractPdfText = (pdfPath: string): string =>
  execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const buildCodeMapFromPdfs = (pdfDir: string) => {
  const files = readdirSync(pdfDir)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .sort();
  const map = new Map<
    string,
    { golonganObat: string; kegunaanObat: string; sourceFile: string }
  >();

  for (const file of files) {
    const pdfPath = path.join(pdfDir, file);

    if (!statSync(pdfPath).isFile()) {
      continue;
    }

    const lines = extractPdfText(pdfPath).split('\n');

    for (const rawLine of lines) {
      const line = rawLine.replace(/\f/g, '').trimEnd();

      if (
        !line.trim() ||
        line.includes('Golongan_Obat') ||
        line.trim().startsWith('Principal')
      ) {
        continue;
      }

      const parts = line
        .trim()
        .split(/\s{2,}/)
        .map(part => normalizeWhitespace(part))
        .filter(Boolean);

      if (parts.length < 7) {
        continue;
      }

      const codeIndex = parts.findIndex(part =>
        /^[0-9A-Z][0-9A-Z@<]{5}$/i.test(part)
      );

      if (codeIndex < 0 || codeIndex < 2) {
        continue;
      }

      const code = parts[codeIndex];
      const golonganObat = parts[1];
      const kegunaanObat = parts[2] ?? '';

      if (!code || !golonganObat) {
        continue;
      }

      if (!map.has(code)) {
        map.set(code, { golonganObat, kegunaanObat, sourceFile: file });
      }
    }
  }

  return map;
};

const main = () => {
  const { inputPath, outputPath, pdfDir } = parseArgs();
  const seed = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;
  const codeMap = buildCodeMapFromPdfs(pdfDir);

  let mapped = 0;
  let sourceMatched = 0;
  let ootMappedToPom = 0;

  for (const item of seed.items) {
    const pdfRow = codeMap.get(item.code);

    if (!pdfRow) {
      continue;
    }

    sourceMatched += 1;
    item.fk_lookup.source_golongan_obat = pdfRow.golonganObat;
    item.fk_lookup.source_kegunaan_obat = pdfRow.kegunaanObat;

    const mappedTypeCode = TYPE_CODE_MAP.get(pdfRow.golonganObat);

    if (!mappedTypeCode) {
      continue;
    }

    if (pdfRow.golonganObat === 'Obat Obat Tertentu (OOT)') {
      ootMappedToPom += 1;
    }

    item.fk_lookup.type_code = mappedTypeCode;
    mapped += 1;
  }

  if (seed.source) {
    seed.source.notes = Array.isArray(seed.source.notes)
      ? seed.source.notes
      : [];
    seed.source.notes.push(
      'Enriched source_golongan_obat and source_kegunaan_obat from per-manufacturer PDF sheets on 2026-03-27.'
    );
    seed.source.notes.push(
      'Mapped item type codes from Golongan_Obat where possible: Alat Kesehatan->ALK, Suplemen->SUP, Obat Keras->POM, Obat Bebas->OTC, Obat Bebas Terbatas->OBT, Obat Prekursor->PRE, Obat Psikotropika->PSY, Narkotika->NAR, Obat Tradisional->OBA, PKRT->PKR, Kosmetik->COS, Obat Kuasi->OKS, Produk Pangan->PPG, Vitamin->VIT, Jamu->JAM, CCP->CCP, Other->UKN, OOT->POM.'
    );
  }

  writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);

  console.log(`Input file       : ${inputPath}`);
  console.log(`PDF directory    : ${pdfDir}`);
  console.log(`Rows matched     : ${sourceMatched}`);
  console.log(`Type mapped      : ${mapped}`);
  console.log(`OOT -> POM count : ${ootMappedToPom}`);
  console.log(`Output file      : ${outputPath}`);
};

main();
