/**
 * Example 2: Token Efficiency Demonstration
 * Shows the 98.7% token savings mentioned in the Anthropic article
 */

import { MCPOrchestrator } from '../runtime/orchestrator/main.ts';
import type { AgentTask } from '@mcp/types';

const orchestrator = new MCPOrchestrator();
await orchestrator.initialize();

console.log('💰 Example 2: Token Efficiency Demonstration\n');

// Scenario: Process large documents and extract insights
const task: AgentTask = {
  id: 'large-data-processing',
  description: 'Process large dataset and extract insights',
  code: `
    // Step 1: Fetch large documents (simulated)
    const documents = await supabase.executeSQL(\`
      SELECT id, title, content, metadata, created_at
      FROM documents
      WHERE created_at > NOW() - INTERVAL '30 days'
      LIMIT 50
    \`);

    console.log(\`Fetched \${documents.length} documents\`);

    // Step 2: Process in sandbox (no token usage for intermediate data)
    const insights = {
      totalDocuments: documents.length,
      totalWords: 0,
      averageLength: 0,
      topKeywords: {},
      categoryCounts: {},
      recentActivity: []
    };

    // Analyze documents
    documents.forEach(doc => {
      // Count words
      const wordCount = doc.content.split(/\\s+/).length;
      insights.totalWords += wordCount;

      // Extract keywords (simple extraction)
      const words = doc.content.toLowerCase().match(/\\b\\w{5,}\\b/g) || [];
      words.forEach(word => {
        insights.topKeywords[word] = (insights.topKeywords[word] || 0) + 1;
      });

      // Count categories
      const category = doc.metadata?.category || 'uncategorized';
      insights.categoryCounts[category] = (insights.categoryCounts[category] || 0) + 1;

      // Track recent activity
      insights.recentActivity.push({
        date: doc.created_at.split('T')[0],
        title: doc.title
      });
    });

    // Calculate averages
    insights.averageLength = Math.round(insights.totalWords / documents.length);

    // Get top 10 keywords
    insights.topKeywords = Object.entries(insights.topKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

    // Return only processed insights (not the raw documents)
    return insights;
  `,
  requiredTools: ['supabase'],
  status: 'pending',
};

console.log('🔄 Processing large dataset...');
const result = await orchestrator.executeTask(task);

console.log('\n✅ Insights extracted:');
console.log(JSON.stringify(result.data, null, 2));

// Calculate token savings
console.log('\n💰 Token Efficiency Analysis:');
console.log('─────────────────────────────────────────────');

// Traditional approach (all data through context)
const estimatedDataSize = 50 * 2000; // 50 docs × ~2000 words each
const traditionalTokens = Math.ceil(estimatedDataSize / 0.75); // ~4 chars per token

// Code execution approach (only code + summary through context)
const codeTokens = result.stats.tokensUsed;
const summaryTokens = 200; // estimate for returned insights
const totalTokensUsed = codeTokens + summaryTokens;

console.log(
  `Traditional approach: ~${traditionalTokens.toLocaleString()} tokens`
);
console.log(
  `Code execution approach: ~${totalTokensUsed.toLocaleString()} tokens`
);

const savings =
  ((traditionalTokens - totalTokensUsed) / traditionalTokens) * 100;
console.log(`Token savings: ${savings.toFixed(1)}% 🎉`);

// Cost analysis (Claude 3 pricing)
const costPerMillionTokens = 15; // $15 per 1M input tokens
const traditionalCost = (traditionalTokens / 1_000_000) * costPerMillionTokens;
const codeExecutionCost = (totalTokensUsed / 1_000_000) * costPerMillionTokens;
const costSavings = traditionalCost - codeExecutionCost;

console.log('\n💵 Cost Analysis:');
console.log(`Traditional: $${traditionalCost.toFixed(4)}`);
console.log(`Code execution: $${codeExecutionCost.toFixed(4)}`);
console.log(`Savings per request: $${costSavings.toFixed(4)}`);
console.log(
  `Savings per 1,000 requests: $${(costSavings * 1000).toFixed(2)} 💰`
);

console.log('\n📊 Execution Stats:');
console.log(`Duration: ${result.stats.duration}ms`);
console.log(
  `Memory used: ${(result.stats.memoryUsed / 1024 / 1024).toFixed(2)}MB`
);
console.log(`Tools called: ${result.stats.toolsCalled.join(', ')}`);
