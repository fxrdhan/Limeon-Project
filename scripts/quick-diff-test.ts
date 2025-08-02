/**
 * Quick Diff Test - Simple interactive testing tool
 *
 * Quick way to test specific text pairs during development
 * Usage: yarn tsx scripts/quick-diff-test.ts "old text" "new text"
 */

import {
  createSmartDiff,
  createCharacterDiff,
  createWordDiff,
  DiffSegment,
} from '../src/utils/diff';
import * as readline from 'readline';

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
 * Analyze and compare all three diff modes
 */
function analyzeDiffModes(oldText: string, newText: string) {
  console.log(`${colors.bold}${colors.blue}🔍 Diff Analysis${colors.reset}`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  console.log(`${colors.bold}Input:${colors.reset}`);
  console.log(`  Old: "${oldText}"`);
  console.log(`  New: "${newText}"\n`);

  // Test all three modes
  const modes = [
    { name: 'Smart', fn: createSmartDiff },
    { name: 'Character', fn: createCharacterDiff },
    { name: 'Word', fn: createWordDiff },
  ];

  for (const mode of modes) {
    const startTime = performance.now();
    const segments = mode.fn(oldText, newText);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log(
      `${colors.bold}${mode.name} Mode:${colors.reset} (${executionTime.toFixed(2)}ms)`
    );
    console.log(`  Result: ${formatSegments(segments)}`);

    // Analyze segments
    const stats = analyzeSegments(segments);
    console.log(
      `  Stats: ${stats.total} segments (${stats.added} added, ${stats.removed} removed, ${stats.unchanged} unchanged)`
    );

    if (stats.issues.length > 0) {
      stats.issues.forEach(issue => {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }

    console.log();
  }

  // Reconstruction test
  console.log(`${colors.bold}Reconstruction Test:${colors.reset}`);
  const smartSegments = createSmartDiff(oldText, newText);
  const reconstructedOld = smartSegments
    .filter(s => s.type !== 'added')
    .map(s => s.text)
    .join('');
  const reconstructedNew = smartSegments
    .filter(s => s.type !== 'removed')
    .map(s => s.text)
    .join('');

  const oldMatch = reconstructedOld === oldText;
  const newMatch = reconstructedNew === newText;

  console.log(
    `  Old text match: ${oldMatch ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`}`
  );
  console.log(
    `  New text match: ${newMatch ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`}`
  );

  if (!oldMatch) {
    console.log(`    Expected: "${oldText}"`);
    console.log(`    Got: "${reconstructedOld}"`);
  }

  if (!newMatch) {
    console.log(`    Expected: "${newText}"`);
    console.log(`    Got: "${reconstructedNew}"`);
  }
}

/**
 * Analyze segment statistics and potential issues
 */
function analyzeSegments(segments: DiffSegment[]) {
  const stats = {
    total: segments.length,
    added: segments.filter(s => s.type === 'added').length,
    removed: segments.filter(s => s.type === 'removed').length,
    unchanged: segments.filter(s => s.type === 'unchanged').length,
    issues: [] as string[],
  };

  // Check for over-fragmentation
  const changeSegments = segments.filter(s => s.type !== 'unchanged');
  const smallSegments = changeSegments.filter(s => s.text.length <= 2);

  if (smallSegments.length > 3) {
    stats.issues.push(
      `Possible over-fragmentation: ${smallSegments.length} segments ≤2 chars`
    );
  }

  // Check for alternating pattern
  let alternatingCount = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type !== segments[i - 1].type) {
      alternatingCount++;
    }
  }

  if (alternatingCount > segments.length * 0.7) {
    stats.issues.push(
      `High alternating pattern: ${alternatingCount}/${segments.length} type changes`
    );
  }

  // Check for empty segments
  const emptySegments = segments.filter(s => s.text.length === 0);
  if (emptySegments.length > 0) {
    stats.issues.push(`Empty segments detected: ${emptySegments.length}`);
  }

  return stats;
}

/**
 * Interactive mode for testing multiple pairs
 */
function interactiveMode() {
  console.log(
    `${colors.bold}${colors.cyan}🎮 Interactive Diff Testing Mode${colors.reset}`
  );
  console.log(`Enter text pairs to compare. Type 'quit' to exit.\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptForTexts() {
    rl.question('Old text: ', (oldText: string) => {
      if (oldText.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      rl.question('New text: ', (newText: string) => {
        if (newText.toLowerCase() === 'quit') {
          rl.close();
          return;
        }

        console.log();
        analyzeDiffModes(oldText, newText);
        console.log(
          `${colors.cyan}───────────────────────────────────────────${colors.reset}\n`
        );

        promptForTexts();
      });
    });
  }

  promptForTexts();
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - show usage and start interactive mode
    console.log(`${colors.bold}Quick Diff Test Tool${colors.reset}\n`);
    console.log(`Usage:`);
    console.log(
      `  yarn tsx scripts/quick-diff-test.ts "old text" "new text"  # Test specific pair`
    );
    console.log(
      `  yarn tsx scripts/quick-diff-test.ts --interactive         # Interactive mode`
    );
    console.log(
      `  yarn tsx scripts/quick-diff-test.ts                       # This help + interactive\n`
    );

    interactiveMode();
  } else if (args[0] === '--interactive') {
    interactiveMode();
  } else if (args.length === 2) {
    // Two arguments - test the specific pair
    const [oldText, newText] = args;
    analyzeDiffModes(oldText, newText);
  } else {
    console.log(
      `${colors.red}Error: Please provide exactly two arguments (old text, new text) or use --interactive${colors.reset}`
    );
    console.log(
      `Usage: yarn tsx scripts/quick-diff-test.ts "old text" "new text"`
    );
    process.exit(1);
  }
}

export { analyzeDiffModes, analyzeSegments };
