/**
 * MCP Code Execution Types
 * Based on Anthropic's article: https://www.anthropic.com/engineering/code-execution-with-mcp
 */

// Core MCP Tool Types
export interface MCPTool<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: MCPToolParameters;
  execute: (params: TParams) => Promise<TResult>;
}

export interface MCPToolParameters {
  type: 'object';
  properties: Record<string, MCPParameterSchema>;
  required?: string[];
}

export interface MCPParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: MCPParameterSchema;
  properties?: Record<string, MCPParameterSchema>;
  [key: string]: unknown;
}

// Execution Context
export interface ExecutionContext {
  workDir: string;
  env: Record<string, string>;
  timeout: number;
  memoryLimit: number;
  allowedModules: string[];
}

// Execution Result
export interface ExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ExecutionError;
  stats: ExecutionStats;
}

export interface ExecutionError {
  message: string;
  stack?: string;
  code?: string;
}

export interface ExecutionStats {
  duration: number;
  tokensUsed: number;
  memoryUsed: number;
  toolsCalled: string[];
}

// Skill (Reusable Code)
export interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  createdAt: Date;
  usageCount: number;
  tags: string[];
}

// Agent Task
export interface AgentTask {
  id: string;
  description: string;
  code?: string;
  requiredTools: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ExecutionResult;
}

// Server Configuration
export interface ServerConfig {
  name: string;
  enabled: boolean;
  basePath: string;
  tools: MCPTool[];
}

// Orchestrator Options
export interface OrchestratorOptions {
  sandboxMode: boolean;
  maxConcurrentTasks: number;
  defaultTimeout: number;
  enableSkillPersistence: boolean;
  skillsDir?: string;
}
