import fs from 'node:fs';
import path from 'node:path';

const COVERAGE_FILE = path.resolve('coverage/coverage-final.json');
const NON_RUNTIME_FILE = path.resolve('scripts/coverage/non-runtime-files.json');

const isCoveredSourceFile = filePath => {
  if (!filePath.startsWith('src/')) return false;
  if (filePath.startsWith('src/test/')) return false;
  if (filePath.startsWith('src/schemas/generated/')) return false;
  if (filePath.includes('/__tests__/')) return false;
  if (filePath.includes('/mockData/')) return false;
  if (filePath.endsWith('.d.ts')) return false;
  if (filePath.endsWith('.test.ts')) return false;
  if (filePath.endsWith('.test.tsx')) return false;
  if (filePath.endsWith('.spec.ts')) return false;
  if (filePath.endsWith('.spec.tsx')) return false;
  if (filePath.includes('.config.')) return false;
  return true;
};

const percent = (covered, total) => {
  if (total === 0) return 100;
  return (covered / total) * 100;
};

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('Coverage file not found:', COVERAGE_FILE);
  console.error('Run: bunx vitest run --coverage');
  process.exit(1);
}

if (!fs.existsSync(NON_RUNTIME_FILE)) {
  console.error('Non-runtime list not found:', NON_RUNTIME_FILE);
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
const nonRuntimeList = new Set(
  JSON.parse(fs.readFileSync(NON_RUNTIME_FILE, 'utf8'))
);

const violations = [];
const missingCoverageFiles = [];
const coveredFiles = new Set();

const sourceFiles = fs
  .readdirSync('src', { recursive: true })
  .map(file => `src/${String(file).replace(/\\/g, '/')}`)
  .filter(file => /\.(ts|tsx)$/.test(file));

const expectedFiles = sourceFiles.filter(filePath => {
  if (!isCoveredSourceFile(filePath)) return false;
  if (nonRuntimeList.has(filePath)) return false;
  return true;
});

for (const [absPath, fileCoverage] of Object.entries(coverage)) {
  const filePath = absPath.replace(`${process.cwd()}/`, '');
  if (!isCoveredSourceFile(filePath)) continue;
  if (nonRuntimeList.has(filePath)) continue;
  coveredFiles.add(filePath);

  const statements = Object.values(fileCoverage.s || {});
  const functions = Object.values(fileCoverage.f || {});
  const branches = Object.values(fileCoverage.b || {}).flat();

  const statementPct = percent(
    statements.filter(hit => hit > 0).length,
    statements.length
  );
  const functionPct = percent(
    functions.filter(hit => hit > 0).length,
    functions.length
  );
  const branchPct = percent(
    branches.filter(hit => hit > 0).length,
    branches.length
  );

  if (statementPct < 100 || functionPct < 100 || branchPct < 100) {
    violations.push({
      filePath,
      statements: statementPct,
      functions: functionPct,
      branches: branchPct,
    });
  }
}

for (const filePath of expectedFiles) {
  if (!coveredFiles.has(filePath)) {
    missingCoverageFiles.push(filePath);
  }
}

if (missingCoverageFiles.length > 0) {
  missingCoverageFiles.sort((a, b) => a.localeCompare(b));
  console.error('\nCoverage data missing for executable source files:\n');
  for (const filePath of missingCoverageFiles) {
    console.error(`- ${filePath}`);
  }
  console.error(`\nMissing files: ${missingCoverageFiles.length}`);
  process.exit(1);
}

if (violations.length > 0) {
  violations.sort((a, b) => a.filePath.localeCompare(b.filePath));

  console.error('\nCoverage 100% check failed for executable source files:\n');
  for (const violation of violations) {
    const statements = violation.statements.toFixed(2);
    const functions = violation.functions.toFixed(2);
    const branches = violation.branches.toFixed(2);
    console.error(
      `- ${violation.filePath} | stmts=${statements}% fn=${functions}% br=${branches}%`
    );
  }

  console.error(`\nTotal violations: ${violations.length}`);
  process.exit(1);
}

console.log('Coverage 100% check passed for all executable source files.');
