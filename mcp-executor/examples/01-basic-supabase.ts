/**
 * Example 1: Basic Supabase Operations
 * Demonstrates listing tables and executing queries with token efficiency
 */

import { MCPOrchestrator } from '../runtime/orchestrator/main.ts';
import type { AgentTask } from '@mcp/types';

const orchestrator = new MCPOrchestrator({
  sandboxMode: true,
  enableSkillPersistence: true,
});

await orchestrator.initialize();

console.log('📚 Example 1: Basic Supabase Operations\n');

// Task 1: List all tables
const task1: AgentTask = {
  id: 'supabase-list-tables',
  description: 'List all database tables',
  code: `
    // List tables in public schema
    const tables = await supabase.listTables(["public"]);

    // Filter and format results (processing happens in sandbox, not in context)
    const tableNames = tables.map(t => t.name);

    console.log("Found tables:", tableNames);

    return {
      count: tableNames.length,
      tables: tableNames
    };
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result1 = await orchestrator.executeTask(task1);
console.log('\n✅ Task 1 Result:', result1.data);
console.log(
  '   Token efficiency: Processing happened in sandbox, only summary returned'
);

// Task 2: Query and process data
const task2: AgentTask = {
  id: 'supabase-query-data',
  description: 'Query users and compute statistics',
  code: `
    // Execute query to get all users
    const users = await supabase.executeSQL(\`
      SELECT id, email, created_at, role
      FROM auth.users
      LIMIT 100
    \`);

    // Process data in sandbox (no token usage for raw data)
    const stats = {
      total: users.length,
      roles: users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
      recentSignups: users
        .filter(u => {
          const created = new Date(u.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return created > weekAgo;
        })
        .length
    };

    // Return only the processed summary
    return stats;
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result2 = await orchestrator.executeTask(task2);
console.log('\n✅ Task 2 Result:', result2.data);
console.log('   Token savings: Processed 100 user records → returned 3 stats');

// Save as a reusable skill
await orchestrator.saveSkill(
  'user-stats',
  'Compute user statistics from database',
  task2.code!,
  ['supabase', 'analytics', 'users']
);

console.log("\n💾 Saved 'user-stats' skill for future reuse");

// Show final stats
console.log('\n📊 Orchestrator Stats:', orchestrator.getStats());
