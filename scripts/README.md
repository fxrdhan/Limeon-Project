# Scripts Directory

Collection of utility scripts and testing tools for PharmaSys development.

## Diff Analyzer Testing Tools

### 1. Test Dictionary (`diff-test-dictionary.ts`)

Comprehensive collection of test cases for evaluating the smart adaptive diff algorithm.

**Features:**

- 40+ test cases covering various scenarios
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

### 2. Unified Diff Test Suite (`unified-diff-test.ts`)

**⭐ NEW: Consolidated testing tool that replaces all previous fragmented scripts**

All-in-one testing solution with multiple modes for comprehensive diff algorithm evaluation.

**Usage:**

```bash
# Run comprehensive test suite (default)
yarn tsx scripts/unified-diff-test.ts

# Interactive testing mode
yarn tsx scripts/unified-diff-test.ts --interactive

# Test specific pair via API
yarn tsx scripts/unified-diff-test.ts --api "old text" "new text"

# Test specific pair locally
yarn tsx scripts/unified-diff-test.ts --local "old text" "new text"

# Debug mode with detailed decision analysis
yarn tsx scripts/unified-diff-test.ts --debug "old text" "new text"

# Filter by category
yarn tsx scripts/unified-diff-test.ts --category medical_term

# Filter by difficulty
yarn tsx scripts/unified-diff-test.ts --difficulty hard

# Run specific test case
yarn tsx scripts/unified-diff-test.ts --id abbrev_001

# Show help
yarn tsx scripts/unified-diff-test.ts --help
```

**Features:**

- **Comprehensive Testing**: Full test suite with 40+ test cases
- **Interactive Mode**: Live testing with multiple test modes
- **API Testing**: Direct testing against edge function API
- **Local Testing**: Side-by-side comparison of all diff modes (smart, character, word)
- **Debug Mode**: Detailed decision logic analysis with step-by-step breakdown
- **Filtering**: By category, difficulty, or specific test ID
- **Visual Output**: Colored terminal output with detailed analysis
- **Performance Metrics**: Timing for local and API tests
- **Accuracy Validation**: Text reconstruction verification

**Test Modes:**

- **Comprehensive**: Run all test cases with detailed reporting
- **Interactive**: Manual testing with real-time feedback
- **API**: Test against deployed edge function
- **Local**: Test using local diff utilities
- **Debug**: Deep analysis of decision-making logic

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
2. **Run comprehensive tests** to establish baseline: `yarn tsx scripts/unified-diff-test.ts`
3. **Make algorithm changes** in `src/utils/diff.ts`
4. **Test specific cases** during development: `yarn tsx scripts/unified-diff-test.ts --local "test" "cases"`
5. **Debug issues** with detailed analysis: `yarn tsx scripts/unified-diff-test.ts --debug "problematic" "case"`
6. **Verify improvements** with full test suite
7. **Test API consistency**: `yarn tsx scripts/unified-diff-test.ts --api "test" "cases"`
8. **Update edge function** once local testing is complete

## Example Test Output

```bash
🧪 Comprehensive Diff Test Suite

✓ abbrev_001: Simple abbreviation expansion - dgn to dengan (0.12ms)
✗ word_002: Multiple word replacements (0.08ms)
  ⚠ Over-fragmentation: 4 segments with ≤2 characters
  Old: "Sediaan cair yang terdiri dari dua cairan"
  New: "Sediaan cair dari dua cairan"
  Diff: Sediaan cair [-yang terdiri] [+dari] dua cairan

📋 Test Summary
─────────────────────────────────────────
Total tests: 40
Passed: 35
Failed: 5
Success rate: 87.5%
Average execution time: 0.09ms
Total execution time: 3.67ms
🎉 All tests passed!
```

## Performance Considerations

- Individual tests typically run in <1ms
- Full test suite (40+ tests) completes in <5ms
- API tests include network latency (50-200ms)
- Debug mode provides detailed timing breakdown
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
