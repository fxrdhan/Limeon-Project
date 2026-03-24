import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');
const generatedTypesPath = resolve(
  repoRoot,
  'src/types/supabase-chat.generated.ts'
);

const getLatestChatMigrationBaseline = () => {
  const latestMigration = readdirSync(migrationsDir)
    .map(fileName => {
      const match = fileName.match(/^(\d{14})_(.+)\.sql$/);
      if (!match) {
        return null;
      }

      const [, timestamp, slug] = match;
      return slug.includes('chat') ? timestamp : null;
    })
    .filter(value => value !== null)
    .sort()
    .at(-1);

  if (!latestMigration) {
    throw new Error('Unable to find a chat migration baseline to compare.');
  }

  return latestMigration;
};

const generatedTypesSource = readFileSync(generatedTypesPath, 'utf8');
const generatedBaselineMatch = generatedTypesSource.match(
  /^\/\/ Chat schema migration baseline: (\d{14})\.$/m
);

if (!generatedBaselineMatch) {
  throw new Error(
    `Missing schema baseline comment in ${basename(generatedTypesPath)}.`
  );
}

const expectedBaseline = getLatestChatMigrationBaseline();
const actualBaseline = generatedBaselineMatch[1];

if (actualBaseline !== expectedBaseline) {
  throw new Error(
    [
      'Chat schema types are out of date.',
      `Expected baseline: ${expectedBaseline}`,
      `Found baseline: ${actualBaseline}`,
      `Refresh ${generatedTypesPath} from Supabase after updating chat migrations.`,
    ].join('\n')
  );
}

for (const requiredSnippet of [
  'storage_path: string;',
  'storage_path?: string;',
  'list_chat_directory_users:',
]) {
  if (!generatedTypesSource.includes(requiredSnippet)) {
    throw new Error(
      [
        `Chat schema types are missing a required contract snippet: ${requiredSnippet}`,
        `Refresh ${generatedTypesPath} from Supabase.`,
      ].join('\n')
    );
  }
}

if (generatedTypesSource.includes('target_url')) {
  throw new Error(
    [
      'Chat schema types still include the removed target_url contract.',
      `Refresh ${generatedTypesPath} from Supabase.`,
    ].join('\n')
  );
}

console.log(`Chat schema types match migrations through ${expectedBaseline}.`);
