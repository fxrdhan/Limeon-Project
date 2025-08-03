/**
 * Unified Diff Test Suite
 * 
 * Consolidated testing tool for diff analyzer functionality.
 * Replaces: debug-diff-test.ts, quick-diff-test.ts, simple-diff-test.ts, test-diff-analyzer.ts
 * Uses: diff-test-dictionary.ts (test cases library)
 * 
 * Usage:
 *   yarn tsx scripts/unified-diff-test.ts                           # Run comprehensive test suite
 *   yarn tsx scripts/unified-diff-test.ts --interactive             # Interactive mode
 *   yarn tsx scripts/unified-diff-test.ts --api "old" "new"        # Test specific pair via API
 *   yarn tsx scripts/unified-diff-test.ts --local "old" "new"      # Test specific pair locally
 *   yarn tsx scripts/unified-diff-test.ts --debug "old" "new"      # Debug mode with detailed analysis
 *   yarn tsx scripts/unified-diff-test.ts --category medical_term   # Filter by category
 *   yarn tsx scripts/unified-diff-test.ts --difficulty hard         # Filter by difficulty
 *   yarn tsx scripts/unified-diff-test.ts --id abbrev_001           # Run specific test case
 */

import { 
  DIFF_TEST_DICTIONARY, 
  DiffTestCase, 
  getAllCategories 
} from './diff-test-dictionary';
import * as readline from 'readline';

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

interface TestResult {
  testCase: DiffTestCase;
  segments: DiffSegment[];
  actualMode: 'character' | 'word' | 'smart';
  passed: boolean;
  executionTime: number;
  issues?: string[];
}

interface ApiResult {
  segments: DiffSegment[];
  analysis: {
    wordSimilarity: number;
    characterSimilarity: number;
    changeRatio: number;
    hasAbbreviationExpansion: boolean;
    hasRepeatedCharCorrection: boolean;
    hasCleanWordChanges: boolean;
    hasPunctuationOnlyChanges: boolean;
    hasNumberUnitChanges: boolean;
    hasWordReplacements: boolean;
  };
  meta: {
    processingTime: string;
    fromCache: boolean;
  };
}

/**
 * Format segments for display with colors
 */
function formatSegments(segments: DiffSegment[]): string {
  return segments
    .map(segment => {
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
    })
    .join('');
}

/**
 * Call the diff analyzer edge function
 */
async function callDiffAnalyzer(oldText: string, newText: string): Promise<ApiResult> {
  const response = await fetch(
    'https://psqmckbtwqphcteymjil.supabase.co/functions/v1/diff-analyzer',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcW1ja2J0d3FwaGN0ZXltamlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTQ2MjAsImV4cCI6MjA1Nzc3MDYyMH0.wvxpldpaoanDk9Wd7wDUeeCuMSVw9e0pxE7_BMt823s',
      },
      body: JSON.stringify({ oldText, newText }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Detect which diff mode was actually used (based on segment patterns)
 */
function detectActualMode(oldText: string, newText: string, segments: DiffSegment[]): 'character' | 'word' | 'smart' {
  if (oldText === newText) return 'smart';
  
  const changeSegments = segments.filter(s => s.type !== 'unchanged');
  if (changeSegments.length === 0) return 'smart';

  // Word-level: Only 2 segments (one removed, one added) without spaces
  if (segments.length === 2 && changeSegments.length === 2) {
    const removed = segments.find(s => s.type === 'removed');
    const added = segments.find(s => s.type === 'added');
    if (removed && added && !removed.text.includes(' ') && !added.text.includes(' ')) {
      return 'word';
    }
  }

  // Character-level: Many small alternating segments
  let alternatingCount = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type !== segments[i - 1].type) {
      alternatingCount++;
    }
  }

  const hasOnlySmallChangeSegments = changeSegments.every(s => s.text.length <= 3);
  if (alternatingCount > segments.length * 0.6 && hasOnlySmallChangeSegments) {
    return 'character';
  }

  // Default to word-level for multi-word segments or larger changes
  const hasMultiWordSegments = changeSegments.some(s => s.text.includes(' '));
  const hasVerySmallSegments = changeSegments.some(s => s.text.length <= 2 && !s.text.includes(' '));

  return hasMultiWordSegments || !hasVerySmallSegments ? 'word' : 'character';
}

/**
 * Check for accuracy issues
 */
function checkAccuracy(testCase: DiffTestCase, segments: DiffSegment[]): string | null {
  const reconstructedOld = segments
    .filter(s => s.type !== 'added')
    .map(s => s.text)
    .join('');

  const reconstructedNew = segments
    .filter(s => s.type !== 'removed')
    .map(s => s.text)
    .join('');

  if (reconstructedOld !== testCase.oldText) {
    return `Old text reconstruction failed: expected "${testCase.oldText}", got "${reconstructedOld}"`;
  }

  if (reconstructedNew !== testCase.newText) {
    return `New text reconstruction failed: expected "${testCase.newText}", got "${reconstructedNew}"`;
  }

  return null;
}

/**
 * Check for over-fragmentation
 */
function checkFragmentation(segments: DiffSegment[]): string | null {
  const changeSegments = segments.filter(s => s.type !== 'unchanged');
  const smallSegments = changeSegments.filter(s => s.text.length <= 2);
  
  if (smallSegments.length > 3) {
    return `Over-fragmentation: ${smallSegments.length} segments with ≤2 characters`;
  }

  return null;
}

/**
 * Run single test case via API
 */
async function runSingleTest(testCase: DiffTestCase): Promise<TestResult> {
  const startTime = performance.now();
  
  let segments: DiffSegment[];
  try {
    const result = await callDiffAnalyzer(testCase.oldText, testCase.newText);
    segments = result.segments;
  } catch (error) {
    const endTime = performance.now();
    return {
      testCase,
      segments: [{ type: 'unchanged', text: testCase.newText }],
      actualMode: 'smart',
      passed: false,
      executionTime: endTime - startTime,
      issues: [`Error during API call: ${error.message}`],
    };
  }

  const endTime = performance.now();
  const executionTime = endTime - startTime;
  const actualMode = detectActualMode(testCase.oldText, testCase.newText, segments);

  const issues: string[] = [];
  let passed = true;

  // Check mode selection
  if (testCase.expectedMode !== 'smart' && actualMode !== testCase.expectedMode) {
    issues.push(`Expected ${testCase.expectedMode} mode, got ${actualMode}`);
    passed = false;
  }

  // Check fragmentation
  const fragmentationIssue = checkFragmentation(segments);
  if (fragmentationIssue) {
    issues.push(fragmentationIssue);
    passed = false;
  }

  // Check accuracy
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
    issues: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Test specific pair via API
 */
async function testApiPair(oldText: string, newText: string) {
  console.log(`${colors.blue}🔍 API Testing: "${oldText}" → "${newText}"${colors.reset}\n`);

  try {
    const startTime = Date.now();
    const result = await callDiffAnalyzer(oldText, newText);
    const endTime = Date.now();
    const requestTime = endTime - startTime;

    console.log(`${colors.green}✅ Success${colors.reset} (${requestTime}ms request, ${result.meta.processingTime}ms server, ${result.meta.fromCache ? 'cached' : 'computed'})`);
    console.log(`Diff: ${formatSegments(result.segments)}\n`);

    // Analysis details
    console.log(`${colors.bold}📊 Analysis:${colors.reset}`);
    console.log(`  Word similarity: ${(result.analysis.wordSimilarity * 100).toFixed(1)}%`);
    console.log(`  Char similarity: ${(result.analysis.characterSimilarity * 100).toFixed(1)}%`);
    console.log(`  Change ratio: ${(result.analysis.changeRatio * 100).toFixed(1)}%`);

    const flags = [];
    if (result.analysis.hasAbbreviationExpansion) flags.push('abbreviation expansion');
    if (result.analysis.hasRepeatedCharCorrection) flags.push('repeated char correction');
    if (result.analysis.hasCleanWordChanges) flags.push('clean word changes');
    if (result.analysis.hasPunctuationOnlyChanges) flags.push('punctuation only');
    if (result.analysis.hasNumberUnitChanges) flags.push('number/unit changes');
    if (result.analysis.hasWordReplacements) flags.push('word replacements');

    if (flags.length > 0) {
      console.log(`  Detected: ${flags.join(', ')}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Failed: ${error.message}${colors.reset}`);
  }
}


/**
 * Debug mode with detailed decision analysis
 */
async function debugMode(oldText: string, newText: string) {
  console.log(`${colors.blue}🔍 Debug Analysis: "${oldText}" → "${newText}"${colors.reset}\n`);

  try {
    const result = await callDiffAnalyzer(oldText, newText);
    
    console.log(`${colors.green}✅ Result Received${colors.reset}`);
    console.log(`Diff: ${formatSegments(result.segments)}\n`);

    // Detailed analysis breakdown
    console.log(`${colors.bold}📊 Detailed Analysis:${colors.reset}`);
    console.log(`  Word similarity: ${(result.analysis.wordSimilarity * 100).toFixed(1)}% (${result.analysis.wordSimilarity})`);
    console.log(`  Char similarity: ${(result.analysis.characterSimilarity * 100).toFixed(1)}% (${result.analysis.characterSimilarity})`);
    console.log(`  Change ratio: ${(result.analysis.changeRatio * 100).toFixed(1)}% (${result.analysis.changeRatio})\n`);

    console.log(`${colors.bold}🔍 Decision Flags:${colors.reset}`);
    console.log(`  hasAbbreviationExpansion: ${result.analysis.hasAbbreviationExpansion ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`  hasRepeatedCharCorrection: ${result.analysis.hasRepeatedCharCorrection ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`  hasCleanWordChanges: ${result.analysis.hasCleanWordChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`  hasPunctuationOnlyChanges: ${result.analysis.hasPunctuationOnlyChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`  hasNumberUnitChanges: ${result.analysis.hasNumberUnitChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`  hasWordReplacements: ${result.analysis.hasWordReplacements ? colors.green + 'TRUE' + colors.reset : 'false'}\n`);

    // Decision logic flow
    console.log(`${colors.bold}🧠 Decision Logic Flow:${colors.reset}`);
    const isSingleWord = !oldText.includes(' ') && !newText.includes(' ');
    const lengthDiff = Math.abs(oldText.length - newText.length);

    console.log(`  1. Abbreviation/Punctuation check: ${result.analysis.hasAbbreviationExpansion || result.analysis.hasPunctuationOnlyChanges ? colors.green + 'MATCHED → Character Diff' + colors.reset : 'not matched'}`);
    console.log(`  2. Number/Word replacement check: ${result.analysis.hasNumberUnitChanges || result.analysis.hasWordReplacements ? colors.green + 'MATCHED → Word Diff' + colors.reset : 'not matched'}`);
    console.log(`  3. Clean word changes check: ${result.analysis.hasCleanWordChanges && result.analysis.wordSimilarity > 0.6 ? colors.green + 'MATCHED → Word Diff' + colors.reset : 'not matched'}`);
    console.log(`  4. Repeated char correction: ${result.analysis.hasRepeatedCharCorrection ? colors.green + 'MATCHED → Character Diff' + colors.reset : 'not matched'}`);

    // Single word condition
    const singleWordConditionMet = isSingleWord && lengthDiff <= 2 && result.analysis.characterSimilarity >= 0.65 && !result.analysis.hasNumberUnitChanges && !result.analysis.hasWordReplacements;
    console.log(`  5. Single word condition:`);
    console.log(`     - isSingleWord: ${isSingleWord ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`     - lengthDiff <= 2: ${lengthDiff <= 2 ? colors.green + 'TRUE' + colors.reset : 'false'} (${lengthDiff})`);
    console.log(`     - charSimilarity >= 0.65: ${result.analysis.characterSimilarity >= 0.65 ? colors.green + 'TRUE' + colors.reset : 'false'} (${result.analysis.characterSimilarity.toFixed(3)})`);
    console.log(`     - !hasNumberUnitChanges: ${!result.analysis.hasNumberUnitChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`     - !hasWordReplacements: ${!result.analysis.hasWordReplacements ? colors.green + 'TRUE' + colors.reset : 'false'}`);
    console.log(`     → Overall: ${singleWordConditionMet ? colors.green + 'MET → Character Diff' + colors.reset : colors.red + 'NOT MET' + colors.reset}`);

    // Final fallback
    const highCharSimilarity = result.analysis.characterSimilarity > 0.8;
    console.log(`  6. High char similarity fallback: ${highCharSimilarity ? colors.green + 'MATCHED → Character Diff' + colors.reset : colors.red + 'NOT MATCHED → Word Diff' + colors.reset} (> 0.8: ${result.analysis.characterSimilarity.toFixed(3)})\n`);

    // Expected vs actual
    const expectedDiff = singleWordConditionMet ? 'Character Diff' : highCharSimilarity ? 'Character Diff' : 'Word Diff';
    const actualDiff = result.segments.length === 2 && result.segments[0].type === 'removed' && result.segments[1].type === 'added' ? 'Word Diff' : 'Character Diff';

    console.log(`${colors.bold}🎯 Decision Summary:${colors.reset}`);
    console.log(`  Expected Algorithm: ${expectedDiff === 'Character Diff' ? colors.green + expectedDiff + colors.reset : colors.yellow + expectedDiff + colors.reset}`);
    console.log(`  Actual Algorithm: ${actualDiff === 'Character Diff' ? colors.green + actualDiff + colors.reset : colors.yellow + actualDiff + colors.reset}`);
    console.log(`  Match: ${expectedDiff === actualDiff ? colors.green + '✓ CONSISTENT' + colors.reset : colors.red + '✗ INCONSISTENT' + colors.reset}`);

  } catch (error) {
    console.log(`${colors.red}❌ Failed: ${error.message}${colors.reset}`);
  }
}

/**
 * Interactive mode
 */
function interactiveMode() {
  console.log(`${colors.bold}${colors.cyan}🎮 Interactive Diff Testing Mode${colors.reset}`);
  console.log(`Commands: 'api', 'debug', or just press Enter for api mode`);
  console.log(`Type 'quit' to exit.\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptForTexts() {
    rl.question('Test mode (api/debug) [api]: ', (mode: string) => {
      if (mode.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      const testMode = mode.trim() || 'api';

      rl.question('Old text: ', (oldText: string) => {
        if (oldText.toLowerCase() === 'quit') {
          rl.close();
          return;
        }

        rl.question('New text: ', async (newText: string) => {
          if (newText.toLowerCase() === 'quit') {
            rl.close();
            return;
          }

          console.log();
          
          try {
            switch (testMode) {
              case 'debug':
                await debugMode(oldText, newText);
                break;
              default:
                await testApiPair(oldText, newText);
            }
          } catch (error) {
            console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
          }

          console.log(`${colors.cyan}───────────────────────────────────────────${colors.reset}\n`);
          promptForTexts();
        });
      });
    });
  }

  promptForTexts();
}

/**
 * Run comprehensive test suite
 */
async function runComprehensiveTests(filter?: { category?: string; difficulty?: string; id?: string }) {
  console.log(`${colors.bold}${colors.blue}🧪 Comprehensive Diff Test Suite${colors.reset}\n`);

  let testCases = [...DIFF_TEST_DICTIONARY];

  // Apply filters
  if (filter?.category) {
    testCases = testCases.filter(t => t.category === filter.category);
  }
  if (filter?.difficulty) {
    testCases = testCases.filter(t => t.difficulty === filter.difficulty);
  }
  if (filter?.id) {
    testCases = testCases.filter(t => t.id === filter.id);
  }

  if (testCases.length === 0) {
    console.log(`${colors.red}No test cases found matching the filter${colors.reset}`);
    return;
  }

  console.log(`📊 Running ${testCases.length} test cases via API`);
  if (filter?.category) console.log(`   Category: ${filter.category}`);
  if (filter?.difficulty) console.log(`   Difficulty: ${filter.difficulty}`);
  if (filter?.id) console.log(`   ID: ${filter.id}`);
  console.log();

  const results: TestResult[] = [];
  const startTime = performance.now();

  // Run tests
  for (const testCase of testCases) {
    const result = await runSingleTest(testCase);
    results.push(result);

    const status = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const time = `${result.executionTime.toFixed(2)}ms`;
    console.log(`${status} ${testCase.id}: ${testCase.description} (${time})`);

    if (!result.passed && result.issues) {
      result.issues.forEach(issue => {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }

    if (!result.passed) {
      console.log(`    Old: "${testCase.oldText}"`);
      console.log(`    New: "${testCase.newText}"`);
      console.log(`    Diff: ${formatSegments(result.segments)}`);
    }

    console.log();
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const averageTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

  console.log(`${colors.bold}📋 Test Summary${colors.reset}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`Average execution time: ${averageTime.toFixed(2)}ms`);
  console.log(`Total execution time: ${totalTime.toFixed(2)}ms`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`${colors.bold}Unified Diff Test Suite${colors.reset}\n`);
  console.log(`Usage:`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts                           # Run comprehensive test suite via API`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --interactive             # Interactive testing mode`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --api "old" "new"        # Test specific pair via API`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --debug "old" "new"      # Debug mode with detailed analysis`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --category medical_term   # Filter by category`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --difficulty hard         # Filter by difficulty`);
  console.log(`  yarn tsx scripts/unified-diff-test.ts --id abbrev_001           # Run specific test case\n`);
  
  console.log(`Available categories: ${getAllCategories().join(', ')}`);
  console.log(`Available difficulties: easy, medium, hard, extreme`);
  console.log(`\nNote: All tests now use the edge function API. Local diff functions have been moved server-side.`);
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  async function main() {
    try {
      if (args.length === 0) {
        await runComprehensiveTests();
      } else if (args[0] === '--help' || args[0] === '-h') {
        showUsage();
      } else if (args[0] === '--interactive') {
        interactiveMode();
      } else if (args[0] === '--api' && args.length === 3) {
        await testApiPair(args[1], args[2]);
      } else if (args[0] === '--debug' && args.length === 3) {
        await debugMode(args[1], args[2]);
      } else if (args[0] === '--category' && args[1]) {
        await runComprehensiveTests({ category: args[1] });
      } else if (args[0] === '--difficulty' && args[1]) {
        await runComprehensiveTests({ difficulty: args[1] });
      } else if (args[0] === '--id' && args[1]) {
        await runComprehensiveTests({ id: args[1] });
      } else {
        console.log(`${colors.red}Invalid arguments. Use --help for usage information.${colors.reset}`);
        process.exit(1);
      }
    } catch (error) {
      console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  main();
}

export {
  runComprehensiveTests,
  testApiPair,
  debugMode,
  interactiveMode,
  type TestResult,
};