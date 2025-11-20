# SearchBar Filter - E2E Tests

This folder contains End-to-End (E2E) testing scripts for SearchBar filter feature using Playwright MCP.

## Test Types

### 🔍 DOM Validation Tests (`filter-case-*.js`)

**Purpose**: Validate that badges **render correctly** in the DOM

- ✅ Check badge **count** (1, 2, 3, 5, or 6 badges)
- ✅ Verify badges **exist** in DOM tree
- ✅ Use Playwright locators to count badge elements
- ✅ Return pass/fail with actual vs expected count

### 🔄 Sync Validation Tests (`sync-validation.js`)

**Purpose**: Validate that badge **content syncs** with AG Grid Filter Panel

- ✅ Check badge content matches filter panel text
- ✅ Verify filter logic is correct (e.g., "> 50000")
- ✅ Ensure filtering actually works on data
- ✅ Test Cases 2 & 4 (simple & multi-condition filters)

---

## DOM Validation Tests (Case 0-4)

### Case 0: One Badge (Column Only)

**File:** `filter-case-0.js`

**Test Flow:**

- Navigate to Item Master page
- Create column badge: "Harga Pokok"
- Validate DOM badge count

**Validation:**

- ✅ Expected badge count: **1**
- ✅ Badge should contain: `[Harga Pokok]`
- ✅ Returns: `{ passed, expectedCount: 1, actualCount }`

---

### Case 1: Two Badges (Column + Operator)

**File:** `filter-case-1.js`

**Test Flow:**

- Navigate to Item Master page
- Create column + operator badges
- Validate DOM badge count

**Validation:**

- ✅ Expected badge count: **2**
- ✅ Badges should contain: `[Harga Pokok][Greater Than]`
- ✅ Returns: `{ passed, expectedCount: 2, actualCount }`

---

### Case 2: Three Badges (Simple Filter)

**File:** `filter-case-2.js`

**Test Flow:**

- Navigate to Item Master page
- Create simple filter: "Harga Pokok > 50000"
- Validate DOM badge count

**Validation:**

- ✅ Expected badge count: **3**
- ✅ Badges should contain: `[Harga Pokok][Greater Than][50000]`
- ✅ Returns: `{ passed, expectedCount: 3, actualCount }`

---

### Case 3: Five Badges (Multi-Condition Partial)

**File:** `filter-case-3.js`

**Test Flow:**

- Navigate to Item Master page
- Create multi-condition partial filter (without second value)
- Validate DOM badge count

**Validation:**

- ✅ Expected badge count: **5**
- ✅ Badges should contain: `[Harga Pokok][Greater Than][50000][AND][Less Than]`
- ✅ Returns: `{ passed, expectedCount: 5, actualCount }`
- ℹ️ Note: Second value NOT entered yet

---

### Case 4: Six Badges (Multi-Condition Complete)

**File:** `filter-case-4.js`

**Test Flow:**

- Navigate to Item Master page
- Create complete multi-condition filter
- Validate DOM badge count

**Validation:**

- ✅ Expected badge count: **6**
- ✅ Badges should contain: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
- ✅ Returns: `{ passed, expectedCount: 6, actualCount }`
- ℹ️ Filter range: 50,000 < Harga Pokok < 100,000

---

## How to Use

### Via Playwright MCP (Claude Code)

**Case 0 (One Badge - Column Only):**

```javascript
const {
  testSearchBarFilterCase0,
} = require('./scripts/e2e-tests/searchbar/filter-case-0.js');
await testSearchBarFilterCase0(page);
```

**Case 1 (Two Badges):**

```javascript
const {
  testSearchBarFilterCase1,
} = require('./scripts/e2e-tests/searchbar/filter-case-1.js');
await testSearchBarFilterCase1(page);
```

**Case 2 (Three Badges):**

```javascript
const {
  testSearchBarFilterCase2,
} = require('./scripts/e2e-tests/searchbar/filter-case-2.js');
await testSearchBarFilterCase2(page);
```

**Case 3 (Five Badges - Before Second Value):**

```javascript
const {
  testSearchBarFilterCase3,
} = require('./scripts/e2e-tests/searchbar/filter-case-3.js');
await testSearchBarFilterCase3(page);
```

**Case 4 (Six Badges - Complete Multi-Condition):**

```javascript
const {
  testSearchBarFilterCase4,
} = require('./scripts/e2e-tests/searchbar/filter-case-4.js');
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

- Case 0: `filter-case-0-[timestamp].jpeg`
- Case 1: `filter-case-1-[timestamp].jpeg`
- Case 2: `filter-case-2-[timestamp].jpeg`
- Case 3: `filter-case-3-[timestamp].jpeg`
- Case 4: `filter-case-4-[timestamp].jpeg`

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
