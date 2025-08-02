/**
 * Debug Diff Test - Detailed analysis debugging
 *
 * Test untuk debug kondisi-kondisi di smart diff analyzer
 */

interface DebugTestCase {
  id: string;
  oldText: string;
  newText: string;
  description: string;
}

const testCases: DebugTestCase[] = [
  {
    id: 'debug-1',
    oldText: 'AAC',
    newText: 'AC',
    description:
      'AAC -> AC (fresh cache - should use character diff after fix)',
  },
];

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Format segments for display with colors
 */
function formatSegments(segments: any[]): string {
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
 * Call the diff analyzer edge function directly
 */
async function callDiffAnalyzer(oldText: string, newText: string) {
  const response = await fetch(
    'https://psqmckbtwqphcteymjil.supabase.co/functions/v1/diff-analyzer',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcW1ja2J0d3FwaGN0ZXltamlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTQ2MjAsImV4cCI6MjA1Nzc3MDYyMH0.wvxpldpaoanDk9Wd7wDUeeCuMSVw9e0pxE7_BMt823s',
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
 * Run a single debug test case with detailed analysis output
 */
async function runDebugTest(testCase: DebugTestCase) {
  console.log(
    `${colors.blue}🔍 Debug Testing: ${testCase.id} - ${testCase.description}${colors.reset}`
  );
  console.log(`   Old: "${testCase.oldText}"`);
  console.log(`   New: "${testCase.newText}"`);
  console.log();

  try {
    const result = await callDiffAnalyzer(testCase.oldText, testCase.newText);

    console.log(`   ${colors.green}✅ Result Received${colors.reset}`);
    console.log(`   Diff: ${formatSegments(result.segments)}`);
    console.log();

    // Detailed analysis breakdown
    console.log(`   ${colors.bold}📊 Detailed Analysis:${colors.reset}`);
    console.log(
      `     Word similarity: ${(result.analysis.wordSimilarity * 100).toFixed(1)}% (${result.analysis.wordSimilarity})`
    );
    console.log(
      `     Char similarity: ${(result.analysis.characterSimilarity * 100).toFixed(1)}% (${result.analysis.characterSimilarity})`
    );
    console.log(
      `     Change ratio: ${(result.analysis.changeRatio * 100).toFixed(1)}% (${result.analysis.changeRatio})`
    );
    console.log();

    console.log(`   ${colors.bold}🔍 Decision Flags:${colors.reset}`);
    console.log(
      `     hasAbbreviationExpansion: ${result.analysis.hasAbbreviationExpansion ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `     hasRepeatedCharCorrection: ${result.analysis.hasRepeatedCharCorrection ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `     hasCleanWordChanges: ${result.analysis.hasCleanWordChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `     hasPunctuationOnlyChanges: ${result.analysis.hasPunctuationOnlyChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `     hasNumberUnitChanges: ${result.analysis.hasNumberUnitChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `     hasWordReplacements: ${result.analysis.hasWordReplacements ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log();

    // Logical flow analysis
    console.log(`   ${colors.bold}🧠 Decision Logic Flow:${colors.reset}`);

    const isSingleWord =
      !testCase.oldText.includes(' ') && !testCase.newText.includes(' ');
    const lengthDiff = Math.abs(
      testCase.oldText.length - testCase.newText.length
    );

    console.log(
      `     1. Abbreviation/Punctuation check: ${result.analysis.hasAbbreviationExpansion || result.analysis.hasPunctuationOnlyChanges ? colors.green + 'MATCHED → Character Diff' + colors.reset : 'not matched'}`
    );
    console.log(
      `     2. Number/Word replacement check: ${result.analysis.hasNumberUnitChanges || result.analysis.hasWordReplacements ? colors.green + 'MATCHED → Word Diff' + colors.reset : 'not matched'}`
    );
    console.log(
      `     3. Clean word changes check: ${result.analysis.hasCleanWordChanges && result.analysis.wordSimilarity > 0.6 ? colors.green + 'MATCHED → Word Diff' + colors.reset : 'not matched'}`
    );
    console.log(
      `     4. Repeated char correction: ${result.analysis.hasRepeatedCharCorrection ? colors.green + 'MATCHED → Character Diff' + colors.reset : 'not matched'}`
    );

    // Single word condition
    const singleWordConditionMet =
      isSingleWord &&
      lengthDiff <= 2 &&
      result.analysis.characterSimilarity >= 0.65 &&
      !result.analysis.hasNumberUnitChanges &&
      !result.analysis.hasWordReplacements;
    console.log(`     5. Single word condition:`);
    console.log(
      `        - isSingleWord: ${isSingleWord ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `        - lengthDiff <= 2: ${lengthDiff <= 2 ? colors.green + 'TRUE' + colors.reset : 'false'} (${lengthDiff})`
    );
    console.log(
      `        - charSimilarity >= 0.65: ${result.analysis.characterSimilarity >= 0.65 ? colors.green + 'TRUE' + colors.reset : 'false'} (${result.analysis.characterSimilarity.toFixed(3)})`
    );
    console.log(
      `        - !hasNumberUnitChanges: ${!result.analysis.hasNumberUnitChanges ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `        - !hasWordReplacements: ${!result.analysis.hasWordReplacements ? colors.green + 'TRUE' + colors.reset : 'false'}`
    );
    console.log(
      `        → Overall: ${singleWordConditionMet ? colors.green + 'MET → Character Diff' + colors.reset : colors.red + 'NOT MET' + colors.reset}`
    );

    // Final fallback condition
    const highCharSimilarity = result.analysis.characterSimilarity > 0.8;
    console.log(
      `     6. High char similarity fallback: ${highCharSimilarity ? colors.green + 'MATCHED → Character Diff' + colors.reset : colors.red + 'NOT MATCHED → Word Diff' + colors.reset} (> 0.8: ${result.analysis.characterSimilarity.toFixed(3)})`
    );

    console.log();

    // Expected vs actual
    const expectedDiff = singleWordConditionMet
      ? 'Character Diff'
      : highCharSimilarity
        ? 'Character Diff'
        : 'Word Diff';
    const actualDiff =
      result.segments.length === 2 &&
      result.segments[0].type === 'removed' &&
      result.segments[1].type === 'added'
        ? 'Word Diff'
        : 'Character Diff';

    console.log(`   ${colors.bold}🎯 Decision Summary:${colors.reset}`);
    console.log(
      `     Expected Algorithm: ${expectedDiff === 'Character Diff' ? colors.green + expectedDiff + colors.reset : colors.yellow + expectedDiff + colors.reset}`
    );
    console.log(
      `     Actual Algorithm: ${actualDiff === 'Character Diff' ? colors.green + actualDiff + colors.reset : colors.yellow + actualDiff + colors.reset}`
    );
    console.log(
      `     Match: ${expectedDiff === actualDiff ? colors.green + '✓ CONSISTENT' + colors.reset : colors.red + '✗ INCONSISTENT' + colors.reset}`
    );
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed: ${error.message}${colors.reset}`);
  }

  console.log();
}

/**
 * Run all debug tests
 */
async function runAllDebugTests() {
  console.log(
    `${colors.bold}${colors.blue}🔍 Diff Debug Analysis Suite${colors.reset}\n`
  );

  for (const testCase of testCases) {
    await runDebugTest(testCase);
  }

  console.log(`${colors.bold}📋 Debug Analysis Complete${colors.reset}`);
}

// Run the debug tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDebugTests().catch(console.error);
}

export { runAllDebugTests, runDebugTest };
