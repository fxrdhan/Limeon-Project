/**
 * Example 3: Multi-Server Workflow
 * Demonstrates coordinating multiple MCP servers in a single task
 */

import { MCPOrchestrator } from '../runtime/orchestrator/main.ts';
import type { AgentTask } from '@mcp/types';

const orchestrator = new MCPOrchestrator();
await orchestrator.initialize();

console.log('🔄 Example 3: Multi-Server Workflow\n');
console.log('Scenario: Automated code review with documentation lookup\n');

// Task: Review code changes and suggest improvements with documentation links
const task: AgentTask = {
  id: 'code-review-with-docs',
  description: 'Review PR, check DB schema, suggest improvements with docs',
  code: `
    console.log("Step 1: Fetch Pull Request details");
    const pr = await github.getPullRequest("fxrdhan", "PharmaSys", 1);
    console.log(\`  → PR #\${pr.number}: \${pr.title}\`);

    console.log("\\nStep 2: Get PR files and diffs");
    const files = await github.callMCPTool("mcp__github__pull_request_read", {
      method: "get_files",
      owner: "fxrdhan",
      repo: "PharmaSys",
      pullNumber: 1
    });

    console.log(\`  → \${files.length} files changed\`);

    console.log("\\nStep 3: Check database schema impact");
    // Look for migration files
    const hasMigrations = files.some(f =>
      f.filename.includes('migration') || f.filename.includes('supabase/migrations')
    );

    let schemaChanges = [];
    if (hasMigrations) {
      const tables = await supabase.listTables(["public"]);
      console.log(\`  → Current schema has \${tables.length} tables\`);

      // Check for potential RLS issues
      const advisors = await supabase.getAdvisors("security");
      schemaChanges = advisors.filter(a => a.category === "RLS");
    }

    console.log("\\nStep 4: Identify technologies and fetch documentation");
    const technologies = new Set();

    // Analyze file extensions and imports
    files.forEach(file => {
      if (file.filename.endsWith('.tsx') || file.filename.endsWith('.ts')) {
        technologies.add('react');
        technologies.add('typescript');
      }
      if (file.patch?.includes('supabase')) {
        technologies.add('supabase-js');
      }
      if (file.patch?.includes('@tanstack/react-query')) {
        technologies.add('react-query');
      }
    });

    console.log(\`  → Detected technologies: \${Array.from(technologies).join(", ")}\`);

    // Fetch relevant documentation
    const docs = {};
    for (const tech of Array.from(technologies).slice(0, 2)) {
      try {
        const techDocs = await context7.getDocsByName(tech, "best practices", 2000);
        docs[tech] = techDocs;
        console.log(\`  → Fetched docs for \${tech}\`);
      } catch (error) {
        console.log(\`  → Failed to fetch docs for \${tech}\`);
      }
    }

    console.log("\\nStep 5: Generate review summary");
    const review = {
      pr: {
        number: pr.number,
        title: pr.title,
        filesChanged: files.length
      },
      schemaImpact: {
        hasMigrations,
        securityIssues: schemaChanges.length,
        issues: schemaChanges.map(c => ({
          type: c.type,
          message: c.message
        }))
      },
      technologies: Array.from(technologies),
      recommendations: [],
      documentationLinks: Object.keys(docs)
    };

    // Generate recommendations based on findings
    if (schemaChanges.length > 0) {
      review.recommendations.push({
        severity: "high",
        message: "Security advisors flagged potential RLS issues. Review before merging."
      });
    }

    if (technologies.has('react-query') && technologies.has('supabase-js')) {
      review.recommendations.push({
        severity: "medium",
        message: "Consider using React Query's optimistic updates for better UX"
      });
    }

    // Return comprehensive review (all processing done in sandbox)
    return review;
  `,
  requiredTools: ['github', 'supabase', 'context7'],
  status: 'pending',
};

console.log('🤖 Executing multi-server workflow...\n');
const result = await orchestrator.executeTask(task);

console.log('\n' + '='.repeat(60));
console.log('📋 Code Review Summary');
console.log('='.repeat(60));
console.log(JSON.stringify(result.data, null, 2));

console.log('\n' + '='.repeat(60));
console.log('📊 Execution Statistics');
console.log('='.repeat(60));
console.log(`Duration: ${result.stats.duration}ms`);
console.log(`Tokens used: ${result.stats.tokensUsed}`);
console.log(`Tools called: ${result.stats.toolsCalled.length}`);
console.log(`  → ${result.stats.toolsCalled.join('\\n  → ')}`);

console.log('\n💡 Key Benefits:');
console.log('  ✓ Coordinated 3 MCP servers in one task');
console.log('  ✓ All data processing happened in sandbox');
console.log('  ✓ Only final summary consumed context tokens');
console.log('  ✓ Complex logic executed without bloating context');

// Save this workflow as a reusable skill
await orchestrator.saveSkill(
  'pr-review-with-docs',
  'Automated PR review with schema checks and documentation lookup',
  task.code!,
  ['github', 'supabase', 'context7', 'automation', 'code-review']
);

console.log('\n💾 Workflow saved as reusable skill!');
