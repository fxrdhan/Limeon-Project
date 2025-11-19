# SearchBar Filter Feature - Architecture Deep Dive

This document provides a comprehensive overview of the SearchBar filter feature implementation in PharmaSys.

## 📁 File Structure

```
src/components/search-bar/
├── SearchBar.tsx                          # Basic search bar (legacy)
├── EnhancedSearchBar.tsx                  # ⭐ Main component with advanced filtering
├── constants.ts                           # Configuration constants
├── operators.tsx                          # ⭐ Filter operator definitions
├── exports.ts                             # Public API exports
├── index.tsx                              # Entry point
│
├── components/
│   ├── Badge.tsx                          # Individual badge component
│   ├── SearchBadge.tsx                    # Badge container wrapper
│   ├── SearchIcon.tsx                     # Dynamic search icon
│   └── selectors/
│       ├── BaseSelector.tsx               # Generic selector base component
│       ├── ColumnSelector.tsx             # ⭐ Column selection modal (#)
│       ├── OperatorSelector.tsx           # ⭐ Operator selection modal (# after column)
│       └── JoinOperatorSelector.tsx       # AND/OR selection modal
│
├── hooks/
│   ├── useBadgeBuilder.ts                 # ⭐ Badge rendering logic
│   ├── useSearchInput.ts                  # Input value management
│   ├── useSearchKeyboard.ts               # Keyboard navigation
│   ├── useSearchState.ts                  # ⭐ Core state machine
│   └── useSelectorPosition.ts             # Modal positioning
│
├── types/
│   ├── index.ts                           # Type exports
│   ├── search.ts                          # Search-related types
│   ├── badge.ts                           # Badge types
│   └── selector.ts                        # Selector types
│
└── utils/
    └── searchUtils.ts                     # ⭐ Search value parsing utilities
```

## 🎯 Core Components

### 1. **EnhancedSearchBar.tsx** (Main Component)

**Location:** `src/components/search-bar/EnhancedSearchBar.tsx`

**Responsibilities:**

- Orchestrates the entire search experience
- Manages input state and value transformations
- Handles column, operator, and value selection
- Supports edit mode for existing filters
- Renders badges for active filters

**Key Props:**

```typescript
{
  value: string;                          // Current search value
  onChange: (e) => void;                  // Value change handler
  columns: SearchColumn[];                // Available columns for filtering
  onGlobalSearch?: (term: string) => void;
  onFilterSearch?: (filter: FilterSearch | null) => void;
  onClearSearch?: () => void;
}
```

**Key State:**

- `preservedFilterRef`: Stores filter data during column/operator editing
- `preservedSearchMode`: Keeps badges visible during edit mode
- `isEditingSecondOperator`: Tracks multi-condition editing state

**Value Format Pattern:**

```
Single Filter:    #fieldName #operator value##
Multi-Condition:  #fieldName #operator1 value1 #and #operator2 value2##
```

---

### 2. **useSearchState.ts** (State Machine)

**Location:** `src/components/search-bar/hooks/useSearchState.ts`

**Responsibilities:**

- Parses search input value into structured state
- Determines which modal should be shown
- Handles debounced filter updates
- Prevents premature filter clearing during multi-condition builds

**Key Logic:**

```typescript
// State is derived from input value using parseSearchValue()
const searchMode = useMemo<EnhancedSearchState>(() => {
  return parseSearchValue(value, columns);
}, [value, columns]);
```

**State Flow:**

1. User types `#` → `showColumnSelector: true`
2. User selects column → `selectedColumn` set, input becomes `#fieldName:`
3. User types `#` again → `showOperatorSelector: true`
4. User selects operator → `operator` set, input becomes `#fieldName #operator `
5. User types value → `filterSearch` created
6. User presses Enter → Filter applied with `##` suffix

---

### 3. **Selectors** (Modals)

#### **ColumnSelector.tsx**

**Location:** `src/components/search-bar/components/selectors/ColumnSelector.tsx`

**Features:**

- Displays all searchable columns
- Fuzzy search support (searches headerName, field, description)
- Type-specific icons (number, text, date)
- Keyboard navigation (Arrow keys, Enter, Escape)

**Triggered by:** User types `#`

**Column Types:**

- `number`/`currency`: Shows number operators (>, <, =, etc.)
- `text`: Shows text operators (contains, equals, startsWith, etc.)
- `date`: Shows date-specific operators

---

#### **OperatorSelector.tsx**

**Location:** `src/components/search-bar/components/selectors/OperatorSelector.tsx`

**Features:**

- Dynamic operators based on column type
- Fuzzy search by operator label/value
- Visual operator icons
- Themed styling (blue theme)

**Triggered by:** User types `#` after selecting column

**Operator Sets:**

- **Text Operators** (DEFAULT_FILTER_OPERATORS):
  - Contains, Not Contains
  - Equals, Not Equal
  - Starts With, Ends With

- **Number Operators** (NUMBER_FILTER_OPERATORS):
  - Equals, Not Equal
  - Greater Than, Greater Than or Equal
  - Less Than, Less Than or Equal
  - In Range

---

### 4. **Badge System**

#### **SearchBadge.tsx**

**Location:** `src/components/search-bar/components/SearchBadge.tsx`

**Responsibilities:**

- Container for all badges
- Uses `useBadgeBuilder` to generate badge configs
- Handles badge hover states
- Manages badge container width for input padding

---

#### **Badge.tsx**

**Location:** `src/components/search-bar/components/Badge.tsx`

**Features:**

- Individual badge rendering
- Edit and clear actions
- Color-coded by type:
  - **Purple**: Column badge
  - **Blue**: Operator badge
  - **Gray**: Value badge
  - **Orange**: Join operator badge (AND/OR)

**Badge States:**

```typescript
{
  id: string;           // Unique identifier
  type: 'column' | 'operator' | 'value' | 'join';
  label: string;        // Display text
  onClear: () => void;  // Clear handler
  canClear: boolean;    // Can be cleared?
  onEdit?: () => void;  // Edit handler
  canEdit: boolean;     // Can be edited?
}
```

---

#### **useBadgeBuilder.ts**

**Location:** `src/components/search-bar/hooks/useBadgeBuilder.ts`

**Logic:**

1. **Column Badge** (Purple): Always shown first
2. **Operator Badge(s)** (Blue): One for single filter, two for multi-condition
3. **Join Badge** (Orange): Only for multi-condition filters (AND/OR)
4. **Value Badge(s)** (Gray): Filter value(s)

**Multi-Condition Example:**

```
[Harga Pokok] [Greater Than] [50000] [AND] [Less Than] [100000]
   Purple         Blue          Gray    Orange   Blue      Gray
```

---

## 🔄 Data Flow

### Test Case 1: Two Badges (Column + Operator)

```
User Input Flow:
1. User types:     #
   State:          showColumnSelector = true
   Badges:         []

2. User selects:   "Harga Pokok"
   Value:          #harga_pokok:
   State:          selectedColumn = {field: 'harga_pokok', ...}
   Badges:         [Harga Pokok]

3. User types:     #
   Value:          #harga_pokok #
   State:          showOperatorSelector = true
   Badges:         [Harga Pokok]

4. User selects:   "Greater Than"
   Value:          #harga_pokok #greaterThan
   State:          operator = 'greaterThan'
   Badges:         [Harga Pokok] [Greater Than]  ✅ SCREENSHOT HERE
```

---

### Test Case 2: Three Badges (Column + Operator + Value)

```
Continuation from Case 1:

5. User types:     50000
   Value:          #harga_pokok #greaterThan 50000
   State:          filterSearch.value = '50000'
   Badges:         [Harga Pokok] [Greater Than] [50000]

6. User presses:   Enter
   Value:          #harga_pokok #greaterThan 50000##
   State:          filterSearch.isConfirmed = true
   Badges:         [Harga Pokok] [Greater Than] [50000]  ✅ SCREENSHOT HERE
   Action:         onFilterSearch() called with filter object
```

---

## 🎨 Styling & Theming

### Input Border Colors:

```typescript
// Column selector open
'border-purple-300 ring-3 ring-purple-100';

// Operator selector open
'border-blue-300 ring-3 ring-blue-100';

// Default state
'border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200';

// Error state
'border-danger focus:border-danger focus:ring-3 focus:ring-red-100';
```

### Badge Colors:

- **Column**: Purple (`bg-purple-100 text-purple-700`)
- **Operator**: Blue (`bg-blue-100 text-blue-700`)
- **Value**: Gray (`bg-gray-100 text-gray-700`)
- **Join**: Orange (`bg-orange-100 text-orange-700`)

---

## 🔌 Integration Points

### Where It's Used:

1. **Item Master Page**
   - File: `src/pages/master-data/item-master/index.tsx`
   - Via: `SearchToolbar` component

2. **Doctor List, Patient List, Supplier List**
   - Similar integration pattern

### Integration Pattern:

```typescript
// In parent component (e.g., ItemMaster)
<SearchToolbar
  searchInputRef={searchInputRef}
  searchBarProps={{
    value: searchBarState.searchValue,
    onChange: handleSearchChange,
    onGlobalSearch: handleGlobalSearch,
    onFilterSearch: handleFilterSearch,
    onClearSearch: handleClearSearch,
    searchState: searchBarState.searchState,
    columns: SEARCH_COLUMNS,  // Column definitions
  }}
  onAdd={handleAdd}
  gridApi={gridApiRef.current}
  exportFilename="items-export"
/>
```

---

## 🛠️ Key Utilities

### **searchUtils.ts**

**Location:** `src/components/search-bar/utils/searchUtils.ts`

**Key Functions:**

- `parseSearchValue()`: Main parser, converts input string to EnhancedSearchState
- `findColumn()`: Column lookup by field name
- `buildColumnValue()`: Builds formatted column selection value

**Parse Logic Example:**

```typescript
Input:  "#harga_pokok #greaterThan 50000##"
Output: {
  isFilterMode: true,
  filterSearch: {
    field: 'harga_pokok',
    operator: 'greaterThan',
    value: '50000',
    isConfirmed: true,
    column: { ... }
  }
}
```

---

## 📝 Constants

### **constants.ts**

**Location:** `src/components/search-bar/constants.ts`

```typescript
export const SEARCH_CONSTANTS = {
  ANIMATION_DURATION: 200, // CSS transition duration
  INPUT_FOCUS_DELAY: 50, // Delay before focusing input
  DEBOUNCE_DELAY: 300, // Search debounce time
  FUZZY_SEARCH_THRESHOLD: -10000, // Fuzzysort threshold
};
```

---

## 🎯 Important Behaviors

### Edit Mode:

When user clicks edit button on a badge:

1. `preservedFilterRef` saves current filter state
2. `preservedSearchMode` keeps badges visible
3. Input value changes to trigger selector
4. After selection, preserved values are restored

### Multi-Condition Support:

- AND/OR operators join multiple conditions
- Each condition maintains its own operator and value
- Format: `#field #op1 value1 #and #op2 value2##`

### Keyboard Shortcuts:

- `#`: Open column selector (when empty) or operator selector (after column)
- `Enter`: Confirm filter / Select highlighted option
- `Escape`: Close selector / Clear partial input
- `Arrow Up/Down`: Navigate selector options
- `Backspace`: Smart deletion (removes badges in reverse order)

---

## 🔍 Search Columns Configuration

### Definition Location:

- `src/utils/searchColumns.ts`
- `getSearchColumnsByEntity()` function

### Example Column:

```typescript
{
  field: 'harga_pokok',
  headerName: 'Harga Pokok',
  type: 'number',
  searchable: true,
  description: 'Harga pembelian item',
}
```

---

## 🧪 Testing Strategy

### E2E Test Coverage:

1. ✅ **Case 1**: Two badges (Column + Operator)
   - Test file: `scripts/e2e-tests/searchbar-filter-case-1.js`

2. ✅ **Case 2**: Three badges (Column + Operator + Value)
   - Test file: `scripts/e2e-tests/searchbar-filter-case-2.js`

### Future Test Cases:

3. Multi-condition filters (AND/OR)
4. Edit existing filter
5. Clear filter behavior
6. Keyboard navigation
7. Different column types (number, text, date)
8. Invalid input handling

---

## 📚 Type Definitions

### Key Types:

```typescript
// src/components/search-bar/types/search.ts
interface EnhancedSearchState {
  isFilterMode: boolean;
  showColumnSelector: boolean;
  showOperatorSelector: boolean;
  showJoinOperatorSelector: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  globalSearch?: string;
  partialJoin?: 'AND' | 'OR';
  secondOperator?: string;
  isSecondOperator?: boolean;
}

interface FilterSearch {
  field: string;
  operator: string;
  value: string;
  column: SearchColumn;
  isConfirmed?: boolean;
  isExplicitOperator?: boolean;
  isMultiCondition?: boolean;
  joinOperator?: 'AND' | 'OR';
  conditions?: Array<{
    operator: string;
    value: string;
  }>;
}
```

---

## 🚀 Performance Optimizations

1. **Memoization**: Extensive use of `useMemo` for derived state
2. **Debouncing**: 300ms debounce on filter updates
3. **Fuzzy Search**: Fast fuzzy search using `fuzzysort` library
4. **Virtual Scrolling**: Selectors support large column lists
5. **Ref-based State**: Critical state stored in refs to avoid re-renders

---

## 📌 Summary

The SearchBar filter feature is a sophisticated component built around:

- **State-driven UI**: Input value determines what's shown
- **Multi-step flow**: Column → Operator → Value
- **Visual feedback**: Color-coded badges and border states
- **Flexible editing**: Edit any part of an existing filter
- **Type-aware**: Different operators for different column types
- **Keyboard-friendly**: Full keyboard navigation support

The architecture follows a **unidirectional data flow** where the input value is the single source of truth, and all UI state is derived from it using the `parseSearchValue()` utility.
