import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '.env') });

type PriceListRow = {
  principal: string;
  code: string;
  product: string;
  uom: string;
  hna: number;
};

type PackageRecord = {
  id: string;
  code: string | null;
  name: string;
};

type ManufacturerRecord = {
  id: string;
  name: string;
};

type ItemRecord = {
  id: string;
  code: string | null;
  sell_price: number | string | null;
  category_id: string | null;
  type_id: string | null;
};

type Summary = {
  totalRows: number;
  uniqueManufacturers: number;
  uniquePackages: number;
  existingItems: number;
  newItems: number;
  updatedItems: number;
  newManufacturers: number;
  newPackages: number;
};

type UndoSummary = {
  totalRows: number;
  itemsMatchingUndoScope: number;
  orphanManufacturersToDelete: number;
  orphanPackagesToDelete: number;
  placeholderCategoryWillDelete: boolean;
  placeholderTypeWillDelete: boolean;
};

const CATEGORY_CODE = 'PDF_IMPORT';
const CATEGORY_NAME = 'Import PDF Pricelist';
const TYPE_CODE = 'PDF_IMPORT';
const TYPE_NAME = 'Belum Diklasifikasi';

const CLI_OPTIONS = new Set(['--apply', '--undo', '--help', '-h']);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const pdfPath = args.find(arg => !CLI_OPTIONS.has(arg));
  const apply = args.includes('--apply');
  const undo = args.includes('--undo');
  const help = args.includes('--help') || args.includes('-h');

  return { pdfPath, apply, help, undo };
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

const extractPdfText = (pdfPath: string): string => {
  try {
    return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(
      `Failed to extract PDF text with pdftotext: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const parsePriceList = (pdfPath: string): PriceListRow[] => {
  const lines = extractPdfText(pdfPath).split('\n');
  const rows: PriceListRow[] = [];
  const seenCodes = new Set<string>();

  for (const rawLine of lines) {
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

    if (seenCodes.has(code)) {
      throw new Error(`Duplicate item code detected in PDF: ${code}`);
    }

    seenCodes.add(code);
    rows.push({
      principal,
      code,
      product,
      uom,
      hna: parsePrice(hna),
    });
  }

  if (!rows.length) {
    throw new Error('No price-list rows could be parsed from the PDF');
  }

  return rows;
};

const createServiceClient = (): SupabaseClient => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)'
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

const ensureLookupRecord = async (
  supabase: SupabaseClient,
  table: 'item_categories' | 'item_types',
  code: string,
  name: string
): Promise<string> => {
  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert({
      code,
      name,
      description: 'Auto-created by PDF item-master import script',
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    throw insertError ?? new Error(`Unable to create record in ${table}`);
  }

  return inserted.id;
};

const getLookupRecordId = async (
  supabase: SupabaseClient,
  table: 'item_categories' | 'item_types',
  code: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
};

const getPackagesByCode = async (
  supabase: SupabaseClient,
  uomCodes: string[]
): Promise<Map<string, PackageRecord>> => {
  const existingRecords = new Map<string, PackageRecord>();

  for (const batch of chunkArray(uomCodes, 100)) {
    const { data, error } = await supabase
      .from('item_packages')
      .select('id, code, name')
      .in('code', batch);

    if (error) {
      throw error;
    }

    for (const record of (data || []) as PackageRecord[]) {
      if (record.code) {
        existingRecords.set(record.code, record);
      }
    }
  }

  return existingRecords;
};

const ensurePackages = async (
  supabase: SupabaseClient,
  uomCodes: string[]
): Promise<{ map: Map<string, string>; createdCount: number }> => {
  const existingRecords = await getPackagesByCode(supabase, uomCodes);
  const missingCodes = uomCodes.filter(code => !existingRecords.has(code));

  if (missingCodes.length) {
    for (const batch of chunkArray(missingCodes, 100)) {
      const payload = batch.map(code => ({
        code,
        name: code,
        description: 'Auto-created by PDF item-master import script',
      }));

      const { data, error } = await supabase
        .from('item_packages')
        .insert(payload)
        .select('id, code, name');

      if (error) {
        throw error;
      }

      for (const record of (data || []) as PackageRecord[]) {
        if (record.code) {
          existingRecords.set(record.code, record);
        }
      }
    }
  }

  return {
    map: new Map(
      Array.from(existingRecords.entries()).map(([code, record]) => [
        code,
        record.id,
      ])
    ),
    createdCount: missingCodes.length,
  };
};

const getManufacturersByName = async (
  supabase: SupabaseClient,
  manufacturers: string[]
): Promise<Map<string, ManufacturerRecord>> => {
  const { data: existingData, error: existingError } = await supabase
    .from('item_manufacturers')
    .select('id, name');

  if (existingError) {
    throw existingError;
  }

  const existingByName = new Map<string, ManufacturerRecord>();

  for (const manufacturer of (existingData || []) as ManufacturerRecord[]) {
    existingByName.set(manufacturer.name, manufacturer);
  }

  return new Map(
    Array.from(existingByName.entries()).filter(([name]) =>
      manufacturers.includes(name)
    )
  );
};

const ensureManufacturers = async (
  supabase: SupabaseClient,
  manufacturers: string[]
): Promise<{ map: Map<string, string>; createdCount: number }> => {
  const existingByName = await getManufacturersByName(supabase, manufacturers);
  const missingManufacturers = manufacturers.filter(
    name => !existingByName.has(name)
  );

  if (missingManufacturers.length) {
    for (const batch of chunkArray(missingManufacturers, 100)) {
      const { data, error } = await supabase
        .from('item_manufacturers')
        .insert(batch.map(name => ({ name })))
        .select('id, name');

      if (error) {
        throw error;
      }

      for (const manufacturer of (data || []) as ManufacturerRecord[]) {
        existingByName.set(manufacturer.name, manufacturer);
      }
    }
  }

  return {
    map: new Map(
      Array.from(existingByName.entries()).map(([name, manufacturer]) => [
        name,
        manufacturer.id,
      ])
    ),
    createdCount: missingManufacturers.length,
  };
};

const getExistingItemsByCode = async (
  supabase: SupabaseClient,
  codes: string[]
): Promise<Map<string, ItemRecord>> => {
  const existingItems = new Map<string, ItemRecord>();

  for (const batch of chunkArray(codes, 200)) {
    const { data, error } = await supabase
      .from('items')
      .select('id, code, sell_price, category_id, type_id')
      .in('code', batch);

    if (error) {
      throw error;
    }

    for (const item of (data || []) as ItemRecord[]) {
      if (item.code) {
        if (existingItems.has(item.code)) {
          throw new Error(
            `Duplicate existing item code found in database: ${item.code}`
          );
        }

        existingItems.set(item.code, item);
      }
    }
  }

  return existingItems;
};

const getUndoScopedItems = async (
  supabase: SupabaseClient,
  codes: string[],
  categoryId: string,
  typeId: string
): Promise<Map<string, ItemRecord>> => {
  const scopedItems = new Map<string, ItemRecord>();

  for (const batch of chunkArray(codes, 200)) {
    const { data, error } = await supabase
      .from('items')
      .select('id, code, sell_price, category_id, type_id')
      .eq('category_id', categoryId)
      .eq('type_id', typeId)
      .in('code', batch);

    if (error) {
      throw error;
    }

    for (const item of (data || []) as ItemRecord[]) {
      if (item.code) {
        scopedItems.set(item.code, item);
      }
    }
  }

  return scopedItems;
};

const getReferencedManufacturerNames = async (
  supabase: SupabaseClient,
  manufacturerNames: string[]
): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('item_manufacturers')
    .select('name, items!left(id)')
    .in('name', manufacturerNames);

  if (error) {
    throw error;
  }

  const referencedNames = new Set<string>();

  for (const record of (data || []) as Array<{
    name: string;
    items?: { id: string }[] | null;
  }>) {
    if (Array.isArray(record.items) && record.items.length > 0) {
      referencedNames.add(record.name);
    }
  }

  return referencedNames;
};

const getReferencedPackageCodes = async (
  supabase: SupabaseClient,
  packageCodes: string[]
): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('item_packages')
    .select('code, items!left(id)')
    .in('code', packageCodes);

  if (error) {
    throw error;
  }

  const referencedCodes = new Set<string>();

  for (const record of (data || []) as Array<{
    code: string | null;
    items?: { id: string }[] | null;
  }>) {
    if (record.code && Array.isArray(record.items) && record.items.length > 0) {
      referencedCodes.add(record.code);
    }
  }

  return referencedCodes;
};

const hasItemsForForeignKey = async (
  supabase: SupabaseClient,
  column: 'category_id' | 'type_id',
  id: string
): Promise<boolean> => {
  const { count, error } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq(column, id);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
};

const buildSummary = (
  rows: PriceListRow[],
  existingItemsByCode: Map<string, ItemRecord>,
  newManufacturers: number,
  newPackages: number
): Summary => ({
  totalRows: rows.length,
  uniqueManufacturers: new Set(rows.map(row => row.principal)).size,
  uniquePackages: new Set(rows.map(row => row.uom)).size,
  existingItems: existingItemsByCode.size,
  newItems: rows.length - existingItemsByCode.size,
  updatedItems: existingItemsByCode.size,
  newManufacturers,
  newPackages,
});

const printSummary = (summary: Summary, mode: 'dry-run' | 'apply') => {
  console.log(`Mode: ${mode}`);
  console.log(`Rows parsed: ${summary.totalRows}`);
  console.log(`Unique principals: ${summary.uniqueManufacturers}`);
  console.log(`Unique UOM codes: ${summary.uniquePackages}`);
  console.log(`Existing items matched by code: ${summary.existingItems}`);
  console.log(`New items to insert: ${summary.newItems}`);
  console.log(`Existing items to update: ${summary.updatedItems}`);
  console.log(`New manufacturers to create: ${summary.newManufacturers}`);
  console.log(`New item packages to create: ${summary.newPackages}`);
};

const printUndoSummary = (
  summary: UndoSummary,
  mode: 'undo-dry-run' | 'undo-apply'
) => {
  console.log(`Mode: ${mode}`);
  console.log(`Rows parsed from PDF: ${summary.totalRows}`);
  console.log(`Items matched for undo: ${summary.itemsMatchingUndoScope}`);
  console.log(
    `Orphan manufacturers to delete: ${summary.orphanManufacturersToDelete}`
  );
  console.log(`Orphan packages to delete: ${summary.orphanPackagesToDelete}`);
  console.log(
    `Delete placeholder category PDF_IMPORT: ${summary.placeholderCategoryWillDelete}`
  );
  console.log(
    `Delete placeholder type PDF_IMPORT: ${summary.placeholderTypeWillDelete}`
  );
};

const applyImport = async (rows: PriceListRow[]) => {
  const supabase = createServiceClient();

  const categoryId = await ensureLookupRecord(
    supabase,
    'item_categories',
    CATEGORY_CODE,
    CATEGORY_NAME
  );
  const typeId = await ensureLookupRecord(
    supabase,
    'item_types',
    TYPE_CODE,
    TYPE_NAME
  );

  const { map: packageIdsByCode, createdCount: newPackages } =
    await ensurePackages(
      supabase,
      Array.from(new Set(rows.map(row => row.uom))).sort()
    );
  const { map: manufacturerIdsByName, createdCount: newManufacturers } =
    await ensureManufacturers(
      supabase,
      Array.from(new Set(rows.map(row => row.principal))).sort()
    );

  const existingItemsByCode = await getExistingItemsByCode(
    supabase,
    rows.map(row => row.code)
  );

  const summary = buildSummary(
    rows,
    existingItemsByCode,
    newManufacturers,
    newPackages
  );

  const inserts = rows
    .filter(row => !existingItemsByCode.has(row.code))
    .map(row => {
      const packageId = packageIdsByCode.get(row.uom);
      const manufacturerId = manufacturerIdsByName.get(row.principal);

      if (!packageId) {
        throw new Error(`Missing package mapping for UOM ${row.uom}`);
      }

      if (!manufacturerId) {
        throw new Error(`Missing manufacturer mapping for ${row.principal}`);
      }

      return {
        name: row.product,
        code: row.code,
        manufacturer_id: manufacturerId,
        package_id: packageId,
        category_id: categoryId,
        type_id: typeId,
        base_price: row.hna,
        sell_price: row.hna,
        stock: 0,
        min_stock: 10,
        is_active: true,
        is_medicine: true,
        is_level_pricing_active: true,
        base_unit: '',
        package_conversions: [],
        image_urls: [],
      };
    });

  const updates = rows
    .filter(row => existingItemsByCode.has(row.code))
    .map(row => {
      const existing = existingItemsByCode.get(row.code);
      const packageId = packageIdsByCode.get(row.uom);
      const manufacturerId = manufacturerIdsByName.get(row.principal);

      if (!existing) {
        throw new Error(`Missing existing item for code ${row.code}`);
      }

      if (!packageId) {
        throw new Error(`Missing package mapping for UOM ${row.uom}`);
      }

      if (!manufacturerId) {
        throw new Error(`Missing manufacturer mapping for ${row.principal}`);
      }

      const existingSellPrice = Number(existing.sell_price) || 0;

      return {
        id: existing.id,
        name: row.product,
        code: row.code,
        manufacturer_id: manufacturerId,
        package_id: packageId,
        category_id: existing.category_id || categoryId,
        type_id: existing.type_id || typeId,
        base_price: row.hna,
        sell_price: existingSellPrice > 0 ? existingSellPrice : row.hna,
      };
    });

  for (const batch of chunkArray(inserts, 200)) {
    const { error } = await supabase.from('items').insert(batch);

    if (error) {
      throw error;
    }
  }

  for (const batch of chunkArray(updates, 200)) {
    const { error } = await supabase.from('items').upsert(batch, {
      onConflict: 'id',
    });

    if (error) {
      throw error;
    }
  }

  printSummary(summary, 'apply');
};

const buildUndoSummary = async (
  supabase: SupabaseClient,
  rows: PriceListRow[]
): Promise<UndoSummary> => {
  const categoryId = await getLookupRecordId(
    supabase,
    'item_categories',
    CATEGORY_CODE
  );
  const typeId = await getLookupRecordId(supabase, 'item_types', TYPE_CODE);

  if (!categoryId || !typeId) {
    return {
      totalRows: rows.length,
      itemsMatchingUndoScope: 0,
      orphanManufacturersToDelete: 0,
      orphanPackagesToDelete: 0,
      placeholderCategoryWillDelete: Boolean(categoryId),
      placeholderTypeWillDelete: Boolean(typeId),
    };
  }

  const scopedItems = await getUndoScopedItems(
    supabase,
    rows.map(row => row.code),
    categoryId,
    typeId
  );

  const manufacturerNames = Array.from(
    new Set(
      rows.filter(row => scopedItems.has(row.code)).map(row => row.principal)
    )
  ).sort();
  const packageCodes = Array.from(
    new Set(rows.filter(row => scopedItems.has(row.code)).map(row => row.uom))
  ).sort();

  const referencedManufacturerNames = await getReferencedManufacturerNames(
    supabase,
    manufacturerNames
  );
  const referencedPackageCodes = await getReferencedPackageCodes(
    supabase,
    packageCodes
  );

  return {
    totalRows: rows.length,
    itemsMatchingUndoScope: scopedItems.size,
    orphanManufacturersToDelete: manufacturerNames.filter(
      name => !referencedManufacturerNames.has(name)
    ).length,
    orphanPackagesToDelete: packageCodes.filter(
      code => !referencedPackageCodes.has(code)
    ).length,
    placeholderCategoryWillDelete: !(await hasItemsForForeignKey(
      supabase,
      'category_id',
      categoryId
    )),
    placeholderTypeWillDelete: !(await hasItemsForForeignKey(
      supabase,
      'type_id',
      typeId
    )),
  };
};

const applyUndo = async (rows: PriceListRow[]) => {
  const supabase = createServiceClient();
  const categoryId = await getLookupRecordId(
    supabase,
    'item_categories',
    CATEGORY_CODE
  );
  const typeId = await getLookupRecordId(supabase, 'item_types', TYPE_CODE);

  if (!categoryId || !typeId) {
    printUndoSummary(
      {
        totalRows: rows.length,
        itemsMatchingUndoScope: 0,
        orphanManufacturersToDelete: 0,
        orphanPackagesToDelete: 0,
        placeholderCategoryWillDelete: Boolean(categoryId),
        placeholderTypeWillDelete: Boolean(typeId),
      },
      'undo-apply'
    );
    return;
  }

  const scopedItems = await getUndoScopedItems(
    supabase,
    rows.map(row => row.code),
    categoryId,
    typeId
  );

  if (!scopedItems.size) {
    printUndoSummary(
      {
        totalRows: rows.length,
        itemsMatchingUndoScope: 0,
        orphanManufacturersToDelete: 0,
        orphanPackagesToDelete: 0,
        placeholderCategoryWillDelete: !(await hasItemsForForeignKey(
          supabase,
          'category_id',
          categoryId
        )),
        placeholderTypeWillDelete: !(await hasItemsForForeignKey(
          supabase,
          'type_id',
          typeId
        )),
      },
      'undo-apply'
    );
    return;
  }

  for (const batch of chunkArray(Array.from(scopedItems.keys()), 200)) {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('category_id', categoryId)
      .eq('type_id', typeId)
      .in('code', batch);

    if (error) {
      throw error;
    }
  }

  const manufacturerNames = Array.from(
    new Set(
      rows.filter(row => scopedItems.has(row.code)).map(row => row.principal)
    )
  ).sort();
  const packageCodes = Array.from(
    new Set(rows.filter(row => scopedItems.has(row.code)).map(row => row.uom))
  ).sort();

  const referencedManufacturerNames = await getReferencedManufacturerNames(
    supabase,
    manufacturerNames
  );
  const orphanManufacturerNames = manufacturerNames.filter(
    name => !referencedManufacturerNames.has(name)
  );

  for (const batch of chunkArray(orphanManufacturerNames, 100)) {
    if (!batch.length) {
      continue;
    }

    const { error } = await supabase
      .from('item_manufacturers')
      .delete()
      .in('name', batch);

    if (error) {
      throw error;
    }
  }

  const referencedPackageCodes = await getReferencedPackageCodes(
    supabase,
    packageCodes
  );
  const orphanPackageCodes = packageCodes.filter(
    code => !referencedPackageCodes.has(code)
  );

  for (const batch of chunkArray(orphanPackageCodes, 100)) {
    if (!batch.length) {
      continue;
    }

    const { error } = await supabase
      .from('item_packages')
      .delete()
      .in('code', batch);

    if (error) {
      throw error;
    }
  }

  const placeholderCategoryWillDelete = !(await hasItemsForForeignKey(
    supabase,
    'category_id',
    categoryId
  ));
  const placeholderTypeWillDelete = !(await hasItemsForForeignKey(
    supabase,
    'type_id',
    typeId
  ));

  if (placeholderCategoryWillDelete) {
    const { error } = await supabase
      .from('item_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      throw error;
    }
  }

  if (placeholderTypeWillDelete) {
    const { error } = await supabase
      .from('item_types')
      .delete()
      .eq('id', typeId);

    if (error) {
      throw error;
    }
  }

  printUndoSummary(
    {
      totalRows: rows.length,
      itemsMatchingUndoScope: scopedItems.size,
      orphanManufacturersToDelete: orphanManufacturerNames.length,
      orphanPackagesToDelete: orphanPackageCodes.length,
      placeholderCategoryWillDelete,
      placeholderTypeWillDelete,
    },
    'undo-apply'
  );
};

const runDryRun = async (rows: PriceListRow[]) => {
  const supabase = createServiceClient();

  const existingItemsByCode = await getExistingItemsByCode(
    supabase,
    rows.map(row => row.code)
  );
  const manufacturers = Array.from(
    new Set(rows.map(row => row.principal))
  ).sort();
  const packages = Array.from(new Set(rows.map(row => row.uom))).sort();

  const existingManufacturerNames = new Set(
    Array.from((await getManufacturersByName(supabase, manufacturers)).keys())
  );
  const existingPackages = await getPackagesByCode(supabase, packages);

  const newManufacturers = manufacturers.filter(
    name => !existingManufacturerNames.has(name)
  ).length;
  const newPackages = packages.filter(
    code => !existingPackages.has(code)
  ).length;

  const summary = buildSummary(
    rows,
    existingItemsByCode,
    newManufacturers,
    newPackages
  );

  printSummary(summary, 'dry-run');
};

const runUndoDryRun = async (rows: PriceListRow[]) => {
  const supabase = createServiceClient();
  const summary = await buildUndoSummary(supabase, rows);
  printUndoSummary(summary, 'undo-dry-run');
};

const printHelp = () => {
  console.log(`Usage:
  bun scripts/archive/item-master/import-item-master-price-list.ts "<pdf-path>"
  bun scripts/archive/item-master/import-item-master-price-list.ts "<pdf-path>" --apply
  bun scripts/archive/item-master/import-item-master-price-list.ts "<pdf-path>" --undo
  bun scripts/archive/item-master/import-item-master-price-list.ts "<pdf-path>" --undo --apply

Behavior:
  - default: dry-run preview only
  - --apply: create missing manufacturers/packages, ensure placeholder category/type, then insert or update items by code
  - --undo: dry-run preview for removing items imported from this PDF that are still tagged PDF_IMPORT
  - --undo --apply: execute the rollback
`);
};

const main = async () => {
  const { pdfPath, apply, help, undo } = parseArgs();

  if (help || !pdfPath) {
    printHelp();
    return;
  }

  const resolvedPdfPath = path.resolve(pdfPath);
  const rows = parsePriceList(resolvedPdfPath);

  if (undo) {
    if (apply) {
      await applyUndo(rows);
      return;
    }

    await runUndoDryRun(rows);
    return;
  }

  if (apply) {
    await applyImport(rows);
    return;
  }

  await runDryRun(rows);
};

void main().catch(error => {
  console.error(
    error instanceof Error ? error.message : 'Unknown import error'
  );
  process.exit(1);
});
