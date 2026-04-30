#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const EXCLUDED_DIRS = new Set([
  '.agent',
  '.agents',
  '.claude',
  '.codex',
  '.gemini',
  '.git',
  '.playwright',
  '.playwright-cli',
  '.playwright-mcp',
  '.venv',
  '.yarn',
  'artifacts',
  'coverage',
  'dist',
  'dist-ssr',
  'logs',
  'node_modules',
  'output',
  'tmp',
  'traces',
]);

const EXCLUDED_FILES = new Set([
  'bun.lock',
  'output.css',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

function printHelp() {
  console.log(`convert-to-oklch

Usage:
  convert-to-oklch ./src/**/*.css
  convert-to-oklch --all
  convert-to-oklch <file-or-folder-or-glob...>

Options:
  --all          Scan all text files from the current working directory.
  -p, --precision <1-21>
                 Round OKLCH output. Default: 1.
  --dry-run      Preview changed files without writing.
  --check        Exit with code 1 when any file needs conversion. Does not write.
  --write, -w    Accepted for compatibility. Writing is the default.
  --help, -h     Show this help.

Examples:
  npx ./dev-tools/convert-to-oklch ./src/**/*.css
  npx ./dev-tools/convert-to-oklch ./src/**/*.css -p 2
  bunx --package "$PWD/dev-tools/convert-to-oklch" convert-to-oklch ./src/**/*.css`);
}

function parseArgs(argv) {
  const options = {
    all: false,
    check: false,
    dryRun: false,
    help: false,
    paths: [],
    precision: 1,
    write: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--all' || arg === 'all') {
      options.all = true;
    } else if (arg === '--write' || arg === '-w') {
      options.write = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--check') {
      options.check = true;
      options.dryRun = true;
    } else if (arg === '--precision' || arg === '-p') {
      const rawPrecision = argv[index + 1];
      if (!rawPrecision) {
        throw new Error(`${arg} requires a value from 1 to 21.`);
      }

      options.precision = parsePrecision(rawPrecision);
      index += 1;
    } else if (arg.startsWith('--precision=')) {
      options.precision = parsePrecision(arg.slice('--precision='.length));
    } else if (/^-p\d+$/.test(arg)) {
      options.precision = parsePrecision(arg.slice(2));
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.paths.push(arg);
    }
  }

  return options;
}

function parsePrecision(value) {
  const precision = Number.parseInt(value, 10);
  if (!Number.isInteger(precision) || precision < 1 || precision > 21) {
    throw new Error(`Invalid precision: ${value}. Use a value from 1 to 21.`);
  }

  return precision;
}

function isExcludedDir(dirName) {
  return EXCLUDED_DIRS.has(dirName);
}

function isExcludedFile(fileName) {
  if (fileName === '.env' || fileName.startsWith('.env.')) {
    return true;
  }

  return EXCLUDED_FILES.has(fileName);
}

async function collectFiles(targetPath, explicitFile = false) {
  const targetStat = await stat(targetPath);

  if (targetStat.isFile()) {
    return explicitFile || !isExcludedFile(path.basename(targetPath))
      ? [targetPath]
      : [];
  }

  if (!targetStat.isDirectory()) {
    return [];
  }

  const files = [];
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      if (!isExcludedDir(entry.name)) {
        files.push(...(await collectFiles(entryPath)));
      }
      continue;
    }

    if (entry.isFile() && !isExcludedFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizePathForGlob(filePath) {
  return filePath.split(path.sep).join('/');
}

function hasGlobMagic(value) {
  return /[*?[]/.test(value);
}

function getGlobBase(pattern) {
  const normalized = normalizePathForGlob(pattern);
  const magicIndex = normalized.search(/[*?[]/);
  if (magicIndex === -1) {
    return pattern;
  }

  const slashIndex = normalized.lastIndexOf('/', magicIndex);
  if (slashIndex === -1) {
    return '.';
  }

  return normalized.slice(0, slashIndex) || '/';
}

function globToRegExp(pattern) {
  const normalized = normalizePathForGlob(path.resolve(process.cwd(), pattern));
  let source = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '*') {
      if (next === '*') {
        const afterNext = normalized[index + 2];
        if (afterNext === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += /[\\^$+?.()|{}[\]]/.test(char) ? `\\${char}` : char;
  }

  return new RegExp(`${source}$`);
}

async function collectTargetFiles(target) {
  if (!hasGlobMagic(target)) {
    return collectFiles(path.resolve(process.cwd(), target), true);
  }

  const base = path.resolve(process.cwd(), getGlobBase(target));
  const matcher = globToRegExp(target);
  const candidates = await collectFiles(base);

  return candidates.filter(file => matcher.test(normalizePathForGlob(file)));
}

function isTextBuffer(buffer) {
  if (buffer.length === 0) {
    return true;
  }

  const scanLength = Math.min(buffer.length, 8192);
  for (let index = 0; index < scanLength; index += 1) {
    if (buffer[index] === 0) {
      return false;
    }
  }

  return true;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatNumber(value, digits) {
  return round(value, digits)
    .toFixed(digits)
    .replace(/\.?0+$/, '');
}

function srgbChannelToLinear(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function srgbToOklch(red, green, blue) {
  const r = srgbChannelToLinear(clamp(red, 0, 255) / 255);
  const g = srgbChannelToLinear(clamp(green, 0, 255) / 255);
  const b = srgbChannelToLinear(clamp(blue, 0, 255) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness =
    0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const labB =
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const chroma = Math.sqrt(a * a + labB * labB);
  const hue = chroma < 0.00001 ? 0 : (Math.atan2(labB, a) * 180) / Math.PI;

  return {
    chroma,
    hue: hue < 0 ? hue + 360 : hue,
    lightness,
  };
}

function formatOklch(
  red,
  green,
  blue,
  alpha = 1,
  compactWhitespace = false,
  precision = 1
) {
  const { chroma, hue, lightness } = srgbToOklch(red, green, blue);
  const lightnessPart = `${formatNumber(lightness * 100, precision)}%`;
  const chromaPart = formatNumber(chroma, precision + 2);
  const huePart = formatNumber(hue, precision);
  const separator = compactWhitespace ? '_' : ' ';
  const alphaPart =
    alpha < 1
      ? `${separator}/${separator}${formatNumber(clamp(alpha, 0, 1), 4)}`
      : '';

  return `oklch(${lightnessPart}${separator}${chromaPart}${separator}${huePart}${alphaPart})`;
}

function parseHexColor(hex) {
  const normalized = hex.toLowerCase();

  if (normalized.length === 3 || normalized.length === 4) {
    const red = Number.parseInt(normalized[0] + normalized[0], 16);
    const green = Number.parseInt(normalized[1] + normalized[1], 16);
    const blue = Number.parseInt(normalized[2] + normalized[2], 16);
    const alpha =
      normalized.length === 4
        ? Number.parseInt(normalized[3] + normalized[3], 16) / 255
        : 1;

    return { alpha, blue, green, red };
  }

  if (normalized.length === 6 || normalized.length === 8) {
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const alpha =
      normalized.length === 8
        ? Number.parseInt(normalized.slice(6, 8), 16) / 255
        : 1;

    return { alpha, blue, green, red };
  }

  return null;
}

function parseRgbChannel(value) {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percent = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percent)
      ? clamp((percent / 100) * 255, 0, 255)
      : null;
  }

  const channel = Number.parseFloat(trimmed);
  return Number.isFinite(channel) ? clamp(channel, 0, 255) : null;
}

function parseAlpha(value) {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percent = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : null;
  }

  const alpha = Number.parseFloat(trimmed);
  return Number.isFinite(alpha) ? clamp(alpha, 0, 1) : null;
}

function parseHue(value) {
  const trimmed = value.trim().toLowerCase();
  const number = Number.parseFloat(trimmed);
  if (!Number.isFinite(number)) {
    return null;
  }

  if (trimmed.endsWith('turn')) {
    return number * 360;
  }

  if (trimmed.endsWith('rad')) {
    return (number * 180) / Math.PI;
  }

  if (trimmed.endsWith('grad')) {
    return number * 0.9;
  }

  return number;
}

function parsePercentage(value) {
  const trimmed = value.trim();
  if (!trimmed.endsWith('%')) {
    return null;
  }

  const percent = Number.parseFloat(trimmed.slice(0, -1));
  return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : null;
}

function splitModernRgbBody(body) {
  const normalized = body.trim().replace(/\s*\/\s*/g, ' / ');
  const parts = normalized.split(/\s+/).filter(Boolean);
  const slashIndex = parts.indexOf('/');

  if (slashIndex === -1) {
    return parts.length === 3 ? { alpha: undefined, channels: parts } : null;
  }

  if (slashIndex !== 3 || parts.length !== 5) {
    return null;
  }

  return {
    alpha: parts[4],
    channels: parts.slice(0, 3),
  };
}

function parseRgbColor(functionName, body) {
  if (/var\(|calc\(|color-mix\(|from\b/i.test(body)) {
    return null;
  }

  const commaParts = body.split(',').map(part => part.trim());
  if (
    commaParts.length > 1 &&
    commaParts.length !== 3 &&
    commaParts.length !== 4
  ) {
    return null;
  }

  const parsed =
    commaParts.length > 1
      ? {
          alpha: commaParts.length === 4 ? commaParts[3] : undefined,
          channels: commaParts.slice(0, 3),
        }
      : splitModernRgbBody(body);

  if (!parsed || parsed.channels.length !== 3) {
    return null;
  }

  if (functionName.toLowerCase() === 'rgba' && parsed.alpha === undefined) {
    return null;
  }

  const red = parseRgbChannel(parsed.channels[0]);
  const green = parseRgbChannel(parsed.channels[1]);
  const blue = parseRgbChannel(parsed.channels[2]);
  const alpha = parsed.alpha === undefined ? 1 : parseAlpha(parsed.alpha);

  if (red === null || green === null || blue === null || alpha === null) {
    return null;
  }

  return { alpha, blue, green, red };
}

function splitModernColorBody(body) {
  const normalized = body.trim().replace(/\s*\/\s*/g, ' / ');
  const parts = normalized.split(/\s+/).filter(Boolean);
  const slashIndex = parts.indexOf('/');

  if (slashIndex === -1) {
    return parts.length === 3 ? { alpha: undefined, channels: parts } : null;
  }

  if (slashIndex !== 3 || parts.length !== 5) {
    return null;
  }

  return {
    alpha: parts[4],
    channels: parts.slice(0, 3),
  };
}

function hslToRgb(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (normalizedHue < 60) {
    red = chroma;
    green = x;
  } else if (normalizedHue < 120) {
    red = x;
    green = chroma;
  } else if (normalizedHue < 180) {
    green = chroma;
    blue = x;
  } else if (normalizedHue < 240) {
    green = x;
    blue = chroma;
  } else if (normalizedHue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    blue: (blue + match) * 255,
    green: (green + match) * 255,
    red: (red + match) * 255,
  };
}

function parseHslColor(functionName, body) {
  if (/var\(|calc\(|color-mix\(|from\b/i.test(body)) {
    return null;
  }

  const commaParts = body.split(',').map(part => part.trim());
  if (
    commaParts.length > 1 &&
    commaParts.length !== 3 &&
    commaParts.length !== 4
  ) {
    return null;
  }

  const parsed =
    commaParts.length > 1
      ? {
          alpha: commaParts.length === 4 ? commaParts[3] : undefined,
          channels: commaParts.slice(0, 3),
        }
      : splitModernColorBody(body);

  if (!parsed || parsed.channels.length !== 3) {
    return null;
  }

  if (functionName.toLowerCase() === 'hsla' && parsed.alpha === undefined) {
    return null;
  }

  const hue = parseHue(parsed.channels[0]);
  const saturation = parsePercentage(parsed.channels[1]);
  const lightness = parsePercentage(parsed.channels[2]);
  const alpha = parsed.alpha === undefined ? 1 : parseAlpha(parsed.alpha);

  if (
    hue === null ||
    saturation === null ||
    lightness === null ||
    alpha === null
  ) {
    return null;
  }

  return {
    ...hslToRgb(hue, saturation, lightness),
    alpha,
  };
}

function isInsideUrl(content, index) {
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const prefix = content.slice(lineStart, index);
  const urlIndex = prefix.toLowerCase().lastIndexOf('url(');

  if (urlIndex === -1) {
    return false;
  }

  return !prefix.slice(urlIndex).includes(')');
}

function findBracketContext(content, index) {
  const open = content.lastIndexOf('[', index);
  if (open === -1) {
    return null;
  }

  const closeBefore = content.lastIndexOf(']', index);
  if (closeBefore > open) {
    return null;
  }

  const close = content.indexOf(']', index);
  if (close === -1) {
    return null;
  }

  const segment = content.slice(open + 1, close);
  if (segment.includes('\n') || segment.includes('\r')) {
    return null;
  }

  return {
    after: content.slice(index, close),
    before: content.slice(open + 1, index),
    segment,
  };
}

function isLikelyTailwindArbitraryValue(content, index) {
  const context = findBracketContext(content, index);
  if (!context) {
    return false;
  }

  if (context.before.includes('=')) {
    return false;
  }

  return true;
}

function isLikelyAttributeSelectorHex(content, index) {
  const context = findBracketContext(content, index);
  return Boolean(context && /=[\s'"]*$/.test(context.before));
}

function isLikelyCssSelector(content, index, tokenLength) {
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const before = content.slice(lineStart, index);
  const after = content.slice(index + tokenLength);
  const nextSignificant = after.match(/^\s*[{,]/);

  return before.trim() === '' && Boolean(nextSignificant);
}

function parseFunctionalColor(functionName, body) {
  return functionName.toLowerCase().startsWith('hsl')
    ? parseHslColor(functionName, body)
    : parseRgbColor(functionName, body);
}

function replaceColors(content, precision) {
  let conversions = 0;

  const withFunctions = content.replace(
    /(?<![A-Za-z])((?:rgb|hsl)a?)\(\s*([^)]*?)\s*\)/gi,
    (match, functionName, body, offset) => {
      const color = parseFunctionalColor(functionName, body);
      if (!color || isInsideUrl(content, offset)) {
        return match;
      }

      conversions += 1;
      return formatOklch(
        color.red,
        color.green,
        color.blue,
        color.alpha,
        isLikelyTailwindArbitraryValue(content, offset),
        precision
      );
    }
  );

  const withHex = withFunctions.replace(
    /(^|[^\w-])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/g,
    (match, prefix, hex, offset) => {
      const colorIndex = offset + prefix.length;
      const color = parseHexColor(hex);

      if (
        !color ||
        isInsideUrl(withFunctions, colorIndex) ||
        isLikelyAttributeSelectorHex(withFunctions, colorIndex) ||
        isLikelyCssSelector(withFunctions, colorIndex, hex.length + 1)
      ) {
        return match;
      }

      conversions += 1;
      return `${prefix}${formatOklch(
        color.red,
        color.green,
        color.blue,
        color.alpha,
        isLikelyTailwindArbitraryValue(withFunctions, colorIndex),
        precision
      )}`;
    }
  );

  return {
    content: withHex,
    conversions,
  };
}

async function processFile(filePath, options) {
  const buffer = await readFile(filePath);
  if (!isTextBuffer(buffer)) {
    return { changed: false, conversions: 0, skippedBinary: true };
  }

  const original = buffer.toString('utf8');
  const result = replaceColors(original, options.precision);
  const changed = result.content !== original;

  if (changed && !options.dryRun) {
    await writeFile(filePath, result.content);
  }

  return {
    changed,
    conversions: result.conversions,
    skippedBinary: false,
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printHelp();
    process.exit(2);
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.all && options.paths.length === 0) {
    printHelp();
    process.exit(2);
  }

  const targets = options.all
    ? [process.cwd(), ...options.paths]
    : options.paths;
  const files = new Set();

  for (const target of targets) {
    const collected =
      options.all && target === process.cwd()
        ? await collectFiles(target)
        : await collectTargetFiles(target);

    if (collected.length === 0 && hasGlobMagic(target)) {
      console.warn(`No files matched: ${target}`);
    }

    for (const file of collected) {
      files.add(file);
    }
  }

  let changedFiles = 0;
  let totalConversions = 0;

  for (const file of [...files].sort()) {
    const result = await processFile(file, options);
    if (!result.changed) {
      continue;
    }

    changedFiles += 1;
    totalConversions += result.conversions;
    console.log(
      `${options.dryRun ? 'would update' : 'updated'} ${path.relative(process.cwd(), file)} (${result.conversions})`
    );
  }

  const mode = options.dryRun ? 'dry-run' : 'write';
  console.log(
    `${mode}: ${changedFiles} file(s), ${totalConversions} conversion(s)`
  );

  if (options.check && changedFiles > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
