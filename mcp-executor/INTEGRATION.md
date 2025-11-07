# Integration Guide

This guide explains how to integrate the MCP Code Execution system with your actual MCP servers.

## Overview

Currently, the system has placeholder implementations for MCP tool calls. To make it fully functional, you need to connect it to your actual MCP client that communicates with the MCP servers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                         │
│                  (PharmaSys Frontend/CLI)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Code Executor                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Orchestrator (main.ts)                    │   │
│  │  • Manages task execution                            │   │
│  │  • Injects MCP bridge                                │   │
│  │  • Handles skills                                    │   │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Sandbox Executor (executor.ts)               │   │
│  │  • Runs code securely                                │   │
│  │  • Enforces resource limits                          │   │
│  │  • Validates code patterns                           │   │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      Server APIs (servers/*/index.ts)                │   │
│  │  • supabase.* functions                              │   │
│  │  • github.* functions                                │   │
│  │  • context7.* functions                              │   │
│  └────────────┬──────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────┘
                │
                ▼ globalThis.__mcpCall()
┌─────────────────────────────────────────────────────────────┐
│                    MCP Bridge                                │
│  • Receives tool calls from sandbox                          │
│  • Routes to appropriate MCP client                          │
│  • Returns results back to sandbox                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Client Library                          │
│  (Your existing MCP client - needs to be integrated)         │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Supabase│  │ GitHub │  │Context7│
    │  MCP   │  │  MCP   │  │  MCP   │
    │ Server │  │ Server │  │ Server │
    └────────┘  └────────┘  └────────┘
```

## Step 1: Create MCP Bridge

Create a bridge that connects the sandbox to your actual MCP client:

```typescript
// runtime/mcp-bridge.ts
import { MCPClient } from '@your-mcp-library/client'; // Replace with your MCP library

export class MCPBridge {
  private client: MCPClient;

  constructor(client: MCPClient) {
    this.client = client;
  }

  /**
   * Call an MCP tool through the client
   */
  async call(toolName: string, params: any): Promise<any> {
    console.log(`[MCP Bridge] Calling ${toolName}`, params);

    try {
      // Call the actual MCP tool through your client
      const result = await this.client.callTool(toolName, params);

      console.log(`[MCP Bridge] ${toolName} succeeded`);
      return result;
    } catch (error) {
      console.error(`[MCP Bridge] ${toolName} failed:`, error);
      throw error;
    }
  }

  /**
   * List available tools from MCP servers
   */
  async listTools(): Promise<any[]> {
    return await this.client.listTools();
  }
}
```

## Step 2: Integrate Bridge with Orchestrator

Update the orchestrator to use the real MCP bridge:

```typescript
// runtime/orchestrator/main.ts

import { MCPBridge } from '../mcp-bridge.ts';

export class MCPOrchestrator {
  private executor: SandboxExecutor;
  private skillsManager: SkillsManager;
  private mcpBridge: MCPBridge; // Add this
  // ... rest of properties

  constructor(
    options: Partial<OrchestratorOptions> = {},
    mcpBridge: MCPBridge // Add this parameter
  ) {
    this.options = {
      /* ... */
    };
    this.executor = createExecutor({
      /* ... */
    });
    this.skillsManager = new SkillsManager(this.options.skillsDir);
    this.mcpBridge = mcpBridge; // Store bridge
  }

  /**
   * Inject MCP call bridge into execution context
   */
  private injectMCPBridge(code: string): string {
    return `
// MCP Bridge - Real implementation
globalThis.__mcpCall = async (toolName, params) => {
  __trackTool(toolName);

  // Call through the bridge (will be bound to actual implementation)
  return await __executeMCPCall(toolName, params);
};

// Import server APIs
${this.generateServerImports()}

// User code
${code}
`;
  }

  /**
   * Execute agent code
   */
  async executeTask(task: AgentTask): Promise<ExecutionResult> {
    // ... existing code ...

    try {
      const codeWithBridge = this.injectMCPBridge(task.code);

      // Create sandbox with MCP bridge binding
      const sandboxContext = {
        __executeMCPCall: async (toolName: string, params: any) => {
          return await this.mcpBridge.call(toolName, params);
        },
      };

      // Execute in sandbox with bound MCP bridge
      const result = await this.executor.execute(
        codeWithBridge,
        sandboxContext
      );

      // ... rest of code ...
    } finally {
      this.activeTasks.delete(task.id);
    }
  }
}
```

## Step 3: Update Sandbox Executor

Modify the sandbox executor to accept and use the MCP bridge context:

```typescript
// runtime/sandbox/executor.ts

export class SandboxExecutor {
  // ... existing code ...

  async execute<T = any>(
    code: string,
    additionalContext?: Record<string, any> // Add this parameter
  ): Promise<ExecutionResult<T>> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    const toolsCalled: string[] = [];

    try {
      this.validateCode(code);

      // Create sandbox with additional context
      const sandbox = {
        ...this.createSandbox(toolsCalled),
        ...additionalContext, // Merge in MCP bridge and other context
      };

      // ... rest of execution code ...
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

## Step 4: Initialize with Real MCP Client

Update your application to initialize the orchestrator with a real MCP client:

```typescript
// your-app.ts or index.ts
import { MCPClient } from '@your-mcp-library/client';
import { MCPBridge } from './runtime/mcp-bridge.ts';
import { MCPOrchestrator } from './runtime/orchestrator/main.ts';

// 1. Create MCP client (using your existing MCP setup)
const mcpClient = new MCPClient({
  servers: {
    supabase: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-supabase'],
      env: {
        SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
        SUPABASE_SERVICE_KEY: Deno.env.get('SUPABASE_SERVICE_KEY'),
      },
    },
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_TOKEN: Deno.env.get('GITHUB_TOKEN'),
      },
    },
    context7: {
      command: 'npx',
      args: ['-y', '@context7/mcp-server'],
    },
  },
});

// 2. Connect to MCP servers
await mcpClient.connect();

// 3. Create MCP bridge
const mcpBridge = new MCPBridge(mcpClient);

// 4. Create orchestrator with bridge
const orchestrator = new MCPOrchestrator(
  {
    sandboxMode: true,
    enableSkillPersistence: true,
  },
  mcpBridge
);

// 5. Initialize
await orchestrator.initialize();

// 6. Now you can execute tasks with real MCP calls!
const task = {
  id: 'real-task',
  description: 'Real MCP task',
  code: `
    // This will actually call the real Supabase MCP server!
    const tables = await supabase.listTables(["public"]);
    return tables;
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result = await orchestrator.executeTask(task);
console.log('Real MCP result:', result);
```

## Step 5: Environment Setup

Create a `.env` file for MCP server credentials:

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
GITHUB_TOKEN=your-github-token
```

Load it in your app:

```typescript
import { load } from 'https://deno.land/std/dotenv/mod.ts';
await load({ export: true });
```

## Step 6: Testing

Test the integration:

```bash
# Run with all permissions (for development)
deno run --allow-all --allow-env your-app.ts

# Or with minimal permissions (production)
deno run \
  --allow-read=. \
  --allow-write=./skills \
  --allow-net \
  --allow-env \
  --allow-run=npx \
  your-app.ts
```

## Using with PharmaSys

To integrate with your PharmaSys application:

```typescript
// In your PharmaSys app
import { setupMCPExecutor } from './mcp-executor/setup.ts';

// Setup once at app initialization
const orchestrator = await setupMCPExecutor();

// Use in your workflows
async function handleAutomation(userRequest: string) {
  const task = generateTaskFromRequest(userRequest);
  const result = await orchestrator.executeTask(task);
  return result;
}
```

## Advanced: Custom Server Integration

If you're building a custom MCP server integration:

```typescript
// custom-mcp-client.ts
export class CustomMCPClient {
  async callTool(toolName: string, params: any): Promise<any> {
    // Parse tool name to determine server and tool
    const [serverPrefix, serverName, toolName] = toolName.split('__');

    switch (serverName) {
      case 'supabase':
        return await this.callSupabaseTool(toolName, params);
      case 'github':
        return await this.callGitHubTool(toolName, params);
      case 'context7':
        return await this.callContext7Tool(toolName, params);
      default:
        throw new Error(`Unknown MCP server: ${serverName}`);
    }
  }

  private async callSupabaseTool(tool: string, params: any) {
    // Implement actual Supabase MCP protocol communication
    // This would use stdio, HTTP, or whatever protocol your MCP server uses
  }

  // ... similar for other servers
}
```

## Troubleshooting

### MCP Tool Calls Failing

Check that:

1. MCP servers are running
2. Environment variables are set correctly
3. Network permissions are granted
4. MCP client is properly initialized

### Permissions Issues

Make sure Deno has permission to:

- Read environment variables (`--allow-env`)
- Make network requests (`--allow-net`)
- Run subprocesses if using stdio transport (`--allow-run`)

### Bridge Not Working

Verify that:

1. `globalThis.__mcpCall` is properly injected
2. The bridge is passed to the orchestrator
3. The MCP client is connected before executing tasks

## Next Steps

1. Implement the MCP bridge with your actual MCP client
2. Test with simple tasks first
3. Gradually migrate to more complex workflows
4. Monitor performance and adjust resource limits
5. Build up your skills library

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Anthropic MCP Article](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Deno Subprocess](https://deno.land/api?s=Deno.Command)

---

Need help? Check the examples or reach out to the team!
