/**
 * Comprehensive Supabase MCP Tools Test
 * Tests all 20 Supabase MCP tools systematically
 */

import { initializeMCPExecutor } from '../setup.ts';
import type { AgentTask } from '@mcp/types';

console.log('═══════════════════════════════════════════════════════');
console.log('  🧪 COMPREHENSIVE SUPABASE MCP TOOLS TEST');
console.log('  Testing all 20 Supabase MCP tools');
console.log('═══════════════════════════════════════════════════════\n');

const orchestrator = await initializeMCPExecutor();

interface TestResult {
  category: string;
  tool: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️ SKIP';
  duration?: number;
  error?: string;
  data?: unknown;
}

const results: TestResult[] = [];

async function runTest(
  category: string,
  tool: string,
  code: string,
  shouldSkip = false
): Promise<TestResult> {
  if (shouldSkip) {
    console.log(`⚠️  Skipping ${tool} (destructive operation)`);
    return { category, tool, status: '⚠️ SKIP' };
  }

  console.log(`🔬 Testing ${tool}...`);

  const task: AgentTask = {
    id: `test-${tool}`,
    description: `Test ${tool}`,
    code,
    requiredTools: ['supabase'],
    status: 'pending',
  };

  try {
    const result = await orchestrator.executeTask(task);

    if (result.success) {
      console.log(`   ✅ PASS (${result.stats.duration}ms)\n`);
      return {
        category,
        tool,
        status: '✅ PASS',
        duration: result.stats.duration,
        data: result.data,
      };
    } else {
      console.log(`   ❌ FAIL: ${result.error?.message}\n`);
      return {
        category,
        tool,
        status: '❌ FAIL',
        error: result.error?.message,
      };
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}\n`);
    return {
      category,
      tool,
      status: '❌ FAIL',
      error: String(error),
    };
  }
}

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 1: DATABASE SCHEMA                          ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 1: listTables
results.push(
  await runTest(
    'Database Schema',
    'listTables',
    `
  const tables = await supabase.listTables(["public"]);
  return { count: tables.length, sample: tables.slice(0, 3).map(t => t.name) };
`
  )
);

// Test 2: listExtensions
results.push(
  await runTest(
    'Database Schema',
    'listExtensions',
    `
  const extensions = await supabase.listExtensions();
  return { count: extensions.length, sample: extensions.slice(0, 5).map(e => e.name) };
`
  )
);

// Test 3: executeSQL (read-only)
results.push(
  await runTest(
    'Database Schema',
    'executeSQL',
    `
  const result = await supabase.executeSQL("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
  return { result };
`
  )
);

// Test 4: generateTypes
results.push(
  await runTest(
    'Database Schema',
    'generateTypes',
    `
  const types = await supabase.generateTypes();
  return { hasTypes: types && types.length > 0, preview: String(types).substring(0, 200) };
`
  )
);

// Test 5: applyMigration (SKIP - destructive)
results.push(
  await runTest(
    'Database Schema',
    'applyMigration',
    '',
    true // Skip destructive operations
  )
);

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 2: MIGRATIONS                               ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 6: listMigrations
results.push(
  await runTest(
    'Migrations',
    'listMigrations',
    `
  const migrations = await supabase.listMigrations();
  return {
    count: migrations.length,
    recent: migrations.slice(-3).map(m => ({ version: m.version, name: m.name }))
  };
`
  )
);

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 3: EDGE FUNCTIONS                           ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 7: listEdgeFunctions
results.push(
  await runTest(
    'Edge Functions',
    'listEdgeFunctions',
    `
  const functions = await supabase.listEdgeFunctions();
  return {
    count: functions.length,
    names: functions.map(f => f.name)
  };
`
  )
);

// Test 8: getEdgeFunction (conditional - only if functions exist)
results.push(
  await runTest(
    'Edge Functions',
    'getEdgeFunction',
    `
  const functions = await supabase.listEdgeFunctions();
  if (functions.length === 0) {
    return { message: "No edge functions to test" };
  }
  const fn = await supabase.getEdgeFunction(functions[0].name);
  return { name: fn.name, hasSource: !!fn.entrypoint_path };
`
  )
);

// Test 9: deployEdgeFunction (SKIP - destructive)
results.push(await runTest('Edge Functions', 'deployEdgeFunction', '', true));

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 4: PROJECT INFORMATION                      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 10: getProjectURL
results.push(
  await runTest(
    'Project Info',
    'getProjectURL',
    `
  const url = await supabase.getProjectURL();
  return { url, isValid: url && url.length > 0 };
`
  )
);

// Test 11: getPublishableKeys
results.push(
  await runTest(
    'Project Info',
    'getPublishableKeys',
    `
  const keys = await supabase.getPublishableKeys();
  return {
    hasKeys: Array.isArray(keys) && keys.length > 0,
    count: Array.isArray(keys) ? keys.length : 0
  };
`
  )
);

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 5: DOCUMENTATION                            ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 12: searchDocs
results.push(
  await runTest(
    'Documentation',
    'searchDocs',
    `
  const query = \`{
    searchDocs(query: "authentication", limit: 3) {
      nodes {
        title
        href
      }
    }
  }\`;
  const docs = await supabase.searchDocs(query);
  return {
    hasResults: !!docs,
    preview: docs
  };
`
  )
);

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 6: BRANCHING                                ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 13: listBranches
results.push(
  await runTest(
    'Branching',
    'listBranches',
    `
  const branches = await supabase.listBranches();
  return {
    count: branches.length,
    branches: branches.map(b => ({ id: b.id, name: b.name, status: b.status }))
  };
`
  )
);

// Test 14-18: Branch operations (SKIP - destructive)
results.push(await runTest('Branching', 'createBranch', '', true));
results.push(await runTest('Branching', 'deleteBranch', '', true));
results.push(await runTest('Branching', 'mergeBranch', '', true));
results.push(await runTest('Branching', 'resetBranch', '', true));
results.push(await runTest('Branching', 'rebaseBranch', '', true));

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  CATEGORY 7: MONITORING                               ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Test 19: getLogs
results.push(
  await runTest(
    'Monitoring',
    'getLogs',
    `
  const logs = await supabase.getLogs("api");
  return {
    hasLogs: Array.isArray(logs) && logs.length > 0,
    count: Array.isArray(logs) ? logs.length : 0,
    sample: Array.isArray(logs) ? logs.slice(0, 2) : []
  };
`
  )
);

// Test 20: getAdvisors
results.push(
  await runTest(
    'Monitoring',
    'getAdvisors',
    `
  const advisors = await supabase.getAdvisors("security");
  return {
    hasAdvisors: Array.isArray(advisors),
    count: Array.isArray(advisors) ? advisors.length : 0,
    issues: Array.isArray(advisors) ? advisors.map(a => a.name) : []
  };
`
  )
);

console.log('\n═══════════════════════════════════════════════════════');
console.log('  📊 TEST RESULTS SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');

// Group results by category
const categories = [...new Set(results.map(r => r.category))];

for (const category of categories) {
  const categoryResults = results.filter(r => r.category === category);
  const passed = categoryResults.filter(r => r.status === '✅ PASS').length;
  const failed = categoryResults.filter(r => r.status === '❌ FAIL').length;
  const skipped = categoryResults.filter(r => r.status === '⚠️ SKIP').length;

  console.log(`\n📁 ${category}`);
  console.log(
    `   Total: ${categoryResults.length} | Pass: ${passed} | Fail: ${failed} | Skip: ${skipped}`
  );

  for (const result of categoryResults) {
    console.log(`   ${result.status} ${result.tool}`);
    if (result.error) {
      console.log(`      Error: ${result.error.substring(0, 80)}...`);
    }
  }
}

// Overall stats
const totalPassed = results.filter(r => r.status === '✅ PASS').length;
const totalFailed = results.filter(r => r.status === '❌ FAIL').length;
const totalSkipped = results.filter(r => r.status === '⚠️ SKIP').length;
const totalTested = totalPassed + totalFailed;

console.log('\n' + '═'.repeat(60));
console.log('  🎯 FINAL SCORE');
console.log('═'.repeat(60));
console.log(`  Total Tools: 20`);
console.log(`  Tested: ${totalTested}`);
console.log(`  Passed: ${totalPassed} ✅`);
console.log(`  Failed: ${totalFailed} ❌`);
console.log(`  Skipped: ${totalSkipped} ⚠️`);
console.log(
  `  Success Rate: ${((totalPassed / totalTested) * 100).toFixed(1)}%`
);
console.log('═'.repeat(60) + '\n');

// Show failed tests details
if (totalFailed > 0) {
  console.log('🔍 Failed Tests Details:\n');
  for (const result of results.filter(r => r.status === '❌ FAIL')) {
    console.log(`❌ ${result.tool}`);
    console.log(`   ${result.error}\n`);
  }
}

console.log(
  '💡 Note: Some tools were skipped because they perform destructive operations'
);
console.log(
  '   (createBranch, deleteBranch, mergeBranch, resetBranch, rebaseBranch, applyMigration, deployEdgeFunction)\n'
);

Deno.exit(totalFailed > 0 ? 1 : 0);
