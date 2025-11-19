# E2E Tests

This folder contains End-to-End (E2E) testing scripts for PharmaSys application using Playwright MCP.

## Available Tests

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

## How to Use

### Via Playwright MCP (Claude Code)

**Case 1 (Two Badges):**

```javascript
const {
  testSearchBarFilterCase1,
} = require('./scripts/e2e-tests/searchbar-filter-case-1.js');
await testSearchBarFilterCase1(page);
```

**Case 2 (Three Badges):**

```javascript
const {
  testSearchBarFilterCase2,
} = require('./scripts/e2e-tests/searchbar-filter-case-2.js');
await testSearchBarFilterCase2(page);
```

**Or copy-paste directly to browser_run_code:**

```javascript
// Copy the function content from the respective file and run
await testSearchBarFilterCase1(page); // or testSearchBarFilterCase2(page)
```

## Output

Test screenshots will be saved to `.playwright-mcp/` folder with format:

- Case 1: `searchbar-filter-case-1-[timestamp].jpeg`
- Case 2: `searchbar-filter-case-2-[timestamp].jpeg`

**Note:** Screenshots are saved in JPEG format, not PNG.

## Notes

- Make sure the application is running at `http://localhost:5173`
- Playwright MCP must be installed and configured
- Each test has console logs for progress tracking
