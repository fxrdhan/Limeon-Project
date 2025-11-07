/**
 * MCP Client
 * Communicates with MCP servers via stdio protocol
 */

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: unknown[];
  isError?: boolean;
}

export class MCPClient {
  private processes: Map<string, Deno.ChildProcess> = new Map();
  private messageId = 0;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();

  constructor(private servers: Record<string, MCPServerConfig>) {}

  /**
   * Initialize connection to MCP servers
   */
  async connect(): Promise<void> {
    console.log('🔌 Connecting to MCP servers...');

    for (const [name, config] of Object.entries(this.servers)) {
      try {
        await this.startServer(name, config);
        console.log(`  ✓ Connected to ${name}`);
      } catch (error) {
        console.error(`  ✗ Failed to connect to ${name}:`, error);
      }
    }
  }

  /**
   * Start an MCP server process
   */
  private async startServer(
    name: string,
    config: MCPServerConfig
  ): Promise<void> {
    const command = new Deno.Command(config.command, {
      args: config.args,
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
      env: config.env,
    });

    const process = command.spawn();
    this.processes.set(name, process);

    // Handle stdout (responses from MCP server)
    this.handleServerOutput(name, process.stdout);

    // Handle stderr (errors and logs)
    this.handleServerErrors(name, process.stderr);

    // Send initialize request
    await this.sendRequest(name, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-executor',
        version: '1.0.0',
      },
    });
  }

  /**
   * Handle server output (stdout)
   */
  private async handleServerOutput(
    serverName: string,
    stdout: ReadableStream<Uint8Array>
  ): Promise<void> {
    const reader = stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON-RPC messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              this.handleMessage(serverName, message);
            } catch {
              console.error(`[${serverName}] Failed to parse message:`, line);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[${serverName}] Output stream error:`, error);
    }
  }

  /**
   * Handle server errors (stderr)
   */
  private async handleServerErrors(
    serverName: string,
    stderr: ReadableStream<Uint8Array>
  ): Promise<void> {
    const reader = stderr.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        if (text.trim()) {
          console.error(`[${serverName}] ${text.trim()}`);
        }
      }
    } catch (error) {
      console.error(`[${serverName}] Error stream error:`, error);
    }
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(
    serverName: string,
    message: Record<string, unknown>
  ): void {
    if (message.id !== undefined && typeof message.id === 'number') {
      // This is a response to our request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(
            new Error(
              `MCP Error: ${(message.error as Record<string, unknown>).message}`
            )
          );
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // This is a notification or request from server (we don't handle these yet)
      console.log(`[${serverName}] Notification:`, message.method);
    }
  }

  /**
   * Send a JSON-RPC request to a server
   */
  private async sendRequest(
    serverName: string,
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const process = this.processes.get(serverName);
    if (!process || !process.stdin) {
      throw new Error(`Server ${serverName} not connected`);
    }

    const id = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    // Create promise for response
    const responsePromise = new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });

    // Send request
    const writer = process.stdin.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(JSON.stringify(request) + '\n'));
    writer.releaseLock();

    return responsePromise;
  }

  /**
   * Call an MCP tool
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    try {
      const result = await this.sendRequest(serverName, 'tools/call', {
        name: toolName,
        arguments: args,
      });

      return result as MCPToolResult;
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * List available tools from a server
   */
  async listTools(serverName: string): Promise<unknown[]> {
    try {
      const result = await this.sendRequest(serverName, 'tools/list', {});
      return (result as { tools: unknown[] }).tools;
    } catch (error) {
      console.error(`Failed to list tools from ${serverName}:`, error);
      return [];
    }
  }

  /**
   * Close all server connections
   */
  async close(): Promise<void> {
    console.log('🔌 Closing MCP server connections...');

    for (const [name, process] of this.processes.entries()) {
      try {
        // Send shutdown notification
        if (process.stdin) {
          const writer = process.stdin.getWriter();
          const encoder = new TextEncoder();
          await writer.write(
            encoder.encode(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/cancelled',
              }) + '\n'
            )
          );
          writer.releaseLock();
        }

        process.kill('SIGTERM');
        await process.status;
        console.log(`  ✓ Closed ${name}`);
      } catch (error) {
        console.error(`  ✗ Failed to close ${name}:`, error);
      }
    }

    this.processes.clear();
    this.pendingRequests.clear();
  }
}
