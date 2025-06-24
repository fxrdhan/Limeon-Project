import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from the root .env file.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Exports database triggers to individual SQL files.
 * @param client - The active PostgreSQL client instance.
 */
async function exportTriggers(client: Client) {
  const query = `
    SELECT
      c.relname AS table_name,
      t.tgname AS trigger_name,
      pg_get_triggerdef(t.oid) || ';' AS trigger_definition
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname NOT IN (
        'pg_catalog', 'information_schema', 'pg_toast', 'auth', 'extensions',
        'graphql', 'graphql_public', 'net', 'pgsodium', 'pgsodium_masks',
        'realtime', 'storage', 'supabase_functions', 'supabase_migrations'
    ) AND t.tgisinternal = false;
  `;
  const result = await client.query(query);
  const triggers = result.rows;

  if (triggers.length === 0) {
    console.log("ℹ️ No user-defined triggers found to export.");
    return;
  }

  console.log(`🔍 Found ${triggers.length} triggers to export.`);
  const outputDir = path.join(process.cwd(), "supabase", "triggers");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const trigger of triggers) {
    const { table_name, trigger_name, trigger_definition } = trigger;
    const fileName = `${table_name}_${trigger_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Trigger: ${trigger_name} on table ${table_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + trigger_definition);
    console.log(`  -> Exported trigger '${trigger_name}' to ${filePath}`);
  }
  console.log(`✅ Successfully exported all ${triggers.length} triggers.`);
}

/**
 * Exports database SQL functions to individual SQL files.
 * @param client - The active PostgreSQL client instance.
 */
async function exportFunctions(client: Client) {
  const query = `
    SELECT
        p.proname AS function_name,
        pg_get_functiondef(p.oid) || ';' AS function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN (
        'pg_catalog', 'information_schema', 'pg_toast', 'auth', 'extensions',
        'graphql', 'graphql_public', 'net', 'pgsodium', 'pgsodium_masks',
        'realtime', 'storage', 'supabase_functions', 'supabase_migrations'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
    );
  `;
  const result = await client.query(query);
  const functions = result.rows;

  if (functions.length === 0) {
    console.log("ℹ️ No user-defined SQL functions found to export.");
    return;
  }

  console.log(`🔍 Found ${functions.length} functions to export.`);
  const outputDir = path.join(process.cwd(), "supabase", "functions");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const func of functions) {
    const { function_name, function_definition } = func;
    const fileName = `${function_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Function: ${function_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + function_definition);
    console.log(`  -> Exported function '${function_name}' to ${filePath}`);
  }
  console.log(`✅ Successfully exported all ${functions.length} functions.`);
}

/**
 * Exports table definitions to individual SQL files.
 * NOTE: This is a best-effort export and may not include all constraints,
 * indexes, or other complex details. It's intended for reference.
 * @param client - The active PostgreSQL client instance.
 */
async function exportTables(client: Client) {
  // This query constructs a simplified CREATE TABLE statement for each table.
  const query = `
    SELECT
      c.table_name,
      'CREATE TABLE ' || n.nspname || '.' || c.table_name || ' (' || CHR(10) ||
      string_agg(
        '  ' || c.column_name || ' ' || c.data_type ||
        (CASE WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length || ')' ELSE '' END) ||
        (CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END) ||
        (CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END),
        ',' || CHR(10) ORDER BY c.ordinal_position
      ) ||
      CHR(10) || ');' as table_definition
    FROM
      information_schema.columns c
    JOIN
      pg_namespace n ON n.nspname = c.table_schema
    WHERE
      c.table_schema NOT IN (
        'pg_catalog', 'information_schema', 'pg_toast', 'auth', 'extensions',
        'graphql', 'graphql_public', 'net', 'pgsodium', 'pgsodium_masks',
        'realtime', 'storage', 'supabase_functions', 'supabase_migrations'
      )
    GROUP BY
      n.nspname, c.table_name;
  `;

  const result = await client.query(query);
  const tables = result.rows;

  if (tables.length === 0) {
    console.log("ℹ️ No user-defined tables found to export.");
    return;
  }

  console.log(`🔍 Found ${tables.length} tables to export.`);
  const outputDir = path.join(process.cwd(), "supabase", "tables");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const table of tables) {
    const { table_name, table_definition } = table;
    const fileName = `${table_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Table Definition: ${table_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + table_definition);
    console.log(
      `  -> Exported table definition '${table_name}' to ${filePath}`,
    );
  }
  console.log(`✅ Successfully exported all ${tables.length} tables.`);
}

/**
 * Main function to orchestrate the export process based on command-line arguments.
 */
async function main() {
  const exportType = process.argv[2]; // e.g., 'triggers', 'functions', 'tables', or 'all'

  if (!exportType) {
    console.error(
      "🔴 Please specify what to export. Usage: yarn export [triggers|functions|tables|all]",
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("🔴 DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log("✅ Successfully connected to the database.");

    if (exportType === "all") {
      console.log("\n--- Exporting All Database Objects ---");
      await exportTriggers(client);
      console.log("--------------------------");
      await exportFunctions(client);
      console.log("--------------------------");
      await exportTables(client);
    } else {
      switch (exportType) {
        case "triggers":
          console.log("\n--- Exporting Triggers ---");
          await exportTriggers(client);
          break;

        case "functions":
          console.log("\n--- Exporting Functions ---");
          await exportFunctions(client);
          break;

        case "tables":
          console.log("\n--- Exporting Table Definitions ---");
          await exportTables(client);
          break;

        default:
          console.error(
            `🔴 Unknown export type '${exportType}'. Please use 'triggers', 'functions', 'tables', or 'all'.`,
          );
          process.exit(1);
      }
    }
    console.log("\nExport process completed successfully.");
  } catch (error) {
    console.error("🔴 An error occurred during the export process:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔗 Database connection closed.");
  }
}

main();
