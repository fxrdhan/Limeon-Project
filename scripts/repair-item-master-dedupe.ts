/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  findPackCount,
  normalizeSeedFile,
  normalizeWhitespace,
  type SeedFile,
  type SeedItem,
} from './normalize-item-master-seed';

config({ path: path.resolve(process.cwd(), '.env') });

type PriceListRow = {
  code: string;
  hna: number;
  principal: string;
  product: string;
  uom: string;
};

type ParsedArgs = {
  inputPath: string;
  outputPath: string;
  pdfPath: string;
  sheetPdfDir: string;
};

type RestoreSummary = {
  dedupedCount: number;
  inheritedCategoryCount: number;
  missingUnitCodes: string[];
  missingVariantCount: number;
  restoredCount: number;
  strictDuplicateGroupCount: number;
};

type HelperNameMaps = {
  categoryNames: Map<string, string>;
  dosageNames: Map<string, string>;
  packageNames: Map<string, string>;
  typeNames: Map<string, string>;
};

const DEFAULT_INPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-seed.json'
);
const DEFAULT_PDF = path.resolve(
  '/home/fxrdhan/Downloads/MASTER - PRICE LIST December 17, 2025 (1).pdf'
);
const DEFAULT_SHEET_PDF_DIR = path.resolve('/tmp/tmp.soJY4oCstj');
const DEFAULT_MANUAL_PACKAGE_REVIEW = path.resolve(
  '/home/fxrdhan/Downloads/missing-item-packages-review_completed.json'
);
const DEFAULT_MANUAL_DOSAGE_REVIEW = path.resolve(
  '/home/fxrdhan/Downloads/missing-item-dosages-review-filled-final.json'
);
const DEFAULT_MANUAL_CATEGORY_REVIEW_PATHS = [
  path.resolve(
    '/home/fxrdhan/Downloads/missing-item-categories-none-na-review_filled.json'
  ),
  path.resolve(
    '/home/fxrdhan/Downloads/missing-item-categories-remaining-review-mapped.json'
  ),
];

const parseArgs = (): ParsedArgs => {
  const args = process.argv.slice(2);
  let inputPath = DEFAULT_INPUT;
  let outputPath = DEFAULT_INPUT;
  let pdfPath = DEFAULT_PDF;
  let sheetPdfDir = DEFAULT_SHEET_PDF_DIR;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input') {
      inputPath = path.resolve(args[index + 1] ?? inputPath);
      index += 1;
      continue;
    }

    if (arg === '--output') {
      outputPath = path.resolve(args[index + 1] ?? outputPath);
      index += 1;
      continue;
    }

    if (arg === '--pdf') {
      pdfPath = path.resolve(args[index + 1] ?? pdfPath);
      index += 1;
      continue;
    }

    if (arg === '--sheet-pdf-dir') {
      sheetPdfDir = path.resolve(args[index + 1] ?? sheetPdfDir);
      index += 1;
    }
  }

  return { inputPath, outputPath, pdfPath, sheetPdfDir };
};

const createServiceClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const normalizeText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/â€“|\u2013|\u2014/g, '-')
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€�|\u201c|\u201d/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const parsePrice = (value: string): number => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  const amount = Number.parseInt(digitsOnly, 10);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid HNA value: ${value}`);
  }

  return amount;
};

const parsePriceList = (pdfPath: string) => {
  const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rows: PriceListRow[] = [];
  const indexByCode = new Map<string, number>();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\f/g, '').trimEnd();

    if (!line.trim() || line.trim().startsWith('Principal')) {
      continue;
    }

    const parts = line
      .trim()
      .split(/\s{2,}/)
      .map(part => normalizeText(part));

    if (parts.length !== 5) {
      continue;
    }

    const [principal, code, product, uom, hna] = parts;

    if (!principal || !code || !product || !uom || !hna) {
      continue;
    }

    if (indexByCode.has(code)) {
      throw new Error(`Duplicate item code detected in PDF: ${code}`);
    }

    indexByCode.set(code, rows.length);
    rows.push({
      code,
      hna: parsePrice(hna),
      principal,
      product,
      uom,
    });
  }

  return {
    indexByCode,
    rows,
  };
};

const createSeedItemFromPriceRow = (row: PriceListRow): SeedItem => ({
  barcode: null,
  base_price: row.hna,
  base_unit: null,
  category_id: null,
  code: row.code,
  description: null,
  dosage_id: null,
  has_expiry_date: false,
  image_urls: [],
  is_active: true,
  is_level_pricing_active: true,
  is_medicine: true,
  manufacturer_id: null,
  measurement_denominator_unit_id: null,
  measurement_denominator_value: null,
  measurement_unit_id: null,
  measurement_value: null,
  min_stock: 10,
  name: row.product,
  package_conversions: [],
  package_id: null,
  rack: null,
  sell_price: row.hna,
  stock: 0,
  type_id: null,
  fk_lookup: {
    category_code: 'PDF_IMPORT',
    manufacturer_name: row.principal,
    package_code: row.uom,
    source_manufacturer_name: row.principal,
    source_name: row.product,
    type_code: 'PDF_IMPORT',
  },
});

const rebaseItemsToRawPackageCode = (
  items: SeedItem[],
  rowsByCode: Map<string, PriceListRow>
): SeedItem[] =>
  items.map(item => {
    const row = rowsByCode.get(item.code);

    if (!row) {
      return item;
    }

    return {
      ...item,
      fk_lookup: {
        ...item.fk_lookup,
        package_code: row.uom,
        package_name: undefined,
      },
    };
  });

const normalizeKeyPart = (value: string): string =>
  normalizeWhitespace(value)
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const collectMatches = (sourceName: string, patterns: RegExp[]): string[] => {
  const matches = patterns.flatMap(pattern => sourceName.match(pattern) ?? []);
  return [
    ...new Set(matches.map(match => normalizeKeyPart(match)).filter(Boolean)),
  ];
};

const extractVariantSignature = (sourceName: string): string[] => {
  const normalizedSourceName = normalizeWhitespace(sourceName)
    .replace(/\bBPJS(?:\s*-\s*[A-Z0-9]+|\s+[A-Z0-9]+)?\b/gi, ' ')
    .replace(/\s*-\s*e-?cat\b/gi, ' ')
    .replace(/\be-?cat\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [
    ...collectMatches(normalizedSourceName, [
      /\bFORTE\b/gi,
      /\bPLUS\b/gi,
      /\bFLASH\b/gi,
      /\b(?:GENERIK|GENERIC|OGB|DOEN)\b/gi,
      /\bFDS\b/gi,
      /\bDS\b/gi,
      /\bINFUS\b/gi,
      /\bINJ(?:EKSI)?\b/gi,
      /\bDROPS?\b/gi,
      /\bSYRUP\b/gi,
      /\bSIRUP\b/gi,
      /\bSUSPENSI\b/gi,
      /\bOVULA\b/gi,
      /\bCHEW(?:ABLE)?\b/gi,
      /\bKUNYAH\b/gi,
      /\bSOFTBAG\b/gi,
      /\bSOFTGEL\b/gi,
      /\bSOFT\b/gi,
      /\bFC\b/gi,
      /\bBLISTER\b/gi,
      /\bSTRIP\b/gi,
    ]),
    ...collectMatches(normalizedSourceName, [
      /@\s*\d+(?:\s*[']?S\b|\s*(?:TAB(?:LET)?|KAPLET|CAPSULE?|KAPSUL|CAPS?|SOFTGEL|SOFT\s+CAPS?)\b)?/gi,
      /\b\d+\s*[']?S\b/gi,
      /\b\d+\s*(?:TAB(?:LET)?|KAPLET|CAPSULE?|KAPSUL|CAPS?|SOFTGEL|SOFT\s+CAPS?)\b/gi,
      /\b\d+\s*x\s*\d+\s*s\b/gi,
    ]),
    ...collectMatches(normalizedSourceName, [
      /\bFG\s*\d+(?:[.,]\d+)?\b/gi,
      /\bCH\s*\d+(?:[.,]\d+)?\b/gi,
      /\b\d+(?:[.,]\d+)?G\b/gi,
      /\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?(?:\s*(?:CM|MM|M))?\b/gi,
    ]),
  ].sort();
};

const getMeasurementSignature = (item: SeedItem): string =>
  [
    item.measurement_value ?? '',
    item.fk_lookup.measurement_unit_code ?? '',
    item.measurement_denominator_value ?? '',
    item.fk_lookup.measurement_denominator_unit_code ?? '',
  ].join('|');

const getStrictDeduplicationKey = (item: SeedItem): string =>
  JSON.stringify({
    base_unit: item.base_unit ?? '',
    dosage_code: item.fk_lookup.dosage_code ?? '',
    manufacturer_name: item.fk_lookup.manufacturer_name,
    measurement: getMeasurementSignature(item),
    name: item.name,
    pack_count:
      findPackCount(item.fk_lookup.source_name ?? '') ||
      (item.package_conversions[0] as { conversion_rate?: number } | undefined)
        ?.conversion_rate ||
      '',
    package_code: item.fk_lookup.package_code,
    variant_signature: extractVariantSignature(
      item.fk_lookup.source_name ?? ''
    ),
  });

const dedupeStrictly = (
  items: SeedItem[],
  pdfIndexByCode: Map<string, number>
): {
  dedupedCount: number;
  items: SeedItem[];
  strictDuplicateGroupCount: number;
} => {
  const sortedItems = [...items].sort((left, right) => {
    const leftIndex = pdfIndexByCode.get(left.code) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex =
      pdfIndexByCode.get(right.code) ?? Number.MAX_SAFE_INTEGER;

    return leftIndex - rightIndex || left.code.localeCompare(right.code);
  });
  const keptByKey = new Map<string, SeedItem>();
  let dedupedCount = 0;
  let strictDuplicateGroupCount = 0;

  for (const item of sortedItems) {
    const key = getStrictDeduplicationKey(item);

    if (!keptByKey.has(key)) {
      keptByKey.set(key, item);
      continue;
    }

    dedupedCount += 1;
  }

  const duplicateCounts = new Map<string, number>();

  for (const item of sortedItems) {
    const key = getStrictDeduplicationKey(item);
    duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
  }

  for (const count of duplicateCounts.values()) {
    if (count > 1) {
      strictDuplicateGroupCount += 1;
    }
  }

  return {
    dedupedCount,
    items: [...keptByKey.values()],
    strictDuplicateGroupCount,
  };
};

const buildMeasurementUnitIdMap = (seed: SeedFile) => {
  const unitIds = new Map<string, string>();

  for (const item of seed.items) {
    const unitCode = item.fk_lookup.measurement_unit_code;

    if (unitCode && item.measurement_unit_id) {
      unitIds.set(unitCode, item.measurement_unit_id);
    }

    const denominatorCode = item.fk_lookup.measurement_denominator_unit_code;

    if (denominatorCode && item.measurement_denominator_unit_id) {
      unitIds.set(denominatorCode, item.measurement_denominator_unit_id);
    }
  }

  return unitIds;
};

const buildHelperNameMapsFromSeed = (seed: SeedFile): HelperNameMaps => {
  const maps: HelperNameMaps = {
    categoryNames: new Map<string, string>(),
    dosageNames: new Map<string, string>(),
    packageNames: new Map<string, string>(),
    typeNames: new Map<string, string>(),
  };

  for (const item of seed.items) {
    const { fk_lookup: lookup } = item;

    if (lookup.category_code && lookup.category_name) {
      maps.categoryNames.set(lookup.category_code, lookup.category_name);
    }

    if (lookup.dosage_code && lookup.dosage_name) {
      maps.dosageNames.set(lookup.dosage_code, lookup.dosage_name);
    }

    if (lookup.package_code && lookup.package_name) {
      maps.packageNames.set(lookup.package_code, lookup.package_name);
    }

    if (lookup.type_code && lookup.type_name) {
      maps.typeNames.set(lookup.type_code, lookup.type_name);
    }
  }

  return maps;
};

const mergeHelperNameMaps = (
  target: HelperNameMaps,
  source: HelperNameMaps
): HelperNameMaps => {
  for (const [code, name] of source.categoryNames) {
    target.categoryNames.set(code, name);
  }

  for (const [code, name] of source.dosageNames) {
    target.dosageNames.set(code, name);
  }

  for (const [code, name] of source.packageNames) {
    target.packageNames.set(code, name);
  }

  for (const [code, name] of source.typeNames) {
    target.typeNames.set(code, name);
  }

  return target;
};

const loadMeasurementUnitIdMap = async (seed: SeedFile) => {
  const unitIds = buildMeasurementUnitIdMap(seed);
  const supabase = createServiceClient();

  if (!supabase) {
    return unitIds;
  }

  const { data, error } = await supabase.from('item_units').select('id, code');

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (row.code) {
      unitIds.set(row.code, row.id);
    }
  }

  return unitIds;
};

const loadHelperNameMaps = async (seed: SeedFile): Promise<HelperNameMaps> => {
  const maps = buildHelperNameMapsFromSeed(seed);
  const supabase = createServiceClient();

  if (!supabase) {
    return maps;
  }

  const [
    { data: categoryRows, error: categoryError },
    { data: dosageRows, error: dosageError },
    { data: packageRows, error: packageError },
    { data: typeRows, error: typeError },
  ] = await Promise.all([
    supabase.from('item_categories').select('code, name'),
    supabase.from('item_dosages').select('code, name'),
    supabase.from('item_packages').select('code, name'),
    supabase.from('item_types').select('code, name'),
  ]);

  if (categoryError) {
    throw categoryError;
  }

  if (dosageError) {
    throw dosageError;
  }

  if (packageError) {
    throw packageError;
  }

  if (typeError) {
    throw typeError;
  }

  const dbMaps: HelperNameMaps = {
    categoryNames: new Map<string, string>(),
    dosageNames: new Map<string, string>(),
    packageNames: new Map<string, string>(),
    typeNames: new Map<string, string>(),
  };

  for (const row of categoryRows ?? []) {
    if (row.code && row.name) {
      dbMaps.categoryNames.set(row.code, row.name);
    }
  }

  for (const row of dosageRows ?? []) {
    if (row.code && row.name) {
      dbMaps.dosageNames.set(row.code, row.name);
    }
  }

  for (const row of packageRows ?? []) {
    if (row.code && row.name) {
      dbMaps.packageNames.set(row.code, row.name);
    }
  }

  for (const row of typeRows ?? []) {
    if (row.code && row.name) {
      dbMaps.typeNames.set(row.code, row.name);
    }
  }

  return mergeHelperNameMaps(maps, dbMaps);
};

const resolveMeasurementUnitIds = (
  seed: SeedFile,
  unitIds: Map<string, string>
): string[] => {
  const missingCodes = new Set<string>();

  for (const item of seed.items) {
    const unitCode = item.fk_lookup.measurement_unit_code;
    item.measurement_unit_id = unitCode
      ? (unitIds.get(unitCode) ?? null)
      : null;

    if (unitCode && !item.measurement_unit_id) {
      missingCodes.add(unitCode);
    }

    const denominatorCode = item.fk_lookup.measurement_denominator_unit_code;
    item.measurement_denominator_unit_id = denominatorCode
      ? (unitIds.get(denominatorCode) ?? null)
      : null;

    if (denominatorCode && !item.measurement_denominator_unit_id) {
      missingCodes.add(denominatorCode);
    }
  }

  return [...missingCodes].sort();
};

const resolveHelperNames = (seed: SeedFile, maps: HelperNameMaps) => {
  for (const item of seed.items) {
    const { fk_lookup: lookup } = item;

    lookup.category_name = lookup.category_code
      ? (maps.categoryNames.get(lookup.category_code) ?? undefined)
      : undefined;
    lookup.dosage_name = lookup.dosage_code
      ? (maps.dosageNames.get(lookup.dosage_code) ?? lookup.dosage_name)
      : undefined;
    lookup.package_name = lookup.package_code
      ? (maps.packageNames.get(lookup.package_code) ?? undefined)
      : undefined;
    lookup.type_name = lookup.type_code
      ? (maps.typeNames.get(lookup.type_code) ?? undefined)
      : undefined;
  }
};

const inheritSiblingCategories = (seed: SeedFile): number => {
  const categoriesByTightKey = new Map<string, Set<string>>();
  const categoriesByLooseKey = new Map<string, Set<string>>();

  for (const item of seed.items) {
    const categoryCode = item.fk_lookup.category_code;

    if (!categoryCode || categoryCode === 'PDF_IMPORT') {
      continue;
    }

    const looseKey = [item.fk_lookup.manufacturer_name, item.name].join('|||');
    const tightKey = [
      item.fk_lookup.manufacturer_name,
      item.name,
      item.fk_lookup.type_code ?? '',
    ].join('|||');

    if (!categoriesByLooseKey.has(looseKey)) {
      categoriesByLooseKey.set(looseKey, new Set());
    }

    if (!categoriesByTightKey.has(tightKey)) {
      categoriesByTightKey.set(tightKey, new Set());
    }

    categoriesByLooseKey.get(looseKey)?.add(categoryCode);
    categoriesByTightKey.get(tightKey)?.add(categoryCode);
  }

  let inheritedCategoryCount = 0;

  for (const item of seed.items) {
    if (
      item.fk_lookup.category_code &&
      item.fk_lookup.category_code !== 'PDF_IMPORT'
    ) {
      continue;
    }

    const tightKey = [
      item.fk_lookup.manufacturer_name,
      item.name,
      item.fk_lookup.type_code ?? '',
    ].join('|||');
    const looseKey = [item.fk_lookup.manufacturer_name, item.name].join('|||');
    const tightCandidates = [
      ...(categoriesByTightKey.get(tightKey) ?? new Set()),
    ];
    const looseCandidates = [
      ...(categoriesByLooseKey.get(looseKey) ?? new Set()),
    ];
    const candidates =
      tightCandidates.length === 1
        ? tightCandidates
        : looseCandidates.length === 1
          ? looseCandidates
          : [];

    if (!candidates.length) {
      continue;
    }

    item.fk_lookup.category_code = candidates[0];
    inheritedCategoryCount += 1;
  }

  return inheritedCategoryCount;
};

const applyManualTypeAndCategoryOverrides = (seed: SeedFile): number => {
  let overrideCount = 0;
  const sensitifVivoCondomCodes = new Set([
    '0K0851',
    '0K1069',
    '0K1105',
    '0K1107',
    '0K1310',
    '0U0850',
    '0U0990',
    '0U1000',
    '0U1010',
    '0U1370',
    '0U1380',
  ]);
  const endocrineMetabolicAntidiabetesCodes = new Set([
    '0J0930',
    '0J6840',
    '0W0620',
    '0Y0040',
    '0Y1660',
    '0Y1670',
    '0Y1680',
    '0Y1690',
  ]);

  for (const item of seed.items) {
    const sourceName = item.fk_lookup.source_name ?? '';

    if (/^SENSITIF\b/i.test(sourceName) && !/\bVIVO\b/i.test(sourceName)) {
      item.fk_lookup.type_code = 'ALK';
      item.fk_lookup.category_code = 'MDV';
      overrideCount += 1;
      continue;
    }

    if (sensitifVivoCondomCodes.has(item.code)) {
      item.fk_lookup.type_code = 'ALK';
      item.fk_lookup.category_code = 'CON';
      overrideCount += 1;
      continue;
    }

    if (endocrineMetabolicAntidiabetesCodes.has(item.code)) {
      item.fk_lookup.category_code = 'ADB';
      overrideCount += 1;
    }
  }

  return overrideCount;
};

const loadManualPackageOverrides = () => {
  if (!existsSync(DEFAULT_MANUAL_PACKAGE_REVIEW)) {
    return new Map<string, { packageCode: string; packageName?: string }>();
  }

  const review = JSON.parse(
    readFileSync(DEFAULT_MANUAL_PACKAGE_REVIEW, 'utf8')
  ) as {
    items?: Array<{
      code?: string;
      manual_package_code?: string;
      manual_package_name?: string;
    }>;
  };
  const overrides = new Map<
    string,
    { packageCode: string; packageName?: string }
  >();

  for (const item of review.items ?? []) {
    const code = item.code?.trim();
    const packageCode = item.manual_package_code?.trim();
    const packageName = item.manual_package_name?.trim();

    if (!code || !packageCode) {
      continue;
    }

    overrides.set(code, {
      packageCode,
      packageName: packageName || undefined,
    });
  }

  return overrides;
};

const applyManualPackageOverrides = (
  seed: SeedFile,
  overrides: Map<string, { packageCode: string; packageName?: string }>
): number => {
  let appliedCount = 0;

  for (const item of seed.items) {
    const override = overrides.get(item.code);

    if (!override) {
      continue;
    }

    item.fk_lookup.package_code = override.packageCode;
    if (override.packageName) {
      item.fk_lookup.package_name = override.packageName;
    }
    appliedCount += 1;
  }

  return appliedCount;
};

const loadManualDosageOverrides = () => {
  if (!existsSync(DEFAULT_MANUAL_DOSAGE_REVIEW)) {
    return new Map<string, { dosageCode: string; dosageName?: string }>();
  }

  const review = JSON.parse(
    readFileSync(DEFAULT_MANUAL_DOSAGE_REVIEW, 'utf8')
  ) as {
    items?: Array<{
      code?: string;
      manual_dosage_code?: string;
      manual_dosage_name?: string;
    }>;
  };
  const overrides = new Map<
    string,
    { dosageCode: string; dosageName?: string }
  >();

  for (const item of review.items ?? []) {
    const code = item.code?.trim();
    const dosageCode = item.manual_dosage_code?.trim();
    const dosageName = item.manual_dosage_name?.trim();

    if (!code || !dosageCode) {
      continue;
    }

    overrides.set(code, {
      dosageCode,
      dosageName: dosageName || undefined,
    });
  }

  return overrides;
};

const applyManualDosageOverrides = (
  seed: SeedFile,
  overrides: Map<string, { dosageCode: string; dosageName?: string }>
): number => {
  let appliedCount = 0;

  for (const item of seed.items) {
    const override = overrides.get(item.code);

    if (!override) {
      continue;
    }

    item.fk_lookup.dosage_code = override.dosageCode;
    if (override.dosageName) {
      item.fk_lookup.dosage_name = override.dosageName;
    }
    appliedCount += 1;
  }

  return appliedCount;
};

const loadManualCategoryOverrides = () => {
  const overrides = new Map<
    string,
    { categoryCode: string; categoryName?: string }
  >();

  for (const reviewPath of DEFAULT_MANUAL_CATEGORY_REVIEW_PATHS) {
    if (!existsSync(reviewPath)) {
      continue;
    }

    const review = JSON.parse(readFileSync(reviewPath, 'utf8')) as {
      items?: Array<{
        code?: string;
        manual_category_code?: string;
        manual_category_name?: string;
      }>;
    };

    for (const item of review.items ?? []) {
      const code = item.code?.trim();
      const categoryCode = item.manual_category_code?.trim();
      const categoryName = item.manual_category_name?.trim();

      if (!code || !categoryCode) {
        continue;
      }

      overrides.set(code, {
        categoryCode,
        categoryName: categoryName || undefined,
      });
    }
  }

  return overrides;
};

const applyManualCategoryOverrides = (
  seed: SeedFile,
  overrides: Map<string, { categoryCode: string; categoryName?: string }>
): number => {
  let appliedCount = 0;

  for (const item of seed.items) {
    const override = overrides.get(item.code);

    if (!override) {
      continue;
    }

    item.fk_lookup.category_code = override.categoryCode;
    if (override.categoryName) {
      item.fk_lookup.category_name = override.categoryName;
    }
    appliedCount += 1;
  }

  return appliedCount;
};

const applyUnknownTypeFallback = (seed: SeedFile): number => {
  let appliedCount = 0;

  for (const item of seed.items) {
    if (
      item.fk_lookup.type_code !== 'PDF_IMPORT' &&
      item.fk_lookup.type_code !== 'UKN'
    ) {
      continue;
    }

    item.fk_lookup.type_code = 'UNK';
    item.fk_lookup.type_name = 'Unknown';
    appliedCount += 1;
  }

  return appliedCount;
};

const uniqueNotes = (notes: string[]): string[] => [...new Set(notes)];

const writeSeed = (outputPath: string, seed: SeedFile) => {
  writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);
};

const runEnrichmentScripts = (outputPath: string, sheetPdfDir: string) => {
  const tempCategoryReport = path.resolve(
    '/tmp/item-master-category-mapping-report.json'
  );

  execFileSync(
    'bun',
    [
      'scripts/enrich-item-types-from-sheet-pdfs.ts',
      outputPath,
      sheetPdfDir,
      outputPath,
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
    }
  );
  execFileSync(
    'bun',
    [
      'scripts/enrich-item-categories-from-kegunaan.ts',
      outputPath,
      outputPath,
      tempCategoryReport,
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
    }
  );
};

const main = async () => {
  const { inputPath, outputPath, pdfPath, sheetPdfDir } = parseArgs();
  const currentSeed = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;
  const measurementUnitIds = await loadMeasurementUnitIdMap(currentSeed);
  const helperNameMaps = await loadHelperNameMaps(currentSeed);
  const manualPackageOverrides = loadManualPackageOverrides();
  const manualDosageOverrides = loadManualDosageOverrides();
  const manualCategoryOverrides = loadManualCategoryOverrides();
  const { indexByCode, rows } = parsePriceList(pdfPath);
  const rowsByCode = new Map(rows.map(row => [row.code, row] as const));
  const existingCodes = new Set(currentSeed.items.map(item => item.code));
  const missingRows = rows.filter(row => !existingCodes.has(row.code));
  const restoredItems = missingRows.map(createSeedItemFromPriceRow);
  const mergedSeed: SeedFile = {
    ...currentSeed,
    items: [
      ...rebaseItemsToRawPackageCode(currentSeed.items, rowsByCode),
      ...restoredItems,
    ],
    source: {
      ...currentSeed.source,
      row_count: rows.length,
      notes: uniqueNotes([
        ...currentSeed.source.notes,
        'Re-synced against source PDF to restore missing codes before applying stricter variant-aware deduplication on 2026-03-27.',
      ]),
    },
  };
  const { normalizedSeed } = normalizeSeedFile(mergedSeed);
  const deduped = dedupeStrictly(normalizedSeed.items, indexByCode);
  const repairedSeed: SeedFile = {
    ...normalizedSeed,
    items: deduped.items,
    source: {
      ...normalizedSeed.source,
      row_count: deduped.items.length,
      notes: uniqueNotes([
        ...normalizedSeed.source.notes,
        `Restored ${restoredItems.length} missing codes from source PDF on 2026-03-27 before stricter deduplication.`,
        `Strict variant-aware deduplication removed ${deduped.dedupedCount} duplicates across ${deduped.strictDuplicateGroupCount} groups on 2026-03-27.`,
      ]),
    },
  };

  writeSeed(outputPath, repairedSeed);
  runEnrichmentScripts(outputPath, sheetPdfDir);

  const enrichedSeed = JSON.parse(readFileSync(outputPath, 'utf8')) as SeedFile;
  const inheritedCategoryCount = inheritSiblingCategories(enrichedSeed);
  const manualOverrideCount = applyManualTypeAndCategoryOverrides(enrichedSeed);
  const manualPackageOverrideCount = applyManualPackageOverrides(
    enrichedSeed,
    manualPackageOverrides
  );
  const manualDosageOverrideCount = applyManualDosageOverrides(
    enrichedSeed,
    manualDosageOverrides
  );
  const manualCategoryOverrideCount = applyManualCategoryOverrides(
    enrichedSeed,
    manualCategoryOverrides
  );
  const unknownTypeFallbackCount = applyUnknownTypeFallback(enrichedSeed);
  const missingUnitCodes = resolveMeasurementUnitIds(
    enrichedSeed,
    measurementUnitIds
  );
  resolveHelperNames(enrichedSeed, helperNameMaps);

  enrichedSeed.items.sort((left, right) => {
    const leftIndex = indexByCode.get(left.code) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = indexByCode.get(right.code) ?? Number.MAX_SAFE_INTEGER;

    return leftIndex - rightIndex || left.code.localeCompare(right.code);
  });
  enrichedSeed.source.row_count = enrichedSeed.items.length;
  enrichedSeed.source.normalized_at = new Date().toISOString();
  enrichedSeed.source.notes = uniqueNotes([
    ...enrichedSeed.source.notes,
    `Inherited sibling category_code for ${inheritedCategoryCount} restored or still-unmapped variants on 2026-03-27.`,
    `Applied ${manualOverrideCount} manual type/category overrides for known brand families on 2026-03-27.`,
    `Applied ${manualPackageOverrideCount} manual package overrides from completed package review on 2026-03-27.`,
    `Applied ${manualDosageOverrideCount} manual dosage overrides from completed dosage review on 2026-03-28.`,
    `Applied ${manualCategoryOverrideCount} manual category overrides from completed none/NA category review on 2026-03-28.`,
    `Applied UNK fallback to ${unknownTypeFallbackCount} items still missing type mapping on 2026-03-28.`,
    'Resolved category/type/package/dosage helper names from current master data on 2026-03-27.',
    'Resolved measurement_unit_id and measurement_denominator_unit_id from existing live-mapped unit codes on 2026-03-27.',
  ]);
  writeSeed(outputPath, enrichedSeed);

  const summary: RestoreSummary = {
    dedupedCount: deduped.dedupedCount,
    inheritedCategoryCount,
    missingUnitCodes,
    missingVariantCount: missingRows.length,
    restoredCount: restoredItems.length,
    strictDuplicateGroupCount: deduped.strictDuplicateGroupCount,
  };

  console.log(`Input seed                 : ${inputPath}`);
  console.log(`Source PDF                 : ${pdfPath}`);
  console.log(`Output seed                : ${outputPath}`);
  console.log(`Raw PDF rows               : ${rows.length}`);
  console.log(`Missing codes restored     : ${summary.restoredCount}`);
  console.log(
    `Strict duplicates removed  : ${summary.dedupedCount} across ${summary.strictDuplicateGroupCount} groups`
  );
  console.log(`Final item count           : ${enrichedSeed.items.length}`);
  console.log(`Inherited sibling category : ${summary.inheritedCategoryCount}`);
  console.log(
    `Missing measurement IDs    : ${summary.missingUnitCodes.join(', ') || '-'}`
  );
};

await main();
