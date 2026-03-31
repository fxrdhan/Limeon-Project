/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { SeedFile, SeedItem } from './normalize-item-master-seed';

config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_INPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-seed.json'
);
const BATCH_SIZE = 50;

type LookupRecord = {
  code: string | null;
  id: string;
  name: string;
};

type ExistingItem = {
  code: string | null;
  id: string;
};

type PackageConversionSeed = {
  base_price?: number;
  conversion_rate?: number;
  sell_price?: number;
  to_unit_id?: string | null;
  unit_name?: string;
};

type ParsedArgs = {
  inputPath: string;
  outputPath: string;
};

const parseArgs = (): ParsedArgs => {
  const args = process.argv.slice(2);
  let inputPath = DEFAULT_INPUT;
  let outputPath = DEFAULT_INPUT;

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
    }
  }

  return { inputPath, outputPath };
};

const createServiceClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const uniqueNotes = (notes: string[]) => [...new Set(notes)];

const readSeed = (inputPath: string): SeedFile =>
  JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;

const writeSeed = (outputPath: string, seed: SeedFile) => {
  writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);
};

const fetchLookupByCode = async (
  supabase: ReturnType<typeof createServiceClient>,
  table: 'item_categories' | 'item_types' | 'item_packages' | 'item_dosages'
) => {
  const { data, error } = await supabase.from(table).select('id, code, name');

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? [])
      .filter((row): row is LookupRecord => Boolean(row?.id && row?.name))
      .map(row => [row.code ?? '', row])
  );
};

const fetchManufacturersByName = async (
  supabase: ReturnType<typeof createServiceClient>,
  names: string[]
) => {
  const rows: LookupRecord[] = [];

  for (const batch of chunkArray(names, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from('item_manufacturers')
      .select('id, code, name')
      .in('name', batch);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as LookupRecord[]));
  }

  return new Map(rows.map(row => [row.name, row]));
};

const ensureManufacturers = async (
  supabase: ReturnType<typeof createServiceClient>,
  items: SeedItem[]
) => {
  const desired = new Map(
    items.map(item => [
      item.fk_lookup.manufacturer_name,
      {
        code: item.fk_lookup.manufacturer_code ?? null,
        name: item.fk_lookup.manufacturer_name,
      },
    ])
  );

  const names = Array.from(desired.keys()).sort();
  let existingByName = await fetchManufacturersByName(supabase, names);
  const inserts = names
    .filter(name => !existingByName.has(name))
    .map(name => desired.get(name))
    .filter((row): row is { code: string | null; name: string } =>
      Boolean(row)
    );

  if (inserts.length) {
    for (const batch of chunkArray(inserts, 100)) {
      const { error } = await supabase
        .from('item_manufacturers')
        .upsert(batch, { onConflict: 'name' });

      if (error) {
        throw error;
      }
    }

    existingByName = await fetchManufacturersByName(supabase, names);
  }

  const missing = names.filter(name => !existingByName.has(name));

  if (missing.length) {
    throw new Error(
      `Failed to resolve manufacturer master rows for: ${missing.join(', ')}`
    );
  }

  return {
    createdCount: inserts.length,
    byName: existingByName,
  };
};

const assertMissingCodes = (
  label: string,
  missing: Array<{ code: string; itemCode: string; itemName: string }>
) => {
  if (!missing.length) {
    return;
  }

  const preview = missing
    .slice(0, 10)
    .map(entry => `${entry.code} <- ${entry.itemCode} ${entry.itemName}`)
    .join(', ');

  throw new Error(`Missing ${label} master rows: ${preview}`);
};

const resolvePackageConversionIds = (
  item: SeedItem,
  packageLookup: Map<string, LookupRecord>
) =>
  item.package_conversions.map(conversion => {
    const value = conversion as PackageConversionSeed;
    const unitKey = (value.unit_name ?? '').trim();
    const resolved =
      packageLookup.get(unitKey) ||
      Array.from(packageLookup.values()).find(
        packageRow => packageRow.name.toLowerCase() === unitKey.toLowerCase()
      );

    return {
      ...value,
      to_unit_id: resolved?.id ?? value.to_unit_id ?? null,
    };
  });

const fetchExistingItemsByCode = async (
  supabase: ReturnType<typeof createServiceClient>,
  codes: string[]
) => {
  const rows: ExistingItem[] = [];

  for (const batch of chunkArray(codes, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from('items')
      .select('id, code')
      .in('code', batch);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as ExistingItem[]));
  }

  return new Map(
    rows
      .filter((row): row is ExistingItem => Boolean(row.id && row.code))
      .map(row => [row.code ?? '', row.id])
  );
};

const main = async () => {
  const { inputPath, outputPath } = parseArgs();
  const seed = readSeed(inputPath);
  const supabase = createServiceClient();

  const [
    categoryByCode,
    typeByCode,
    packageByCode,
    dosageByCode,
    { byName: manufacturerByName, createdCount: createdManufacturers },
  ] = await Promise.all([
    fetchLookupByCode(supabase, 'item_categories'),
    fetchLookupByCode(supabase, 'item_types'),
    fetchLookupByCode(supabase, 'item_packages'),
    fetchLookupByCode(supabase, 'item_dosages'),
    ensureManufacturers(supabase, seed.items),
  ]);

  const missingCategories: Array<{
    code: string;
    itemCode: string;
    itemName: string;
  }> = [];
  const missingTypes: Array<{
    code: string;
    itemCode: string;
    itemName: string;
  }> = [];
  const missingPackages: Array<{
    code: string;
    itemCode: string;
    itemName: string;
  }> = [];
  const missingDosages: Array<{
    code: string;
    itemCode: string;
    itemName: string;
  }> = [];
  const missingManufacturers: Array<{
    code: string;
    itemCode: string;
    itemName: string;
  }> = [];

  for (const item of seed.items) {
    if (
      item.fk_lookup.type_code === 'PDF_IMPORT' ||
      item.fk_lookup.type_code === 'UKN'
    ) {
      item.fk_lookup.type_code = 'UNK';
      item.fk_lookup.type_name = 'Unknown';
    }

    const categoryCode = item.fk_lookup.category_code;
    const typeCode = item.fk_lookup.type_code;
    const packageCode = item.fk_lookup.package_code;
    const dosageCode = item.fk_lookup.dosage_code ?? '';
    const manufacturerName = item.fk_lookup.manufacturer_name;

    if (!categoryByCode.has(categoryCode)) {
      missingCategories.push({
        code: categoryCode,
        itemCode: item.code,
        itemName: item.name,
      });
    }

    if (!typeByCode.has(typeCode)) {
      missingTypes.push({
        code: typeCode,
        itemCode: item.code,
        itemName: item.name,
      });
    }

    if (!packageByCode.has(packageCode)) {
      missingPackages.push({
        code: packageCode,
        itemCode: item.code,
        itemName: item.name,
      });
    }

    if (!dosageCode || !dosageByCode.has(dosageCode)) {
      missingDosages.push({
        code: dosageCode || '(blank)',
        itemCode: item.code,
        itemName: item.name,
      });
    }

    if (!manufacturerByName.has(manufacturerName)) {
      missingManufacturers.push({
        code: manufacturerName,
        itemCode: item.code,
        itemName: item.name,
      });
    }
  }

  assertMissingCodes('category', missingCategories);
  assertMissingCodes('type', missingTypes);
  assertMissingCodes('package', missingPackages);
  assertMissingCodes('dosage', missingDosages);
  assertMissingCodes('manufacturer', missingManufacturers);

  for (const item of seed.items) {
    const category = categoryByCode.get(item.fk_lookup.category_code)!;
    const type = typeByCode.get(item.fk_lookup.type_code)!;
    const packageRow = packageByCode.get(item.fk_lookup.package_code)!;
    const dosage = dosageByCode.get(item.fk_lookup.dosage_code ?? '')!;
    const manufacturer = manufacturerByName.get(
      item.fk_lookup.manufacturer_name
    )!;

    item.category_id = category.id;
    item.type_id = type.id;
    item.package_id = packageRow.id;
    item.dosage_id = dosage.id;
    item.manufacturer_id = manufacturer.id;
    item.fk_lookup.category_name = category.name;
    item.fk_lookup.type_name = type.name;
    item.fk_lookup.package_name = packageRow.name;
    item.fk_lookup.dosage_name = dosage.name;
    item.package_conversions = resolvePackageConversionIds(item, packageByCode);
  }

  const existingItemsByCode = await fetchExistingItemsByCode(
    supabase,
    seed.items.map(item => item.code)
  );

  const toRecord = (item: SeedItem) => {
    const existingId = existingItemsByCode.get(item.code);

    return {
      ...(existingId ? { id: existingId } : {}),
      name: item.name,
      sell_price: item.sell_price,
      stock: item.stock,
      min_stock: item.min_stock,
      description: item.description,
      is_active: item.is_active,
      code: item.code,
      rack: item.rack,
      has_expiry_date: item.has_expiry_date,
      is_medicine: item.is_medicine,
      category_id: item.category_id,
      type_id: item.type_id,
      base_unit: item.base_unit,
      base_price: item.base_price,
      package_conversions: item.package_conversions,
      barcode: item.barcode,
      dosage_id: item.dosage_id,
      measurement_value: item.measurement_value ?? null,
      measurement_unit_id: item.measurement_unit_id ?? null,
      measurement_denominator_value: item.measurement_denominator_value ?? null,
      measurement_denominator_unit_id:
        item.measurement_denominator_unit_id ?? null,
      package_id: item.package_id,
      manufacturer_id: item.manufacturer_id,
      image_urls: item.image_urls,
      is_level_pricing_active: item.is_level_pricing_active,
    };
  };

  const inserts = seed.items
    .filter(item => !existingItemsByCode.has(item.code))
    .map(toRecord);
  const updates = seed.items
    .filter(item => existingItemsByCode.has(item.code))
    .map(toRecord);

  for (const batch of chunkArray(inserts, BATCH_SIZE)) {
    if (!batch.length) {
      continue;
    }

    const { error } = await supabase.from('items').insert(batch);

    if (error) {
      throw error;
    }
  }

  for (const batch of chunkArray(updates, BATCH_SIZE)) {
    if (!batch.length) {
      continue;
    }

    const { error } = await supabase.from('items').upsert(batch, {
      onConflict: 'id',
    });

    if (error) {
      throw error;
    }
  }

  seed.source.notes = uniqueNotes([
    ...seed.source.notes,
    `Resolved category_id, type_id, package_id, dosage_id, and manufacturer_id from live master data on ${new Date().toISOString()}.`,
    `Created ${createdManufacturers} missing manufacturers in item_manufacturers during seeding on ${new Date().toISOString()}.`,
    `Seeded ${seed.items.length} items to public.items from canonical JSON on ${new Date().toISOString()}.`,
  ]);
  writeSeed(outputPath, seed);

  console.log(`Input seed                 : ${inputPath}`);
  console.log(`Output seed                : ${outputPath}`);
  console.log(`Manufacturers created      : ${createdManufacturers}`);
  console.log(`Items to insert            : ${inserts.length}`);
  console.log(`Items to update            : ${updates.length}`);
  console.log(`Final seeded items         : ${seed.items.length}`);
};

void main();
