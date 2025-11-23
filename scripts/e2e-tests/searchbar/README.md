# SearchBar Filter - E2E Tests

End-to-End testing for SearchBar filter feature using **Claude Code + Playwright MCP**.

## 📋 Test Flows

All test scenarios are documented in **[TEST-FLOWS.md](./TEST-FLOWS.md)**.

### Quick Overview:

- **Badge Creation Tests**: 5 scenarios (Case 0-4) - from 1 badge to 6 badges
- **Badge Deletion Tests**: 7 scenarios (D0-D6) - cascading deletion behaviors
- **Badge Edit Tests**: 10 scenarios (E0-E9) - comprehensive editing functionality
  - Column badge editing (2, 3, 5, 6 badge states)
  - Operator badge editing (first operator, second operator)
  - Value badge editing (first value, second value)
  - Join operator bidirectional editing (AND↔OR)
  - Progressive deletion with auto operator selector
- **Total**: 22 comprehensive test scenarios

## 🚀 How to Run Tests

### Using Claude Code:

Simply ask Claude to run a test:

```
"Run test D1"
"Test Case 2"
"Execute deletion test D3"
```

Claude will:

1. Navigate to the page
2. Execute the steps from TEST-FLOWS.md
3. Take screenshots
4. Validate results
5. Report pass/fail

### Application URL:

`http://localhost:5173/master-data/item-master/items`

### Screenshots:

Saved to `.playwright-mcp/` folder (JPEG format)

## 📚 Documentation

- **[TEST-FLOWS.md](./TEST-FLOWS.md)** - Complete test scenarios and flows
- **[ARCHITECTURE-ANALYSIS.md](./ARCHITECTURE-ANALYSIS.md)** - Code architecture investigation (how 22 use cases are handled)
- **[FILE_INDEX.md](./FILE_INDEX.md)** - File reference guide

## ✨ Benefits of This Approach

✅ **No code maintenance** - Just markdown flows
✅ **Easy to read** - Plain English descriptions
✅ **Flexible execution** - Claude executes interactively
✅ **Auto-documentation** - Screenshots + validation
✅ **No dependencies** - No helper functions to maintain

## 🎯 Test Coverage

- UI rendering and badge creation (5 tests)
- User interactions (click, type, keyboard, hover)
- State management and transitions (0→6 badge states)
- Data synchronization (badges ↔ filter panel ↔ AG Grid)
- Cascading deletions (7 deletion scenarios)
- Badge editing functionality (10 comprehensive edit tests)
  - Column badge editing preserves structure
  - Operator badge editing maintains integrity
  - Value badge inline editing with re-filtering
  - Join operator bidirectional editing (AND↔OR↔AND)
  - Auto operator selector after backspace deletion
- Auto-opening selectors
- Multi-condition filter management
- Data grid filtering and re-filtering

---

**Total Test Scenarios**: 22 comprehensive tests (100% pass rate)
