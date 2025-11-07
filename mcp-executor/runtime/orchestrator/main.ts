/**
 * MCP Orchestrator
 * Main entry point for code execution with MCP
 * Based on: https://www.anthropic.com/engineering/code-execution-with-mcp
 */

import { SandboxExecutor, createExecutor } from '../sandbox/executor.ts';
import { SkillsManager } from '../skills-manager.ts';
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

  constructor(options: Partial<OrchestratorOptions> = {}) {
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

      // Execute in sandbox
      const result = await this.executor.execute(codeWithBridge);

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
    return `
// MCP Bridge - Allows code to call MCP tools
globalThis.__mcpCall = async (toolName, params) => {
  __trackTool(toolName);

  // This would make an actual MCP call
  // For now, we'll simulate it
  console.log(\`[MCP Call] \${toolName}\`, params);

  // In production, this would use the actual MCP client
  // to make the tool call and return the result
  return {
    _simulated: true,
    tool: toolName,
    params
  };
};

// Import server APIs
${this.generateServerImports()}

// User code
${code}
`;
  }

  /**
   * Generate import statements for server APIs
   */
  private generateServerImports(): string {
    const imports: string[] = [];

    for (const [name, config] of this.servers.entries()) {
      if (config.enabled) {
        imports.push(
          `import * as ${name} from "@mcp/servers/${name}/index.ts";`
        );
      }
    }

    return imports.join('\n');
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
