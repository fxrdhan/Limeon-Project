/**
 * Simple Diff Test - Direct API testing
 *
 * Test specific diff cases using the edge function API
 */

// Direct edge function testing without complex imports

interface TestCase {
  id: string;
  oldText: string;
  newText: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    id: 'test-1',
    oldText: 'AAN',
    newText: 'AN',
    description: 'AAN -> AN',
  },
  {
    id: 'test-2',
    oldText: 'AN',
    newText: 'AAN',
    description: 'AN -> AAN (reverse)',
  },
  {
    id: 'test-3',
    oldText: 'NAA',
    newText: 'NA',
    description: 'NAA -> NA',
  },
  {
    id: 'test-4',
    oldText: 'NA',
    newText: 'NAA',
    description: 'NA -> NAA (reverse)',
  },
  {
    id: 'test-5',
    oldText: 'AAD',
    newText: 'AD',
    description: 'AAD -> AD (fresh cache test)',
  },
  {
    id: 'test-6',
    oldText: 'AB',
    newText: 'AAB',
    description: 'AB -> AAB (fresh cache test reverse)',
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
 * Analyze accuracy of the diff result
 */
function analyzeAccuracy(
  testCase: TestCase,
  segments: any[]
): {
  isAccurate: boolean;
  reconstructedOld: string;
  reconstructedNew: string;
  issues: string[];
} {
  const reconstructedOld = segments
    .filter(s => s.type !== 'added')
    .map(s => s.text)
    .join('');

  const reconstructedNew = segments
    .filter(s => s.type !== 'removed')
    .map(s => s.text)
    .join('');

  const issues: string[] = [];
  let isAccurate = true;

  if (reconstructedOld !== testCase.oldText) {
    issues.push(
      `Old text reconstruction failed: expected "${testCase.oldText}", got "${reconstructedOld}"`
    );
    isAccurate = false;
  }

  if (reconstructedNew !== testCase.newText) {
    issues.push(
      `New text reconstruction failed: expected "${testCase.newText}", got "${reconstructedNew}"`
    );
    isAccurate = false;
  }

  return { isAccurate, reconstructedOld, reconstructedNew, issues };
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
 * Run a single test case
 */
async function runSingleTest(testCase: TestCase) {
  console.log(
    `${colors.blue}🧪 Testing: ${testCase.id} - ${testCase.description}${colors.reset}`
  );
  console.log(`   Old: "${testCase.oldText}"`);
  console.log(`   New: "${testCase.newText}"`);

  try {
    const startTime = Date.now();

    const result = await callDiffAnalyzer(testCase.oldText, testCase.newText);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(
      `   ${colors.green}✅ Success${colors.reset} (${processingTime}ms, server: ${result.meta.processingTime}ms, ${result.meta.fromCache ? 'cached' : 'computed'})`
    );
    console.log(`   Diff: ${formatSegments(result.segments)}`);

    // Analyze accuracy
    const accuracy = analyzeAccuracy(testCase, result.segments);

    if (accuracy.isAccurate) {
      console.log(
        `   ${colors.green}✓ Reconstruction: Accurate${colors.reset}`
      );
    } else {
      console.log(`   ${colors.red}✗ Reconstruction: Failed${colors.reset}`);
      accuracy.issues.forEach(issue => {
        console.log(`     ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }

    // Show analysis
    console.log(`   Analysis:`);
    console.log(
      `     Word similarity: ${(result.analysis.wordSimilarity * 100).toFixed(1)}%`
    );
    console.log(
      `     Char similarity: ${(result.analysis.characterSimilarity * 100).toFixed(1)}%`
    );
    console.log(
      `     Change ratio: ${(result.analysis.changeRatio * 100).toFixed(1)}%`
    );

    if (result.analysis.hasAbbreviationExpansion)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Abbreviation expansion detected`
      );
    if (result.analysis.hasRepeatedCharCorrection)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Repeated char correction detected`
      );
    if (result.analysis.hasCleanWordChanges)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Clean word changes detected`
      );
    if (result.analysis.hasPunctuationOnlyChanges)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Punctuation only changes detected`
      );
    if (result.analysis.hasNumberUnitChanges)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Number/unit changes detected`
      );
    if (result.analysis.hasWordReplacements)
      console.log(
        `     ${colors.cyan}ℹ${colors.reset} Word replacements detected`
      );
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed: ${error.message}${colors.reset}`);
  }

  console.log();
}

/**
 * Run all test cases
 */
async function runAllTests() {
  console.log(
    `${colors.bold}${colors.blue}🧪 Simple Diff Test Suite${colors.reset}\n`
  );
  console.log(`Testing specific cases as requested:\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      await runSingleTest(testCase);
      passed++;
    } catch (error) {
      console.log(
        `${colors.red}❌ Test ${testCase.id} failed with error: ${error.message}${colors.reset}\n`
      );
      failed++;
    }
  }

  console.log(`${colors.bold}📋 Summary${colors.reset}`);
  console.log(`─────────────────────────`);
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, runSingleTest };
