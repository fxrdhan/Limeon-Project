# Scripts Directory

Collection of utility scripts and testing tools for PharmaSys development.

## Diff Analyzer Testing Tools

### 1. Test Dictionary (`diff-test-dictionary.ts`)

Comprehensive collection of test cases for evaluating the smart adaptive diff algorithm.

**Features:**

- 30+ test cases covering various scenarios
- Categorized by type: abbreviation expansion, word replacement, punctuation, numbers, medical terms, etc.
- Difficulty levels: easy, medium, hard, extreme
- Helper functions for filtering and statistics

**Categories:**

- `abbreviation_expansion` - dgn→dengan, utk→untuk, etc.
- `word_replacement` - putih→merah, tablet→sirup
- `punctuation` - comma insertion, formatting changes
- `number_unit` - dosage changes, unit conversions
- `mixed_complex` - multiple change types combined
- `edge_case` - short texts, identical texts, completely different
- `medical_term` - pharmaceutical and medical terminology
- `indonesian_specific` - Indonesian language patterns
- `performance` - long texts for performance testing

### 2. Comprehensive Test Runner (`test-diff-analyzer.ts`)

Full test suite runner with detailed analysis and reporting.

**Usage:**

```bash
# Run all tests
yarn tsx scripts/test-diff-analyzer.ts

# Filter by category
yarn tsx scripts/test-diff-analyzer.ts --category abbreviation_expansion

# Filter by difficulty
yarn tsx scripts/test-diff-analyzer.ts --difficulty hard

# Run specific test
yarn tsx scripts/test-diff-analyzer.ts --id abbrev_001
```

**Features:**

- Colored terminal output with ✓/✗ indicators
- Performance timing for each test
- Fragmentation and accuracy detection
- Success rate by category and difficulty
- Detailed failure analysis with visual diff output

**Test Evaluation:**

- Mode detection (character vs word vs smart)
- Over-fragmentation detection
- Text reconstruction accuracy
- Performance timing
- Pattern analysis

### 3. Quick Interactive Tester (`quick-diff-test.ts`)

Simple tool for testing specific text pairs during development.

**Usage:**

```bash
# Test specific pair
yarn tsx scripts/quick-diff-test.ts "old text" "new text"

# Interactive mode
yarn tsx scripts/quick-diff-test.ts --interactive

# Show usage and start interactive
yarn tsx scripts/quick-diff-test.ts
```

**Features:**

- Side-by-side comparison of all three modes (smart, character, word)
- Visual diff output with colors
- Performance timing
- Segment analysis and issue detection
- Text reconstruction verification
- Interactive mode for multiple tests

## Other Utility Scripts

### User Management

- `add-admin-user.ts` - Create new admin users
- `update-user-password.ts` - Update user passwords

### Data Management

- `export.ts` - Export database data

All user management scripts support `--help` flag for detailed usage instructions.

## Development Workflow

When improving the diff algorithm:

1. **Add test cases** to `diff-test-dictionary.ts` for new scenarios
2. **Run comprehensive tests** to establish baseline: `yarn tsx scripts/test-diff-analyzer.ts`
3. **Make algorithm changes** in `src/utils/diff.ts`
4. **Test specific cases** during development: `yarn tsx scripts/quick-diff-test.ts "test" "cases"`
5. **Verify improvements** with full test suite
6. **Update edge function** once local testing is complete

## Example Test Output

```bash
🧪 Diff Analyzer Test Suite

✓ abbrev_001: Simple abbreviation expansion - dgn to dengan (0.12ms)
✗ word_002: Multiple word replacements (0.08ms)
  ⚠ Over-fragmentation: 4 segments with ≤2 characters
  Old: "Sediaan cair yang terdiri dari dua cairan"
  New: "Sediaan cair dari dua cairan"
  Diff: Sediaan cair [+dari] [-yang terdiri dari] dua cairan

📋 Test Summary
─────────────────────────────────────────
Total tests: 32
Passed: 28
Failed: 4
Success rate: 87.5%
Average execution time: 0.09ms
```

## Performance Considerations

- Individual tests typically run in <1ms
- Full test suite (~30 tests) completes in <100ms
- Complex cases with long texts may take 2-5ms
- Memory usage is minimal for all test scenarios

## Contributing Test Cases

When adding new test cases to the dictionary:

1. Use descriptive IDs (`category_###`)
2. Include clear descriptions and notes
3. Set appropriate difficulty levels
4. Add expected mode for validation
5. Cover edge cases and real-world scenarios
6. Test pharmaceutical and medical terminology
7. Include Indonesian language specifics
