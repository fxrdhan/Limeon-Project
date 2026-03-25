import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const targetPath = path.join(
  scriptDir,
  '..',
  'node_modules',
  'browserslist',
  'node_modules',
  'baseline-browser-mapping',
  'dist',
  'index.cjs'
);

if (!fs.existsSync(targetPath)) {
  process.exit(0);
}

const source = fs.readFileSync(targetPath, 'utf8');
const warningSnippet =
  '[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`';

if (!source.includes(warningSnippet)) {
  process.exit(0);
}

const patched = source.replace(`console.warn("${warningSnippet}")`, 'void 0');

if (patched !== source) {
  fs.writeFileSync(targetPath, patched, 'utf8');
}
