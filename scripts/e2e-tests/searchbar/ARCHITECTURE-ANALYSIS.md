# SearchBar Filter System - Arsitektur Kode (Code Architecture Analysis)

**Generated:** 23 November 2025
**Purpose:** Deep dive investigasi arsitektur kode untuk memahami bagaimana sistem menangani 22 use case dari TEST-FLOWS.md

---

## 📐 Arsitektur Overview

Sistem SearchBar menggunakan **Unidirectional Data Flow** dengan **Derived State Pattern**:

```
User Input → parseSearchValue() → EnhancedSearchState → Badges + Selectors
     ↓                                    ↓
  onChange                         useBadgeBuilder
     ↓                                    ↓
Value String                        BadgeConfig[]
```

### Prinsip Desain Utama:

1. **Single Source of Truth**: `value` string adalah satu-satunya state
2. **Derived State**: `searchMode` di-derive dari `value` melalui parsing
3. **Declarative Rendering**: Badges dan selectors rendered berdasarkan `searchMode`
4. **Pattern-Based**: Value string menggunakan pattern khusus (#, ##, #and, dll)

---

## 🔍 Flow Diagram Per Use Case

### 1. Badge Creation Flow (Case 0-4)

```
┌─────────────────────────────────────────────────────────┐
│  CASE 0: Column Only (1 badge)                          │
├─────────────────────────────────────────────────────────┤
│  User types "#" → parseSearchValue()                    │
│  → returns { showColumnSelector: true }                 │
│  → ColumnSelector modal opens                           │
│  → User selects "Harga Pokok"                           │
│  → handleColumnSelect() sets value = "#Harga Pokok #"   │
│  → parseSearchValue() detects operator selector pattern │
│  → returns { selectedColumn, showOperatorSelector: true}│
│  → Badge: [Harga Pokok]                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CASE 1: Column + Operator (2 badges)                   │
├─────────────────────────────────────────────────────────┤
│  Current: "#Harga Pokok #"                              │
│  → OperatorSelector shows                               │
│  → User selects "Greater Than"                          │
│  → handleOperatorSelect() sets value =                  │
│    "#Harga Pokok #greaterThan "                         │
│  → parseSearchValue() Line 355-365                      │
│    detects column + operator, no value                  │
│  → Badges: [Harga Pokok][Greater Than]                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CASE 2: Simple Filter (3 badges)                       │
├─────────────────────────────────────────────────────────┤
│  Current: "#Harga Pokok #greaterThan "                  │
│  → User types "50000"                                   │
│  → value = "#Harga Pokok #greaterThan 50000"            │
│  → User presses Enter                                   │
│  → useSearchKeyboard adds "##" marker                   │
│  → value = "#Harga Pokok #greaterThan 50000##"          │
│  → parseSearchValue() Line 440-462                      │
│    detects hasConfirmation = true (Line 443)            │
│  → returns { isFilterMode: true, filterSearch: {        │
│      field: 'base_price',                               │
│      value: '50000',                                    │
│      operator: 'greaterThan',                           │
│      isConfirmed: true                                  │
│    }}                                                   │
│  → useSearchState triggers onFilterSearch callback      │
│  → AG Grid filter applies                               │
│  → Badges: [Harga Pokok][Greater Than][50000]           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CASE 3: Partial Multi-Condition (5 badges)             │
├─────────────────────────────────────────────────────────┤
│  Current: "#Harga Pokok #greaterThan 50000##"           │
│  → User types " #"                                      │
│  → value = "#Harga Pokok #greaterThan 50000 #"          │
│  → parseSearchValue() Line 316-353                      │
│    detects joinSelectorMatch pattern                    │
│  → returns { showJoinOperatorSelector: true }           │
│  → JoinOperatorSelector shows AND/OR                    │
│  → User selects "AND"                                   │
│  → handleJoinOperatorSelect() sets value =              │
│    "#Harga Pokok #greaterThan 50000 #and #"             │
│  → parseSearchValue() Line 184-225                      │
│    detects partialJoinWithHash pattern                  │
│  → returns { partialJoin: 'AND',                        │
│      showOperatorSelector: true,                        │
│      isSecondOperator: true }                           │
│  → OperatorSelector opens for 2nd operator              │
│  → User selects "Less Than"                             │
│  → value = "#Harga Pokok #greaterThan 50000 #and        │
│    #lessThan "                                          │
│  → parseSearchValue() Line 273-314                      │
│    detects incompleteMultiCondition pattern             │
│  → returns { partialJoin: 'AND',                        │
│      secondOperator: 'lessThan' }                       │
│  → useBadgeBuilder Line 201-234 renders 5 badges        │
│  → Badges: [Harga Pokok][Greater Than][50000]           │
│            [AND][Less Than]                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CASE 4: Complete Multi-Condition (6 badges)            │
├─────────────────────────────────────────────────────────┤
│  Current: "#Harga Pokok #greaterThan 50000 #and         │
│            #lessThan "                                  │
│  → User types "100000"                                  │
│  → value = "#Harga Pokok #greaterThan 50000 #and        │
│    #lessThan 100000"                                    │
│  → User presses Enter                                   │
│  → value = "#Harga Pokok #greaterThan 50000 #and        │
│    #lessThan 100000##"                                  │
│  → parseSearchValue() Line 171-182 calls               │
│    parseMultiConditionFilter()                          │
│  → parseMultiConditionFilter() Line 18-109:            │
│    - Line 29: hasConfirmationMarker = true             │
│    - Line 46: Split by /#(and|or)\s+/i                 │
│    - Lines 51-89: Parse conditions array               │
│    - Returns FilterSearch with isMultiCondition: true   │
│  → useBadgeBuilder Line 68-131 renders multi badges     │
│  → Badges: [Harga Pokok][Greater Than][50000]           │
│            [AND][Less Than][100000]                     │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Badge Deletion Flow (D0-D6)

```
┌─────────────────────────────────────────────────────────┐
│  D0: Delete Operator → Cascading (2→1)                  │
├─────────────────────────────────────────────────────────┤
│  Setup: [Harga Pokok][Greater Than]                     │
│  → User clicks X on "Greater Than" badge                │
│  → Badge.tsx triggers onClear callback                  │
│  → handleClearToColumn() Line 403-419 executes:         │
│    - Rebuilds value = "#Harga Pokok #"                  │
│    - Auto-opens operator selector                       │
│  → parseSearchValue() detects operator selector         │
│  → Only [Harga Pokok] badge remains                      │
│  → OperatorSelector modal visible                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D1: Delete Value (3→2)                                  │
├─────────────────────────────────────────────────────────┤
│  Setup: [Harga Pokok][Greater Than][50000]              │
│  → User clicks X on "50000" badge                       │
│  → handleClearValue() Line 421-438 executes:            │
│    - Rebuilds value = "#Harga Pokok #greaterThan "      │
│    - Preserves column and operator                      │
│  → parseSearchValue() Line 355-472                      │
│    detects operator without value                       │
│  → Badges: [Harga Pokok][Greater Than]                  │
│  → Input ready for new value                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D2: Delete Operator → Cascading (3→1)                  │
├─────────────────────────────────────────────────────────┤
│  Setup: [Harga Pokok][Greater Than][50000]              │
│  → User clicks X on "Greater Than" badge                │
│  → handleClearToColumn() Line 403-419 executes          │
│  → Value becomes "#Harga Pokok #"                       │
│  → Cascade: Operator deletion removes value too         │
│  → Only [Harga Pokok] remains                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D3: Delete Second Value (6→5)                           │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT][100000]                │
│  → User clicks X on "100000" badge                      │
│  → handleClearSecondValue() Line 551-628 executes:      │
│    Line 559-586: Detects confirmed multi-condition      │
│    Line 570: Extract second operator from pattern       │
│    Line 576: Rebuild without second value               │
│  → value = "#base_price #greaterThan 50000 #and          │
│    #lessThan "                                          │
│  → parseSearchValue() Line 273-314                      │
│    detects incomplete multi-condition                   │
│  → Badges: [HP][GT][50000][AND][LT]                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D4: Delete Second Operator → Cascading (6→4)           │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT][100000]                │
│  → User clicks X on "Less Than" (2nd operator)          │
│  → handleClearSecondOperator() Line 485-549 executes:   │
│    Line 495-518: Detects confirmed multi-condition      │
│    Line 507: Rebuild to partial join state              │
│  → value = "#base_price #greaterThan 50000 #and #"       │
│  → parseSearchValue() Line 184-225                      │
│    detects partialJoinWithHash                          │
│  → Opens operator selector for second operator          │
│  → Cascade: Second operator deletion removes 2nd value  │
│  → Badges: [HP][GT][50000][AND]                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D5: Delete Join → Cascading (6→3)                       │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT][100000]                │
│  → User clicks X on "AND" badge                         │
│  → handleClearPartialJoin() Line 440-483 executes:      │
│    Line 449-468: Detects multi-condition                │
│    Line 457: Rebuild to single-condition confirmed      │
│  → value = "#base_price #greaterThan 50000##"            │
│  → parseSearchValue() Line 440-462                      │
│    detects simple confirmed filter                      │
│  → Cascade: Join deletion removes 2nd op + 2nd value    │
│  → Badges: [HP][GT][50000]                               │
│  → AG Grid filter updates to single condition           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  D6: Progressive Backspace Deletion (6→0)                │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT][100000]                │
│  → User hits Backspace                                  │
│  → useSearchKeyboard Line 58-68 (in file):              │
│    - Detects confirmed filter (ends with ##)            │
│    - Removes ## marker, puts last value in edit mode    │
│  → value = "#base_price #greaterThan 50000 #and          │
│    #lessThan 100000"                                    │
│  → Continue backspacing deletes second value            │
│  → When input empty, another backspace triggers         │
│    second operator deletion (handled by keyboard hook)  │
│  → Process continues through all badge states:          │
│    6 → 5 → 4 → 3 → 2 → 1 → 0                            │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Badge Edit Flow (E0-E9)

```
┌─────────────────────────────────────────────────────────┐
│  E0-E1: Edit Column Badge                                │
├─────────────────────────────────────────────────────────┤
│  Setup: [Harga Pokok][Greater Than][50000]              │
│  → User hovers "Harga Pokok" badge                       │
│  → Badge.tsx shows edit (🖊️) button                     │
│  → User clicks edit button                              │
│  → handleEditColumn() Line 633-702 executes:            │
│    Line 644: Set preservedSearchMode = current state    │
│    Line 683-687: Save to preservedFilterRef: {          │
│      operator: 'greaterThan',                           │
│      value: '50000'                                     │
│    }                                                    │
│    Line 695: Set value = "#"                            │
│  → parseSearchValue() returns showColumnSelector        │
│  → ColumnSelector opens, all columns visible            │
│  → CRITICAL: preservedSearchMode keeps badges visible!  │
│  → User selects "Harga Jual"                            │
│  → handleColumnSelect() Line 116-203 executes:          │
│    Line 119: Detects preservedFilterRef exists          │
│    Line 129-131: Check operator compatibility           │
│    Line 163: Reconstruct filter with new column:        │
│      value = "#Harga Jual #greaterThan 50000##"         │
│    Line 184-185: Clear preserved state                  │
│  → Badges update: [Harga Jual][Greater Than][50000]     │
│  → AG Grid re-filters with new column                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E2: Edit Value Badge (Simple Filter)                   │
├─────────────────────────────────────────────────────────┤
│  Setup: [Harga Jual][Greater Than][50000]               │
│  → User clicks edit on "50000" badge                    │
│  → handleEditValue() Line 890-944 executes:             │
│    Line 902: Set preservedSearchMode                    │
│    Line 928: Set value = "#sale_price #greaterThan      │
│      50000" (no ## marker)                              │
│  → Input shows "50000" for editing                      │
│  → User modifies to "60000", presses Enter              │
│  → useSearchKeyboard adds ## marker                     │
│  → value = "#sale_price #greaterThan 60000##"           │
│  → Badges update: [Harga Jual][Greater Than][60000]     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E3-E4: Edit Value in Multi-Condition                   │
├─────────────────────────────────────────────────────────┤
│  Setup: [HJ][GT][60000][AND][LT][100000]                │
│  → User clicks edit on "100000" (second value)          │
│  → handleEditSecondValue() Line 946-1005 executes:      │
│    Line 964-976: Create modifiedSearchMode with         │
│      second value hidden (empty string)                 │
│    Line 978: Set preservedSearchMode = modified         │
│    Line 981-988: Save to preservedFilterRef: {          │
│      columnName: 'sale_price',                          │
│      operator: 'greaterThan',                           │
│      value: '60000',                                    │
│      join: 'AND',                                       │
│      secondOperator: 'lessThan',                        │
│      secondValue: '100000'                              │
│    }                                                    │
│    Line 991: Show full pattern in input for editing     │
│  → Input shows full pattern, cursor at end              │
│  → User edits "100000" to "90000", presses Enter        │
│  → Pattern becomes: ...#lessThan 90000##                │
│  → Badges: [HJ][GT][60000][AND][LT][90000]              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E5: Edit Join Operator (AND↔OR Bidirectional)          │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT]                        │
│  → User clicks edit on "AND" badge                      │
│  → handleEditJoin() Line 805-888 executes:              │
│    Line 814: Set preservedSearchMode                    │
│    Line 855-871: For partial join state:                │
│      - Detect second operator pattern (Line 858)        │
│      - Save secondOperator to preservedFilterRef        │
│      - Set currentJoinOperator = 'AND' (Line 874)       │
│    Line 879: Set value = "#base_price #greaterThan      │
│      50000 #"                                           │
│  → parseSearchValue() opens JoinOperatorSelector        │
│  → Selector highlights current "AND"                    │
│  → User selects "OR"                                    │
│  → handleJoinOperatorSelect() Line 287-325 executes:    │
│    Line 293-305: Detects preservedFilterRef has         │
│      secondOperator                                     │
│    Line 302: Reconstruct: "#base_price #greaterThan     │
│      50000 #or #lessThan "                              │
│  → Badges: [HP][GT][50000][OR][LT]                       │
│  → User can edit again: OR → AND (bidirectional!)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E6-E7: Edit Column/Operator in 6-Badge Multi-Condition │
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT][50000][AND][LT][80000]                 │
│  → User edits "Greater Than" operator                   │
│  → handleEditOperator(isSecond=false) Line 704-803:     │
│    Line 715: Set preservedSearchMode                    │
│    Line 753-767: For first operator in multi-condition: │
│      - Save full multi-condition to preservedFilterRef  │
│      - Include all: op1, val1, join, op2, val2          │
│    Line 791: Set value = "#base_price #"                │
│  → OperatorSelector opens with "Greater Than" selected  │
│  → User selects "Greater Than or Equal"                 │
│  → handleOperatorSelect() Line 205-285 Case 2:          │
│    Line 229-252: Editing first operator                │
│    Line 237-240: Reconstruct full multi-condition:      │
│      "#base_price #greaterThanOrEq 50000 #and           │
│       #lessThan 80000##"                                │
│  → Badges: [HP][GT or Eq][50000][AND][LT][80000]        │
│  → All 6 badges preserved, only operator changed        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E8: Edit Column in Partial Multi-Condition (5 badges)  │
├─────────────────────────────────────────────────────────┤
│  Setup: [HJ][GT or Eq][50000][AND][LT]                  │
│  → User edits "Harga Jual" column                       │
│  → handleEditColumn() Line 633-702:                     │
│    Line 666-680: Detects partial multi-condition:       │
│      - Has partialJoin AND secondOperator               │
│      - Save to preservedFilterRef with empty            │
│        secondValue: ''                                  │
│    Line 693: Set value = "#"                            │
│  → ColumnSelector opens                                 │
│  → User selects "Harga Pokok"                           │
│  → handleColumnSelect() Line 116-203:                   │
│    Line 135-158: Detects multi-condition in preserved:  │
│    Line 143-149: Check both operators compatible        │
│    Line 146-148: Reconstruct partial multi:             │
│      "#base_price #greaterThanOrEq 50000 #and           │
│       #lessThan "                                       │
│  → Badges: [HP][GT or Eq][50000][AND][LT]               │
│  → Partial structure preserved perfectly!               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  E9: Progressive Value Deletion + Auto Operator Selector│
├─────────────────────────────────────────────────────────┤
│  Setup: [HP][GT or Eq][50000][AND][LT][100000]          │
│  → User hits Backspace                                  │
│  → useSearchKeyboard removes ## marker                  │
│  → value = "...#lessThan 100000"                        │
│  → Continue backspacing: "10000" → "1000" → "100" →     │
│    "10" → "1" → ""                                      │
│  → Input now empty, still has 5 badges                  │
│  → User hits Backspace on empty input                   │
│  → handleOnChangeWithReconstruction() Line 1068-1098:   │
│    Line 1072: Detects empty input + preservedFilterRef  │
│      with join + secondOperator                         │
│    Line 1087: Reconstruct WITHOUT second operator:      │
│      "#base_price #greaterThanOrEq 50000 #and #"        │
│    Line 1095: Clear preservedFilterRef                  │
│  → parseSearchValue() Line 184-225                      │
│    detects partialJoinWithHash pattern                  │
│  → **AUTO-OPENS** OperatorSelector! ← KEY FEATURE       │
│  → Badges: [HP][GT or Eq][50000][AND]                   │
│  → Operator selector ready for new 2nd operator         │
│  → User selects "Less Than or Equal"                    │
│  → Types "80000", presses Enter                         │
│  → Final: [HP][GT or Eq][50000][AND][LT or Eq][80000]   │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Komponen Arsitektur Kunci

### 1. EnhancedSearchBar.tsx (Main Orchestrator)

**Responsibility:** Central controller yang mengoordinasikan semua interaksi

**Key State:**

```typescript
// Line 47-68: Preserved state untuk edit mode
preservedFilterRef: {
  columnName?: string;
  operator: string;
  value: string;
  join?: 'AND' | 'OR';
  secondOperator?: string;
  secondValue?: string;
} | null

preservedSearchMode: EnhancedSearchState | null
isEditingSecondOperator: boolean
currentJoinOperator: 'AND' | 'OR' | undefined
```

**Key Handlers:**

- `handleColumnSelect()` Line 116-203: Handle column selection dengan preservation logic
- `handleOperatorSelect()` Line 205-285: 4 CASES berbeda untuk operator selection
- `handleJoinOperatorSelect()` Line 287-325: Handle AND/OR selection
- `handleClear*()` Line 392-628: 6 different clear handlers untuk berbagai badge types
- `handleEdit*()` Line 630-1005: 5 edit handlers (Column, Operator, Join, Value, SecondValue)
- `handleOnChangeWithReconstruction()` Line 1007-1135: Wrapper untuk reconstruct multi-condition

**Critical Features:**

1. **Preserved State Pattern** (Line 47-68): Mempertahankan badges saat edit mode
2. **Operator Compatibility Check** (Line 124-140): Validasi operator kompatibel dengan column type
3. **Multi-Condition Reconstruction** (Line 142-174): Rebuild complete pattern setelah edit

---

### 2. useSearchState.ts (State Management Hook)

**Responsibility:** Manage derived state dan trigger filter callbacks

**Architecture Pattern:** **Reactive State Derivation**

```typescript
// Line 22-25: Pure derivation
const searchMode = useMemo<EnhancedSearchState>(() => {
  const result = parseSearchValue(value, columns);
  return result;
}, [value, columns]);
```

**Key Logic:**

```typescript
// Line 48-107: Filter update logic dengan debouncing
useEffect(() => {
  // Line 70-73: Trigger filter hanya jika isConfirmed
  if (searchMode.filterSearch.isConfirmed) {
    debouncedFilterUpdate(searchMode.filterSearch);
  }

  // Line 86-91: 🐛 BUG FIXES
  // Don't clear filter when:
  // - partialJoin mode (building multi-condition)
  // - isEditMode (preserving badges during edit)

  // Line 96-104: NEW - Maintain first condition filter
  // during partial join state
}, [value, searchMode, isEditMode]);
```

**Critical Bug Fixes:**

- **Bug #1** (Line 86): Don't clear filter saat partial join mode
- **Bug #2** (Line 88): Don't clear filter saat edit mode

---

### 3. searchUtils.ts (Parsing Engine)

**Responsibility:** Parse value string menjadi EnhancedSearchState

**Architecture Pattern:** **Pattern Matching State Machine**

```
parseSearchValue() decision tree:
│
├─ "#" → showColumnSelector
├─ "#field:" → colon syntax (legacy)
├─ "#field #..." → Filter syntax
│   │
│   ├─ Multi-condition (##) → parseMultiConditionFilter()
│   ├─ Partial join (#and #op) → partialJoin state
│   ├─ Incomplete multi (typing 2nd value) → partialJoin + secondOperator
│   ├─ Join selector (#field #op val #) → showJoinOperatorSelector
│   ├─ Operator selector (#field #) → showOperatorSelector
│   └─ Simple filter (#field #op val) → filterSearch
│
└─ Plain text → globalSearch
```

**parseMultiConditionFilter()** Line 18-109:

```typescript
// Step 1: Validate confirmation marker (Line 29)
const hasConfirmationMarker = searchValue.endsWith('##');
if (!hasConfirmationMarker) return null;

// Step 2: Split by join operators (Line 46)
const parts = remainingPart.split(/#(and|or)\s+/i);

// Step 3: Parse conditions (Line 51-89)
for (let i = 0; i < parts.length; i++) {
  if (i % 2 === 0) {
    // Extract operator and value
    conditions.push({ operator, value });
  } else {
    // Extract join operator
    joinOperator = parts[i].toUpperCase();
  }
}

// Step 4: Validate (Line 91-94)
if (conditions.length < 2) return null;
```

**Critical Pattern Detections:**

1. **Partial Join with Hash** (Line 188-190): `#field #op val #and #`
2. **Incomplete Multi with Value** (Line 229-231): `#field #op1 val1 #and #op2 val2` (no ##)
3. **Incomplete Multi no Value** (Line 275-277): `#field #op1 val1 #and #op2`
4. **Join Selector** (Line 319-321): `#field #op val #` (space before final #)

---

### 4. useBadgeBuilder.ts (Badge Generator)

**Responsibility:** Generate BadgeConfig[] dari EnhancedSearchState

**Architecture Pattern:** **Conditional Rendering Logic**

```typescript
// Badge Generation Flow:
return useMemo(() => {
  const badges: BadgeConfig[] = [];

  // Early return if no badges (Line 31-39)
  if (!searchMode.isFilterMode && !searchMode.selectedColumn) {
    return badges;
  }

  // 1. Column Badge (Line 47-66) - ALWAYS shown
  badges.push({ type: 'column', ... });

  // 2. Multi-Condition Badges (Line 68-131)
  if (isMultiCondition) {
    filter.conditions.forEach((condition, index) => {
      badges.push({ type: 'operator', ... });
      if (condition.value) {
        badges.push({ type: 'value', ... });
      }
      if (index < conditions.length - 1) {
        badges.push({ type: 'join', ... });
      }
    });
    return badges; // Early return
  }

  // 3. Single Operator Badge (Line 133-162)
  // 4. Single Value Badge (Line 164-199)
  // 5. Join Badge (Line 201-212)
  // 6. Second Operator Badge (Line 214-234)

  return badges;
}, [searchMode, handlers]);
```

**Badge Handler Mapping:**

```typescript
// Column badge (Line 54-66)
onClear: handlers.onClearColumn; // → handleClearAll()
onEdit: handlers.onEditColumn; // → handleEditColumn()

// Operator badge (Line 81-94)
onClear: handlers.onClearOperator; // → handleClearToColumn()
onEdit: handlers.onEditOperator; // → handleEditOperator(isSecond)

// Value badge (Line 98-113)
onClear: handlers.onClearValue; // → handleClearValue()
onEdit: handlers.onEditValue; // → handleEditValue()

// Join badge (Line 118-127)
onClear: handlers.onClearPartialJoin; // → handleClearPartialJoin()
onEdit: handlers.onEditJoin; // → handleEditJoin()
```

---

## 🔄 Pattern System (Value String Patterns)

### Pattern Syntax Reference:

| Pattern                           | Meaning                          | Example                                 |
| --------------------------------- | -------------------------------- | --------------------------------------- |
| `#`                               | Column selector trigger          | `#`                                     |
| `#field`                          | Column selected                  | `#base_price`                           |
| `#field #`                        | Operator selector trigger        | `#base_price #`                         |
| `#field #op`                      | Operator selected, waiting value | `#base_price #greaterThan`              |
| `#field #op val`                  | Filter being typed               | `#base_price #greaterThan 50000`        |
| `#field #op val##`                | Confirmed filter (ENTER pressed) | `#base_price #greaterThan 50000##`      |
| `#field #op val #`                | Join selector trigger            | `#base_price #greaterThan 50000 #`      |
| `#field #op val #and`             | Join selected, incomplete        | `#base_price #greaterThan 50000 #and`   |
| `#field #op val #and #`           | Second operator selector         | `#base_price #greaterThan 50000 #and #` |
| `#field #op val #and #op2`        | Second operator, waiting value   | `...#and #lessThan`                     |
| `#field #op val #and #op2 val2`   | Typing second value              | `...#and #lessThan 100000`              |
| `#field #op val #and #op2 val2##` | Confirmed multi-condition        | `...#and #lessThan 100000##`            |

### Confirmation Marker (##):

- **Purpose:** Distinguish "typing" vs "confirmed" state
- **Added by:** `useSearchKeyboard` on Enter key press
- **Triggers:** AG Grid filter application
- **Removed by:** Backspace on confirmed filter (enters edit mode)

---

## 🎯 State Transition Diagram

```
[Empty Input]
    ↓ type "#"
[Column Selector] showColumnSelector: true
    ↓ select column
[Column Selected] selectedColumn: SearchColumn
    ↓ auto "#"
[Operator Selector] showOperatorSelector: true
    ↓ select operator
[Operator Selected] filterSearch.operator set
    ↓ type value
[Value Typing] filterSearch.value updating
    ↓ press Enter (add ##)
[Simple Filter Confirmed] isFilterMode: true, isConfirmed: true
    ↓ type " #"
[Join Selector] showJoinOperatorSelector: true
    ↓ select AND/OR
[Partial Join] partialJoin: 'AND'|'OR'
    ↓ auto "#"
[Second Operator Selector] isSecondOperator: true
    ↓ select operator
[Incomplete Multi] secondOperator set
    ↓ type value
[Typing Second Value] secondOperator + value
    ↓ press Enter (add ##)
[Multi-Condition Confirmed] isMultiCondition: true, conditions: []
```

---

## 🧩 Edit Mode State Management

### Preservation Mechanism:

```typescript
// 1. User triggers edit (e.g., click edit on column badge)
handleEditColumn() {
  // Save current searchMode to keep badges visible
  setPreservedSearchMode(searchMode);

  // Save filter data for reconstruction
  preservedFilterRef.current = {
    operator: 'greaterThan',
    value: '50000',
    join: 'AND',
    secondOperator: 'lessThan',
    secondValue: '100000'
  };

  // Trigger selector
  onChange({ target: { value: '#' } });
}

// 2. parseSearchValue() runs
// Returns: { showColumnSelector: true, ... }

// 3. But badges still visible because:
// Line 1339: {(showTargetedIndicator || preservedSearchMode) && (
//   <SearchBadge preservedSearchMode={preservedSearchMode} />
// )}

// 4. User selects new column
handleColumnSelect(newColumn) {
  // Check preservedFilterRef exists
  if (preservedFilterRef.current) {
    // Reconstruct filter with new column
    const newValue = buildFullPattern(
      newColumn,
      preservedFilterRef.current
    );
    onChange({ target: { value: newValue } });

    // Clear preserved state
    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  }
}
```

### Why This Works:

1. **preservedSearchMode** → Badge rendering uses this instead of derived searchMode
2. **preservedFilterRef** → Data needed for reconstruction
3. **Selector still works** → Actual searchMode triggers selector modal
4. **Clean separation** → Display state vs actual parsing state

---

## 🐛 Critical Bug Fixes Explained

### Bug #1: Filter Cleared During Partial Join

**Problem:**

```typescript
// User creates: [HP][GT][50000]
// User types " #" to add AND/OR
// → Filter cleared! Data grid shows all items
```

**Root Cause:**

```typescript
// useSearchState.ts Line 92
if (searchMode.showColumnSelector || searchMode.showOperatorSelector) {
  onFilterSearchRef.current?.(null); // ❌ Clears filter
}
```

**Fix (Line 86-91):**

```typescript
if (
  !searchMode.partialJoin && // ← NEW: Don't clear if building multi-condition
  !searchMode.showJoinOperatorSelector && // ← Don't clear if join selector open
  !isEditMode && // ← Don't clear during edit
  (searchMode.showColumnSelector || searchMode.showOperatorSelector)
) {
  onFilterSearchRef.current?.(null);
}
```

### Bug #2: Filter Cleared During Edit Mode

**Problem:**

```typescript
// User clicks edit on column badge
// → All badges visible (preserved)
// → But filter cleared! Wrong data shown
```

**Solution:**

```typescript
// Pass isEditMode flag to useSearchState
const { searchMode } = useSearchState({
  value,
  columns,
  onGlobalSearch,
  onFilterSearch,
  isEditMode: preservedSearchMode !== null, // ← In edit mode when preserving
});
```

---

## 📊 Complexity Analysis

### Time Complexity:

| Operation                   | Complexity | Notes                                        |
| --------------------------- | ---------- | -------------------------------------------- |
| parseSearchValue()          | O(n)       | n = value string length, regex matching      |
| parseMultiConditionFilter() | O(n)       | Split + parse conditions                     |
| useBadgeBuilder()           | O(c)       | c = conditions count (max 2 in current impl) |
| handleColumnSelect()        | O(1)       | Direct string manipulation                   |
| handleOperatorSelect()      | O(1)       | Pattern reconstruction                       |

### Space Complexity:

| State              | Size | Notes                   |
| ------------------ | ---- | ----------------------- |
| searchMode         | O(1) | Fixed structure         |
| preservedFilterRef | O(1) | Max 6 fields            |
| badges             | O(c) | c = badge count (max 6) |

---

## 🎓 Design Patterns Used

1. **Derived State Pattern**: searchMode derived dari value string
2. **State Preservation**: preservedSearchMode untuk edit mode
3. **Pattern Matching**: Regex patterns untuk detect states
4. **Callback Props**: Handler functions passed down ke badges
5. **Unidirectional Data Flow**: value → parse → render
6. **Declarative Rendering**: Badges rendered based on state
7. **Compound Components**: SearchBar + ColumnSelector + OperatorSelector
8. **Controlled Component**: Parent controls value via onChange

---

## 🚀 Performance Optimizations

1. **useMemo** untuk searchMode derivation (Line 22-25 useSearchState.ts)
2. **useMemo** untuk badge generation (Line 28 useBadgeBuilder.ts)
3. **useMemo** untuk operator lists (Line 1228-1233 EnhancedSearchBar.tsx)
4. **Debouncing** untuk filter updates (Line 37-46 useSearchState.ts)
5. **Early returns** dalam parsing logic untuk avoid unnecessary checks

---

## 📝 Summary: How 22 Use Cases Are Handled

| Use Case            | Primary Handler                    | Key Files                       | Pattern Used              |
| ------------------- | ---------------------------------- | ------------------------------- | ------------------------- |
| Case 0-4 (Creation) | parseSearchValue()                 | searchUtils.ts:111-523          | Pattern detection         |
| D0-D6 (Deletion)    | handleClear\*()                    | EnhancedSearchBar.tsx:392-628   | Value reconstruction      |
| E0-E2 (Basic Edit)  | handleEdit\*() + preservedState    | EnhancedSearchBar.tsx:630-944   | State preservation        |
| E3-E4 (Value Edit)  | handleEditValue/SecondValue()      | EnhancedSearchBar.tsx:890-1005  | Pattern reconstruction    |
| E5 (Join Edit)      | handleEditJoin()                   | EnhancedSearchBar.tsx:805-888   | Preserved second operator |
| E6-E7 (Multi Edit)  | handleEdit\*() + multi-condition   | EnhancedSearchBar.tsx:753-803   | Full state preservation   |
| E8 (Partial Edit)   | handleEditColumn()                 | EnhancedSearchBar.tsx:666-680   | Partial multi detection   |
| E9 (Auto Selector)  | handleOnChangeWithReconstruction() | EnhancedSearchBar.tsx:1068-1098 | Auto pattern trigger      |

---

**Total Lines Analyzed:** ~2,300 lines
**Core Components:** 4 files (EnhancedSearchBar, useSearchState, searchUtils, useBadgeBuilder)
**Pattern Types:** 12+ distinct value string patterns
**State Transitions:** 15+ different states

---

**Conclusion:** Sistem ini menggunakan **pattern-based state machine** dengan **derived state** dan **preservation mechanism** untuk menangani 22 use case secara elegant. Semua logic terpusat di parsing function, membuat sistem mudah di-debug dan di-maintain.
