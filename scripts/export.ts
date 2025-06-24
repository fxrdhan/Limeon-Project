import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from the root .env file.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Creates a logging function for a specific export type.
 * It ensures the log directory exists and writes detailed logs to a file.
 * @param outputDir The directory where the 'export.log' file will be created.
 * @returns A function that takes a message and appends it to the log file.
 */
function createLogger(outputDir: string): (message: string) => void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const logFilePath = path.join(outputDir, "export.log");

  // Start with a fresh log file for each run
  fs.writeFileSync(
    logFilePath,
    `-- Export log generated on ${new Date().toISOString()} --\n\n`,
  );

  return (message: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
  };
}

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

  const outputDir = path.join(process.cwd(), "supabase", "triggers");
  const log = createLogger(outputDir);
  log("Initialized trigger export.");

  if (triggers.length === 0) {
    const info = "ℹ️ No user-defined triggers found to export.";
    console.log(info);
    log(info);
    return;
  }

  console.log(`🔍 Found ${triggers.length} triggers. Exporting...`);
  log(`Found ${triggers.length} triggers to export.`);

  for (const trigger of triggers) {
    const { table_name, trigger_name, trigger_definition } = trigger;
    const fileName = `${table_name}_${trigger_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Trigger: ${trigger_name} on table ${table_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + trigger_definition);
    log(`  -> Exported '${trigger_name}' to ${filePath}`);
  }

  const successMessage = `✅ Exported ${triggers.length} triggers. See details in ${path.join(outputDir, "export.log")}`;
  console.log(successMessage);
  log("Successfully finished exporting triggers.");
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

  const outputDir = path.join(process.cwd(), "supabase", "functions");
  const log = createLogger(outputDir);
  log("Initialized function export.");

  if (functions.length === 0) {
    const info = "ℹ️ No user-defined SQL functions found to export.";
    console.log(info);
    log(info);
    return;
  }

  console.log(`🔍 Found ${functions.length} functions. Exporting...`);
  log(`Found ${functions.length} functions to export.`);

  for (const func of functions) {
    const { function_name, function_definition } = func;
    const fileName = `${function_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Function: ${function_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + function_definition);
    log(`  -> Exported '${function_name}' to ${filePath}`);
  }

  const successMessage = `✅ Exported ${functions.length} functions. See details in ${path.join(outputDir, "export.log")}`;
  console.log(successMessage);
  log("Successfully finished exporting functions.");
}

/**
 * Exports table definitions to individual SQL files.
 * @param client - The active PostgreSQL client instance.
 */
async function exportTables(client: Client) {
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

  const outputDir = path.join(process.cwd(), "supabase", "tables");
  const log = createLogger(outputDir);
  log("Initialized table export.");

  if (tables.length === 0) {
    const info = "ℹ️ No user-defined tables found to export.";
    console.log(info);
    log(info);
    return;
  }

  console.log(`🔍 Found ${tables.length} tables. Exporting...`);
  log(`Found ${tables.length} tables to export.`);

  for (const table of tables) {
    const { table_name, table_definition } = table;
    const fileName = `${table_name}.sql`;
    const filePath = path.join(outputDir, fileName);
    const fileHeader = `-- Table Definition: ${table_name}\n-- Exported from Supabase on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(filePath, fileHeader + table_definition);
    log(`  -> Exported '${table_name}' to ${filePath}`);
  }

  const successMessage = `✅ Exported ${tables.length} tables. See details in ${path.join(outputDir, "export.log")}`;
  console.log(successMessage);
  log("Successfully finished exporting tables.");
}

/**
 * Exports all data from each table into individual JSON files.
 * @param client - The active PostgreSQL client instance.
 */
async function exportTableDataAsJson(client: Client) {
  const getTablesQuery = `
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN (
        'pg_catalog', 'information_schema', 'pg_toast', 'auth', 'extensions',
        'graphql', 'graphql_public', 'net', 'pgsodium', 'pgsodium_masks',
        'realtime', 'storage', 'supabase_functions', 'supabase_migrations'
    ) AND table_type = 'BASE TABLE';
  `;

  const tablesResult = await client.query(getTablesQuery);
  const tables = tablesResult.rows;

  const outputDir = path.join(process.cwd(), "supabase", "data");
  const log = createLogger(outputDir);
  log("Initialized table data export.");

  if (tables.length === 0) {
    const info = "ℹ️ No user-defined tables found to export data from.";
    console.log(info);
    log(info);
    return;
  }

  console.log(`🔍 Found ${tables.length} tables. Exporting data as JSON...`);
  log(`Found ${tables.length} tables to export data from.`);

  for (const table of tables) {
    const { table_schema, table_name } = table;
    const dataQuery = `SELECT * FROM "${table_schema}"."${table_name}";`;
    try {
      const dataResult = await client.query(dataQuery);
      const jsonData = JSON.stringify(dataResult.rows, null, 2);
      const fileName = `${table_name}.json`;
      const filePath = path.join(outputDir, fileName);

      fs.writeFileSync(filePath, jsonData);
      log(
        `  -> Exported data for table '${table_name}' to ${filePath} (${dataResult.rowCount} rows)`,
      );
    } catch (error) {
      const errorMessage = `  -> Failed to export data for table '${table_name}'. Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      log(errorMessage);
    }
  }

  const successMessage = `✅ Exported data for ${tables.length} tables. See details in ${path.join(outputDir, "export.log")}`;
  console.log(successMessage);
  log("Successfully finished exporting table data.");
}

/**
 * Main function to orchestrate the export process based on command-line arguments.
 */
async function main() {
  const exportType = process.argv[2]; // e.g., 'triggers', 'functions', 'tables', 'data', or 'all'

  if (!exportType) {
    console.error(
      "🔴 Please specify what to export. Usage: yarn export [triggers|functions|tables|data|all]",
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
      console.log("------------------------------------");
      await exportFunctions(client);
      console.log("------------------------------------");
      await exportTables(client);
      console.log("------------------------------------");
      await exportTableDataAsJson(client);
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

        case "data":
          console.log("\n--- Exporting Table Data as JSON ---");
          await exportTableDataAsJson(client);
          break;

        default:
          console.error(
            `🔴 Unknown export type '${exportType}'. Please use 'triggers', 'functions', 'tables', 'data', or 'all'.`,
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
