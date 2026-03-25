import fs from 'node:fs';
import path from 'node:path';

interface FileCoverage {
  s?: Record<string, number>;
  f?: Record<string, number>;
  b?: Record<string, number[]>;
}

const COVERAGE_FILE = path.resolve('coverage/coverage-final.json');
const OUTPUT_FILE = path.resolve('scripts/coverage/non-runtime-files.json');

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('Coverage file not found:', COVERAGE_FILE);
  console.error('Run: bun run test:coverage');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8')) as Record<
  string,
  FileCoverage
>;
const nonRuntimeFiles: string[] = [];

for (const [absPath, fileCoverage] of Object.entries(coverage)) {
  const filePath = absPath.replace(`${process.cwd()}/`, '');
  if (!filePath.startsWith('src/')) continue;

  const statementCount = Object.keys(fileCoverage.s || {}).length;
  const functionCount = Object.keys(fileCoverage.f || {}).length;
  const branchCount = Object.keys(fileCoverage.b || {}).length;

  if (statementCount === 0 && functionCount === 0 && branchCount === 0) {
    nonRuntimeFiles.push(filePath);
  }
}

nonRuntimeFiles.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(nonRuntimeFiles, null, 2) + '\n');

console.log(`Updated ${OUTPUT_FILE} with ${nonRuntimeFiles.length} entries.`);
