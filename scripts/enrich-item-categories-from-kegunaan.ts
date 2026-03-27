/// <reference types="node" />

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SeedItem = {
  code: string;
  name: string;
  fk_lookup: {
    category_code?: string;
    normalized_kegunaan_obat?: string;
    source_golongan_obat?: string;
    source_kegunaan_obat?: string;
    source_name?: string;
    type_code?: string;
  };
};

type SeedFile = {
  source?: {
    notes?: string[];
  };
  items: SeedItem[];
};

type CategoryRule = {
  code: string;
  patterns: RegExp[];
  typeCodes?: string[];
};

type UnmappedGroup = {
  count: number;
  examples: Array<{
    code: string;
    name: string;
    source_name?: string;
    type_code?: string;
    source_golongan_obat?: string;
  }>;
  raw_values: string[];
};

const DEFAULT_INPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-seed.json'
);
const DEFAULT_REPORT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-category-mapping-report.json'
);

const NON_DRUG_TYPE_CODES = new Set(['ALK', 'CCP', 'COS', 'PKR', 'PPG', 'UKN']);

const CATEGORY_RULES: CategoryRule[] = [
  {
    code: 'UNK',
    patterns: [/^OTHER$/i],
  },
  {
    code: 'ATB',
    patterns: [
      /^ANTI ?INFEKSI(?: DAN SISTEMIK| SISTEMIK)?$/i,
      /^FARMASI ANTIBIOTIK$/i,
      /^ANTIBIOTIK INJEKSI$/i,
      /^INFEKSI PADA KULIT$/i,
    ],
  },
  {
    code: 'AHS',
    patterns: [
      /^ALERGI DAN SISTEM IMUN$/i,
      /^ANTIHISTAMIN DAN ANTIALERGI$/i,
      /^FARMASI ANTIHISTAMIN$/i,
      /^ANTIALERGI$/i,
      /^ANTIHISTAMIN$/i,
    ],
  },
  {
    code: 'VIT',
    patterns: [
      /^VITAMIN$/i,
      /^VITAMIN DAN MINERAL$/i,
      /^VITAMIN DAN SUPLEMEN$/i,
      /^VITAMIN DAN SUPLEMEN KESEHATAN$/i,
      /^SUPLEMEN DAN VITAMIN$/i,
    ],
  },
  {
    code: 'SUP',
    patterns: [
      /^FARMASI VITAMIN DAN SUPLEMEN KESEHATAN$/i,
      /^SUPLEMEN$/i,
      /^SUPLEMEN MAKANAN$/i,
      /^SUPLEMEN KESEHATAN DAN MAKANAN$/i,
      /^SUPLEMEN KESEHATAN MAKANAN$/i,
      /^FITOFARMAKA SUPLEMEN MAKANAN$/i,
      /^MEMBANTU MEMELIHARA KESEHATAN(?: DENGAN MENAMBAH ZAT GIZI| TUBUH)?$/i,
      /^MEMELIHARA DAYA TAHAN TUBUH$/i,
      /^MEMELIHARA KESEHATAN PERSENDIAN$/i,
      /^PENAMBAH STAMINA$/i,
    ],
  },
  {
    code: 'ANA',
    patterns: [
      /^ANALGESIK$/i,
      /^ANALGESIK DAN ANTIPIRETIK$/i,
      /^ANALGETIK DAN ANTIPIRETIK$/i,
      /^FARMASI ANALGESIK$/i,
      /^FARMASI ANTIPIRETIK$/i,
      /^ANTINYERI$/i,
    ],
  },
  {
    code: 'NSA',
    patterns: [
      /^FARMASI ANTI INFLAMASI$/i,
      /^FARMASI ANTIINFLAMASI$/i,
      /^ANTIINFLAMASI$/i,
      /^ANTIRADANG$/i,
    ],
  },
  {
    code: 'COR',
    patterns: [
      /^FARMASI KORTIKOSTEROID$/i,
      /^TOPICAL KORTIKOSTEROID$/i,
      /^KORTIKOSTEROID TOPIKAL$/i,
    ],
  },
  {
    code: 'AEM',
    patterns: [
      /^FARMASI ANTI EMETIK$/i,
      /^FARMASI ANTIEMETIK$/i,
      /^ANTIEMETIC$/i,
    ],
  },
  {
    code: 'ADB',
    patterns: [/^FARMASI ANTI DIABETES$/i],
  },
  {
    code: 'AHT',
    patterns: [
      /^FARMASI ANTIHIPERTENSI$/i,
      /^ANTI HYPERTENSI$/i,
      /^TERAPI HIPERTENSI ESENSIAL$/i,
      /^PENGOBATAN GAGAL JANTUNG DAN HIPERTENSI$/i,
    ],
  },
  {
    code: 'AST',
    patterns: [/^FARMASI ANTIASMA$/i],
  },
  {
    code: 'ADP',
    patterns: [/^FARMASI ANTI DEPRESAN$/i],
  },
  {
    code: 'APS',
    patterns: [
      /^FARMASI ANTI PSIKOTIKA$/i,
      /^FARMASI ANTIPSIKOTIKA$/i,
      /^ATIPIKAL ANTIPSIKOTIK$/i,
    ],
  },
  {
    code: 'ACV',
    patterns: [/^FARMASI ANTIKONVULSAN$/i, /^FARMASI ANTI EPILEPSI$/i],
  },
  {
    code: 'AMG',
    patterns: [/^FARMASI ANTIMIGRAIN$/i],
  },
  {
    code: 'DEC',
    patterns: [/^FARMASI DEKONGESTAN$/i, /^DEKONGESTAN$/i],
  },
  {
    code: 'HEM',
    patterns: [/^HAEMOSTASIS$/i, /^HEMOSTATIKA PERMUKAAN KULIT$/i],
  },
  {
    code: 'AOB',
    patterns: [/^PENURUN BERAT BADAN$/i, /^FARMASI ANTI OBESITAS$/i],
  },
  {
    code: 'PRB',
    patterns: [/^PROBIOTIK$/i],
  },
  {
    code: 'DER',
    patterns: [
      /^TERAPI UNTUK KULIT$/i,
      /^NUTRISI KULIT$/i,
      /^PERAWATAN KULIT WAJAH$/i,
      /^PERAWATAN KULIT DAN DIRI$/i,
      /^PERAWATAN KULIT DIRI$/i,
    ],
  },
  {
    code: 'ASP',
    patterns: [
      /^ANTISEPTIK$/i,
      /^ANTISEPTIKA$/i,
      /^ANTISEPTIK DAN DISINFEKTAN$/i,
    ],
  },
  {
    code: 'MUK',
    patterns: [
      /^FARMASI MUKOLITIK$/i,
      /^FARMASI MUKOLITIK EKSPEKTORAN$/i,
      /^MUKOLITIK$/i,
      /^ACETYLCYSTEINE \d+(?: DAN \d+)? MG$/i,
    ],
  },
  {
    code: 'EXP',
    patterns: [/^FARMASI EXPECTORAN$/i, /^FARMASI ANTITUSIF$/i],
  },
  {
    code: 'ACG',
    patterns: [/^FARMASI ANTI KOAGULAN$/i],
  },
  {
    code: 'AGT',
    patterns: [/^FARMASI ANTIGOUT$/i],
  },
  {
    code: 'AVR',
    patterns: [/^FARMASI ANTIVIRUS$/i],
  },
  {
    code: 'SED',
    patterns: [
      /^ANSIOLITIK$/i,
      /^FARMASI ANTISIETAS$/i,
      /^FARMASI ANTI INSOMNIA$/i,
    ],
  },
  {
    code: 'EDT',
    patterns: [/^FARMASI DISFUNGSI EREKSI$/i],
  },
  {
    code: 'LAX',
    patterns: [/^FARMASI LAXATIVE$/i],
  },
  {
    code: 'OST',
    patterns: [
      /^FARMASI TERAPI TULANG$/i,
      /^OSTEOPOROSIS RAKHITIS HIPOPARATIROID$/i,
    ],
  },
  {
    code: 'NTR',
    patterns: [/^FARMASI NEUROTROPIK$/i],
  },
  {
    code: 'ANT',
    patterns: [
      /^ANTASIDA$/i,
      /^ANTASID DAN ANTIREFLUX$/i,
      /^FARMASI GASTRITIS$/i,
    ],
  },
  {
    code: 'AFG',
    patterns: [/^FARMASI ANTI FUNGI$/i, /^ANTIJAMUR$/i],
  },
  {
    code: 'ADI',
    patterns: [/^FARMASI ANTIDIARE$/i],
  },
  {
    code: 'ELE',
    patterns: [
      /^DEXTROSE \d+(?: DAN \d+)? GR DAN NACL \d+(?: DAN \d+)? GR DAN KCL \d+(?: DAN \d+)? GR DAN NA SITRAT \d+(?: DAN \d+)? GR$/i,
    ],
  },
  {
    code: 'NSA',
    patterns: [
      /^PENGOBATAN OA DAN RA$/i,
      /^MENGURANGI GEJALA PENGOBATAN OA DAN RA$/i,
      /^DEXKETOPROFEN TROMETAMOL$/i,
    ],
  },
];

const parseArgs = () => {
  const args = process.argv.slice(2);

  return {
    inputPath: path.resolve(args[0] ?? DEFAULT_INPUT),
    outputPath: path.resolve(args[1] ?? args[0] ?? DEFAULT_INPUT),
    reportPath: path.resolve(args[2] ?? DEFAULT_REPORT),
  };
};

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeKegunaan = (value: string): string =>
  normalizeWhitespace(value)
    .toUpperCase()
    .replace(/&/g, ' DAN ')
    .replace(/\//g, ' DAN ')
    .replace(/,/g, ' DAN ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\bCOUGH\b/g, 'BATUK')
    .replace(/\bCOLD\b/g, 'PILEK')
    .replace(/\bPREPARATIONS\b/g, '')
    .replace(/\bAND\b/g, 'DAN')
    .replace(/\bANTIHISTAMAIN\b/g, 'ANTIHISTAMIN')
    .replace(/\bCARDIOVASKULER\b/g, 'KARDIOVASKULAR')
    .replace(/\bANTI PSIKOTIKA\b/g, 'ANTIPSIKOTIKA')
    .replace(/\bANTI EMETIK\b/g, 'ANTIEMETIK')
    .replace(/\bANTI ?INFEKSI\b/g, 'ANTIINFEKSI')
    .replace(/\bANTI ?INFLAMASI\b/g, 'ANTIINFLAMASI')
    .replace(/\bSISTEM MUSKOSKELETAL\b/g, 'SISTEM MUSKULOSKELETAL')
    .replace(/\s*\(([^)]+)\)\s*/g, ' $1 ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveCategoryCode = (
  normalizedKegunaan: string,
  typeCode?: string
): string | null => {
  if (!normalizedKegunaan || normalizedKegunaan === 'NA') {
    return null;
  }

  for (const rule of CATEGORY_RULES) {
    if (
      rule.typeCodes?.length &&
      (!typeCode || !rule.typeCodes.includes(typeCode))
    ) {
      continue;
    }

    if (rule.patterns.some(pattern => pattern.test(normalizedKegunaan))) {
      return rule.code;
    }
  }

  return null;
};

const pushUnique = (values: string[], value: string) => {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
};

const main = () => {
  const { inputPath, outputPath, reportPath } = parseArgs();
  const seed = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;
  const unmappedGroups = new Map<string, UnmappedGroup>();
  const mappedCategoryCounts = new Map<string, number>();

  let normalizedCount = 0;
  let mappedCount = 0;
  let nonDrugCount = 0;
  let missingKegunaanCount = 0;

  for (const item of seed.items) {
    const rawKegunaan = normalizeWhitespace(
      item.fk_lookup.source_kegunaan_obat ?? ''
    );
    const normalizedKegunaan = rawKegunaan
      ? normalizeKegunaan(rawKegunaan)
      : '';
    const typeCode = item.fk_lookup.type_code;

    if (normalizedKegunaan) {
      item.fk_lookup.normalized_kegunaan_obat = normalizedKegunaan;
      normalizedCount += 1;
    } else {
      delete item.fk_lookup.normalized_kegunaan_obat;
      missingKegunaanCount += 1;
    }

    const categoryCode = resolveCategoryCode(normalizedKegunaan, typeCode);

    if (categoryCode) {
      item.fk_lookup.category_code = categoryCode;
      mappedCount += 1;
      mappedCategoryCounts.set(
        categoryCode,
        (mappedCategoryCounts.get(categoryCode) || 0) + 1
      );
      continue;
    }

    if (typeCode && NON_DRUG_TYPE_CODES.has(typeCode)) {
      nonDrugCount += 1;
      continue;
    }

    const groupKey = normalizedKegunaan || '(none)';
    const currentGroup = unmappedGroups.get(groupKey) ?? {
      count: 0,
      examples: [],
      raw_values: [],
    };

    currentGroup.count += 1;
    pushUnique(currentGroup.raw_values, rawKegunaan || '(none)');

    if (currentGroup.examples.length < 5) {
      currentGroup.examples.push({
        code: item.code,
        name: item.name,
        source_name: item.fk_lookup.source_name,
        type_code: typeCode,
        source_golongan_obat: item.fk_lookup.source_golongan_obat,
      });
    }

    unmappedGroups.set(groupKey, currentGroup);
  }

  if (seed.source) {
    seed.source.notes = Array.isArray(seed.source.notes)
      ? seed.source.notes
      : [];
    seed.source.notes.push(
      'Normalized source_kegunaan_obat into fk_lookup.normalized_kegunaan_obat and mapped high-confidence category codes on 2026-03-27.'
    );
    seed.source.notes.push(
      'Resolve category_id from fk_lookup.category_code via item_categories.code after review of unmapped kegunaan groups.'
    );
  }

  const unmappedTop = [...unmappedGroups.entries()]
    .sort(
      (left, right) =>
        right[1].count - left[1].count || left[0].localeCompare(right[0])
    )
    .slice(0, 200)
    .map(([normalized_kegunaan_obat, group]) => ({
      normalized_kegunaan_obat,
      count: group.count,
      raw_values: group.raw_values,
      examples: group.examples,
    }));

  const mappedTop = [...mappedCategoryCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .map(([category_code, count]) => ({ category_code, count }));

  writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        input_file: inputPath,
        output_file: outputPath,
        total_items: seed.items.length,
        normalized_kegunaan_count: normalizedCount,
        missing_kegunaan_count: missingKegunaanCount,
        non_drug_type_count: nonDrugCount,
        mapped_count: mappedCount,
        unmapped_group_count: unmappedGroups.size,
        mapped_categories: mappedTop,
        top_unmapped_groups: unmappedTop,
      },
      null,
      2
    )}\n`
  );

  console.log(`Input file              : ${inputPath}`);
  console.log(`Output file             : ${outputPath}`);
  console.log(`Report file             : ${reportPath}`);
  console.log(`Total items             : ${seed.items.length}`);
  console.log(`Normalized kegunaan     : ${normalizedCount}`);
  console.log(`Mapped category codes   : ${mappedCount}`);
  console.log(`Missing kegunaan        : ${missingKegunaanCount}`);
  console.log(`Non-drug type skipped   : ${nonDrugCount}`);
  console.log(`Unmapped kegunaan group : ${unmappedGroups.size}`);
  console.log(
    `Top mapped categories   : ${mappedTop
      .slice(0, 10)
      .map(row => `${row.category_code}=${row.count}`)
      .join(', ')}`
  );
};

main();
