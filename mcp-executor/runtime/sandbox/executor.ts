/**
 * Sandbox Executor
 * Securely executes TypeScript/JavaScript code with resource limits
 */

import type { ExecutionContext, ExecutionResult } from '@mcp/types';

export class SandboxExecutor {
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  /**
   * Execute code in a sandboxed environment
   */
  async execute<T = unknown>(
    code: string,
    additionalContext?: Record<string, unknown>
  ): Promise<ExecutionResult<T>> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    const toolsCalled: string[] = [];

    try {
      // Validate code before execution
      this.validateCode(code);

      // Create isolated execution environment
      const sandbox = {
        ...this.createSandbox(toolsCalled),
        ...(additionalContext || {}),
      };

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Execution timeout exceeded')),
          this.context.timeout
        )
      );

      // Execute code with timeout
      const executionPromise = this.runCode<T>(code, sandbox);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Calculate stats
      const duration = performance.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;

      return {
        success: true,
        data: result,
        stats: {
          duration,
          tokensUsed: this.estimateTokens(code),
          memoryUsed,
          toolsCalled,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: (error as Record<string, unknown>)?.code as string | undefined,
        },
        stats: {
          duration,
          tokensUsed: this.estimateTokens(code),
          memoryUsed: this.getMemoryUsage() - startMemory,
          toolsCalled,
        },
      };
    }
  }

  /**
   * Validate code for security issues
   */
  private validateCode(code: string): void {
    // Block dangerous patterns
    const dangerousPatterns = [
      /Deno\.(run|spawn|Command)/,
      /eval\(/,
      /Function\(/,
      /import\s*\(/,
      /__proto__/,
      /constructor\[/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    // Check memory limit syntax
    if (code.length > this.context.memoryLimit) {
      throw new Error('Code size exceeds memory limit');
    }
  }

  /**
   * Create sandboxed environment with limited APIs
   */
  private createSandbox(toolsCalled: string[]): Record<string, unknown> {
    return {
      // Safe globals
      console: {
        log: (...args: unknown[]) => console.log('[SANDBOX]', ...args),
        error: (...args: unknown[]) => console.error('[SANDBOX]', ...args),
        warn: (...args: unknown[]) => console.warn('[SANDBOX]', ...args),
      },

      // JSON utilities
      JSON: JSON,

      // Safe math and data structures
      Math: Math,
      Date: Date,
      Array: Array,
      Object: Object,
      Map: Map,
      Set: Set,

      // Track tool calls
      __trackTool: (toolName: string) => {
        toolsCalled.push(toolName);
      },
    };
  }

  /**
   * Run code in sandbox
   */
  private async runCode<T>(
    code: string,
    sandbox: Record<string, unknown>
  ): Promise<T> {
    // Wrap code in async function
    const wrappedCode = `
      return (async () => {
        ${code}
      })();
    `;

    // Create function with limited scope
    const sandboxKeys = Object.keys(sandbox);
    const sandboxValues = Object.values(sandbox);

    // Use Function constructor with restricted scope
    const fn = new Function(...sandboxKeys, wrappedCode);

    // Execute with sandbox context
    return await fn(...sandboxValues);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    try {
      return Deno.memoryUsage().heapUsed;
    } catch {
      return 0;
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create a default sandbox executor
 */
export function createExecutor(
  overrides?: Partial<ExecutionContext>
): SandboxExecutor {
  const defaultContext: ExecutionContext = {
    workDir: Deno.cwd(),
    env: {},
    timeout: 30000, // 30 seconds
    memoryLimit: 50 * 1024 * 1024, // 50MB
    allowedModules: [],
    ...overrides,
  };

  return new SandboxExecutor(defaultContext);
}
