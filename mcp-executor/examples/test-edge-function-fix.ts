/**
 * Quick test to verify getEdgeFunction fix
 */

import { initializeMCPExecutor } from '../setup.ts';
import type { AgentTask } from '@mcp/types';

console.log('🧪 Testing getEdgeFunction fix...\n');

const orchestrator = await initializeMCPExecutor();

// Test 1: listEdgeFunctions (should work)
console.log('1️⃣ Testing listEdgeFunctions...');
const task1: AgentTask = {
  id: 'test-list',
  description: 'List edge functions',
  code: `
    const functions = await supabase.listEdgeFunctions();
    console.log("   Found", functions.length, "edge functions");
    return { count: functions.length, names: functions.map(f => f.name) };
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

const result1 = await orchestrator.executeTask(task1);
if (!result1.success) {
  console.log('❌ FAILED:', result1.error?.message);
  Deno.exit(1);
}

console.log('✅ PASSED\n');
const edgeFunctions = result1.data as { count: number; names: string[] };

// Test 2: getEdgeFunction (previously failed, should now work)
if (edgeFunctions.count > 0) {
  console.log('2️⃣ Testing getEdgeFunction (the problematic one)...');
  const task2: AgentTask = {
    id: 'test-get',
    description: 'Get edge function details',
    code: `
      const functions = await supabase.listEdgeFunctions();
      if (functions.length === 0) {
        return { message: "No edge functions available" };
      }

      console.log("   Getting details for:", functions[0].name);
      const fn = await supabase.getEdgeFunction(functions[0].name);

      return {
        name: fn.name,
        id: fn.id,
        hasEntrypoint: !!fn.entrypoint_path,
        status: fn.status
      };
    `,
    requiredTools: ['supabase'],
    status: 'pending',
  };

  const result2 = await orchestrator.executeTask(task2);

  if (!result2.success) {
    console.log('❌ FAILED:', result2.error?.message);
    Deno.exit(1);
  }

  console.log('✅ PASSED');
  console.log('   Result:', JSON.stringify(result2.data, null, 2));
} else {
  console.log('2️⃣ Skipping getEdgeFunction (no edge functions available)');
}

console.log('\n🎉 All tests passed! Security filter fix successful!\n');

Deno.exit(0);
