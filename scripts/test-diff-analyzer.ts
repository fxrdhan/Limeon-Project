/**
 * Diff Analyzer Test Runner
 * 
 * Test script to evaluate the performance and accuracy of the diff analyzer
 * using the comprehensive test dictionary. This helps identify areas for
 * algorithm improvement before deploying to edge functions.
 */

import { createSmartDiff, DiffSegment } from '../src/utils/diff';
import { 
  DIFF_TEST_DICTIONARY, 
  DiffTestCase,
  getTestStatistics
} from './diff-test-dictionary';

interface TestResult {
  testCase: DiffTestCase;
  segments: DiffSegment[];
  actualMode: 'character' | 'word' | 'smart';
  passed: boolean;
  executionTime: number;
  issues?: string[];
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  averageTime: number;
  categoryResults: Record<string, { passed: number; total: number }>;
  difficultyResults: Record<string, { passed: number; total: number }>;
}

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Run a single diff test case
 */
function runSingleTest(testCase: DiffTestCase): TestResult {
  const startTime = performance.now();
  
  let segments: DiffSegment[];
  let actualMode: 'character' | 'word' | 'smart' = 'smart';
  
  try {
    // Always use smart diff for testing
    segments = createSmartDiff(testCase.oldText, testCase.newText);
    
    // Try to determine which mode was actually used by analyzing the segments
    actualMode = detectActualMode(testCase.oldText, testCase.newText, segments);
    
  } catch (error) {
    const endTime = performance.now();
    return {
      testCase,
      segments: [{ type: 'unchanged', text: testCase.newText }],
      actualMode: 'smart',
      passed: false,
      executionTime: endTime - startTime,
      issues: [`Error during diff: ${error}`]
    };
  }
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  // Evaluate the result
  const issues: string[] = [];
  let passed = true;
  
  // Check if the mode selection was appropriate
  if (testCase.expectedMode !== 'smart' && actualMode !== testCase.expectedMode) {
    issues.push(`Expected ${testCase.expectedMode} mode, got ${actualMode}`);
    passed = false;
  }
  
  // Check for over-fragmentation (too many small segments)
  const fragmentationIssue = checkFragmentation(segments);
  if (fragmentationIssue) {
    issues.push(fragmentationIssue);
    passed = false;
  }
  
  // Check for accuracy issues
  const accuracyIssue = checkAccuracy(testCase, segments);
  if (accuracyIssue) {
    issues.push(accuracyIssue);
    passed = false;
  }
  
  return {
    testCase,
    segments,
    actualMode,
    passed,
    executionTime,
    issues: issues.length > 0 ? issues : undefined
  };
}

/**
 * Detect which diff mode was actually used based on segment patterns
 */
function detectActualMode(oldText: string, newText: string, segments: DiffSegment[]): 'character' | 'word' | 'smart' {
  // If texts are identical
  if (oldText === newText) return 'smart';
  
  // Count total changes
  const changeSegments = segments.filter(s => s.type !== 'unchanged');
  if (changeSegments.length === 0) return 'smart';
  
  // Simple heuristic: if there are only 2 segments (one removed, one added) 
  // and they don't contain internal spaces, likely word-level replacement
  if (segments.length === 2 && changeSegments.length === 2) {
    const removed = segments.find(s => s.type === 'removed');
    const added = segments.find(s => s.type === 'added');
    if (removed && added && !removed.text.includes(' ') && !added.text.includes(' ')) {
      return 'word';
    }
  }
  
  // Check for character-level patterns: many small alternating segments
  let alternatingCount = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type !== segments[i-1].type) {
      alternatingCount++;
    }
  }
  
  // High alternating pattern suggests character-level diff, BUT only if segments are small
  const hasOnlySmallChangeSegments = changeSegments.every(s => s.text.length <= 3);
  if (alternatingCount > segments.length * 0.6 && hasOnlySmallChangeSegments) {
    return 'character';
  }
  
  // Check if changes align with word boundaries
  const hasMultiWordSegments = changeSegments.some(s => s.text.includes(' '));
  const hasVerySmallSegments = changeSegments.some(s => s.text.length <= 2 && !s.text.includes(' '));
  
  if (hasMultiWordSegments || !hasVerySmallSegments) {
    return 'word';
  } else {
    return 'character';
  }
}

/**
 * Check for over-fragmentation issues
 */
function checkFragmentation(segments: DiffSegment[]): string | null {
  const changeSegments = segments.filter(s => s.type !== 'unchanged');
  
  // Too many small change segments might indicate over-fragmentation
  const smallSegments = changeSegments.filter(s => s.text.length <= 2);
  if (smallSegments.length > 3) {
    return `Over-fragmentation: ${smallSegments.length} segments with ≤2 characters`;
  }
  
  // Check for alternating pattern (change-unchanged-change-unchanged...)
  let alternatingCount = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type !== segments[i-1].type) {
      alternatingCount++;
    }
  }
  
  // High alternating pattern is only problematic if there are also small segments
  // For cases like abbreviation expansion (d[+en]g[+a]n), alternating is natural
  const hasOnlyAdditions = changeSegments.every(s => s.type === 'added');
  const hasOnlySmallChanges = changeSegments.every(s => s.text.length <= 2);
  
  if (alternatingCount > segments.length * 0.7 && hasOnlySmallChanges && !hasOnlyAdditions) {
    return `High alternating pattern: ${alternatingCount} type changes in ${segments.length} segments`;
  }
  
  return null;
}

/**
 * Check for accuracy issues in the diff result
 */
function checkAccuracy(testCase: DiffTestCase, segments: DiffSegment[]): string | null {
  // Reconstruct texts from segments
  const reconstructedOld = segments
    .filter(s => s.type !== 'added')
    .map(s => s.text)
    .join('');
    
  const reconstructedNew = segments
    .filter(s => s.type !== 'removed')
    .map(s => s.text)
    .join('');
  
  // Check if reconstruction matches original texts
  if (reconstructedOld !== testCase.oldText) {
    return `Old text reconstruction mismatch: expected "${testCase.oldText}", got "${reconstructedOld}"`;
  }
  
  if (reconstructedNew !== testCase.newText) {
    return `New text reconstruction mismatch: expected "${testCase.newText}", got "${reconstructedNew}"`;
  }
  
  return null;
}

/**
 * Format segments for display
 */
function formatSegments(segments: DiffSegment[]): string {
  return segments.map(segment => {
    switch (segment.type) {
      case 'added':
        return `${colors.green}[+${segment.text}]${colors.reset}`;
      case 'removed':
        return `${colors.red}[-${segment.text}]${colors.reset}`;
      case 'unchanged':
        return segment.text;
      default:
        return segment.text;
    }
  }).join('');
}

/**
 * Run all tests and generate summary
 */
function runAllTests(): TestSummary {
  console.log(`${colors.bold}${colors.blue}🧪 Diff Analyzer Test Suite${colors.reset}\n`);
  
  const stats = getTestStatistics();
  console.log(`📊 Test Statistics:`);
  console.log(`   Total test cases: ${stats.total}`);
  console.log(`   Categories: ${Object.keys(stats.byCategory).length}`);
  console.log(`   Difficulty levels: ${Object.keys(stats.byDifficulty).length}\n`);
  
  const results: TestResult[] = [];
  const startTime = performance.now();
  
  // Run all tests
  for (const testCase of DIFF_TEST_DICTIONARY) {
    const result = runSingleTest(testCase);
    results.push(result);
    
    // Print individual test result
    const status = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const time = `${result.executionTime.toFixed(2)}ms`;
    console.log(`${status} ${testCase.id}: ${testCase.description} (${time})`);
    
    if (!result.passed && result.issues) {
      result.issues.forEach(issue => {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }
    
    // Show diff for failed tests
    if (!result.passed) {
      console.log(`    Old: "${testCase.oldText}"`);
      console.log(`    New: "${testCase.newText}"`);
      console.log(`    Diff: ${formatSegments(result.segments)}`);
    }
    
    console.log();
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  // Calculate summary statistics
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const averageTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
  
  // Category breakdown
  const categoryResults: Record<string, { passed: number; total: number }> = {};
  for (const category of Object.keys(stats.byCategory)) {
    const categoryTests = results.filter(r => r.testCase.category === category);
    categoryResults[category] = {
      passed: categoryTests.filter(r => r.passed).length,
      total: categoryTests.length
    };
  }
  
  // Difficulty breakdown
  const difficultyResults: Record<string, { passed: number; total: number }> = {};
  for (const difficulty of Object.keys(stats.byDifficulty)) {
    const difficultyTests = results.filter(r => r.testCase.difficulty === difficulty);
    difficultyResults[difficulty] = {
      passed: difficultyTests.filter(r => r.passed).length,
      total: difficultyTests.length
    };
  }
  
  // Print summary
  console.log(`${colors.bold}📋 Test Summary${colors.reset}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`Average execution time: ${averageTime.toFixed(2)}ms`);
  console.log(`Total execution time: ${totalTime.toFixed(2)}ms\n`);
  
  // Category breakdown
  console.log(`${colors.bold}📊 Results by Category${colors.reset}`);
  for (const [category, result] of Object.entries(categoryResults)) {
    const percentage = ((result.passed / result.total) * 100).toFixed(1);
    const status = result.passed === result.total ? colors.green : 
                  result.passed === 0 ? colors.red : colors.yellow;
    console.log(`  ${category}: ${status}${result.passed}/${result.total}${colors.reset} (${percentage}%)`);
  }
  
  console.log();
  
  // Difficulty breakdown
  console.log(`${colors.bold}🎯 Results by Difficulty${colors.reset}`);
  for (const [difficulty, result] of Object.entries(difficultyResults)) {
    const percentage = ((result.passed / result.total) * 100).toFixed(1);
    const status = result.passed === result.total ? colors.green : 
                  result.passed === 0 ? colors.red : colors.yellow;
    console.log(`  ${difficulty}: ${status}${result.passed}/${result.total}${colors.reset} (${percentage}%)`);
  }
  
  return {
    total: results.length,
    passed,
    failed,
    averageTime,
    categoryResults,
    difficultyResults
  };
}

/**
 * Run specific test cases
 */
function runSpecificTests(filter: { category?: string; difficulty?: string; id?: string }) {
  let testCases = [...DIFF_TEST_DICTIONARY];
  
  if (filter.category) {
    testCases = testCases.filter(t => t.category === filter.category);
  }
  
  if (filter.difficulty) {
    testCases = testCases.filter(t => t.difficulty === filter.difficulty);
  }
  
  if (filter.id) {
    testCases = testCases.filter(t => t.id === filter.id);
  }
  
  if (testCases.length === 0) {
    console.log(`${colors.red}No test cases found matching the filter${colors.reset}`);
    return;
  }
  
  console.log(`${colors.blue}Running ${testCases.length} filtered test cases...${colors.reset}\n`);
  
  for (const testCase of testCases) {
    const result = runSingleTest(testCase);
    const status = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    
    console.log(`${status} ${testCase.id}: ${testCase.description}`);
    console.log(`   Category: ${testCase.category} | Difficulty: ${testCase.difficulty}`);
    console.log(`   Mode: expected ${testCase.expectedMode}, actual ${result.actualMode}`);
    console.log(`   Time: ${result.executionTime.toFixed(2)}ms`);
    
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }
    
    console.log(`   Old: "${testCase.oldText}"`);
    console.log(`   New: "${testCase.newText}"`);
    console.log(`   Diff: ${formatSegments(result.segments)}`);
    
    if (testCase.notes) {
      console.log(`   Notes: ${colors.cyan}${testCase.notes}${colors.reset}`);
    }
    
    console.log();
  }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    runAllTests();
  } else if (args[0] === '--category' && args[1]) {
    runSpecificTests({ category: args[1] });
  } else if (args[0] === '--difficulty' && args[1]) {
    runSpecificTests({ difficulty: args[1] });
  } else if (args[0] === '--id' && args[1]) {
    runSpecificTests({ id: args[1] });
  } else {
    console.log(`${colors.bold}Usage:${colors.reset}`);
    console.log(`  Run all tests: yarn tsx scripts/test-diff-analyzer.ts`);
    console.log(`  Filter by category: yarn tsx scripts/test-diff-analyzer.ts --category abbreviation_expansion`);
    console.log(`  Filter by difficulty: yarn tsx scripts/test-diff-analyzer.ts --difficulty hard`);
    console.log(`  Run specific test: yarn tsx scripts/test-diff-analyzer.ts --id abbrev_001`);
  }
}

// Export for programmatic use
export {
  runAllTests,
  runSpecificTests,
  runSingleTest,
  type TestResult,
  type TestSummary
};