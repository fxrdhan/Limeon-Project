# E2E Tests

End-to-End testing for PharmaSys application using **Claude Code + Playwright MCP**.

## 🎯 Philosophy

Tests are defined as **markdown flows**, not code. Claude Code + Playwright MCP execute tests interactively.

### Benefits:

- ✅ No code maintenance
- ✅ Easy to read and update
- ✅ Flexible execution
- ✅ Auto-documentation via screenshots
- ✅ No dependencies

## 📁 Test Categories

### 🔍 [SearchBar Filter Tests](./searchbar/)

Comprehensive testing for SearchBar filter feature with badge system.

**Coverage:**

- Badge creation (5 scenarios)
- Badge deletion (5 scenarios)
- Synchronization validation (2 scenarios)
- **Total: 12 test scenarios**

**Files:**

- [TEST-FLOWS.md](./searchbar/TEST-FLOWS.md) - All test scenarios
- [README.md](./searchbar/README.md) - Test overview
- [ARCHITECTURE.md](./searchbar/ARCHITECTURE.md) - Feature deep dive
- [FILE_INDEX.md](./searchbar/FILE_INDEX.md) - File reference

**Quick Start:**

```
"Run test D1"
"Test Case 2"
"Execute deletion test D3"
```

---

## 🚀 How to Run Tests

Simply ask Claude Code to run a test by name or scenario. Claude will:

1. Read the test flow from markdown
2. Navigate and interact with the application
3. Take screenshots
4. Validate results
5. Report pass/fail

**No code execution needed** - just conversational test execution!

---

## 📋 Adding New Test Categories

To add a new test category:

1. Create a new folder: `scripts/e2e-tests/[feature-name]/`
2. Add `TEST-FLOWS.md` with test scenarios
3. Add `README.md` with overview
4. Update this file with links

**Example structure:**

```
scripts/e2e-tests/
├── README.md (this file)
└── [feature-name]/
    ├── TEST-FLOWS.md  (test scenarios)
    ├── README.md      (overview)
    └── ...            (optional docs)
```

---

**More test categories coming soon...**
