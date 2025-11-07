# MCP Code Execution System

> Based on Anthropic's article: [Code Execution with MCP: Building More Efficient AI Agents](https://www.anthropic.com/engineering/code-execution-with-mcp)

An efficient, secure code execution system for AI agents that interact with Model Context Protocol (MCP) servers. Achieve **98.7% token savings** by writing code instead of making direct tool calls.

## 🎯 Key Benefits

### 1. **Massive Token Savings**

- **Traditional**: Load all tool definitions upfront → 150,000 tokens
- **Code Execution**: Load tools on-demand → 2,000 tokens
- **Savings**: 98.7% reduction in context usage

### 2. **Context Efficiency**

- Process large datasets in sandbox
- Return only summaries to the model
- Example: Process 50k token document, return 200 token summary

### 3. **Privacy Preservation**

- Intermediate results stay in execution environment
- No sensitive data passes through model context
- Automatic tokenization of PII (future enhancement)

### 4. **State Persistence**

- Save automation workflows as reusable "skills"
- Build a library of tested patterns
- Share skills across team members

### 5. **Progressive Disclosure**

- Agents discover tools by exploring filesystem
- Load only what's needed for the task
- Natural navigation for AI models

## 🏗️ Architecture

```
mcp-executor/
├── runtime/
│   ├── types.ts                 # Core type definitions
│   ├── sandbox/
│   │   └── executor.ts          # Sandboxed code execution
│   ├── orchestrator/
│   │   └── main.ts              # Main orchestration layer
│   └── skills-manager.ts        # Persistent skill storage
│
├── servers/                     # MCP tool APIs (filesystem-based)
│   ├── supabase/
│   │   └── index.ts            # Supabase tools as code
│   ├── github/
│   │   └── index.ts            # GitHub tools as code
│   └── context7/
│       └── index.ts            # Context7 tools as code
│
├── skills/                      # Saved automation skills
│   └── *.ts                    # TypeScript skill files
│
└── examples/                    # Example workflows
    ├── 01-basic-supabase.ts
    ├── 02-token-efficiency.ts
    ├── 03-multi-server-workflow.ts
    └── 04-skills-reuse.ts
```

## 🚀 Quick Start

### Prerequisites

- [Deno](https://deno.land/) 1.40+
- MCP servers configured (Supabase, GitHub, Context7)
- PharmaSys project set up

### Installation

```bash
cd mcp-executor

# Initialize the system
deno run --allow-all runtime/orchestrator/main.ts

# Or use the task runner
deno task start
```

### Run Examples

```bash
# Basic Supabase operations
deno run --allow-all examples/01-basic-supabase.ts

# Token efficiency demonstration
deno run --allow-all examples/02-token-efficiency.ts

# Multi-server workflow
deno run --allow-all examples/03-multi-server-workflow.ts

# Skills system
deno run --allow-all examples/04-skills-reuse.ts
```

## 📚 Usage

### Basic Task Execution

```typescript
import { MCPOrchestrator } from './runtime/orchestrator/main.ts';
import type { AgentTask } from '@mcp/types';

const orchestrator = new MCPOrchestrator();
await orchestrator.initialize();

const task: AgentTask = {
  id: 'my-task',
  description: 'List Supabase tables',
  code: `
    const tables = await supabase.listTables(["public"]);
    return tables.map(t => t.name);
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result = await orchestrator.executeTask(task);
console.log(result.data);
```

### Multi-Server Workflow

```typescript
const task: AgentTask = {
  id: 'multi-server-task',
  description: 'Coordinate multiple MCP servers',
  code: `
    // Step 1: Query database
    const users = await supabase.executeSQL("SELECT * FROM users LIMIT 10");

    // Step 2: Process data (happens in sandbox)
    const userEmails = users.map(u => u.email);

    // Step 3: Create GitHub issue with findings
    await github.createIssue(
      "owner",
      "repo",
      "User Analysis",
      \`Found \${users.length} users\`
    );

    // Step 4: Lookup documentation
    const docs = await context7.getDocsByName("supabase-js", "RLS");

    // Return only the summary
    return {
      userCount: users.length,
      issueCreated: true,
      docsFound: docs.tokens > 0
    };
  `,
  requiredTools: ['supabase', 'github', 'context7'],
  status: 'pending',
};
```

### Skills System

```typescript
// Save a skill
await orchestrator.saveSkill(
  'db-backup-report',
  'Generate database backup report',
  `
    const tables = await supabase.listTables(["public"]);
    const migrations = await supabase.listMigrations();

    return {
      tables: tables.length,
      lastMigration: migrations[migrations.length - 1]?.name,
      timestamp: new Date().toISOString()
    };
  `,
  ['supabase', 'backup', 'reporting']
);

// Execute a skill
const result = await orchestrator.executeSkill('db-backup-report');

// Search skills
const skills = orchestrator.searchSkills('backup');
```

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation.

### Key Security Features

- **Sandboxed Execution**: Code runs in isolated environment
- **Pattern Blocking**: Dangerous code patterns automatically blocked
- **Resource Limits**: Timeout and memory constraints
- **Minimal Permissions**: Deno permission system for defense in depth
- **Audit Trail**: All tool calls logged and tracked

### Recommended Permissions

```bash
# Production
deno run \
  --allow-read=./servers,./skills \
  --allow-write=./skills \
  --allow-net=api.supabase.com,api.github.com \
  --no-prompt \
  runtime/orchestrator/main.ts
```

## 📊 Token Efficiency Example

### Traditional Approach

```
1. Load all 100 tool definitions → 50,000 tokens
2. Fetch 50 documents → 100,000 tokens
3. Return documents to model → 100,000 tokens again
4. Model processes → Another context pass

Total: ~250,000 tokens
```

### Code Execution Approach

```
1. Load tool discovery code → 500 tokens
2. Agent writes processing code → 1,000 tokens
3. Sandbox fetches & processes → 0 tokens (not in context)
4. Return summary only → 500 tokens

Total: ~2,000 tokens (98.7% savings!)
```

## 🛠️ Available Servers

### Supabase

- `listTables()` - List database tables
- `executeSQL()` - Execute queries
- `applyMigration()` - Apply migrations
- `listEdgeFunctions()` - List Edge Functions
- `deployEdgeFunction()` - Deploy functions
- `getAdvisors()` - Security/performance checks
- And more...

### GitHub

- `createRepository()` - Create repos
- `listIssues()` - List issues
- `createPullRequest()` - Create PRs
- `getFileContents()` - Get file contents
- `pushFiles()` - Push multiple files
- `searchCode()` - Search codebase
- And more...

### Context7

- `resolveLibraryId()` - Resolve library IDs
- `getLibraryDocs()` - Fetch documentation
- `getDocsByName()` - Get docs by name
- `compareLibraries()` - Compare libraries

## 🧪 Development

### Run Tests

```bash
deno task test
```

### Watch Mode

```bash
deno task dev
```

### Format Code

```bash
deno fmt
```

### Lint

```bash
deno lint
```

## 📈 Monitoring

```typescript
// Get orchestrator statistics
const stats = orchestrator.getStats();
console.log(stats);
// {
//   servers: 3,
//   tools: 45,
//   skills: 12,
//   activeTasks: 2,
//   maxConcurrentTasks: 5
// }

// Get execution result stats
const result = await orchestrator.executeTask(task);
console.log(result.stats);
// {
//   duration: 234,
//   tokensUsed: 1250,
//   memoryUsed: 2048576,
//   toolsCalled: ["supabase.listTables", "supabase.executeSQL"]
// }
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

Same as PharmaSys project

## 🙏 Acknowledgments

Based on Anthropic's research and best practices for efficient AI agent architectures.

## 🔗 Resources

- [Anthropic Article](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Deno Documentation](https://deno.land/manual)

---

**Built with ❤️ for PharmaSys**
