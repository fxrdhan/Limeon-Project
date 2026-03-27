/// <reference types="node" />

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SeedItem = {
  barcode: string | null;
  base_price: number;
  base_unit: string | null;
  category_id: string | null;
  code: string;
  description: string | null;
  dosage_id: string | null;
  measurement_denominator_unit_id?: string | null;
  measurement_denominator_value?: number | null;
  measurement_unit_id?: string | null;
  measurement_value?: number | null;
  fk_lookup: {
    category_code: string;
    dosage_code?: string;
    dosage_name?: string;
    manufacturer_code?: string;
    manufacturer_name: string;
    measurement_denominator_unit_code?: string;
    measurement_denominator_unit_name?: string;
    measurement_unit_code?: string;
    measurement_unit_name?: string;
    package_code: string;
    source_manufacturer_name?: string;
    source_name?: string;
    type_code: string;
  };
  has_expiry_date: boolean;
  image_urls: string[];
  is_active: boolean;
  is_level_pricing_active: boolean;
  is_medicine: boolean;
  manufacturer_id: string | null;
  min_stock: number;
  name: string;
  package_conversions: unknown[];
  package_id: string | null;
  rack: string | null;
  sell_price: number;
  stock: number;
  type_id: string | null;
};

type SeedFile = {
  source: {
    file_name: string;
    generated_at: string;
    normalized_at?: string;
    row_count: number;
    target_table: string;
    schema_mode: string;
    notes: string[];
  };
  items: SeedItem[];
};

type DosageGuess = {
  code: string;
  name: string;
  priority: number;
  stripPatterns: RegExp[];
};

type MeasurementGuess = {
  denominatorUnitCode?: string;
  denominatorUnitName?: string;
  denominatorValue?: number;
  unitCode: string;
  unitName: string;
  value: number;
};

const DEFAULT_OUTPUT = path.resolve(
  '/home/fxrdhan/Downloads/item-master-seed.json'
);
const DEFAULT_INPUT = existsSync(DEFAULT_OUTPUT)
  ? DEFAULT_OUTPUT
  : path.resolve('/home/fxrdhan/Downloads/item-master-seed.raw.json');

const GENERIC_PATTERNS = [
  /\((?:GENERIK|GENERIC)\)/gi,
  /\b(?:GENERIK|GENERIC|OGB|DOEN)\b/gi,
];

const PACK_COUNT_PATTERNS = [
  /@\s*\d+(?:[.,]\d+)?\s*[A-Z]+/gi,
  /\b\d+\s*(?:TAB(?:LET)?|KAPLET|CAPSULE?|KAPSUL|BOTOL|BTL|AMP(?:OULE)?|VIAL|SACHET|SASET|STRIP|BOX|PACK|PCS)\b/gi,
  /\b\d+\s*'?S\b/gi,
];

const MEASUREMENT_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s*(?:MG|MCG|G|KG|ML|L|IU|UCI)\s*\/\s*\d+(?:[.,]\d+)?\s*(?:MG|MCG|G|KG|ML|L|IU|UCI)\b/gi,
  /\b\d+(?:[.,]\d+)?\s*(?:MG|MCG|G|KG|ML|L|IU|UCI)\b/gi,
];

const MEASUREMENT_UNITS = {
  g: {
    code: 'g',
    name: 'GRAM',
  },
  iu: {
    code: 'IU',
    name: 'INTERNATIONAL UNITS',
  },
  kg: {
    code: 'kg',
    name: 'KILOGRAM',
  },
  l: {
    code: 'L',
    name: 'LITER',
  },
  mcg: {
    code: 'mcg',
    name: 'MICROGRAM',
  },
  mg: {
    code: 'mg',
    name: 'MILLIGRAM',
  },
  ml: {
    code: 'mL',
    name: 'MILLILITER',
  },
  uci: {
    code: 'uCI',
    name: 'MICROCURIE',
  },
} as const;

const DOSAGE_RULES: Array<{
  code: string;
  name: string;
  priority: number;
  patterns: RegExp[];
  extraStripPatterns?: RegExp[];
}> = [
  {
    code: 'PFU',
    name: 'POWDER, FOR SUSPENSION',
    priority: 100,
    patterns: [
      /\bFDS\b/gi,
      /\bDS\b/gi,
      /\bDRY\s+SYR(?:UP)?\b/gi,
      /\bSIRUP\s+KERING\b/gi,
    ],
  },
  {
    code: 'TFC',
    name: 'TABLET, FILM COATED',
    priority: 95,
    patterns: [/\bSALUT\s+SELAPUT\b/gi, /\bFILM\s+COATED\b/gi, /\bFC\.?\b/gi],
    extraStripPatterns: [
      /\bTABLET\b/gi,
      /\bTAB\b/gi,
      /\bKAPLET\b/gi,
      /\bCAPLET\b/gi,
    ],
  },
  {
    code: 'TCH',
    name: 'TABLET, CHEWABLE',
    priority: 94,
    patterns: [/\bKUNYAH\b/gi, /\bCHEWABLE\b/gi],
  },
  {
    code: 'TEF',
    name: 'TABLET, EFFERVESCENT',
    priority: 93,
    patterns: [/\bEFFERVESCENT\b/gi],
  },
  {
    code: 'INJ',
    name: 'INJECTION',
    priority: 90,
    patterns: [/\bINJEKSI\b/gi, /\bINJ\.?\b/gi, /\bINFUS\b/gi],
  },
  {
    code: 'SDP',
    name: 'SOLUTION/ DROPS',
    priority: 85,
    patterns: [/\bDROPS?\b/gi, /\bDROP\b/gi],
  },
  {
    code: 'SYR',
    name: 'SYRUP',
    priority: 84,
    patterns: [/\bSYRUP\b/gi, /\bSIRUP\b/gi, /\bSYR\b/gi],
  },
  {
    code: 'SUS',
    name: 'SUSPENSION',
    priority: 83,
    patterns: [/\bSUSPENSI\b/gi, /\bSUSP\b/gi],
  },
  {
    code: 'CAP',
    name: 'CAPSULE',
    priority: 82,
    patterns: [
      /\bKAPSUL\b/gi,
      /\bCAPSUL\b/gi,
      /\bCAPSULE\b/gi,
      /\bCAPS\b/gi,
      /\bSOFTGEL\b/gi,
      /\bLICAPS\b/gi,
      /\bCAP\b/gi,
      /\bKAP\b/gi,
    ],
  },
  {
    code: 'TAB',
    name: 'TABLET',
    priority: 81,
    patterns: [
      /\bTABLETS?\b/gi,
      /\bTABS?\b/gi,
      /\bTAB\b/gi,
      /\bKAPLET\b/gi,
      /\bCAPLET\b/gi,
    ],
  },
  {
    code: 'CRM',
    name: 'CREAM',
    priority: 80,
    patterns: [/\bCREAM\b/gi, /\bKRIM\b/gi],
  },
  {
    code: 'GEL',
    name: 'GEL',
    priority: 79,
    patterns: [/\bGEL\b/gi],
  },
  {
    code: 'OIN',
    name: 'OINTMENT',
    priority: 78,
    patterns: [/\bOINTMENT\b/gi, /\bSALEP\b/gi],
  },
  {
    code: 'ELX',
    name: 'ELIXIR',
    priority: 77,
    patterns: [/\bELIXIR\b/gi],
  },
  {
    code: 'EMU',
    name: 'EMULSION',
    priority: 76,
    patterns: [/\bEMULSION\b/gi],
  },
  {
    code: 'POW',
    name: 'POWDER',
    priority: 75,
    patterns: [/\bPOWDER\b/gi, /\bSERBUK\b/gi],
  },
  {
    code: 'GRN',
    name: 'GRANULE',
    priority: 74,
    patterns: [/\bGRANULE\b/gi],
  },
  {
    code: 'LOZ',
    name: 'LOZENGE',
    priority: 73,
    patterns: [/\bLOZENGE\b/gi, /\bLOZ\b/gi],
  },
  {
    code: 'SOL',
    name: 'SOLUTION',
    priority: 72,
    patterns: [/\bSOLUTION\b/gi, /\bSOL\b/gi, /\bKONS\b/gi],
  },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  let inputPath = DEFAULT_INPUT;
  let outputPath = DEFAULT_OUTPUT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input') {
      inputPath = path.resolve(args[index + 1] ?? DEFAULT_INPUT);
      index += 1;
      continue;
    }

    if (arg === '--output') {
      outputPath = path.resolve(args[index + 1] ?? DEFAULT_OUTPUT);
      index += 1;
      continue;
    }
  }

  return {
    help: args.includes('--help') || args.includes('-h'),
    inputPath,
    outputPath,
  };
};

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (word === 'PT') {
        return 'PT';
      }

      if (/^\(.+\)$/.test(word)) {
        const inner = word.slice(1, -1);
        if (/^[A-Z0-9&-]{2,}$/.test(inner)) {
          return `(${inner})`;
        }

        return `(${inner[0]?.toUpperCase() ?? ''}${inner.slice(1).toLowerCase()})`;
      }

      return `${word[0]?.toUpperCase() ?? ''}${word.slice(1).toLowerCase()}`;
    })
    .join(' ');

const normalizeManufacturerName = (value: string): string =>
  toTitleCase(
    normalizeWhitespace(value)
      .toUpperCase()
      .replace(/\bPT\.?\s*/g, 'PT ')
      .replace(/\bIND\b/g, 'Indonesia')
      .replace(/\bPT\s+GRACIA\s+PH\b/g, 'PT Gracia Pharmindo')
      .replace(/\bPT\s+GRACIA\s+PHARMINDO\b/g, 'PT Gracia Pharmindo')
      .replace(/\bPT\s+GUARDIAN\s+PH\b/g, 'PT Guardian Pharmatama')
      .replace(/\bPT\s+LAPI\b(?!\s+LABORATORIES)\b/g, 'PT Lapi Laboratories')
      .replace(/\bPT\s+MEDI\s+HOP\b/g, 'PT Medihop')
      .replace(/\s+\(CHD\)\b/g, '')
      .replace(/\bOTC\b/g, '')
      .replace(/\.(?=\s|$|\))/g, '')
      .replace(/\s+\)/g, ')')
      .replace(/\(\s+/g, '(')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
    .replace(/\s*\(CHD\)/g, '')
    .replace(/\bPT\.?\s*/g, 'PT ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const manufacturerTokens = (value: string): string[] =>
  value
    .replace(/^PT\s+/i, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const firstThreeLetters = (token: string): string => token.slice(0, 3);

const consonantCode = (token: string): string => {
  const letters = token.replace(/[^A-Z]/g, '');
  const consonants = letters.replace(/[AEIOU]/g, '');
  const source = consonants.length >= 3 ? consonants : letters;
  return source.slice(0, 3);
};

const uniqueCandidateCodes = (name: string): string[] => {
  const tokens = manufacturerTokens(name);
  const [first = '', second = '', third = ''] = tokens;
  const candidates = [
    firstThreeLetters(first),
    `${first[0] ?? ''}${second[0] ?? ''}${third[0] ?? ''}`,
    `${first[0] ?? ''}${second.slice(0, 2) ?? ''}`,
    `${first.slice(0, 2) ?? ''}${second[0] ?? ''}`,
    `${first[0] ?? ''}${second[0] ?? ''}${second[1] ?? ''}`,
    `${first[0] ?? ''}${second[0] ?? ''}${third[0] ?? ''}`,
    consonantCode(first),
    `${first[0] ?? ''}${first[1] ?? ''}${third[0] ?? ''}`,
    `${first[0] ?? ''}${third[0] ?? ''}${third[1] ?? ''}`,
  ]
    .map(candidate => candidate.replace(/[^A-Z]/g, '').slice(0, 3))
    .filter(candidate => candidate.length === 3);

  return [...new Set(candidates)];
};

const buildManufacturerCodeMap = (names: string[]): Map<string, string> => {
  const used = new Set<string>();
  const map = new Map<string, string>();

  for (const name of [...names].sort()) {
    const candidates = uniqueCandidateCodes(name);
    let selected =
      candidates.find(candidate => !used.has(candidate)) ?? undefined;

    if (!selected) {
      const tokenLetters = manufacturerTokens(name).join('');

      for (let index = 0; index <= tokenLetters.length - 3; index += 1) {
        const candidate = tokenLetters.slice(index, index + 3);
        if (candidate.length === 3 && !used.has(candidate)) {
          selected = candidate;
          break;
        }
      }
    }

    if (!selected) {
      throw new Error(
        `Unable to generate unique 3-letter manufacturer code for ${name}`
      );
    }

    used.add(selected);
    map.set(name, selected);
  }

  return map;
};

const cleanupDelimiters = (value: string): string =>
  value
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+([,/.-])/g, '$1')
    .replace(/([(/-])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/[.,/-]+$/g, '')
    .trim();

const shouldStripLeadingSkuToken = (token: string): boolean => {
  if (/^\d{5,}$/.test(token)) {
    return true;
  }

  return (
    /^\d/.test(token) &&
    token.length >= 6 &&
    /[A-Za-z]/.test(token) &&
    /\d/.test(token)
  );
};

const normalizeSourceProductName = (sourceName: string): string => {
  let nextName = normalizeWhitespace(sourceName)
    .replace(/Â®/g, '')
    .replace(/®/g, '')
    .replace(/\b0NE\b/gi, 'ONE');

  const [firstToken = ''] = nextName.split(' ');

  if (shouldStripLeadingSkuToken(firstToken)) {
    nextName = nextName.slice(firstToken.length).trim();
  }

  nextName = nextName
    .replace(/\s*-\s*e-?cat\b/gi, ' ')
    .replace(/\be-?cat\b/gi, ' ')
    .replace(/([A-Za-z])\.(?=\d)/g, '$1 ')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(
      /\b(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)\b/gi,
      '$1 x $2 $3'
    )
    .replace(/\b(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\b/gi, '$1 x $2')
    .replace(/\bFG\.?\s*(\d+(?:[.,]\d+)?)\b/gi, 'FG $1')
    .replace(/\bCH\.?\s*(\d+(?:[.,]\d+)?)\b/gi, 'CH $1')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|cc|gr|gsm|kg|lt)\b/gi, '$1 $2')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(pcs)\b/gi, '$1 $2')
    .replace(/\b3WAY\b/gi, '3-WAY')
    .replace(/\bW\/O\b/gi, 'w/o')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (/\bNBC\b/i.test(sourceName) && !/^NBC\b/i.test(nextName)) {
    nextName = `NBC ${nextName}`.trim();
  }

  return cleanupDelimiters(nextName.replace(/\bNBC\b$/i, '').trim());
};

const normalizeRelianceName = (sourceName: string): string | null => {
  const normalizedSource = normalizeWhitespace(sourceName)
    .replace(/Â®/g, '')
    .replace(/®/g, '');

  if (!/\bRELIANCE\b/i.test(normalizedSource)) {
    return null;
  }

  return cleanupDelimiters(
    normalizedSource
      .replace(/^\S+\s+(?=(?:AHLSTROM\s+)?RELIANCE\b)/i, '')
      .replace(/\bAHLSTROM\b/gi, 'Ahlstrom')
      .replace(/\bRELIANCE\b/gi, 'Reliance')
      .replace(/\bSMS\b/gi, 'SMS')
      .replace(/\bCREPE\b/gi, 'Crepe')
      .replace(/\bTANDEM\b/gi, 'Tandem')
      .replace(/\bGREEN\b/gi, 'Green')
      .replace(/\bBLUE\b/gi, 'Blue')
      .replace(/\b(\d+)\s*cm\s*x\s*(\d+)\s*cm\b/gi, '$1 x $2 cm')
      .replace(/\b(\d+)\s*cmx\s*(\d+)\s*cm\b/gi, '$1 x $2 cm')
      .replace(/\b(\d+)\s*[xX]\s*(\d+)\s*cm\b/gi, '$1 x $2 cm')
      .replace(/\b(\d+)\s*[xX]\s*(\d+)\b/gi, '$1 x $2')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
};

const formatName = (value: string): string => {
  const lowerWords = new Set(['mg', 'mcg', 'ml', 'gr', 'g', 'iu', 'ui']);
  const upperWords = new Map([
    ['bpjs', 'BPJS'],
    ['ch', 'CH'],
    ['da', 'DA'],
    ['fg', 'FG'],
    ['hcg', 'HCG'],
    ['hiv', 'HIV'],
    ['iv', 'IV'],
    ['nbc', 'NBC'],
    ['pu', 'PU'],
    ['rc', 'RC'],
    ['sg', 'SG'],
    ['sms', 'SMS'],
    ['sp', 'SP'],
    ['tc', 'TC'],
    ['tp', 'TP'],
    ['xc', 'XC'],
  ]);
  const formatAlphaWord = (word: string): string =>
    word
      .split('-')
      .map(segment => {
        if (!segment) {
          return segment;
        }

        const lower = segment.toLowerCase();

        if (upperWords.has(lower)) {
          return upperWords.get(lower) ?? segment;
        }

        if (lowerWords.has(lower)) {
          return lower;
        }

        return `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1).toLowerCase()}`;
      })
      .join('-');

  return cleanupDelimiters(normalizeWhitespace(value))
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();

      if (upperWords.has(lower)) {
        return upperWords.get(lower) ?? word;
      }

      if (lowerWords.has(lower)) {
        return lower;
      }

      if (/\d/.test(word)) {
        return word.replace(
          /[A-Za-z]+/g,
          match =>
            upperWords.get(match.toLowerCase()) ??
            (lowerWords.has(match.toLowerCase())
              ? match.toLowerCase()
              : `${match[0].toUpperCase()}${match.slice(1).toLowerCase()}`)
        );
      }

      return formatAlphaWord(word);
    })
    .join(' ')
    .replace(/\bI-face\b/g, 'I-Face')
    .replace(/\bW\/o\b/g, 'w/o')
    .replace(/\bCc\b/g, 'cc')
    .replace(/\bCm\b/g, 'cm')
    .replace(/\bGsm\b/g, 'gsm')
    .replace(/\bGr\b/g, 'gr')
    .replace(/\bKg\b/g, 'kg')
    .replace(/\bLt\b/g, 'L')
    .replace(/\bMm\b/g, 'mm')
    .replace(/\bMl\b/g, 'mL')
    .replace(/\b([A-Za-z]+-\d)\s+([A-Za-z]{2,})\b/g, '$1$2');
};

const findDosageGuess = (sourceName: string): DosageGuess | null => {
  let bestGuess: DosageGuess | null = null;

  for (const rule of DOSAGE_RULES) {
    const matchedPatterns = rule.patterns.filter(pattern => {
      const testPattern = new RegExp(pattern.source, pattern.flags);
      return testPattern.test(sourceName);
    });

    if (!matchedPatterns.length) {
      continue;
    }

    if (!bestGuess || rule.priority > bestGuess.priority) {
      bestGuess = {
        code: rule.code,
        name: rule.name,
        priority: rule.priority,
        stripPatterns: [
          ...matchedPatterns.map(
            pattern => new RegExp(pattern.source, pattern.flags)
          ),
          ...(rule.extraStripPatterns ?? []).map(
            pattern => new RegExp(pattern.source, pattern.flags)
          ),
        ],
      };
    } else if (bestGuess && rule.priority === bestGuess.priority) {
      bestGuess.stripPatterns.push(
        ...matchedPatterns.map(
          pattern => new RegExp(pattern.source, pattern.flags)
        ),
        ...(rule.extraStripPatterns ?? []).map(
          pattern => new RegExp(pattern.source, pattern.flags)
        )
      );
    }
  }

  return bestGuess;
};

const stripPatterns = (value: string, patterns: RegExp[]): string =>
  patterns.reduce((current, pattern) => current.replace(pattern, ' '), value);

const cleanupName = (sourceName: string, guess: DosageGuess | null): string => {
  let nextName = sourceName;

  nextName = stripPatterns(nextName, GENERIC_PATTERNS);

  if (guess) {
    nextName = stripPatterns(nextName, guess.stripPatterns);
  }

  nextName = stripPatterns(nextName, PACK_COUNT_PATTERNS);
  nextName = stripPatterns(nextName, MEASUREMENT_PATTERNS);

  nextName = nextName
    .replace(
      /\b(?:BOX|BTL|BOTOL|STRIP|BLISTER|PACK|PCS|AMP(?:OULE)?|VIAL)\b/gi,
      ' '
    )
    .replace(/\b(?:FORTE)\b/gi, ' ')
    .replace(/@\s*\d+\s*'?S\b/gi, ' ')
    .replace(/@\s*\d+/g, ' ')
    .replace(/\s*@\s*/g, ' ')
    .replace(
      /\b\d+\s*(?:ML|MG|MCG|GR|G)\s*\/\s*\d+\s*(?:ML|MG|MCG|GR|G)\b/gi,
      match => normalizeWhitespace(match)
    )
    .replace(/[()]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (
    /\b\d+\s*(?:TABLETS?|TABS?|TAB|KAPLET|CAPS?|CAPSULE|CAPSUL|KAPSUL)\b$/i.test(
      sourceName
    )
  ) {
    nextName = nextName.replace(/\b\d+\b$/g, '').trim();
  }

  return cleanupDelimiters(nextName);
};

const ensureFallbackName = (
  cleanedName: string,
  sourceName: string,
  guess: DosageGuess | null
): string => {
  if (cleanedName) {
    return cleanedName;
  }

  if (!guess) {
    return sourceName;
  }

  return cleanupDelimiters(
    stripPatterns(sourceName, GENERIC_PATTERNS)
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
};

const parseMeasurementValue = (value: string): number =>
  Number.parseFloat(value.replace(',', '.'));

const resolveMeasurementUnit = (value: string) =>
  MEASUREMENT_UNITS[value.toLowerCase() as keyof typeof MEASUREMENT_UNITS] ??
  null;

const findMeasurementGuess = (sourceName: string): MeasurementGuess | null => {
  const ratioMatch = sourceName.match(
    /\b(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|kg|ml|l|iu|uci)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|kg|ml|l|iu|uci)\b/i
  );

  if (ratioMatch) {
    const numeratorUnit = resolveMeasurementUnit(ratioMatch[2]);
    const denominatorUnit = resolveMeasurementUnit(ratioMatch[4]);

    if (numeratorUnit && denominatorUnit) {
      return {
        value: parseMeasurementValue(ratioMatch[1]),
        unitCode: numeratorUnit.code,
        unitName: numeratorUnit.name,
        denominatorValue: parseMeasurementValue(ratioMatch[3]),
        denominatorUnitCode: denominatorUnit.code,
        denominatorUnitName: denominatorUnit.name,
      };
    }
  }

  const simpleMatch = sourceName.match(
    /\b(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|kg|ml|l|iu|uci)\b/i
  );

  if (!simpleMatch) {
    return null;
  }

  const unit = resolveMeasurementUnit(simpleMatch[2]);

  if (!unit) {
    return null;
  }

  return {
    value: parseMeasurementValue(simpleMatch[1]),
    unitCode: unit.code,
    unitName: unit.name,
  };
};

const main = () => {
  const { help, inputPath, outputPath } = parseArgs();

  if (help) {
    console.log(
      `Usage: bun run normalize:item-master:seed [--input <path>] [--output <path>]`
    );
    console.log(`Default input : ${DEFAULT_INPUT}`);
    console.log(`Default output: ${DEFAULT_OUTPUT}`);
    return;
  }

  const source = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;

  const dosageCounts = new Map<string, number>();
  const measurementCounts = new Map<string, number>();
  let changedNames = 0;
  let guessedDosages = 0;
  let changedManufacturers = 0;
  let guessedMeasurements = 0;
  const normalizedManufacturerNames = [
    ...new Set(
      source.items.map(item =>
        normalizeManufacturerName(item.fk_lookup.manufacturer_name)
      )
    ),
  ];
  const manufacturerCodeMap = buildManufacturerCodeMap(
    normalizedManufacturerNames
  );

  const normalizedItems = source.items.map(item => {
    const sourceName = normalizeWhitespace(
      item.fk_lookup.source_name ?? item.name
    );
    const normalizedSourceName = normalizeSourceProductName(sourceName);
    const sourceManufacturerName = normalizeWhitespace(
      item.fk_lookup.source_manufacturer_name ??
        item.fk_lookup.manufacturer_name
    );
    const normalizedManufacturerName = normalizeManufacturerName(
      sourceManufacturerName
    );
    const guess = findDosageGuess(normalizedSourceName);
    const measurementGuess = findMeasurementGuess(sourceName);
    const relianceName = normalizeRelianceName(sourceName);
    const cleanedName = ensureFallbackName(
      cleanupName(normalizedSourceName, guess),
      normalizedSourceName,
      guess
    );
    const formattedName = relianceName ?? formatName(cleanedName);

    if (formattedName !== sourceName) {
      changedNames += 1;
    }

    if (normalizedManufacturerName !== sourceManufacturerName) {
      changedManufacturers += 1;
    }

    if (guess) {
      guessedDosages += 1;
      dosageCounts.set(guess.code, (dosageCounts.get(guess.code) || 0) + 1);
    }

    if (measurementGuess) {
      guessedMeasurements += 1;
      measurementCounts.set(
        measurementGuess.unitCode,
        (measurementCounts.get(measurementGuess.unitCode) || 0) + 1
      );
    }

    return {
      ...item,
      measurement_denominator_unit_id: null,
      measurement_denominator_value: measurementGuess?.denominatorValue ?? null,
      measurement_unit_id: null,
      measurement_value: measurementGuess?.value ?? null,
      name: formattedName,
      fk_lookup: {
        ...item.fk_lookup,
        manufacturer_code: manufacturerCodeMap.get(normalizedManufacturerName),
        manufacturer_name: normalizedManufacturerName,
        measurement_denominator_unit_code:
          measurementGuess?.denominatorUnitCode,
        measurement_denominator_unit_name:
          measurementGuess?.denominatorUnitName,
        measurement_unit_code: measurementGuess?.unitCode,
        measurement_unit_name: measurementGuess?.unitName,
        dosage_code: guess?.code,
        dosage_name: guess?.name,
        source_manufacturer_name: sourceManufacturerName,
        source_name: sourceName,
      },
    };
  });

  const normalizedSource: SeedFile = {
    source: {
      ...source.source,
      normalized_at: new Date().toISOString(),
      schema_mode:
        'public.items insert columns + fk_lookup helper + normalized name/dosage',
      notes: [
        ...source.source.notes.filter(
          note =>
            !note.includes('Resolve category_id and type_id') &&
            !note.includes('Resolve manufacturer_id') &&
            !note.includes('Resolve package_id')
        ),
        'Resolve manufacturer_id from fk_lookup.manufacturer_name via item_manufacturers.name.',
        'Resolve item_manufacturers.code from fk_lookup.manufacturer_code when seeding manufacturer master data.',
        'Resolve package_id from fk_lookup.package_code via item_packages.code.',
        'Resolve dosage_id from fk_lookup.dosage_code via item_dosages.code when available.',
        'Resolve measurement_unit_id from fk_lookup.measurement_unit_code via item_units.code when available.',
        'Resolve measurement_denominator_unit_id from fk_lookup.measurement_denominator_unit_code via item_units.code when available.',
        'Resolve category_id and type_id from fk_lookup.category_code and fk_lookup.type_code.',
        'name is normalized to remove packaging, dosage-form, and measurement tokens while preserving original source_name.',
        'measurement_value and measurement_unit fields are inferred from source_name when values like 500 mg, 100 mL, or 125 mg/5 mL are present.',
        'manufacturer_name is normalized to a canonical company name without punctuation drift.',
        'Original source product text is preserved in fk_lookup.source_name.',
        'Original source manufacturer text is preserved in fk_lookup.source_manufacturer_name.',
      ],
    },
    items: normalizedItems,
  };

  writeFileSync(outputPath, `${JSON.stringify(normalizedSource, null, 2)}\n`);

  const topDosages = [...dosageCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, 10);
  const topMeasurements = [...measurementCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, 10);

  console.log(`Input file      : ${inputPath}`);
  console.log(`Output file     : ${outputPath}`);
  console.log(`Total items     : ${normalizedItems.length}`);
  console.log(`Names changed   : ${changedNames}`);
  console.log(`Mfrs changed    : ${changedManufacturers}`);
  console.log(`Dosage inferred : ${guessedDosages}`);
  console.log(`Measure inferred: ${guessedMeasurements}`);
  console.log(
    `Top dosage codes: ${topDosages.map(([code, count]) => `${code}=${count}`).join(', ')}`
  );
  console.log(
    `Top measure code: ${topMeasurements.map(([code, count]) => `${code}=${count}`).join(', ')}`
  );
};

main();
