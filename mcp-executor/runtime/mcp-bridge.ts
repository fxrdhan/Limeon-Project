/**
 * MCP Bridge
 * Connects sandbox execution to real MCP servers
 */

import { MCPClient } from './mcp-client.ts';

export class MCPBridge {
  constructor(private client: MCPClient) {}

  /**
   * Call an MCP tool through the bridge
   * Tool names format: mcp__<server>__<tool_name>
   */
  async call(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    // Parse tool name: mcp__<server>__<tool_name>
    const match = toolName.match(/^mcp__([^_]+)__(.+)$/);

    if (!match) {
      throw new Error(`Invalid MCP tool name format: ${toolName}`);
    }

    const [, serverName, actualToolName] = match;

    console.log(`[MCP Bridge] Calling ${serverName}/${actualToolName}`);

    try {
      const result = await this.client.callTool(
        serverName,
        actualToolName,
        params
      );

      // Extract content from MCP response
      if (result.isError) {
        throw new Error(`MCP tool error: ${JSON.stringify(result.content)}`);
      }

      // MCP tools return { content: [...] }
      // We extract the actual data from content array
      if (Array.isArray(result.content)) {
        if (result.content.length === 1) {
          // Single result - unwrap it
          const item = result.content[0];
          if (typeof item === 'object' && item !== null && 'text' in item) {
            // Text content - try to parse as JSON
            try {
              return JSON.parse((item as { text: string }).text);
            } catch {
              return (item as { text: string }).text;
            }
          }
          return item;
        } else if (result.content.length > 1) {
          // Multiple results - return array
          return result.content.map(item => {
            if (typeof item === 'object' && item !== null && 'text' in item) {
              try {
                return JSON.parse((item as { text: string }).text);
              } catch {
                return (item as { text: string }).text;
              }
            }
            return item;
          });
        }
      }

      return result.content;
    } catch (error) {
      console.error(`[MCP Bridge] Error calling ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * List all available tools from all servers
   */
  async listAllTools(): Promise<Map<string, unknown[]>> {
    const toolsByServer = new Map<string, unknown[]>();

    // For now, we'll populate this when needed
    // In a full implementation, we'd query each server

    return toolsByServer;
  }
}
