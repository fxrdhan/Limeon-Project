/**
 * Context7 MCP Server API
 * Exposes Context7 documentation tools as code-callable functions
 */

import type { MCPTool } from '@mcp/types';

// Types for Context7 operations
export interface LibraryResult {
  id: string;
  name: string;
  description: string;
  trustScore: number;
  codeSnippets: number;
}

export interface Documentation {
  library: string;
  content: string;
  tokens: number;
  topics?: string[];
}

/**
 * Resolve a library name to a Context7-compatible library ID
 */
export async function resolveLibraryId(
  libraryName: string
): Promise<LibraryResult[]> {
  console.log(`[Context7] Resolving library: ${libraryName}`);

  return await callMCPTool('mcp__context7__resolve-library-id', {
    libraryName,
  });
}

/**
 * Get documentation for a library
 */
export async function getLibraryDocs(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens: number = 5000
): Promise<Documentation> {
  console.log(
    `[Context7] Getting docs for ${context7CompatibleLibraryID}${
      topic ? ` (topic: ${topic})` : ''
    }`
  );

  return await callMCPTool('mcp__context7__get-library-docs', {
    context7CompatibleLibraryID,
    topic,
    tokens,
  });
}

/**
 * Get documentation for a library by name (convenience function)
 * Automatically resolves the library ID first
 */
export async function getDocsByName(
  libraryName: string,
  topic?: string,
  tokens: number = 5000
): Promise<Documentation> {
  console.log(`[Context7] Getting docs for library: ${libraryName}`);

  // First resolve the library ID
  const results = await resolveLibraryId(libraryName);

  if (results.length === 0) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  // Use the first (most relevant) result
  const libraryId = results[0].id;
  console.log(`[Context7] Resolved to library ID: ${libraryId}`);

  // Get the documentation
  return await getLibraryDocs(libraryId, topic, tokens);
}

/**
 * Search for libraries matching a query
 */
export async function searchLibraries(query: string): Promise<LibraryResult[]> {
  console.log(`[Context7] Searching libraries: ${query}`);

  return await resolveLibraryId(query);
}

/**
 * Get documentation for multiple topics in a library
 */
export async function getMultipleTopics(
  libraryId: string,
  topics: string[],
  tokensPerTopic: number = 3000
): Promise<Record<string, Documentation>> {
  console.log(
    `[Context7] Getting docs for ${topics.length} topics in ${libraryId}`
  );

  const results: Record<string, Documentation> = {};

  // Fetch documentation for each topic
  for (const topic of topics) {
    try {
      results[topic] = await getLibraryDocs(libraryId, topic, tokensPerTopic);
    } catch (error) {
      console.error(`Failed to get docs for topic "${topic}":`, error);
    }
  }

  return results;
}

/**
 * Compare documentation between multiple libraries
 */
export async function compareLibraries(
  libraryNames: string[],
  topic?: string,
  tokensPerLibrary: number = 3000
): Promise<Record<string, Documentation>> {
  console.log(
    `[Context7] Comparing ${libraryNames.length} libraries${
      topic ? ` on topic: ${topic}` : ''
    }`
  );

  const results: Record<string, Documentation> = {};

  for (const libraryName of libraryNames) {
    try {
      results[libraryName] = await getDocsByName(
        libraryName,
        topic,
        tokensPerLibrary
      );
    } catch (error) {
      console.error(`Failed to get docs for library "${libraryName}":`, error);
    }
  }

  return results;
}

// Internal function to call MCP tools
async function callMCPTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  // @ts-expect-error - This will be injected by the orchestrator
  if (typeof globalThis.__mcpCall === 'function') {
    // @ts-expect-error - This will be injected by the orchestrator
    return await globalThis.__mcpCall(toolName, params);
  }
  throw new Error('MCP orchestrator not initialized');
}

// Export tool definitions for discovery
export const tools: MCPTool[] = [
  {
    name: 'resolveLibraryId',
    description:
      'Resolve a package/product name to a Context7-compatible library ID',
    parameters: {
      type: 'object',
      properties: {
        libraryName: {
          type: 'string',
          description: 'Library name to search for',
        },
      },
      required: ['libraryName'],
    },
    execute: ({ libraryName }) => resolveLibraryId(libraryName),
  },
  {
    name: 'getLibraryDocs',
    description: 'Fetch up-to-date documentation for a library',
    parameters: {
      type: 'object',
      properties: {
        context7CompatibleLibraryID: {
          type: 'string',
          description: 'Exact Context7-compatible library ID',
        },
        topic: {
          type: 'string',
          description: 'Topic to focus documentation on',
        },
        tokens: {
          type: 'number',
          description: 'Maximum number of tokens to retrieve',
        },
      },
      required: ['context7CompatibleLibraryID'],
    },
    execute: ({ context7CompatibleLibraryID, topic, tokens }) =>
      getLibraryDocs(context7CompatibleLibraryID, topic, tokens),
  },
  {
    name: 'getDocsByName',
    description:
      'Get documentation for a library by name (automatically resolves library ID)',
    parameters: {
      type: 'object',
      properties: {
        libraryName: {
          type: 'string',
          description: 'Name of the library',
        },
        topic: {
          type: 'string',
          description: 'Topic to focus on',
        },
        tokens: {
          type: 'number',
          description: 'Maximum tokens to retrieve',
        },
      },
      required: ['libraryName'],
    },
    execute: ({ libraryName, topic, tokens }) =>
      getDocsByName(libraryName, topic, tokens),
  },
  {
    name: 'compareLibraries',
    description: 'Compare documentation between multiple libraries',
    parameters: {
      type: 'object',
      properties: {
        libraryNames: {
          type: 'array',
          description: 'Array of library names to compare',
        },
        topic: {
          type: 'string',
          description: 'Specific topic to compare',
        },
        tokensPerLibrary: {
          type: 'number',
          description: 'Tokens per library',
        },
      },
      required: ['libraryNames'],
    },
    execute: ({ libraryNames, topic, tokensPerLibrary }) =>
      compareLibraries(libraryNames, topic, tokensPerLibrary),
  },
];
