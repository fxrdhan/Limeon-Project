/**
 * Supabase MCP Server API
 * Exposes Supabase tools as code-callable functions
 */

import type { MCPTool } from "@mcp/types";

// Types for Supabase operations
export interface TableSchema {
  schema: string;
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
}

export interface Migration {
  version: string;
  name: string;
  applied_at: string;
}

export interface EdgeFunction {
  id: string;
  name: string;
  version: number;
  status: string;
}

export interface Branch {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

/**
 * List all tables in one or more schemas
 */
export async function listTables(
  schemas: string[] = ["public"]
): Promise<TableSchema[]> {
  console.log(`[Supabase] Listing tables in schemas: ${schemas.join(", ")}`);

  // This would be implemented to call the actual MCP tool
  // For now, this is a placeholder that shows the structure
  return await callMCPTool("mcp__supabase__list_tables", { schemas });
}

/**
 * Execute raw SQL in the Postgres database
 */
export async function executeSQL(query: string): Promise<unknown[]> {
  console.log(`[Supabase] Executing SQL query`);

  return await callMCPTool("mcp__supabase__execute_sql", { query }) as unknown[];
}

/**
 * Apply a migration to the database
 */
export async function applyMigration(
  name: string,
  query: string
): Promise<void> {
  console.log(`[Supabase] Applying migration: ${name}`);

  return await callMCPTool("mcp__supabase__apply_migration", { name, query });
}

/**
 * List all migrations in the database
 */
export async function listMigrations(): Promise<Migration[]> {
  console.log(`[Supabase] Listing migrations`);

  return await callMCPTool("mcp__supabase__list_migrations", {});
}

/**
 * List all Edge Functions
 */
export async function listEdgeFunctions(): Promise<EdgeFunction[]> {
  console.log(`[Supabase] Listing edge functions`);

  return await callMCPTool("mcp__supabase__list_edge_functions", {});
}

/**
 * Get Edge Function source code
 */
export async function getEdgeFunction(functionSlug: string): Promise<string> {
  console.log(`[Supabase] Getting edge function: ${functionSlug}`);

  return await callMCPTool("mcp__supabase__get_edge_function", {
    function_slug: functionSlug,
  });
}

/**
 * Deploy an Edge Function
 */
export async function deployEdgeFunction(
  name: string,
  files: Array<{ name: string; content: string }>,
  entrypointPath: string = "index.ts",
  importMapPath?: string
): Promise<void> {
  console.log(`[Supabase] Deploying edge function: ${name}`);

  return await callMCPTool("mcp__supabase__deploy_edge_function", {
    name,
    files,
    entrypoint_path: entrypointPath,
    import_map_path: importMapPath,
  });
}

/**
 * Get project URL
 */
export async function getProjectURL(): Promise<string> {
  console.log(`[Supabase] Getting project URL`);

  return await callMCPTool("mcp__supabase__get_project_url", {});
}

/**
 * Get publishable API keys
 */
export async function getPublishableKeys(): Promise<unknown> {
  console.log(`[Supabase] Getting publishable keys`);

  return await callMCPTool("mcp__supabase__get_publishable_keys", {});
}

/**
 * Generate TypeScript types for the database
 */
export async function generateTypes(): Promise<string> {
  console.log(`[Supabase] Generating TypeScript types`);

  return await callMCPTool("mcp__supabase__generate_typescript_types", {});
}

/**
 * Search Supabase documentation
 */
export async function searchDocs(graphqlQuery: string): Promise<unknown> {
  console.log(`[Supabase] Searching documentation`);

  return await callMCPTool("mcp__supabase__search_docs", {
    graphql_query: graphqlQuery,
  });
}

/**
 * List development branches
 */
export async function listBranches(): Promise<Branch[]> {
  console.log(`[Supabase] Listing branches`);

  return await callMCPTool("mcp__supabase__list_branches", {});
}

/**
 * Create a development branch
 */
export async function createBranch(
  name: string = "develop",
  confirmCostId: string
): Promise<Branch> {
  console.log(`[Supabase] Creating branch: ${name}`);

  return await callMCPTool("mcp__supabase__create_branch", {
    name,
    confirm_cost_id: confirmCostId,
  });
}

/**
 * Delete a development branch
 */
export async function deleteBranch(branchId: string): Promise<void> {
  console.log(`[Supabase] Deleting branch: ${branchId}`);

  return await callMCPTool("mcp__supabase__delete_branch", { branch_id: branchId });
}

/**
 * Merge a development branch to production
 */
export async function mergeBranch(branchId: string): Promise<void> {
  console.log(`[Supabase] Merging branch: ${branchId}`);

  return await callMCPTool("mcp__supabase__merge_branch", { branch_id: branchId });
}

/**
 * Reset a development branch
 */
export async function resetBranch(
  branchId: string,
  migrationVersion?: string
): Promise<void> {
  console.log(`[Supabase] Resetting branch: ${branchId}`);

  return await callMCPTool("mcp__supabase__reset_branch", {
    branch_id: branchId,
    migration_version: migrationVersion,
  });
}

/**
 * Rebase a development branch on production
 */
export async function rebaseBranch(branchId: string): Promise<void> {
  console.log(`[Supabase] Rebasing branch: ${branchId}`);

  return await callMCPTool("mcp__supabase__rebase_branch", { branch_id: branchId });
}

/**
 * Get logs for a service
 */
export async function getLogs(
  service: "api" | "branch-action" | "postgres" | "edge-function" | "auth" | "storage" | "realtime"
): Promise<unknown> {
  console.log(`[Supabase] Getting logs for service: ${service}`);

  return await callMCPTool("mcp__supabase__get_logs", { service });
}

/**
 * Get security/performance advisors
 */
export async function getAdvisors(
  type: "security" | "performance"
): Promise<unknown> {
  console.log(`[Supabase] Getting ${type} advisors`);

  return await callMCPTool("mcp__supabase__get_advisors", { type });
}

// Internal function to call MCP tools
// This will be implemented by the orchestrator
async function callMCPTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
  // @ts-expect-error - This will be injected by the orchestrator
  if (typeof globalThis.__mcpCall === "function") {
    // @ts-expect-error - This will be injected by the orchestrator
    return await globalThis.__mcpCall(toolName, params);
  }
  throw new Error("MCP orchestrator not initialized");
}

// Export tool definitions for discovery
export const tools: MCPTool[] = [
  {
    name: "listTables",
    description: "List all tables in one or more schemas",
    parameters: {
      type: "object",
      properties: {
        schemas: {
          type: "array",
          description: "List of schemas to include",
        },
      },
    },
    execute: listTables,
  },
  {
    name: "executeSQL",
    description: "Execute raw SQL in the Postgres database",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute",
        },
      },
      required: ["query"],
    },
    execute: ({ query }) => executeSQL(query),
  },
  // Add more tool definitions...
];
