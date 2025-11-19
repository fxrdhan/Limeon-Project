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

| File                                                                      | Purpose                    |
| ------------------------------------------------------------------------- | -------------------------- |
| `src/components/search-bar/components/Badge.tsx`                          | Individual badge rendering |
| `src/components/search-bar/components/SearchBadge.tsx`                    | Badge container/manager    |
| `src/components/search-bar/components/SearchIcon.tsx`                     | Animated search icon       |
| `src/components/search-bar/components/selectors/BaseSelector.tsx`         | Generic selector base      |
| `src/components/search-bar/components/selectors/ColumnSelector.tsx`       | Column selection modal     |
| `src/components/search-bar/components/selectors/OperatorSelector.tsx`     | Operator selection modal   |
| `src/components/search-bar/components/selectors/JoinOperatorSelector.tsx` | AND/OR selection modal     |

## 🪝 Hooks

| File                                                     | Purpose                       | Key Function                           |
| -------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| `src/components/search-bar/hooks/useSearchState.ts`      | State machine & value parsing | Derives EnhancedSearchState from input |
| `src/components/search-bar/hooks/useBadgeBuilder.ts`     | Badge generation logic        | Creates badge configs from state       |
| `src/components/search-bar/hooks/useSearchInput.ts`      | Input value management        | Handles display value & changes        |
| `src/components/search-bar/hooks/useSearchKeyboard.ts`   | Keyboard navigation           | Arrow keys, Enter, Escape              |
| `src/components/search-bar/hooks/useSelectorPosition.ts` | Modal positioning             | Calculates selector position           |

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

| File                                             | Purpose              | Key Functions                                              |
| ------------------------------------------------ | -------------------- | ---------------------------------------------------------- |
| `src/components/search-bar/utils/searchUtils.ts` | Search value parsing | `parseSearchValue()`, `findColumn()`, `buildColumnValue()` |

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

## 🧪 Tests

| File                                             | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `scripts/e2e-tests/searchbar/filter-case-0.js`   | E2E test: One badge (column only)               |
| `scripts/e2e-tests/searchbar/filter-case-1.js`   | E2E test: Two badges                            |
| `scripts/e2e-tests/searchbar/filter-case-2.js`   | E2E test: Three badges                          |
| `scripts/e2e-tests/searchbar/filter-case-3.js`   | E2E test: Five badges (before second value)     |
| `scripts/e2e-tests/searchbar/filter-case-4.js`   | E2E test: Six badges (complete multi-condition) |
| `scripts/e2e-tests/searchbar/sync-validation.js` | E2E test: Badge-to-Filter Panel sync validation |
| `scripts/e2e-tests/searchbar/README.md`          | Test documentation                              |
| `scripts/e2e-tests/searchbar/ARCHITECTURE.md`    | Architecture deep dive                          |
| `scripts/e2e-tests/searchbar/FILE_INDEX.md`      | This file                                       |

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

# Run E2E test Case 0
# (Copy content from searchbar-filter-case-0.js)

# Run E2E test Case 1
# (Copy content from searchbar-filter-case-1.js)

# Run E2E test Case 2
# (Copy content from searchbar-filter-case-2.js)

# Run E2E test Case 3
# (Copy content from searchbar-filter-case-3.js)

# Run E2E test Case 4
# (Copy content from searchbar-filter-case-4.js)
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

**Total Files**: 30+ files involved in the SearchBar filter feature
