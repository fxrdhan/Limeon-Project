/**
 * GitHub MCP Server API
 * Exposes GitHub tools as code-callable functions
 */

import type { MCPTool } from '@mcp/types';

// Types for GitHub operations
export interface Repository {
  owner: string;
  repo: string;
  description?: string;
  private?: boolean;
}

export interface Issue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels?: string[];
}

export interface PullRequest {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  head: string;
  base: string;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

/**
 * Get authenticated user details
 */
export async function getMe(): Promise<unknown> {
  console.log(`[GitHub] Getting authenticated user details`);
  return await callMCPTool('mcp__github__get_me', {});
}

/**
 * Create a new repository
 */
export async function createRepository(
  name: string,
  description?: string,
  isPrivate: boolean = false,
  organization?: string
): Promise<unknown> {
  console.log(`[GitHub] Creating repository: ${name}`);

  return await callMCPTool('mcp__github__create_repository', {
    name,
    description,
    private: isPrivate,
    organization,
  });
}

/**
 * Fork a repository
 */
export async function forkRepository(
  owner: string,
  repo: string,
  organization?: string
): Promise<unknown> {
  console.log(`[GitHub] Forking repository: ${owner}/${repo}`);

  return await callMCPTool('mcp__github__fork_repository', {
    owner,
    repo,
    organization,
  });
}

/**
 * List branches in a repository
 */
export async function listBranches(
  owner: string,
  repo: string,
  page: number = 1,
  perPage: number = 30
): Promise<Branch[]> {
  console.log(`[GitHub] Listing branches for ${owner}/${repo}`);

  return await callMCPTool('mcp__github__list_branches', {
    owner,
    repo,
    page,
    perPage,
  });
}

/**
 * Create a new branch
 */
export async function createBranch(
  owner: string,
  repo: string,
  branch: string,
  fromBranch?: string
): Promise<unknown> {
  console.log(`[GitHub] Creating branch: ${branch} in ${owner}/${repo}`);

  return await callMCPTool('mcp__github__create_branch', {
    owner,
    repo,
    branch,
    from_branch: fromBranch,
  });
}

/**
 * Get file contents
 */
export async function getFileContents(
  owner: string,
  repo: string,
  path: string = '/',
  ref?: string
): Promise<unknown> {
  console.log(`[GitHub] Getting file contents: ${path} from ${owner}/${repo}`);

  return await callMCPTool('mcp__github__get_file_contents', {
    owner,
    repo,
    path,
    ref,
  });
}

/**
 * Create or update a file
 */
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<unknown> {
  console.log(`[GitHub] ${sha ? 'Updating' : 'Creating'} file: ${path}`);

  return await callMCPTool('mcp__github__create_or_update_file', {
    owner,
    repo,
    path,
    content,
    message,
    branch,
    sha,
  });
}

/**
 * Delete a file
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  branch: string
): Promise<unknown> {
  console.log(`[GitHub] Deleting file: ${path}`);

  return await callMCPTool('mcp__github__delete_file', {
    owner,
    repo,
    path,
    message,
    branch,
  });
}

/**
 * Push multiple files
 */
export async function pushFiles(
  owner: string,
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
): Promise<unknown> {
  console.log(`[GitHub] Pushing ${files.length} files to ${owner}/${repo}`);

  return await callMCPTool('mcp__github__push_files', {
    owner,
    repo,
    branch,
    files,
    message,
  });
}

/**
 * List issues
 */
export async function listIssues(
  owner: string,
  repo: string,
  state?: 'OPEN' | 'CLOSED',
  labels?: string[],
  perPage: number = 30
): Promise<Issue[]> {
  console.log(`[GitHub] Listing issues for ${owner}/${repo}`);

  return await callMCPTool('mcp__github__list_issues', {
    owner,
    repo,
    state,
    labels,
    perPage,
  });
}

/**
 * Create an issue
 */
export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[],
  assignees?: string[]
): Promise<unknown> {
  console.log(`[GitHub] Creating issue: ${title}`);

  return await callMCPTool('mcp__github__issue_write', {
    method: 'create',
    owner,
    repo,
    title,
    body,
    labels,
    assignees,
  });
}

/**
 * Update an issue
 */
export async function updateIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
  }
): Promise<unknown> {
  console.log(`[GitHub] Updating issue #${issueNumber}`);

  return await callMCPTool('mcp__github__issue_write', {
    method: 'update',
    owner,
    repo,
    issue_number: issueNumber,
    ...updates,
  });
}

/**
 * Add comment to issue
 */
export async function addIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<unknown> {
  console.log(`[GitHub] Adding comment to issue #${issueNumber}`);

  return await callMCPTool('mcp__github__add_issue_comment', {
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

/**
 * List pull requests
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  perPage: number = 30
): Promise<PullRequest[]> {
  console.log(`[GitHub] Listing pull requests for ${owner}/${repo}`);

  return await callMCPTool('mcp__github__list_pull_requests', {
    owner,
    repo,
    state,
    perPage,
  });
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
  draft: boolean = false
): Promise<unknown> {
  console.log(`[GitHub] Creating pull request: ${title}`);

  return await callMCPTool('mcp__github__create_pull_request', {
    owner,
    repo,
    title,
    head,
    base,
    body,
    draft,
  });
}

/**
 * Get pull request details
 */
export async function getPullRequest(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<unknown> {
  console.log(`[GitHub] Getting pull request #${pullNumber}`);

  return await callMCPTool('mcp__github__pull_request_read', {
    method: 'get',
    owner,
    repo,
    pullNumber,
  });
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
): Promise<unknown> {
  console.log(`[GitHub] Merging pull request #${pullNumber}`);

  return await callMCPTool('mcp__github__merge_pull_request', {
    owner,
    repo,
    pullNumber,
    merge_method: mergeMethod,
  });
}

/**
 * Search repositories
 */
export async function searchRepositories(
  query: string,
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated',
  perPage: number = 30
): Promise<unknown> {
  console.log(`[GitHub] Searching repositories: ${query}`);

  return await callMCPTool('mcp__github__search_repositories', {
    query,
    sort,
    perPage,
  });
}

/**
 * Search code
 */
export async function searchCode(
  query: string,
  perPage: number = 30
): Promise<unknown> {
  console.log(`[GitHub] Searching code: ${query}`);

  return await callMCPTool('mcp__github__search_code', {
    query,
    perPage,
  });
}

/**
 * Search issues
 */
export async function searchIssues(
  query: string,
  owner?: string,
  repo?: string,
  perPage: number = 30
): Promise<unknown> {
  console.log(`[GitHub] Searching issues: ${query}`);

  return await callMCPTool('mcp__github__search_issues', {
    query,
    owner,
    repo,
    perPage,
  });
}

/**
 * List commits
 */
export async function listCommits(
  owner: string,
  repo: string,
  sha?: string,
  author?: string,
  perPage: number = 30
): Promise<unknown> {
  console.log(`[GitHub] Listing commits for ${owner}/${repo}`);

  return await callMCPTool('mcp__github__list_commits', {
    owner,
    repo,
    sha,
    author,
    perPage,
  });
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
    name: 'getMe',
    description: 'Get authenticated user details',
    parameters: { type: 'object', properties: {} },
    execute: getMe,
  },
  {
    name: 'createRepository',
    description: 'Create a new repository',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Repository name' },
        description: { type: 'string', description: 'Repository description' },
        isPrivate: { type: 'boolean', description: 'Make repository private' },
      },
      required: ['name'],
    },
    execute: ({ name, description, isPrivate }) =>
      createRepository(name, description, isPrivate),
  },
  // Add more tool definitions...
];
