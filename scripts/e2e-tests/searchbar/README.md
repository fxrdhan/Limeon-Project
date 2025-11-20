# SearchBar Filter - E2E Tests

End-to-End testing for SearchBar filter feature using **Claude Code + Playwright MCP**.

## 📋 Test Flows

All test scenarios are documented in **[TEST-FLOWS.md](./TEST-FLOWS.md)**.

### Quick Overview:

- **Badge Creation Tests**: 5 scenarios (0-4) - from 1 badge to 6 badges
- **Badge Deletion Tests**: 5 scenarios (D1-D5) - all deletion behaviors
- **Synchronization Tests**: Badge ↔ Filter Panel validation

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
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Feature architecture deep dive
- **[FILE_INDEX.md](./FILE_INDEX.md)** - File reference guide

## ✨ Benefits of This Approach

✅ **No code maintenance** - Just markdown flows
✅ **Easy to read** - Plain English descriptions
✅ **Flexible execution** - Claude executes interactively
✅ **Auto-documentation** - Screenshots + validation
✅ **No dependencies** - No helper functions to maintain

## 🎯 Test Coverage

- UI rendering and badge creation
- User interactions (click, type, keyboard)
- State management and transitions
- Data synchronization (badges ↔ filter panel)
- Cascading deletions
- Auto-opening selectors
- Data grid filtering

---

**Total Test Scenarios**: 12 comprehensive tests
