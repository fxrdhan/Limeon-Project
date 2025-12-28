# Advanced SearchBar Badges - Deep Dive Analysis

## Overview

The advanced searchbar implements a sophisticated badge system for multi-condition filter building with support for creation, deletion, editing, selection, and hovering interactions. The system follows a scalable, index-based architecture that supports N-conditions (unlimited conditions).

---

## 1. Architecture & Component Hierarchy

### Component Structure

```
EnhancedSearchBar (Main Container)
├── SearchBadge (Badge Renderer)
│   ├── Badge (Individual Badge Component)
│   │   ├── Inline Edit Input
│   │   ├── Edit Button (FiEdit2 / LuX)
│   │   └── Delete Button (PiTrashSimpleBold)
│   └── AnimatePresence (Framer Motion)
├── ColumnSelector (Dropdown)
├── OperatorSelector (Dropdown)
└── JoinOperatorSelector (Dropdown)
```

### Key Files

- **`Badge.tsx`** - Individual badge rendering & inline editing
- **`SearchBadge.tsx`** - Badge collection renderer with preview support
- **`useBadgeBuilder.ts`** - Badge configuration factory (creates BadgeConfig[])
- **`useBadgeHandlers.ts`** - Index-based handlers for CRUD operations
- **`types/badge.ts`** - Type definitions & color schemes
- **`EnhancedSearchBar.tsx`** - Main orchestrator & keyboard navigation

---

## 2. Badge Types & Color Scheme

### BadgeType Enum

```typescript
type BadgeType =
  | 'column' // Purple - filter column selection
  | 'operator' // Blue - comparison operator (=, !=, >, <, etc.)
  | 'value' // Gray - filter value
  | 'valueTo' // Gray - second value for "between" operator
  | 'separator' // Slate - "to" text between value/valueTo
  | 'join' // Orange - AND/OR operator between conditions
  | 'operatorN'; // Blue - operator at condition index > 0
```

### Color Scheme (Tailwind)

| Type      | Background    | Text            | Hover               | Glow        |
| --------- | ------------- | --------------- | ------------------- | ----------- |
| column    | bg-purple-100 | text-purple-700 | hover:bg-purple-200 | purple glow |
| operator  | bg-blue-100   | text-blue-700   | hover:bg-blue-200   | blue glow   |
| value     | bg-gray-100   | text-gray-700   | hover:bg-gray-200   | gray glow   |
| valueTo   | bg-gray-100   | text-gray-700   | hover:bg-gray-200   | gray glow   |
| separator | bg-slate-100  | text-slate-600  | (none)              | (none)      |
| join      | bg-orange-100 | text-orange-700 | hover:bg-orange-200 | orange glow |

---

## 3. Badge Lifecycle

### 3.1 CREATION

#### Flow

1. User types `#columnName` → Column selected
2. System creates **column badge** (purple)
3. User types `#operator` → Operator selected
4. System creates **operator badge** (blue)
5. User types value → System creates **value badge** (gray)
6. User presses Enter/Space → Value confirmed
7. User types `#AND/#OR` → Join selected
8. System creates **join badge** (orange)
9. Repeat for additional conditions

#### Badge Creation Process

```typescript
// useBadgeBuilder.ts - Main factory function
export const useBadgeBuilder = (
  searchMode: EnhancedSearchState,
  handlers: BadgeHandlers,
  inlineEditingProps?: InlineEditingProps,
  selectedBadgeIndex?: number | null
): BadgeConfig[]
```

**Key Creation Points:**

1. **Column Badge Creation** (lines 268-288)
   - Triggered when: `isFilterMode || showOperatorSelector || showJoinOperatorSelector || selectedColumn`
   - ID: `condition-{index}-column`
   - Always editable and clearable

2. **Multi-Condition Badges** (lines 290-408)
   - For each condition in `filter.conditions[]`
   - Creates: column (if index >= 1), operator, value(s), join
   - Supports "Between" operator with value/valueTo pair

3. **Single-Condition Fallback** (lines 410-483)
   - For building first condition
   - Creates operator and value badges

4. **Partial Conditions Loop** (lines 485-589)
   - For N-conditions being built (index-based)
   - Scalable: supports unlimited conditions

#### BadgeConfig Interface

```typescript
interface BadgeConfig {
  id: string; // Unique identifier
  type: BadgeType; // Badge type
  label: string; // Display text
  onClear: () => void; // Delete handler
  canClear: boolean; // Show delete button?
  onEdit?: () => void; // Edit handler
  canEdit: boolean; // Show edit button?

  // Inline editing props (for value badges only)
  isEditing?: boolean;
  editingValue?: string;
  onValueChange?: (value: string) => void;
  onEditComplete?: (finalValue?: string) => void;
  onNavigateEdit?: (direction: 'left' | 'right') => void;
  onFocusInput?: () => void;

  // Keyboard navigation
  isSelected?: boolean;
  columnType?: 'text' | 'number' | 'date' | 'currency';
}
```

---

### 3.2 DELETION

#### Methods

1. **Hover + Click Trash Icon**
   - Shows on hover (group-hover)
   - Calls `config.onClear()`

2. **Keyboard: Ctrl+D**
   - When badge is selected (via Ctrl+Arrow)
   - Calls `badge.onClear()`

3. **During Inline Edit: Delete Key**
   - While editing value badge
   - Clears the value (empty string)

#### Handler Implementation (useBadgeHandlers.ts)

**clearConditionPart** (lines 120-310)

```typescript
clearConditionPart(conditionIndex: number, target: BadgeTarget)
// target: 'column' | 'operator' | 'value' | 'valueTo'

// Behavior:
// - column: Clear entire condition (or all if index=0)
// - operator: Clear operator & subsequent conditions
// - value: Clear value, keep other conditions
// - valueTo: Clear valueTo for "between" operator
```

**clearJoin** (lines 320-402)

```typescript
clearJoin(joinIndex: number)
// Removes join operator and subsequent conditions
// Keeps conditions 0 to joinIndex
```

**clearAll** (lines 106-115)

```typescript
clearAll();
// Resets entire search to empty
```

#### Deletion Flow Example

```
User clicks trash on operator badge at condition[1]
  ↓
clearConditionPart(1, 'operator')
  ↓
Remove operator, value, valueTo from condition[1]
Remove all subsequent conditions
  ↓
Rebuild pattern: condition[0] #AND #column[1] #
  ↓
Open operator selector for condition[1]
```

---

### 3.3 EDITING

#### Edit Types

**1. Selector-Based Editing (Column/Operator/Join)**

- Opens dropdown selector
- Shows live preview in badge
- Preserves other badges

**2. Inline Editing (Value Badges)**

- Converts badge to input field
- Validates based on column type
- Supports keyboard navigation between badges

#### Inline Editing Flow

**Entry Point:**

```typescript
// Badge.tsx - Click on value badge
<span onClick={config.canEdit && config.onEdit ? config.onEdit : undefined}>
  {displayLabel}
</span>
```

**Handler Chain:**

```
Badge.onEdit()
  ↓
editValueN(conditionIndex, target)  // useBadgeHandlers.ts:409
  ↓
setEditingBadge({
  conditionIndex: number,
  field: 'value' | 'valueTo',
  value: string
})
  ↓
Badge enters editing mode (isEditing = true)
  ↓
Input field appears with auto-focus
```

**Editing State Management** (EnhancedSearchBar.tsx:96-103)

```typescript
const [editingBadge, setEditingBadge] = useState<{
  conditionIndex: number;
  field: 'value' | 'valueTo';
  value: string;
} | null>(null);
```

**Value Validation** (Badge.tsx:62-94)

```typescript
validateValue(value: string): boolean
// Checks:
// - Not empty
// - For number/currency: contains digits, valid chars
// - For text/date: any value allowed
// - Auto-enters edit mode if invalid
// - Shake animation on validation error
```

**Edit Completion** (Badge.tsx:183-205)

```typescript
// Enter key: Save value
// Escape key: Save value (no cancel)
// Delete key: Clear badge
// Blur: Save value (if valid)
```

#### Keyboard Navigation During Edit

**Ctrl+E** (Left)

- Navigate to previous editable badge
- Save current value first
- Wraps around to rightmost

**Ctrl+Shift+E** (Right)

- Navigate to next editable badge
- Save current value first
- Wraps around to leftmost

**Ctrl+I** (Input)

- Exit inline edit
- Focus main input field
- Restore original pattern

#### Edit Handlers (useBadgeHandlers.ts)

**editConditionPart** (lines 470-589)

```typescript
editConditionPart(conditionIndex: number, target: BadgeTarget)
// target: 'column' | 'operator' | 'value' | 'valueTo'

// Behavior:
// - column/operator: Open selector, preserve state
// - value/valueTo: Enter inline editing mode
```

**editJoin** (lines 599-694)

```typescript
editJoin(joinIndex: number)
// Opens join operator selector
// Preserves all conditions
```

---

### 3.4 SELECTION (Keyboard Navigation)

#### Selection Mechanism

**Ctrl+Arrow Keys**

- Navigate between badges
- Highlight selected badge with glow effect
- Cycle through all badges

**State Management** (EnhancedSearchBar.tsx:105-108)

```typescript
const [selectedBadgeIndex, setSelectedBadgeIndex] = useState<number | null>(
  null
);
const [badgeCount, setBadgeCount] = useState<number>(0);
```

**Badge Selection Styling** (Badge.tsx:251-256)

```typescript
const selectedClass =
  isShaking || hasInvalidValue
    ? errorGlow // Red glow for errors
    : isSelected || isEditing
      ? colors.glow // Color-specific glow
      : '';
```

#### Selection Actions

**Ctrl+E** (Edit)

- Edit selected badge
- Navigates left (wraps right)

**Ctrl+D** (Delete)

- Delete selected badge
- Clears selection after deletion

**Arrow Keys** (Navigate)

- Move selection left/right
- Cycle through badges

#### Selection Handler (EnhancedSearchBar.tsx:380-440)

```typescript
const handleBadgeEdit = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+E navigation
    // Direction: Shift = right, no Shift = left
    // Finds next editable badge
    // Wraps around at edges
  }
);
```

---

### 3.5 HOVERING

#### Hover Effects

**Button Visibility**

- Edit button (FiEdit2): Hidden → Visible on hover
- Delete button (Trash): Hidden → Visible on hover
- Transition: 100ms ease-out

**Styling** (Badge.tsx:312-354)

```typescript
// Edit button
className={`
  ${isEditing || isSelected
    ? 'ml-1.5 max-w-[24px] opacity-100'
    : 'max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5'
  }
`}

// Delete button (similar pattern)
```

**Hover State Tracking** (SearchBadge.tsx:199-205)

```typescript
const handleMouseEnter = () => {
  onHoverChange?.(true);
};

const handleMouseLeave = () => {
  onHoverChange?.(false);
};
```

**Container Hover** (Badge.tsx:270-274)

```typescript
<div className="group flex items-center px-3 py-1.5 rounded-md ...">
  {/* Children inherit group-hover state */}
</div>
```

#### Live Preview on Hover (Selector Navigation)

**Preview Props** (SearchBadge.tsx:72-74)

```typescript
previewColumn?: { headerName: string; field: string } | null;
previewOperator?: { label: string; value: string } | null;
```

**Preview Application** (SearchBadge.tsx:144-187)

```typescript
// When selector is open and user hovers/navigates items:
// - Update badge label with preview value
// - Only applies when in edit mode (preservedSearchMode exists)
// - Correct badge identified by editingConditionIndex
```

---

## 4. State Management Architecture

### Core State Hierarchy

```
EnhancedSearchBar
├── searchMode (useSearchState)
│   ├── isFilterMode: boolean
│   ├── filterSearch: FilterSearch | null
│   ├── selectedColumn: SearchColumn | null
│   ├── showColumnSelector: boolean
│   ├── showOperatorSelector: boolean
│   ├── showJoinOperatorSelector: boolean
│   ├── partialConditions: PartialCondition[]
│   ├── partialJoin: 'AND' | 'OR' | undefined
│   └── joins: ('AND' | 'OR')[]
│
├── preservedSearchMode: EnhancedSearchState | null
│   └── (Snapshot of searchMode during edit)
│
├── editingSelectorTarget: { conditionIndex, target } | null
│   └── (Tracks which condition's column/operator is being edited)
│
├── editingBadge: { conditionIndex, field, value } | null
│   └── (Tracks which value badge is being inline edited)
│
├── selectedBadgeIndex: number | null
│   └── (Keyboard navigation selection)
│
└── badgeCount: number
    └── (For keyboard navigation bounds)
```

### State Preservation Pattern

**Why Preserve State?**

- When editing badges, we need to keep them visible
- Opening selectors would normally clear badges
- Solution: Snapshot searchMode before opening selector

**Implementation:**

```typescript
// Before opening selector
if (!preservedSearchMode) {
  setPreservedSearchMode(searchMode);
}

// Use preserved mode for badge rendering
const modeToRender = preservedSearchMode || searchMode;
```

---

## 5. Pattern System Integration

### Pattern Syntax

```
#columnName #operator value
#columnName #operator value #AND #columnName2 #operator2 value2
#columnName #operator value #to value2  (for "between" operator)
```

### PatternBuilder Utility

```typescript
// Builds patterns from condition arrays
PatternBuilder.buildNConditions(
  conditions,
  joins,
  isMultiColumn,
  defaultField,
  options
);

// Options:
// - confirmed: boolean (add ## for confirmed)
// - openSelector: boolean (add trailing #)
// - stopAfterIndex: number (build up to index)
```

### Pattern Restoration

```typescript
// When exiting inline edit, restore original pattern
restoreConfirmedPattern(filter);
// Converts filter object back to pattern string
```

---

## 6. Keyboard Shortcuts Reference

| Shortcut           | Context            | Action                        |
| ------------------ | ------------------ | ----------------------------- |
| `Ctrl+E`           | Main input         | Edit leftmost editable badge  |
| `Ctrl+Shift+E`     | Main input         | Edit rightmost editable badge |
| `Ctrl+E`           | During inline edit | Navigate to previous badge    |
| `Ctrl+Shift+E`     | During inline edit | Navigate to next badge        |
| `Ctrl+I`           | During inline edit | Exit edit, focus main input   |
| `Ctrl+D`           | Badge selected     | Delete selected badge         |
| `Arrow Left/Right` | Main input         | Navigate badge selection      |
| `Enter`            | During inline edit | Save value                    |
| `Escape`           | During inline edit | Save value (no cancel)        |
| `Delete`           | During inline edit | Clear badge                   |

---

## 7. Validation & Error Handling

### Value Validation (Badge.tsx:62-94)

**Rules by Column Type:**

```typescript
// Text columns: Any non-empty value
// Date columns: Any non-empty value
// Number columns: Must contain digits, valid chars (digits, +, -, ., ,)
// Currency columns: Same as number, plus currency symbols
```

**Validation Triggers:**

1. On blur (click outside)
2. On Enter key
3. On Escape key
4. Auto-trigger on invalid badge load

### Error States

**Shake Animation**

- Triggered on validation failure
- Duration: 400ms
- Indicates invalid value

**Error Styling**

```typescript
// Invalid badge styling
!bg-rose-200 !text-rose-800

// Glow effect
errorGlow: 'shadow-[0_0_12px_rgba(244,63,94,0.5),...]'
```

**Auto-Edit on Invalid**

```typescript
// If value badge loads with invalid value:
// 1. Trigger shake animation
// 2. Auto-enter edit mode
// 3. User must fix before continuing
```

---

## 8. Animation & Transitions

### Badge Animations (Framer Motion)

**Entry Animation:**

```typescript
variants = { badgeVariants };
initial = 'initial';
animate = 'animate';
exit = 'exit';
```

**Layout Animation:**

```typescript
layout; // Smooth position transitions when badges reorder
```

**AnimatePresence:**

```typescript
<AnimatePresence mode="popLayout">
  {badges.map(badge => (...))}
</AnimatePresence>
```

### Button Transitions

**Hover Button Reveal:**

```typescript
transition: 'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out';
```

**Smooth Width/Opacity Changes:**

- max-width: 0 → 24px
- opacity: 0 → 1
- margin-left: 0 → 1.5

---

## 9. Multi-Condition Support (N-Conditions)

### Index-Based Architecture

**Scalable Handler Pattern:**

```typescript
// All handlers accept conditionIndex parameter
clearConditionPart(conditionIndex: number, target: BadgeTarget)
editConditionPart(conditionIndex: number, target: BadgeTarget)
editValueN(conditionIndex: number, target: 'value' | 'valueTo')
clearJoin(joinIndex: number)
editJoin(joinIndex: number)
```

**Badge ID Naming:**

```
condition-{index}-column
condition-{index}-operator
condition-{index}-value
condition-{index}-valueTo
condition-{index}-separator
join-{index}
```

### Partial Conditions Array

**Structure:**

```typescript
partialConditions: Array<{
  field?: string;
  column?: SearchColumn;
  operator?: string;
  value?: string;
  valueTo?: string;
  waitingForValueTo?: boolean;
}>;
```

**Usage:**

- Index 0: First condition (confirmed or building)
- Index 1+: Additional conditions being built
- Supports unlimited conditions

### Multi-Condition Badge Rendering

**Priority Order:**

1. Confirmed multi-conditions (filter.conditions[])
2. Single condition with partial join
3. Building partial conditions (partialConditions[])

---

## 10. Performance Optimizations

### Memoization

**useBadgeBuilder:**

```typescript
return useMemo(() => {
  // Badge creation logic
}, [searchMode, handlers, inlineEditingProps, selectedBadgeIndex]);
```

**SearchBadge Badge Mapping:**

```typescript
const badges = useMemo(() => {
  // Apply preview values
}, [rawBadges, previewColumn, previewOperator, ...])
```

### Ref Management

**Dynamic Badge Ref Map:**

```typescript
const setBadgeRef = (badgeId: string, element: HTMLDivElement | null) => {
  // Store refs for dynamic positioning
};
```

**Preserved Filter Ref:**

```typescript
const preservedFilterRef = useRef<PreservedFilter | null>(null);
// Maintains filter state during edit
```

---

## 11. Integration Points

### With EnhancedSearchBar

1. **Input Change Handler**
   - Parses pattern → updates searchMode
   - Triggers badge rebuild

2. **Selector Handlers**
   - Column selection → creates column badge
   - Operator selection → creates operator badge
   - Join selection → creates join badge

3. **Keyboard Handlers**
   - Ctrl+E/D → badge edit/delete
   - Arrow keys → badge selection

### With Search State

**useSearchState Hook:**

- Parses pattern string
- Builds searchMode object
- Detects filter mode, selectors, conditions

**Pattern Parsing:**

- Extracts column, operator, value
- Handles multi-conditions
- Detects join operators

---

## 12. Edge Cases & Special Handling

### Between Operator (inRange)

- Creates two value badges: value + valueTo
- Separator badge between them ("to")
- Both values must be confirmed

### Multi-Column Mode

- Forces all field names in pattern
- Ensures parser correctly identifies conditions
- Used when editing N-conditions

### Partial Conditions Beyond Confirmed

- Supports building new conditions while previous ones confirmed
- Maintains separate badge streams
- Merges on confirmation

### Selector Interruption

- When user clicks value badge while selector open
- Saves selector state
- Restores after inline edit completes

---

## 13. Testing Considerations

### Unit Test Scenarios

**Badge Creation:**

- Single condition (column, operator, value)
- Multi-condition (with joins)
- Between operator (value + valueTo)

**Badge Deletion:**

- Delete column → clear all
- Delete operator → clear subsequent
- Delete value → keep other conditions
- Delete join → merge conditions

**Badge Editing:**

- Inline value edit with validation
- Column/operator selector edit
- Join operator edit

**Keyboard Navigation:**

- Ctrl+E/Shift+E navigation
- Ctrl+D deletion
- Arrow key selection
- Wrap-around behavior

**Validation:**

- Invalid value detection
- Auto-edit trigger
- Shake animation
- Type-specific validation

---

## 14. Future Enhancement Opportunities

1. **Drag & Drop Reordering**
   - Reorder conditions via drag
   - Reorder joins

2. **Batch Operations**
   - Select multiple badges
   - Delete/edit batch

3. **Copy/Paste Conditions**
   - Duplicate condition
   - Paste from clipboard

4. **Advanced Operators**
   - Custom operator support
   - Operator grouping

5. **Accessibility**
   - Screen reader support
   - ARIA labels
   - Keyboard-only navigation

---

## Summary

The advanced searchbar badges system is a **sophisticated, scalable architecture** that elegantly handles:

✅ **Creation** - Dynamic badge generation from patterns  
✅ **Deletion** - Index-based removal with state preservation  
✅ **Editing** - Dual modes (selector + inline) with validation  
✅ **Selection** - Keyboard-driven navigation with visual feedback  
✅ **Hovering** - Progressive disclosure of actions

**Key Strengths:**

- Index-based design supports unlimited conditions
- State preservation keeps badges visible during edits
- Comprehensive validation prevents invalid states
- Smooth animations enhance UX
- Keyboard shortcuts enable power-user workflows

**Architecture Pattern:**

- Separation of concerns (Badge, SearchBadge, useBadgeBuilder, useBadgeHandlers)
- Memoization for performance
- Ref-based dynamic positioning
- Pattern-driven state management
