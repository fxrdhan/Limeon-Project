#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';

interface FileStats {
  file: string;
  extension: string;
  lines: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  language: string;
}

interface LanguageStats {
  language: string;
  totalLines: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  fileCount: number;
  files: FileStats[];
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'Other',
  jsx: 'Other',
  sql: 'Other',
  json: 'Other',
  css: 'CSS',
  html: 'HTML',
  md: 'Other',
  yml: 'Other',
  yaml: 'Other',
  toml: 'Other',
  gitignore: 'Other',
  example: 'Other',
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: COLORS.cyan,
  Other: COLORS.gray,
};

function getGitTrackedFiles(): string[] {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output
      .trim()
      .split('\n')
      .filter(file => file.length > 0)
      .filter(file => !shouldExcludeFile(file));
  } catch (error) {
    console.error('Error getting git tracked files:', error);
    process.exit(1);
  }
}

function shouldExcludeFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const extension = getFileExtension(fileName);

  // Exclude binary files
  const binaryExtensions = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'ico',
    'woff',
    'woff2',
    'ttf',
    'eot',
  ];
  if (binaryExtensions.includes(extension)) {
    return true;
  }

  // Exclude documentation files
  if (
    fileName.toLowerCase().includes('readme') ||
    fileName.toLowerCase().includes('changelog')
  ) {
    return true;
  }

  // Exclude config files
  const configExtensions = ['json', 'yml', 'yaml', 'toml', 'ini'];
  const configFiles = [
    '.gitignore',
    '.prettierignore',
    '.prettierrc',
    '.swcrc',
    '.yarnrc.yml',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'eslint.config.ts',
    'postcss.config.js',
    'tailwind.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    '.env.example',
    '.mcp.json.example',
  ];

  if (
    configExtensions.includes(extension) ||
    configFiles.some(config => fileName === config || filePath.endsWith(config))
  ) {
    return true;
  }

  // Exclude dotfiles and config directories
  if (fileName.startsWith('.') && extension !== 'ts' && extension !== 'tsx') {
    return true;
  }

  return false;
}

function analyzeLines(filePath: string): {
  total: number;
  code: number;
  blank: number;
  comment: number;
} {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const extension = getFileExtension(filePath);

    let codeLines = 0;
    let blankLines = 0;
    let commentLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        blankLines++;
      } else if (isCommentLine(trimmed, extension)) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    return {
      total: lines.length,
      code: codeLines,
      blank: blankLines,
      comment: commentLines,
    };
  } catch {
    return { total: 0, code: 0, blank: 0, comment: 0 };
  }
}

function isCommentLine(line: string, extension: string): boolean {
  // TypeScript/JavaScript style comments
  if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
    return (
      line.startsWith('//') ||
      line.startsWith('/*') ||
      line.startsWith('*') ||
      line.endsWith('*/')
    );
  }

  // CSS style comments
  if (['css'].includes(extension)) {
    return line.startsWith('/*') || line.startsWith('*') || line.endsWith('*/');
  }

  // HTML style comments
  if (['html'].includes(extension)) {
    return line.includes('<!--') || line.includes('-->');
  }

  return false;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return 'no-ext';
  return fileName.substring(lastDot + 1).toLowerCase();
}

function getLanguage(extension: string): string {
  return LANGUAGE_MAP[extension] || 'Other';
}

function createProgressBar(
  current: number,
  total: number,
  width: number = 40
): string {
  const percentage = total === 0 ? 0 : current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function main() {
  console.log(
    `${COLORS.bright}${COLORS.cyan}📊 Lines of Code Statistics${COLORS.reset}\n`
  );

  const files = getGitTrackedFiles();
  const fileStats: FileStats[] = [];

  for (const file of files) {
    const extension = getFileExtension(file);
    const language = getLanguage(extension);
    const lineStats = analyzeLines(file);

    fileStats.push({
      file,
      extension,
      lines: lineStats.total,
      codeLines: lineStats.code,
      blankLines: lineStats.blank,
      commentLines: lineStats.comment,
      language,
    });
  }

  // Group by language
  const languageMap = new Map<string, LanguageStats>();

  for (const fileStat of fileStats) {
    if (!languageMap.has(fileStat.language)) {
      languageMap.set(fileStat.language, {
        language: fileStat.language,
        totalLines: 0,
        codeLines: 0,
        blankLines: 0,
        commentLines: 0,
        fileCount: 0,
        files: [],
      });
    }

    const langStat = languageMap.get(fileStat.language)!;
    langStat.totalLines += fileStat.lines;
    langStat.codeLines += fileStat.codeLines;
    langStat.blankLines += fileStat.blankLines;
    langStat.commentLines += fileStat.commentLines;
    langStat.fileCount++;
    langStat.files.push(fileStat);
  }

  const languageStats = Array.from(languageMap.values()).sort(
    (a, b) => b.codeLines - a.codeLines
  );

  const totalLines = languageStats.reduce(
    (sum, lang) => sum + lang.totalLines,
    0
  );
  const totalCodeLines = languageStats.reduce(
    (sum, lang) => sum + lang.codeLines,
    0
  );
  const totalBlankLines = languageStats.reduce(
    (sum, lang) => sum + lang.blankLines,
    0
  );
  const totalCommentLines = languageStats.reduce(
    (sum, lang) => sum + lang.commentLines,
    0
  );
  const totalFiles = fileStats.length;

  // Display summary
  console.log(`${COLORS.bright}Summary${COLORS.reset}`);
  console.log(`${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
  console.log(
    `Total Files: ${COLORS.bright}${formatNumber(totalFiles)}${COLORS.reset}`
  );
  console.log(
    `Total Lines: ${COLORS.bright}${formatNumber(totalLines)}${COLORS.reset}`
  );
  console.log(
    `Blank Lines: ${COLORS.bright}${formatNumber(totalBlankLines)}${COLORS.reset}`
  );
  console.log(
    `Comment Lines: ${COLORS.bright}${formatNumber(totalCommentLines)}${COLORS.reset}`
  );
  console.log(
    `Lines of Code: ${COLORS.bright}${formatNumber(totalCodeLines)}${COLORS.reset}\n`
  );

  // Display language breakdown
  console.log(`${COLORS.bright}Languages ${COLORS.reset}`);
  console.log(`${COLORS.gray}${'─'.repeat(80)}${COLORS.reset}`);

  const displayStats = languageStats.filter(lang => lang.codeLines > 0);

  for (const langStat of displayStats) {
    const color = LANGUAGE_COLORS[langStat.language] || COLORS.white;
    const percentage = ((langStat.codeLines / totalCodeLines) * 100).toFixed(1);
    const bar = createProgressBar(langStat.codeLines, totalCodeLines, 30);

    console.log(
      `${color}${langStat.language.padEnd(15)}${COLORS.reset} ` +
        `${color}${bar}${COLORS.reset} ` +
        `${COLORS.bright}${formatNumber(langStat.codeLines).padStart(8)}${COLORS.reset} lines ` +
        `${COLORS.gray}(${percentage}%) ${langStat.fileCount} files${COLORS.reset}`
    );
  }

  console.log();

  console.log(
    `\n${COLORS.gray}Generated by LOC Stats • ${new Date().toLocaleString()}${COLORS.reset}`
  );
}

main();
