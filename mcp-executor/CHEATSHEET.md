# MCP Code Execution Cheat Sheet

Quick reference for common operations and patterns.

## 🚀 Getting Started

```bash
# Initialize orchestrator
import { MCPOrchestrator } from "./runtime/orchestrator/main.ts";

const orchestrator = new MCPOrchestrator({
  sandboxMode: true,
  enableSkillPersistence: true,
  defaultTimeout: 30000
});

await orchestrator.initialize();
```

## 📝 Task Execution

### Basic Task

```typescript
const task = {
  id: 'unique-id',
  description: 'What the task does',
  code: `
    // Your code here
    return result;
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result = await orchestrator.executeTask(task);
```

### With Error Handling

```typescript
const task = {
  id: 'safe-task',
  description: 'Task with error handling',
  code: `
    try {
      const data = await supabase.listTables(["public"]);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};
```

## 🗄️ Supabase Operations

### List Tables

```typescript
const tables = await supabase.listTables(['public', 'auth']);
```

### Execute SQL

```typescript
const users = await supabase.executeSQL(`
  SELECT id, email, created_at
  FROM auth.users
  WHERE created_at > NOW() - INTERVAL '7 days'
`);
```

### Apply Migration

```typescript
await supabase.applyMigration(
  'add_users_table',
  `
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
`
);
```

### Check Security

```typescript
const advisors = await supabase.getAdvisors('security');
const critical = advisors.filter(a => a.level === 'critical');
```

### Edge Functions

```typescript
// List functions
const functions = await supabase.listEdgeFunctions();

// Deploy function
await supabase.deployEdgeFunction('my-function', [
  { name: 'index.ts', content: '...' },
]);
```

## 🐙 GitHub Operations

### List Issues

```typescript
const issues = await github.listIssues('owner', 'repo', 'OPEN');
```

### Create Issue

```typescript
await github.createIssue(
  'owner',
  'repo',
  'Bug: Something broke',
  'Description of the issue',
  ['bug', 'priority:high']
);
```

### Create PR

```typescript
await github.createPullRequest(
  'owner',
  'repo',
  'Add new feature',
  'feature-branch',
  'main',
  '## Changes\n- Added feature X\n- Fixed bug Y'
);
```

### Search Code

```typescript
const results = await github.searchCode(
  'repo:owner/repo language:typescript function'
);
```

### Get File Contents

```typescript
const content = await github.getFileContents('owner', 'repo', 'src/index.ts');
```

### Push Multiple Files

```typescript
await github.pushFiles(
  'owner',
  'repo',
  'main',
  [
    { path: 'file1.ts', content: '...' },
    { path: 'file2.ts', content: '...' },
  ],
  'Update multiple files'
);
```

## 📚 Context7 Operations

### Get Documentation

```typescript
const docs = await context7.getDocsByName(
  'react',
  'hooks',
  3000 // max tokens
);
```

### Resolve Library ID

```typescript
const libraries = await context7.resolveLibraryId('supabase');
const libraryId = libraries[0].id;
```

### Compare Libraries

```typescript
const comparison = await context7.compareLibraries(
  ['react', 'vue', 'svelte'],
  'state management',
  2000
);
```

## 💾 Skills System

### Save Skill

```typescript
await orchestrator.saveSkill(
  'skill-name',
  'What the skill does',
  `
    // Skill code
    return result;
  `,
  ['tag1', 'tag2']
);
```

### Execute Skill

```typescript
const result = await orchestrator.executeSkill('skill-name');
```

### Execute Skill with Params

```typescript
const result = await orchestrator.executeSkill('skill-name', {
  param1: 'value1',
  param2: 'value2',
});
```

### List Skills

```typescript
const skills = orchestrator.listSkills();
```

### Search Skills

```typescript
const found = orchestrator.searchSkills('automation');
```

## 🔄 Common Patterns

### Database + GitHub Integration

```typescript
code: `
  // 1. Check database
  const tables = await supabase.listTables(["public"]);
  const advisors = await supabase.getAdvisors("security");

  // 2. Create issue if problems
  if (advisors.length > 0) {
    await github.createIssue(
      "owner",
      "repo",
      "Database Security Issues",
      \`Found \${advisors.length} issues\`,
      ["security", "database"]
    );
  }

  return { tables: tables.length, issues: advisors.length };
`;
```

### Data Processing (Token Efficient)

```typescript
code: `
  // Fetch large dataset
  const records = await supabase.executeSQL("SELECT * FROM large_table");

  // Process in sandbox (no tokens!)
  const stats = {
    total: records.length,
    active: records.filter(r => r.status === 'active').length,
    categories: records.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {})
  };

  // Return only summary
  return stats;
`;
```

### Multi-Step Workflow

```typescript
code: `
  console.log("Step 1: Fetch data");
  const data = await supabase.executeSQL("...");

  console.log("Step 2: Process");
  const processed = data.map(/* transform */);

  console.log("Step 3: Create report");
  const report = { /* summary */ };

  console.log("Step 4: Post to GitHub");
  await github.createIssue("owner", "repo", "Report", JSON.stringify(report));

  return report;
`;
```

## 📊 Monitoring

### Get Stats

```typescript
const stats = orchestrator.getStats();
// {
//   servers: 3,
//   tools: 45,
//   skills: 12,
//   activeTasks: 2,
//   maxConcurrentTasks: 5
// }
```

### Execution Stats

```typescript
const result = await orchestrator.executeTask(task);
console.log(result.stats);
// {
//   duration: 234,
//   tokensUsed: 1250,
//   memoryUsed: 2048576,
//   toolsCalled: [...]
// }
```

## 🔒 Security

### Blocked Patterns

```typescript
// ❌ These will be blocked:
eval('code');
new Function('code');
import('dynamic');
Deno.run({ cmd: ['ls'] });
__proto__;
```

### Safe Patterns

```typescript
// ✅ These are safe:
JSON.parse(data);
console.log(message);
Array.map();
Math.random();
await supabase.listTables();
```

## ⚙️ Configuration

### Orchestrator Options

```typescript
const orchestrator = new MCPOrchestrator({
  sandboxMode: true, // Enable sandbox
  maxConcurrentTasks: 5, // Max parallel tasks
  defaultTimeout: 30000, // 30 seconds
  enableSkillPersistence: true, // Save skills
  skillsDir: './skills', // Skills directory
});
```

### Custom Timeout

```typescript
const executor = createExecutor({
  timeout: 60000, // 60 seconds
  memoryLimit: 100 * 1024 * 1024, // 100MB
});
```

## 🎯 Best Practices

### ✅ Do

- Process data in sandbox
- Return only summaries
- Use skills for repeated tasks
- Handle errors gracefully
- Add console.log for debugging

### ❌ Don't

- Return large datasets to context
- Use eval or Function()
- Spawn processes
- Access **proto**
- Ignore timeouts

## 🐛 Debugging

### Add Logging

```typescript
code: `
  console.log("Starting task...");

  const data = await supabase.listTables(["public"]);
  console.log("Found tables:", data.length);

  return data;
`;
```

### Check Execution Stats

```typescript
const result = await orchestrator.executeTask(task);

if (!result.success) {
  console.error('Task failed:', result.error);
  console.log('Duration:', result.stats.duration);
  console.log('Tools called:', result.stats.toolsCalled);
}
```

## 📖 Quick Reference

| Operation               | Token Usage |
| ----------------------- | ----------- |
| Load all tools upfront  | ~150,000    |
| Code execution approach | ~2,000      |
| Savings                 | 98.7%       |

| Resource         | Default | Max   |
| ---------------- | ------- | ----- |
| Timeout          | 30s     | 60s   |
| Memory           | 50MB    | 100MB |
| Concurrent Tasks | 5       | 10    |

| Server   | Tools Available |
| -------- | --------------- |
| Supabase | 20+             |
| GitHub   | 30+             |
| Context7 | 5+              |

## 🔗 Links

- [README.md](./README.md) - Full documentation
- [QUICKSTART.md](./QUICKSTART.md) - Get started
- [SECURITY.md](./SECURITY.md) - Security guide
- [INTEGRATION.md](./INTEGRATION.md) - Integration guide
- [Examples](./examples/) - Code examples

---

**Quick tip**: Start with QUICKSTART.md, then explore examples!
