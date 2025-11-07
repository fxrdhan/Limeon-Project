/**
 * Example 4: Skills System
 * Demonstrates creating, saving, and reusing automation skills
 */

import { MCPOrchestrator } from '../runtime/orchestrator/main.ts';

const orchestrator = new MCPOrchestrator({
  enableSkillPersistence: true,
  skillsDir: './skills',
});

await orchestrator.initialize();

console.log('🎯 Example 4: Skills System - Reusable Automation\n');

// Create and save multiple skills
console.log('📚 Creating reusable skills...\n');

// Skill 1: Database Health Check
await orchestrator.saveSkill(
  'db-health-check',
  'Comprehensive database health check with security advisors',
  `
// Get table information
const tables = await supabase.listTables(["public"]);
console.log(\`Found \${tables.length} tables\`);

// Check security advisors
const securityAdvisors = await supabase.getAdvisors("security");
const performanceAdvisors = await supabase.getAdvisors("performance");

// Check recent migrations
const migrations = await supabase.listMigrations();
const recentMigrations = migrations.slice(-5);

// Return health report
return {
  timestamp: new Date().toISOString(),
  tables: {
    count: tables.length,
    names: tables.map(t => t.name)
  },
  security: {
    issues: securityAdvisors.length,
    critical: securityAdvisors.filter(a => a.level === "critical").length
  },
  performance: {
    issues: performanceAdvisors.length,
    warnings: performanceAdvisors.filter(a => a.level === "warning").length
  },
  migrations: {
    total: migrations.length,
    recent: recentMigrations.map(m => ({ name: m.name, version: m.version }))
  },
  status: securityAdvisors.filter(a => a.level === "critical").length === 0 ? "healthy" : "needs_attention"
};
  `,
  ['supabase', 'monitoring', 'health-check']
);
console.log('  ✓ Saved: db-health-check');

// Skill 2: Issue Triage
await orchestrator.saveSkill(
  'issue-triage',
  'Automatically triage and label new GitHub issues',
  `
// Fetch recent issues (params.owner and params.repo should be provided)
const issues = await github.searchIssues(
  \`repo:\${params.owner}/\${params.repo} is:issue is:open no:label\`
);

console.log(\`Found \${issues.items.length} unlabeled issues\`);

const triaged = [];

for (const issue of issues.items.slice(0, 5)) {
  const labels = [];
  const title = issue.title.toLowerCase();
  const body = (issue.body || "").toLowerCase();

  // Auto-label based on keywords
  if (title.includes("bug") || body.includes("error")) {
    labels.push("bug");
  }
  if (title.includes("feature") || title.includes("enhancement")) {
    labels.push("enhancement");
  }
  if (body.includes("documentation") || body.includes("docs")) {
    labels.push("documentation");
  }
  if (title.includes("urgent") || title.includes("critical")) {
    labels.push("priority: high");
  }

  // Apply labels if any were identified
  if (labels.length > 0) {
    await github.updateIssue(params.owner, params.repo, issue.number, { labels });
    triaged.push({
      number: issue.number,
      title: issue.title,
      appliedLabels: labels
    });
    console.log(\`  → Issue #\${issue.number}: Applied \${labels.join(", ")}\`);
  }
}

return {
  processed: issues.items.length,
  triaged: triaged.length,
  issues: triaged
};
  `,
  ['github', 'automation', 'issue-management']
);
console.log('  ✓ Saved: issue-triage');

// Skill 3: Documentation Finder
await orchestrator.saveSkill(
  'find-docs',
  'Find and summarize documentation for multiple libraries',
  `
// params.libraries should be an array of library names
const libraries = params.libraries || ["react", "typescript"];
const topic = params.topic || "best practices";

console.log(\`Fetching docs for: \${libraries.join(", ")}\`);

const results = {};

for (const lib of libraries) {
  try {
    const docs = await context7.getDocsByName(lib, topic, 2000);
    results[lib] = {
      found: true,
      preview: docs.content.substring(0, 200) + "...",
      tokens: docs.tokens
    };
    console.log(\`  ✓ Found docs for \${lib}\`);
  } catch (error) {
    results[lib] = {
      found: false,
      error: error.message
    };
    console.log(\`  ✗ Failed to find docs for \${lib}\`);
  }
}

return {
  topic,
  libraries: Object.keys(results),
  results
};
  `,
  ['context7', 'documentation', 'research']
);
console.log('  ✓ Saved: find-docs\n');

// List all skills
console.log('📚 Available Skills:');
const skills = orchestrator.listSkills();
skills.forEach(skill => {
  console.log(
    `  • ${skill.name} - ${skill.description} (used ${skill.usageCount}x)`
  );
  console.log(`    Tags: ${skill.tags.join(', ')}`);
});

// Execute a skill
console.log("\n🚀 Executing 'db-health-check' skill...\n");
const healthResult = await orchestrator.executeSkill('db-health-check');

if (healthResult.success) {
  console.log('✅ Health Check Results:');
  console.log(JSON.stringify(healthResult.data, null, 2));
} else {
  console.log('❌ Health check failed:', healthResult.error);
}

// Execute skill with parameters
console.log("\n🚀 Executing 'find-docs' skill with parameters...\n");
const docsResult = await orchestrator.executeSkill('find-docs', {
  libraries: ['supabase-js', 'react-query', 'zustand'],
  topic: 'state management',
});

if (docsResult.success) {
  console.log('✅ Documentation Search Results:');
  console.log(JSON.stringify(docsResult.data, null, 2));
} else {
  console.log('❌ Documentation search failed:', docsResult.error);
}

// Search for skills
console.log("\n🔍 Search skills by keyword: 'automation'");
const automationSkills = orchestrator.searchSkills('automation');
console.log(`Found ${automationSkills.length} skills:`);
automationSkills.forEach(skill => {
  console.log(`  • ${skill.name}: ${skill.description}`);
});

// Show updated stats
console.log('\n📊 Final Statistics:');
const stats = orchestrator.getStats();
console.log(`  Servers: ${stats.servers}`);
console.log(`  Tools: ${stats.tools}`);
console.log(`  Skills: ${stats.skills}`);
console.log(`  Active tasks: ${stats.activeTasks}`);

console.log('\n💡 Skills Benefits:');
console.log('  ✓ Write once, reuse many times');
console.log('  ✓ Build a library of automation patterns');
console.log('  ✓ Share skills across team members');
console.log('  ✓ Track usage and iterate on popular skills');
console.log('  ✓ Compose complex workflows from simple skills');
