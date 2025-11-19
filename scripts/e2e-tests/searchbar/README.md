# SearchBar Filter - E2E Tests

This folder contains End-to-End (E2E) testing scripts for SearchBar filter feature using Playwright MCP.

## Available Tests

### Case 0: SearchBar Filter - One Badge (Column Only)

**File:** `searchbar-filter-case-0.js`

**Test Flow:**

- Navigate to Item Master page
- Type `#` to open column selector
- Select "Harga Pokok" column
- Take screenshot (JPEG format)

**Expected Result:**

- **ONE badge** visible: [Harga Pokok]
- No operator or value selected yet
- Column badge shown, ready for operator selection

---

### Case 1: SearchBar Filter - Two Badges (Column + Operator)

**File:** `searchbar-filter-case-1.js`

**Test Flow:**

- Navigate to Item Master page
- Type `#` to open column selector
- Select "Harga Pokok" column
- Type `#` again to open operator selector
- Select "Greater Than" operator
- Take screenshot (JPEG format)

**Expected Result:**

- **TWO badges** visible: [Harga Pokok][Greater Than]
- No value entered yet
- Operator selector closed after selection

---

### Case 2: SearchBar Filter - Three Badges (Column + Operator + Value)

**File:** `searchbar-filter-case-2.js`

**Test Flow:**

- Navigate to Item Master page
- Type `#` to open column selector
- Select "Harga Pokok" column
- Type `#` again to open operator selector
- Select "Greater Than" operator
- Type value `50000`
- Press Enter to apply filter
- Take screenshot (JPEG format)

**Expected Result:**

- **THREE badges** visible: [Harga Pokok][Greater Than][50000]
- Data filtered to show only items with Harga Pokok > 50,000
- Filter applied and active

---

### Case 3: SearchBar Filter - Five Badges (Multi-Condition Before Second Value)

**File:** `searchbar-filter-case-3.js`

**Test Flow:**

- Navigate to Item Master page
- Type `#` to open column selector
- Select "Harga Pokok" column
- Type `#` again to open operator selector
- Select "Greater Than" operator
- Type value `50000`
- Press Enter to confirm first condition
- Type `#` to open join operator selector
- Select "AND" join operator
- Operator selector opens automatically
- Select "Less Than" operator
- Take screenshot (JPEG format)

**Expected Result:**

- **FIVE badges** visible: [Harga Pokok][Greater Than][50000][AND][Less Than]
- Second value NOT entered yet
- Ready for second value input

---

### Case 4: SearchBar Filter - Six Badges (Complete Multi-Condition)

**File:** `searchbar-filter-case-4.js`

**Test Flow:**

- Navigate to Item Master page
- Type `#` to open column selector
- Select "Harga Pokok" column
- Type `#` again to open operator selector
- Select "Greater Than" operator
- Type value `50000`
- Press Enter to confirm first condition
- Type `#` to open join operator selector
- Select "AND" join operator
- Operator selector opens automatically
- Select "Less Than" operator
- Type second value `100000`
- Press Enter to apply multi-condition filter
- Take screenshot (JPEG format)

**Expected Result:**

- **SIX badges** visible: [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
- Data filtered to show items with 50,000 < Harga Pokok < 100,000
- Multi-condition filter is active and applied

## How to Use

### Via Playwright MCP (Claude Code)

**Case 0 (One Badge - Column Only):**

```javascript
const {
  testSearchBarFilterCase0,
} = require('./scripts/e2e-tests/searchbar/searchbar-filter-case-0.js');
await testSearchBarFilterCase0(page);
```

**Case 1 (Two Badges):**

```javascript
const {
  testSearchBarFilterCase1,
} = require('./scripts/e2e-tests/searchbar/searchbar-filter-case-1.js');
await testSearchBarFilterCase1(page);
```

**Case 2 (Three Badges):**

```javascript
const {
  testSearchBarFilterCase2,
} = require('./scripts/e2e-tests/searchbar/searchbar-filter-case-2.js');
await testSearchBarFilterCase2(page);
```

**Case 3 (Five Badges - Before Second Value):**

```javascript
const {
  testSearchBarFilterCase3,
} = require('./scripts/e2e-tests/searchbar/searchbar-filter-case-3.js');
await testSearchBarFilterCase3(page);
```

**Case 4 (Six Badges - Complete Multi-Condition):**

```javascript
const {
  testSearchBarFilterCase4,
} = require('./scripts/e2e-tests/searchbar/searchbar-filter-case-4.js');
await testSearchBarFilterCase4(page);
```

**Or copy-paste directly to browser_run_code:**

```javascript
// Copy the function content from the respective file and run
await testSearchBarFilterCase0(page); // Case 0
await testSearchBarFilterCase1(page); // Case 1
await testSearchBarFilterCase2(page); // Case 2
await testSearchBarFilterCase3(page); // Case 3
await testSearchBarFilterCase4(page); // Case 4
```

## Output

Test screenshots will be saved to `.playwright-mcp/` folder with format:

- Case 0: `searchbar-filter-case-0-[timestamp].jpeg`
- Case 1: `searchbar-filter-case-1-[timestamp].jpeg`
- Case 2: `searchbar-filter-case-2-[timestamp].jpeg`
- Case 3: `searchbar-filter-case-3-[timestamp].jpeg`
- Case 4: `searchbar-filter-case-4-[timestamp].jpeg`

**Note:** Screenshots are saved in JPEG format, not PNG.

## Notes

- Make sure the application is running at `http://localhost:5173`
- Playwright MCP must be installed and configured
- Each test has console logs for progress tracking

---

### Sync Validation Test: SearchBar ↔ AG Grid Filter Panel

**File:** `searchbar-sync-validation.js`

**Purpose:**

Validates that SearchBar badges and AG Grid Filter Panel are synchronized. This test ensures that:

- Badge representation matches the actual filter state
- AG Grid Filter Panel shows the correct filter pattern
- Filter logic is consistent between badge UI and grid

**Test Cases:**

- **Case 2 Validation**: 3 badges → Filter Panel should show `"> 50000"`
- **Case 4 Validation**: 6 badges → Filter Panel should show `"> 50000 AND < 100000"`

**Usage:**

```javascript
const {
  testSearchBarSyncValidation,
} = require('./scripts/e2e-tests/searchbar/searchbar-sync-validation.js');
await testSearchBarSyncValidation(page);
```

**Expected Output:**

```
✅ ALL TESTS PASSED!
✨ Badge-to-Filter synchronization is working correctly.

Key Findings:
• SearchBar badges accurately represent the filter state
• AG Grid Filter Panel shows matching filter patterns
• Filter logic is consistent between badge UI and grid filtering
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into SearchBar filter feature implementation
- [FILE_INDEX.md](./FILE_INDEX.md) - Quick reference to all files involved in the feature
