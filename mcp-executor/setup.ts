/**
 * MCP Executor Setup
 * Initializes MCP client, bridge, and orchestrator with real MCP servers
 */

import { MCPClient } from './runtime/mcp-client.ts';
import { MCPBridge } from './runtime/mcp-bridge.ts';
import { MCPOrchestrator } from './runtime/orchestrator/main.ts';

export interface MCPConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  >;
}

/**
 * Load MCP configuration from file
 */
export async function loadMCPConfig(
  configPath: string = '../.mcp.json'
): Promise<MCPConfig> {
  try {
    const configText = await Deno.readTextFile(configPath);
    return JSON.parse(configText);
  } catch (error) {
    console.error('Failed to load MCP config:', error);
    throw new Error(
      `Could not load MCP configuration from ${configPath}. Make sure the file exists.`
    );
  }
}

/**
 * Initialize MCP Executor with real server connections
 */
export async function initializeMCPExecutor(
  configPath?: string
): Promise<MCPOrchestrator> {
  console.log('🚀 Initializing MCP Executor...\n');

  // 1. Load configuration
  console.log('📋 Loading MCP configuration...');
  const config = await loadMCPConfig(configPath);
  const serverCount = Object.keys(config.mcpServers).length;
  console.log(`   Found ${serverCount} MCP server(s)\n`);

  // 2. Create and connect MCP client
  console.log('🔌 Connecting to MCP servers...');
  const mcpClient = new MCPClient(config.mcpServers);
  await mcpClient.connect();
  console.log('');

  // 3. Create MCP bridge
  console.log('🌉 Creating MCP bridge...');
  const mcpBridge = new MCPBridge(mcpClient);
  console.log('   ✓ Bridge created\n');

  // 4. Create orchestrator with bridge
  console.log('🎯 Creating orchestrator...');
  const orchestrator = new MCPOrchestrator(
    {
      sandboxMode: true,
      enableSkillPersistence: true,
      defaultTimeout: 60000, // 60 seconds for MCP calls
    },
    mcpBridge
  );

  await orchestrator.initialize();
  console.log('');

  console.log('✅ MCP Executor fully initialized and ready!\n');

  // Return cleanup function
  return orchestrator;
}

/**
 * Shutdown MCP Executor and close connections
 */
export async function shutdownMCPExecutor(client: MCPClient): Promise<void> {
  console.log('\n🛑 Shutting down MCP Executor...');
  await client.close();
  console.log('✅ Shutdown complete');
}

// If run directly, demonstrate setup
if (import.meta.main) {
  const orchestrator = await initializeMCPExecutor();

  console.log('📊 Orchestrator Stats:');
  console.log(orchestrator.getStats());
  console.log('\n✨ Setup complete! Press Ctrl+C to exit.\n');

  // Keep process alive
  await new Promise(() => {});
}
