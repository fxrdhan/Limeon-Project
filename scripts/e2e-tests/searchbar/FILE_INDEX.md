# SearchBar Filter Feature - File Index

Quick reference guide to all files involved in the SearchBar filter feature.

## 🎯 Core Components

| File                                              | Purpose                                  | Key Exports         |
| ------------------------------------------------- | ---------------------------------------- | ------------------- |
| `src/components/search-bar/EnhancedSearchBar.tsx` | Main search bar component with filtering | `EnhancedSearchBar` |
| `src/components/search-bar/SearchBar.tsx`         | Basic search bar (legacy)                | `SearchBar`         |
| `src/components/search-bar/index.tsx`             | Public API entry point                   | All components      |
| `src/components/search-bar/exports.ts`            | Re-exports for convenience               | -                   |

## 🧩 Sub-Components

| File                                                                      | Purpose                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/components/search-bar/components/Badge.tsx`                          | Individual badge rendering **with edit/clear actions** |
| `src/components/search-bar/components/SearchBadge.tsx`                    | Badge container/manager                                |
| `src/components/search-bar/components/SearchIcon.tsx`                     | Animated search icon                                   |
| `src/components/search-bar/components/selectors/BaseSelector.tsx`         | Generic selector base                                  |
| `src/components/search-bar/components/selectors/ColumnSelector.tsx`       | Column selection modal                                 |
| `src/components/search-bar/components/selectors/OperatorSelector.tsx`     | Operator selection modal                               |
| `src/components/search-bar/components/selectors/JoinOperatorSelector.tsx` | AND/OR selection modal                                 |

## 🪝 Hooks

| File                                                     | Purpose                                 | Key Function                           |
| -------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| `src/components/search-bar/hooks/useSearchState.ts`      | State machine & value parsing           | Derives EnhancedSearchState from input |
| `src/components/search-bar/hooks/useBadgeBuilder.ts`     | Badge generation **with edit handlers** | Creates badge configs from state       |
| `src/components/search-bar/hooks/useSearchInput.ts`      | Input value management                  | Handles display value & changes        |
| `src/components/search-bar/hooks/useSearchKeyboard.ts`   | Keyboard navigation                     | Arrow keys, Enter, Escape              |
| `src/components/search-bar/hooks/useSelectorPosition.ts` | Modal positioning                       | Calculates selector position           |

## ⚙️ Configuration & Types

| File                                          | Purpose                        |
| --------------------------------------------- | ------------------------------ |
| `src/components/search-bar/constants.ts`      | Constants (delays, thresholds) |
| `src/components/search-bar/operators.tsx`     | Filter operator definitions    |
| `src/components/search-bar/types/index.ts`    | Type exports                   |
| `src/components/search-bar/types/search.ts`   | Search-related types           |
| `src/components/search-bar/types/badge.ts`    | Badge types                    |
| `src/components/search-bar/types/selector.ts` | Selector types                 |

## 🛠️ Utilities

| File                                             | Purpose                                | Key Functions                                                                                                        |
| ------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/search-bar/utils/searchUtils.ts` | Search value & multi-condition parsing | `parseSearchValue()`, `parseMultiConditionFilter()`, `findColumn()`, `buildColumnValue()`, `getOperatorSearchTerm()` |

## 🔌 Integration Layer

| File                                               | Purpose                        |
| -------------------------------------------------- | ------------------------------ |
| `src/features/shared/components/SearchToolbar.tsx` | Wrapper component for pages    |
| `src/hooks/ag-grid/useEnhancedAgGridSearch.ts`     | AG Grid integration hook       |
| `src/utils/searchColumns.ts`                       | Column configuration utilities |

## 📄 Usage Examples

| File                                            | Description                      |
| ----------------------------------------------- | -------------------------------- |
| `src/pages/master-data/item-master/index.tsx`   | Item Master page using SearchBar |
| `src/pages/master-data/doctor-list/index.tsx`   | Doctor list page example         |
| `src/pages/master-data/patient-list/index.tsx`  | Patient list page example        |
| `src/pages/master-data/supplier-list/index.tsx` | Supplier list page example       |

## 🧪 E2E Tests

| File                                                   | Purpose                                   |
| ------------------------------------------------------ | ----------------------------------------- |
| `scripts/e2e-tests/searchbar/TEST-FLOWS.md`            | **All test scenarios & flows**            |
| `scripts/e2e-tests/searchbar/README.md`                | Test overview & usage guide               |
| `scripts/e2e-tests/searchbar/ARCHITECTURE.md`          | Feature architecture deep dive            |
| `scripts/e2e-tests/searchbar/ARCHITECTURE-ANALYSIS.md` | **Code architecture investigation (NEW)** |
| `scripts/e2e-tests/searchbar/FILE_INDEX.md`            | This file                                 |

### Test Coverage:

- **Badge Creation Tests**: 5 scenarios (Case 0-4) - 1 badge to 6 badges
- **Badge Deletion Tests**: 7 scenarios (D0-D6) - cascading deletion behaviors
- **Badge Edit Tests**: 10 scenarios (E0-E9) ⭐ COMPREHENSIVE
  - E0: Edit column badge (2 badges)
  - E1: Edit column badge with filter sync (3 badges)
  - E2: Edit value badge (simple filter)
  - E3: Edit second value badge (multi-condition)
  - E4: Edit first value badge (multi-condition)
  - E5: Edit join operator badge (AND↔OR bidirectional)
  - E6: Edit column badge (6 badges multi-condition)
  - E7: Edit first operator badge (6 badges)
  - E8: Edit column in partial multi-condition (5 badges)
  - E9: Progressive value deletion with auto operator selector
- **Total**: 22 comprehensive test scenarios

**Badge Edit Testing validates:**

- Edit button functionality (🖊️ pena icon)
- Column badge editing preserves operator/value structure
- Operator badge editing maintains multi-condition integrity
- Value badge inline editing with re-filtering
- Join operator bidirectional editing (AND↔OR↔AND)
- Auto operator selector opening after backspace deletion
- Preserved state during edit (`preservedFilterRef`, `preservedSearchMode`)
- Filter panel synchronization after edits
- AG Grid re-filtering after badge modifications

**Note**: Tests are executed interactively using Claude Code + Playwright MCP. No code files needed - just markdown test flows.

## 📊 Dependency Graph

```
EnhancedSearchBar (Main)
├── useSearchState (State)
│   └── searchUtils.parseSearchValue()
├── useBadgeBuilder (Badges)
│   └── operators (Definitions)
├── useSearchInput (Input)
├── useSearchKeyboard (Keyboard)
├── useSelectorPosition (Position)
├── SearchBadge (Badge Container)
│   ├── Badge (Individual)
│   └── useBadgeBuilder
├── SearchIcon
├── ColumnSelector
│   └── BaseSelector
├── OperatorSelector
│   └── BaseSelector
└── JoinOperatorSelector
    └── BaseSelector
```

## 🎨 Styling Files

SearchBar uses Tailwind CSS classes directly. No separate CSS files.

## 🔍 Key Search Paths

When debugging or adding features, start with these files:

1. **Input Value Changes**: `EnhancedSearchBar.tsx` → `handleInputChange`
2. **State Updates**: `useSearchState.ts` → `parseSearchValue` in `searchUtils.ts`
3. **Badge Rendering**: `useBadgeBuilder.ts` → Badge type logic
4. **Column Selection**: `ColumnSelector.tsx` → `handleColumnSelect` in `EnhancedSearchBar.tsx`
5. **Operator Selection**: `OperatorSelector.tsx` → `handleOperatorSelect` in `EnhancedSearchBar.tsx`
6. **Filter Application**: `useSearchState.ts` → `onFilterSearch` callback

## 📝 Quick Access Commands

```bash
# View main component
cat src/components/search-bar/EnhancedSearchBar.tsx

# View state machine
cat src/components/search-bar/hooks/useSearchState.ts

# View badge builder
cat src/components/search-bar/hooks/useBadgeBuilder.ts

# View operators
cat src/components/search-bar/operators.tsx

# View search utils
cat src/components/search-bar/utils/searchUtils.ts

# View test flows
cat scripts/e2e-tests/searchbar/TEST-FLOWS.md
```

## 🎯 Most Important Files (Top 5)

1. **EnhancedSearchBar.tsx** - Main orchestrator
2. **useSearchState.ts** - State derivation & parsing
3. **searchUtils.ts** - Value parsing logic
4. **useBadgeBuilder.ts** - Badge rendering logic
5. **operators.tsx** - Operator definitions

## 📚 Learning Path

To understand the feature, read in this order:

1. `operators.tsx` - Understand available operators
2. `types/search.ts` - Understand data structures
3. `searchUtils.ts` - See how values are parsed
4. `useSearchState.ts` - See state machine
5. `useBadgeBuilder.ts` - See badge generation
6. `EnhancedSearchBar.tsx` - See it all come together

---

**Total Files**: 31 files involved in the SearchBar filter feature

- **Core Components**: 13 files
- **Hooks**: 5 files
- **Configuration & Types**: 6 files
- **Utilities**: 1 file
- **Integration**: 3 files
- **Usage Examples**: 4 files
- **Test Documentation**: 4 markdown files

---

## 🆕 Recent Updates to Codebase

### Badge Editing Feature ⭐ Major Addition

- **Badge.tsx** - Added edit button (FiEdit2 icon) with hover animation
- **useBadgeBuilder.ts** - All badges now have `canEdit: true` and `onEdit` handlers
- **EnhancedSearchBar.tsx** - Implemented preserved state logic for editing
- **types/badge.ts** - Added `onEdit?: () => void` and `canEdit: boolean` to BadgeConfig

### Enhanced Multi-Condition Support

- **searchUtils.ts** - New `parseMultiConditionFilter()` function (line 18-108)
- **types/badge.ts** - Added `secondOperator` badge type
- Better pattern detection for incomplete multi-condition states

### Bug Fixes

- **useSearchState.ts:86** - Don't clear filter during partial join mode (Bug #1)
- **useSearchState.ts:88** - Don't clear filter during edit mode (Bug #2)
- These ensure first condition stays active during multi-condition building/editing

### State Management

- **EnhancedSearchBar.tsx:47-62** - Added `preservedFilterRef`, `preservedSearchMode`, `isEditingSecondOperator`
- **useSearchState.ts:19** - Added `isEditMode` prop for edit detection

For detailed architectural changes, see **ARCHITECTURE.md** → "Recent Changes & Improvements" section.
