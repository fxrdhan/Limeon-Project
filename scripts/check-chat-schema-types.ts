import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

interface TableColumnRow {
  table_name: string;
  column_name: string;
  is_nullable: 'YES' | 'NO';
}

interface RpcRow {
  proname: string;
}

interface ChatMigrationFile {
  fileName: string;
  source: string;
  timestamp: string;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');
const generatedTypesPath = resolve(
  repoRoot,
  'src/types/supabase-chat.generated.ts'
);
const liveDatabaseUrl =
  process.env.CHAT_SCHEMA_LIVE_DATABASE_URL?.trim() || null;
const requireLiveCheck = process.argv.includes('--require-live');

const REQUIRED_LIVE_CHAT_RPC_NAMES = [
  'create_chat_message',
  'delete_chat_message_thread',
  'edit_chat_message_text',
  'fetch_chat_message_context',
  'fetch_chat_messages_page',
  'get_chat_message_by_id',
  'get_user_presence',
  'list_active_user_presence_since',
  'list_chat_directory_users',
  'list_undelivered_incoming_message_ids',
  'mark_chat_message_ids_as_delivered',
  'mark_chat_message_ids_as_read',
  'search_chat_messages',
  'sync_user_presence_on_exit',
  'update_chat_file_preview_metadata',
  'upsert_user_presence',
];

const CHAT_CONTRACT_TABLE_NAMES = [
  'chat_messages',
  'chat_shared_links',
  'user_presence',
];

const CHAT_CONTRACT_FUNCTION_NAMES = [
  ...REQUIRED_LIVE_CHAT_RPC_NAMES,
  'generate_chat_shared_link_slug',
];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CHAT_CONTRACT_TABLE_PATTERN = new RegExp(
  String.raw`\b(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+exists|exists)\s+)?public\.(?:${CHAT_CONTRACT_TABLE_NAMES.map(escapeRegex).join('|')})\b`,
  'i'
);

const CHAT_CONTRACT_FUNCTION_PATTERN = new RegExp(
  String.raw`\b(?:create(?:\s+or\s+replace)?|drop)\s+function\s+(?:if\s+exists\s+)?public\.(?:${CHAT_CONTRACT_FUNCTION_NAMES.map(escapeRegex).join('|')})\s*\(`,
  'i'
);

const listChatMigrationFiles = () =>
  readdirSync(migrationsDir)
    .map((fileName): ChatMigrationFile | null => {
      const match = fileName.match(/^(\d{14})_(.+)\.sql$/);
      if (!match) {
        return null;
      }

      const [, timestamp, slug] = match;
      if (!slug.includes('chat')) {
        return null;
      }

      return {
        fileName,
        source: readFileSync(resolve(migrationsDir, fileName), 'utf8'),
        timestamp,
      };
    })
    .filter((value): value is ChatMigrationFile => value !== null)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

const getLatestChatContractMigration = () => {
  const latestMigration = listChatMigrationFiles()
    .filter(
      migration =>
        CHAT_CONTRACT_TABLE_PATTERN.test(migration.source) ||
        CHAT_CONTRACT_FUNCTION_PATTERN.test(migration.source)
    )
    .at(-1);

  if (!latestMigration) {
    throw new Error(
      'Unable to find a contract-affecting chat migration to compare.'
    );
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

const latestContractMigration = getLatestChatContractMigration();
const expectedBaseline = latestContractMigration.timestamp;
const actualBaseline = generatedBaselineMatch[1];

if (actualBaseline < expectedBaseline) {
  throw new Error(
    [
      'Chat schema types predate the latest contract-affecting chat migration.',
      `Latest contract migration: ${latestContractMigration.fileName}`,
      `Expected baseline to be at least: ${expectedBaseline}`,
      `Found baseline: ${actualBaseline}`,
      `Refresh ${generatedTypesPath} from Supabase when a chat migration changes typed tables or RPC contracts.`,
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

const maybeCreateLiveSchemaClient = () => {
  if (!liveDatabaseUrl) {
    if (requireLiveCheck) {
      throw new Error(
        [
          'Missing CHAT_SCHEMA_LIVE_DATABASE_URL for live chat schema verification.',
          'Set it to a Postgres connection string for the deployed Supabase database.',
        ].join('\n')
      );
    }

    return null;
  }

  return new Client({
    connectionString: liveDatabaseUrl,
    ssl: liveDatabaseUrl.includes('sslmode=disable')
      ? undefined
      : {
          rejectUnauthorized: false,
        },
  });
};

const verifyLiveSchema = async () => {
  const client = maybeCreateLiveSchemaClient();
  if (!client) {
    console.log(
      'Live chat schema check skipped; CHAT_SCHEMA_LIVE_DATABASE_URL is not set.'
    );
    return;
  }

  await client.connect();

  try {
    const { rows: tableColumns } = await client.query<TableColumnRow>(`
      select table_name, column_name, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'chat_shared_links' and column_name in ('storage_path', 'target_url'))
          or (table_name = 'chat_messages' and column_name = 'shared_link_slug')
        )
    `);

    const getColumn = (tableName: string, columnName: string) =>
      tableColumns.find(
        tableColumn =>
          tableColumn.table_name === tableName &&
          tableColumn.column_name === columnName
      );

    const storagePathColumn = getColumn('chat_shared_links', 'storage_path');
    if (!storagePathColumn) {
      throw new Error(
        'Live chat schema drift: public.chat_shared_links.storage_path is missing.'
      );
    }

    if (storagePathColumn.is_nullable !== 'NO') {
      throw new Error(
        'Live chat schema drift: public.chat_shared_links.storage_path must be NOT NULL.'
      );
    }

    if (getColumn('chat_shared_links', 'target_url')) {
      throw new Error(
        'Live chat schema drift: public.chat_shared_links still exposes target_url.'
      );
    }

    if (!getColumn('chat_messages', 'shared_link_slug')) {
      throw new Error(
        'Live chat schema drift: public.chat_messages.shared_link_slug is missing.'
      );
    }

    const { rows: rpcRows } = await client.query<RpcRow>(
      `
        select proname
        from pg_proc
        inner join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
        where pg_namespace.nspname = 'public'
          and proname = any($1::text[])
      `,
      [REQUIRED_LIVE_CHAT_RPC_NAMES]
    );
    const availableRpcNames = new Set(rpcRows.map(rpcRow => rpcRow.proname));
    const missingRpcNames = REQUIRED_LIVE_CHAT_RPC_NAMES.filter(
      rpcName => !availableRpcNames.has(rpcName)
    );

    if (missingRpcNames.length > 0) {
      throw new Error(
        [
          'Live chat schema drift: required chat RPCs are missing.',
          ...missingRpcNames.map(rpcName => `- ${rpcName}`),
        ].join('\n')
      );
    }

    console.log('Live chat schema matches the attachment-only contract.');
  } finally {
    await client.end();
  }
};

console.log(`Chat schema types match migrations through ${expectedBaseline}.`);
await verifyLiveSchema();
