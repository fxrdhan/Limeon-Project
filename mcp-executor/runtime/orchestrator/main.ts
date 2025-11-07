/**
 * MCP Orchestrator
 * Main entry point for code execution with MCP
 * Based on: https://www.anthropic.com/engineering/code-execution-with-mcp
 */

import { SandboxExecutor, createExecutor } from '../sandbox/executor.ts';
import { SkillsManager } from '../skills-manager.ts';
import { MCPBridge } from '../mcp-bridge.ts';
import type {
  AgentTask,
  ExecutionResult,
  MCPTool,
  OrchestratorOptions,
  ServerConfig,
} from '@mcp/types';

export class MCPOrchestrator {
  private executor: SandboxExecutor;
  private skillsManager: SkillsManager;
  private servers: Map<string, ServerConfig> = new Map();
  private options: OrchestratorOptions;
  private activeTasks: Map<string, AgentTask> = new Map();
  private mcpBridge?: MCPBridge;

  constructor(
    options: Partial<OrchestratorOptions> = {},
    mcpBridge?: MCPBridge
  ) {
    this.options = {
      sandboxMode: true,
      maxConcurrentTasks: 5,
      defaultTimeout: 30000,
      enableSkillPersistence: true,
      skillsDir: './skills',
      ...options,
    };

    this.executor = createExecutor({
      timeout: this.options.defaultTimeout,
    });

    this.skillsManager = new SkillsManager(this.options.skillsDir);
    this.mcpBridge = mcpBridge;
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing MCP Orchestrator...');

    // Initialize skills manager
    if (this.options.enableSkillPersistence) {
      await this.skillsManager.initialize();
    }

    // Discover and load MCP servers
    await this.discoverServers();

    console.log(
      `✅ Orchestrator initialized with ${this.servers.size} servers`
    );
  }

  /**
   * Discover MCP servers from filesystem
   */
  private async discoverServers(): Promise<void> {
    const serversDir = './servers';

    try {
      for await (const entry of Deno.readDir(serversDir)) {
        if (entry.isDirectory) {
          try {
            const serverName = entry.name;
            const indexPath = `${serversDir}/${serverName}/index.ts`;

            // Check if index.ts exists
            try {
              await Deno.stat(indexPath);

              // Load server module
              const module = await import(
                `@mcp/servers/${serverName}/index.ts`
              );

              const config: ServerConfig = {
                name: serverName,
                enabled: true,
                basePath: indexPath,
                tools: module.tools || [],
              };

              this.servers.set(serverName, config);
              console.log(
                `📦 Loaded server: ${serverName} (${config.tools.length} tools)`
              );
            } catch {
              // No index.ts, skip
            }
          } catch (error) {
            console.error(`Failed to load server ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to discover servers:', error);
    }
  }

  /**
   * Execute agent code
   */
  async executeTask(task: AgentTask): Promise<ExecutionResult> {
    console.log(`\n🤖 Executing task: ${task.description}`);

    if (!task.code) {
      return {
        success: false,
        error: {
          message: 'No code provided for task',
        },
        stats: {
          duration: 0,
          tokensUsed: 0,
          memoryUsed: 0,
          toolsCalled: [],
        },
      };
    }

    // Track active task
    task.status = 'running';
    this.activeTasks.set(task.id, task);

    try {
      // Inject MCP bridge into execution context
      const codeWithBridge = this.injectMCPBridge(task.code);

      // Create sandbox context with MCP bridge
      const sandboxContext = this.mcpBridge
        ? {
            __executeMCPCall: async (
              toolName: string,
              params: Record<string, unknown>
            ) => {
              return await this.mcpBridge!.call(toolName, params);
            },
          }
        : {};

      // Execute in sandbox
      const result = await this.executor.execute(
        codeWithBridge,
        sandboxContext
      );

      // Update task status
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;

      console.log(
        `✅ Task ${result.success ? 'completed' : 'failed'} in ${result.stats.duration}ms`
      );
      console.log(
        `   Tools called: ${result.stats.toolsCalled.join(', ') || 'none'}`
      );
      console.log(`   Tokens used: ${result.stats.tokensUsed}`);

      return result;
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Inject MCP call bridge into execution context
   */
  private injectMCPBridge(code: string): string {
    const bridgeCode = this.mcpBridge
      ? `
// MCP Bridge - Real implementation
globalThis.__mcpCall = async (toolName, params) => {
  __trackTool(toolName);

  // Call through the real MCP bridge
  return await __executeMCPCall(toolName, params);
};`
      : `
// MCP Bridge - Simulation mode (no bridge connected)
globalThis.__mcpCall = async (toolName, params) => {
  __trackTool(toolName);

  console.log(\`[MCP Call - Simulated] \${toolName}\`, params);

  return {
    _simulated: true,
    tool: toolName,
    params
  };
};`;

    return `
${bridgeCode}

// Server APIs
${this.generateServerAPIs()}

// User code
${code}
`;
  }

  /**
   * Generate server API objects for sandbox
   */
  private generateServerAPIs(): string {
    // Instead of imports, create API objects directly
    return `
// Supabase API
const supabase = {
  listTables: async (schemas) => await __mcpCall("mcp__supabase__list_tables", { schemas }),
  listExtensions: async () => await __mcpCall("mcp__supabase__list_extensions", {}),
  executeSQL: async (query) => await __mcpCall("mcp__supabase__execute_sql", { query }),
  applyMigration: async (name, query) => await __mcpCall("mcp__supabase__apply_migration", { name, query }),
  listMigrations: async () => await __mcpCall("mcp__supabase__list_migrations", {}),
  listEdgeFunctions: async () => await __mcpCall("mcp__supabase__list_edge_functions", {}),
  getEdgeFunction: async (slug) => await __mcpCall("mcp__supabase__get_edge_function", { function_slug: slug }),
  deployEdgeFunction: async (name, files, entrypoint, importMap) => await __mcpCall("mcp__supabase__deploy_edge_function", { name, files, entrypoint_path: entrypoint, import_map_path: importMap }),
  getProjectURL: async () => await __mcpCall("mcp__supabase__get_project_url", {}),
  getPublishableKeys: async () => await __mcpCall("mcp__supabase__get_publishable_keys", {}),
  generateTypes: async () => await __mcpCall("mcp__supabase__generate_typescript_types", {}),
  searchDocs: async (query) => await __mcpCall("mcp__supabase__search_docs", { graphql_query: query }),
  listBranches: async () => await __mcpCall("mcp__supabase__list_branches", {}),
  createBranch: async (name, confirmCostId) => await __mcpCall("mcp__supabase__create_branch", { name, confirm_cost_id: confirmCostId }),
  deleteBranch: async (branchId) => await __mcpCall("mcp__supabase__delete_branch", { branch_id: branchId }),
  mergeBranch: async (branchId) => await __mcpCall("mcp__supabase__merge_branch", { branch_id: branchId }),
  resetBranch: async (branchId, version) => await __mcpCall("mcp__supabase__reset_branch", { branch_id: branchId, migration_version: version }),
  rebaseBranch: async (branchId) => await __mcpCall("mcp__supabase__rebase_branch", { branch_id: branchId }),
  getLogs: async (service) => await __mcpCall("mcp__supabase__get_logs", { service }),
  getAdvisors: async (type) => await __mcpCall("mcp__supabase__get_advisors", { type }),
};

// GitHub API
const github = {
  getMe: async () => await __mcpCall("mcp__github__get_me", {}),
  createRepository: async (name, description, isPrivate, org) => await __mcpCall("mcp__github__create_repository", { name, description, private: isPrivate, organization: org }),
  listBranches: async (owner, repo) => await __mcpCall("mcp__github__list_branches", { owner, repo }),
  createBranch: async (owner, repo, branch, from) => await __mcpCall("mcp__github__create_branch", { owner, repo, branch, from_branch: from }),
  getFileContents: async (owner, repo, path) => await __mcpCall("mcp__github__get_file_contents", { owner, repo, path }),
  listIssues: async (owner, repo) => await __mcpCall("mcp__github__list_issues", { owner, repo }),
  createIssue: async (owner, repo, title, body, labels) => await __mcpCall("mcp__github__issue_write", { method: "create", owner, repo, title, body, labels }),
  listPullRequests: async (owner, repo) => await __mcpCall("mcp__github__list_pull_requests", { owner, repo }),
  createPullRequest: async (owner, repo, title, head, base, body) => await __mcpCall("mcp__github__create_pull_request", { owner, repo, title, head, base, body }),
};

// Context7 API
const context7 = {
  resolveLibraryId: async (name) => await __mcpCall("mcp__context7__resolve-library-id", { libraryName: name }),
  getLibraryDocs: async (id, topic, tokens) => await __mcpCall("mcp__context7__get-library-docs", { context7CompatibleLibraryID: id, topic, tokens }),
};
`;
  }

  /**
   * List available servers
   */
  listServers(): ServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * List available tools
   */
  listTools(): MCPTool[] {
    const tools: MCPTool[] = [];

    for (const config of this.servers.values()) {
      if (config.enabled) {
        tools.push(...config.tools);
      }
    }

    return tools;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverName: string): MCPTool[] {
    const server = this.servers.get(serverName);
    return server?.tools || [];
  }

  /**
   * Search for tools
   */
  searchTools(query: string): MCPTool[] {
    const lowerQuery = query.toLowerCase();
    return this.listTools().filter(
      tool =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Save code as a reusable skill
   */
  async saveSkill(
    name: string,
    description: string,
    code: string,
    tags: string[] = []
  ): Promise<void> {
    const skill = this.skillsManager.createSkill(name, description, code, tags);
    await this.skillsManager.saveSkill(skill);
    console.log(`💾 Saved skill: ${name}`);
  }

  /**
   * Load and execute a skill
   */
  async executeSkill(
    skillId: string,
    params?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const skill = this.skillsManager.getSkill(skillId);

    if (!skill) {
      return {
        success: false,
        error: {
          message: `Skill not found: ${skillId}`,
        },
        stats: {
          duration: 0,
          tokensUsed: 0,
          memoryUsed: 0,
          toolsCalled: [],
        },
      };
    }

    // Inject params if provided
    let code = skill.code;
    if (params) {
      code = `const params = ${JSON.stringify(params)};\n${code}`;
    }

    const task: AgentTask = {
      id: `skill-${skillId}-${Date.now()}`,
      description: `Execute skill: ${skill.name}`,
      code,
      requiredTools: [],
      status: 'pending',
    };

    const result = await this.executeTask(task);

    // Increment usage count
    if (result.success) {
      await this.skillsManager.incrementUsage(skillId);
    }

    return result;
  }

  /**
   * List all skills
   */
  listSkills() {
    return this.skillsManager.listSkills();
  }

  /**
   * Search skills
   */
  searchSkills(query: string) {
    return this.skillsManager.searchSkills(query);
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      servers: this.servers.size,
      tools: this.listTools().length,
      skills: this.listSkills().length,
      activeTasks: this.activeTasks.size,
      maxConcurrentTasks: this.options.maxConcurrentTasks,
    };
  }
}

// Example usage
if (import.meta.main) {
  const orchestrator = new MCPOrchestrator({
    sandboxMode: true,
    enableSkillPersistence: true,
  });

  await orchestrator.initialize();

  // Example task: List Supabase tables
  const task: AgentTask = {
    id: 'task-1',
    description: 'List all Supabase tables',
    code: `
      const tables = await supabase.listTables(["public"]);
      console.log("Tables:", tables);
      return tables;
    `,
    requiredTools: ['supabase'],
    status: 'pending',
  };

  const result = await orchestrator.executeTask(task);
  console.log('\n📊 Result:', result);

  // Show stats
  console.log('\n📈 Orchestrator Stats:', orchestrator.getStats());
}
