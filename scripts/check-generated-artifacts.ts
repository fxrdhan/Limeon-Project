/// <reference types="node" />

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type ZodSchemaArtifact = {
  name: string;
  input: string;
  output: string;
  hasPropsFilter?: boolean;
};

type GeneratedArtifact = {
  label: string;
  actualPath: string;
  generatedPath: string;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const shouldFix = args.has('--fix');
const only = process.argv
  .find(arg => arg.startsWith('--only='))
  ?.slice('--only='.length);
const zodNameFilter = process.argv
  .find(arg => arg.startsWith('--zod='))
  ?.slice('--zod='.length);

if (only && !['zod', 'db-types'].includes(only)) {
  throw new Error(`Unsupported --only value: ${only}`);
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || 'psqmckbtwqphcteymjil';

const zodArtifacts: ZodSchemaArtifact[] = [
  {
    name: 'database',
    input: 'src/types/database.ts',
    output: 'src/schemas/generated/database.zod.ts',
  },
  {
    name: 'forms',
    input: 'src/types/forms.ts',
    output: 'src/schemas/generated/forms.zod.ts',
    hasPropsFilter: true,
  },
  {
    name: 'invoice',
    input: 'src/types/invoice.ts',
    output: 'src/schemas/generated/invoice.zod.ts',
  },
  {
    name: 'purchase',
    input: 'src/types/purchase.ts',
    output: 'src/schemas/generated/purchase.zod.ts',
    hasPropsFilter: true,
  },
];

const selectedZodArtifacts = zodNameFilter
  ? zodArtifacts.filter(artifact => artifact.name === zodNameFilter)
  : zodArtifacts;

if (zodNameFilter && selectedZodArtifacts.length === 0) {
  throw new Error(`Unknown Zod schema artifact: ${zodNameFilter}`);
}

const normalizeSource = (source: string) =>
  `${source.replaceAll('\r\n', '\n').trimEnd()}\n`;

const readNormalized = (filePath: string) =>
  normalizeSource(readFileSync(filePath, 'utf8'));

const run = (
  command: string,
  commandArgs: string[],
  options: { cwd?: string; input?: string } = {}
) => {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 30 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${commandArgs.join(' ')}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result;
};

const formatFiles = (files: string[]) => {
  if (files.length === 0) return;
  run('vp', ['fmt', '--write', ...files]);
};

const writeTsToZodConfig = (
  tempDir: string,
  artifacts: ZodSchemaArtifact[]
) => {
  const configSource = `export default [
${artifacts
  .map(
    artifact => `  {
    name: ${JSON.stringify(artifact.name)},
    input: ${JSON.stringify(artifact.input)},
    output: ${JSON.stringify(artifact.output)},
    getSchemaName: identifier => \`\${identifier}Schema\`,${
      artifact.hasPropsFilter
        ? "\n    nameFilter: name => !name.includes('Props'),"
        : ''
    }
  }`
  )
  .join(',\n')}
];
`;

  writeFileSync(resolve(tempDir, 'ts-to-zod.config.mjs'), configSource);
};

const prepareTempTypeInputs = (tempDir: string) => {
  const tempSrcDir = resolve(tempDir, 'src');
  const tempTypesDir = resolve(tempSrcDir, 'types');

  mkdirSync(tempSrcDir, { recursive: true });
  symlinkSync(resolve(repoRoot, 'src/types'), tempTypesDir, 'dir');
};

const generateZodSchemas = (tempDir: string): GeneratedArtifact[] => {
  if (selectedZodArtifacts.length === 0) {
    return [];
  }

  prepareTempTypeInputs(tempDir);

  for (const artifact of selectedZodArtifacts) {
    mkdirSync(dirname(resolve(tempDir, artifact.output)), {
      recursive: true,
    });
  }

  writeTsToZodConfig(tempDir, zodArtifacts);
  run(
    'bunx',
    zodNameFilter
      ? ['ts-to-zod', '--config', zodNameFilter, '--skipValidation']
      : ['ts-to-zod', '--all', '--skipValidation'],
    { cwd: tempDir }
  );

  const generatedFiles = selectedZodArtifacts.map(artifact =>
    resolve(tempDir, artifact.output)
  );
  formatFiles(generatedFiles);

  return selectedZodArtifacts.map(artifact => ({
    label: `Zod schema ${artifact.name}`,
    actualPath: resolve(repoRoot, artifact.output),
    generatedPath: resolve(tempDir, artifact.output),
  }));
};

const generateSupabaseTypes = (tempDir: string): GeneratedArtifact => {
  const generatedPath = resolve(tempDir, 'src/types/supabase.generated.ts');
  mkdirSync(dirname(generatedPath), { recursive: true });

  const result = run('bunx', [
    'supabase',
    'gen',
    'types',
    'typescript',
    '--project-id',
    projectRef,
  ]);
  writeFileSync(generatedPath, normalizeSource(result.stdout));
  formatFiles([generatedPath]);

  return {
    label: 'Supabase database types',
    actualPath: resolve(repoRoot, 'src/types/supabase.generated.ts'),
    generatedPath,
  };
};

const compareArtifacts = (artifacts: GeneratedArtifact[]) => {
  const staleArtifacts: string[] = [];

  for (const artifact of artifacts) {
    const generatedSource = readNormalized(artifact.generatedPath);
    const actualExists = existsSync(artifact.actualPath);
    const actualSource = actualExists
      ? readNormalized(artifact.actualPath)
      : '';

    if (actualSource === generatedSource) continue;

    if (shouldFix) {
      mkdirSync(dirname(artifact.actualPath), { recursive: true });
      writeFileSync(artifact.actualPath, generatedSource);
      console.log(`Updated ${artifact.label}: ${artifact.actualPath}`);
      continue;
    }

    staleArtifacts.push(`${artifact.label} is stale: ${artifact.actualPath}`);
  }

  if (staleArtifacts.length > 0) {
    throw new Error(
      [
        'Generated artifacts are stale.',
        ...staleArtifacts,
        'Run bun run check:generated:fix to refresh all generated artifacts.',
      ].join('\n')
    );
  }
};

const tempDir = mkdtempSync(resolve(tmpdir(), 'pharmasys-generated-'));

try {
  const artifacts: GeneratedArtifact[] = [];

  if (only !== 'db-types') {
    artifacts.push(...generateZodSchemas(tempDir));
  }

  if (only !== 'zod') {
    artifacts.push(generateSupabaseTypes(tempDir));
  }

  compareArtifacts(artifacts);
  console.log('Generated artifacts are up to date.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
