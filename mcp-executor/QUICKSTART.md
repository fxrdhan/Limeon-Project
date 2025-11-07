# Quick Start Guide

Get up and running with MCP Code Execution in 5 minutes!

## Step 1: Install Deno

If you haven't already:

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

Verify installation:

```bash
deno --version
```

## Step 2: Test the System

Navigate to the MCP executor directory:

```bash
cd mcp-executor
```

Run the basic example:

```bash
deno run --allow-all examples/01-basic-supabase.ts
```

Expected output:

```
📚 Example 1: Basic Supabase Operations

[Supabase] Listing tables in schemas: public
Found tables: [...]

✅ Task 1 Result: { count: 5, tables: [...] }
   Token efficiency: Processing happened in sandbox, only summary returned

💾 Saved 'user-stats' skill for future reuse
```

## Step 3: Run Token Efficiency Demo

See the 98.7% token savings in action:

```bash
deno run --allow-all examples/02-token-efficiency.ts
```

This demonstrates:

- Processing 50 large documents
- Extracting insights in sandbox
- Returning only summary (huge token savings!)

## Step 4: Try Multi-Server Workflow

Coordinate multiple MCP servers:

```bash
deno run --allow-all examples/03-multi-server-workflow.ts
```

This shows:

- Fetching GitHub PR details
- Checking database schema
- Looking up documentation
- All in one automated workflow!

## Step 5: Explore the Skills System

Learn about reusable automation:

```bash
deno run --allow-all examples/04-skills-reuse.ts
```

This demonstrates:

- Creating reusable skills
- Executing saved skills
- Searching skills library
- Building automation library

## Step 6: Build Your Own Workflow

Create a new file:

```typescript
// my-workflow.ts
import { MCPOrchestrator } from './runtime/orchestrator/main.ts';
import type { AgentTask } from '@mcp/types';

const orchestrator = new MCPOrchestrator();
await orchestrator.initialize();

const task: AgentTask = {
  id: 'my-custom-task',
  description: 'Your task description',
  code: `
    // Your automation code here
    // Access MCP servers: supabase, github, context7

    const tables = await supabase.listTables(["public"]);
    console.log("Tables:", tables);

    return { success: true, tableCount: tables.length };
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result = await orchestrator.executeTask(task);
console.log(result);
```

Run it:

```bash
deno run --allow-all my-workflow.ts
```

## Common Use Cases

### 1. Database Operations

```typescript
code: `
  const tables = await supabase.listTables(["public"]);
  const advisors = await supabase.getAdvisors("security");
  return { tables: tables.length, securityIssues: advisors.length };
`;
```

### 2. GitHub Automation

```typescript
code: `
  const issues = await github.listIssues("owner", "repo", "OPEN");
  const unlabeled = issues.filter(i => i.labels.length === 0);

  for (const issue of unlabeled) {
    await github.updateIssue("owner", "repo", issue.number, {
      labels: ["needs-triage"]
    });
  }

  return { processed: unlabeled.length };
`;
```

### 3. Documentation Lookup

```typescript
code: `
  const docs = await context7.getDocsByName("react", "hooks", 3000);
  const summary = docs.content.substring(0, 500);
  return { found: true, preview: summary };
`;
```

### 4. Combined Workflow

```typescript
code: `
  // 1. Check database
  const tables = await supabase.listTables(["public"]);

  // 2. Create GitHub issue if problems found
  if (tables.length === 0) {
    await github.createIssue(
      "owner",
      "repo",
      "Database Empty",
      "No tables found in public schema"
    );
  }

  // 3. Get documentation
  const docs = await context7.getDocsByName("supabase-js", "migrations");

  return {
    tableCount: tables.length,
    issueCreated: tables.length === 0,
    docsAvailable: docs.tokens > 0
  };
`;
```

## Tips & Best Practices

### 1. **Process Data in Sandbox**

❌ Bad (wastes tokens):

```typescript
const users = await supabase.executeSQL('SELECT * FROM users');
return users; // Returns all data to context!
```

✅ Good (efficient):

```typescript
const users = await supabase.executeSQL('SELECT * FROM users');
const stats = {
  total: users.length,
  active: users.filter(u => u.active).length,
};
return stats; // Returns only summary
```

### 2. **Use Skills for Repetitive Tasks**

```typescript
// Save commonly used workflows
await orchestrator.saveSkill(
  'weekly-report',
  'Generate weekly stats report',
  code,
  ['reporting', 'analytics']
);

// Reuse anytime
const result = await orchestrator.executeSkill('weekly-report');
```

### 3. **Coordinate Multiple Servers**

```typescript
// Combine different MCP servers in one task
code: `
  const dbStats = await supabase.executeSQL("...");
  const prData = await github.getPullRequest(...);
  const docs = await context7.getDocsByName(...);

  // Process all together
  return combinedReport;
`;
```

### 4. **Handle Errors Gracefully**

```typescript
code: `
  try {
    const data = await supabase.executeSQL("...");
    return { success: true, data };
  } catch (error) {
    console.error("Query failed:", error);
    return { success: false, error: error.message };
  }
`;
```

## Next Steps

1. **Read the [README](./README.md)** for complete documentation
2. **Check [SECURITY.md](./SECURITY.md)** for security best practices
3. **Explore the examples** in the `examples/` directory
4. **Build your own skills** for common automation tasks
5. **Share skills** with your team

## Troubleshooting

### "MCP orchestrator not initialized"

Make sure you call `await orchestrator.initialize()` before executing tasks.

### "Dangerous pattern detected"

Your code contains blocked patterns. Check [SECURITY.md](./SECURITY.md) for the list.

### "Execution timeout exceeded"

Increase the timeout:

```typescript
const orchestrator = new MCPOrchestrator({
  defaultTimeout: 60000, // 60 seconds
});
```

### Permission Errors

Make sure you're running with appropriate Deno permissions:

```bash
deno run --allow-all script.ts
```

For production, use minimal permissions (see README).

## Need Help?

- Check the [examples/](./examples) directory
- Read the [README.md](./README.md)
- Review [SECURITY.md](./SECURITY.md)
- Check Anthropic's article: https://www.anthropic.com/engineering/code-execution-with-mcp

---

Happy automating! 🚀
