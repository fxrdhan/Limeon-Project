/// <reference types="node" />

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SeedItem = {
  code: string;
  name: string;
  fk_lookup?: {
    category_code?: string;
    normalized_kegunaan_obat?: string;
    source_golongan_obat?: string;
    source_kegunaan_obat?: string;
    source_name?: string;
    type_code?: string;
  };
};

type SeedFile = {
  items: SeedItem[];
};

type GroupRow = {
  normalized_kegunaan_obat: string;
  item_count: number;
  raw_kegunaan_values: string;
  type_codes: string;
  sample_codes: string;
  sample_names: string;
  final_category_code: string;
  notes: string;
};

const DEFAULT_INPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-seed.json'
);
const DEFAULT_GROUP_OUTPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-missing-categories-groups.csv'
);
const DEFAULT_ITEM_OUTPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-missing-categories-items.csv'
);

const parseArgs = () => {
  const args = process.argv.slice(2);

  return {
    inputPath: path.resolve(args[0] ?? DEFAULT_INPUT),
    groupOutputPath: path.resolve(args[1] ?? DEFAULT_GROUP_OUTPUT),
    itemOutputPath: path.resolve(args[2] ?? DEFAULT_ITEM_OUTPUT),
  };
};

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeCsvValue = (value: string | number | null | undefined): string => {
  const stringValue =
    value === null || value === undefined ? '' : String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const toCsv = (
  headers: string[],
  rows: Array<Record<string, string | number>>
) =>
  [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => escapeCsvValue(row[header])).join(',')
    ),
  ].join('\n');

const main = () => {
  const { inputPath, groupOutputPath, itemOutputPath } = parseArgs();
  const seed = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;
  const missingItems = seed.items.filter(
    item =>
      !item.fk_lookup?.category_code ||
      item.fk_lookup.category_code === 'PDF_IMPORT'
  );

  const grouped = new Map<
    string,
    {
      item_count: number;
      raw_kegunaan_values: Set<string>;
      type_codes: Set<string>;
      sample_codes: string[];
      sample_names: string[];
    }
  >();

  for (const item of missingItems) {
    const normalizedKegunaan =
      normalizeWhitespace(item.fk_lookup?.normalized_kegunaan_obat ?? '') ||
      '(none)';
    const rawKegunaan =
      normalizeWhitespace(item.fk_lookup?.source_kegunaan_obat ?? '') ||
      '(none)';
    const typeCode =
      normalizeWhitespace(item.fk_lookup?.type_code ?? '') || '-';
    const current = grouped.get(normalizedKegunaan) ?? {
      item_count: 0,
      raw_kegunaan_values: new Set<string>(),
      type_codes: new Set<string>(),
      sample_codes: [],
      sample_names: [],
    };

    current.item_count += 1;
    current.raw_kegunaan_values.add(rawKegunaan);
    current.type_codes.add(typeCode);

    if (current.sample_codes.length < 5) {
      current.sample_codes.push(item.code);
      current.sample_names.push(item.name);
    }

    grouped.set(normalizedKegunaan, current);
  }

  const groupRows: GroupRow[] = [...grouped.entries()]
    .sort((left, right) => {
      const countDiff = right[1].item_count - left[1].item_count;
      return countDiff || left[0].localeCompare(right[0]);
    })
    .map(([normalized_kegunaan_obat, group]) => ({
      normalized_kegunaan_obat,
      item_count: group.item_count,
      raw_kegunaan_values: [...group.raw_kegunaan_values].sort().join(' | '),
      type_codes: [...group.type_codes].sort().join(' | '),
      sample_codes: group.sample_codes.join(' | '),
      sample_names: group.sample_names.join(' | '),
      final_category_code: '',
      notes: '',
    }));

  const itemRows = missingItems
    .map(item => ({
      code: item.code,
      name: item.name,
      source_name: item.fk_lookup?.source_name ?? '',
      type_code: item.fk_lookup?.type_code ?? '',
      source_golongan_obat: item.fk_lookup?.source_golongan_obat ?? '',
      source_kegunaan_obat: item.fk_lookup?.source_kegunaan_obat ?? '',
      normalized_kegunaan_obat: item.fk_lookup?.normalized_kegunaan_obat ?? '',
      current_category_code: item.fk_lookup?.category_code ?? '',
      final_category_code: '',
      notes: '',
    }))
    .sort(
      (left, right) =>
        left.normalized_kegunaan_obat.localeCompare(
          right.normalized_kegunaan_obat
        ) || left.code.localeCompare(right.code)
    );

  const groupCsv = toCsv(
    [
      'normalized_kegunaan_obat',
      'item_count',
      'raw_kegunaan_values',
      'type_codes',
      'sample_codes',
      'sample_names',
      'final_category_code',
      'notes',
    ],
    groupRows
  );
  const itemCsv = toCsv(
    [
      'code',
      'name',
      'source_name',
      'type_code',
      'source_golongan_obat',
      'source_kegunaan_obat',
      'normalized_kegunaan_obat',
      'current_category_code',
      'final_category_code',
      'notes',
    ],
    itemRows
  );

  writeFileSync(groupOutputPath, `${groupCsv}\n`);
  writeFileSync(itemOutputPath, `${itemCsv}\n`);

  console.log(`Input file         : ${inputPath}`);
  console.log(`Missing items      : ${missingItems.length}`);
  console.log(`Missing groups     : ${groupRows.length}`);
  console.log(`Group CSV output   : ${groupOutputPath}`);
  console.log(`Item CSV output    : ${itemOutputPath}`);
};

main();
