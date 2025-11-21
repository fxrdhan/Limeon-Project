# Bug Analysis: E2 - Edit Second Value in Multi-Condition Filter

## 🐛 Bug Summary

**Test Case:** E2 - Edit Second Value Badge (Multi-Condition Filter)
**Severity:** CRITICAL
**Status:** CONFIRMED
**Date:** 2025-11-21

When editing the second value in a multi-condition filter, the system creates a **duplicate condition** instead of replacing the existing value.

### Expected Behavior

```
Initial:  [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
Edit:     Change 100000 → 80000
Result:   [Harga Pokok][Greater Than][50000][AND][Less Than][80000]  ✓
Badges:   6 badges
```

### Actual Behavior

```
Initial:  [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
Edit:     Change 100000 → 80000
Result:   [Harga Pokok][Greater Than][50000][AND][Less Than][80000][AND][Less Than][100000]  ✗
Badges:   9 badges (3 extra!)
```

---

## 🔍 Root Cause Analysis

### The Problem

The bug occurs in the `handleOnChangeWithReconstruction` function (lines 895-929 in `EnhancedSearchBar.tsx`). This function was designed to handle editing the **first value** in multi-condition filters, but it **incorrectly triggers** when editing the **second value** as well.

### Execution Flow

#### Step 1: User Clicks Edit on Second Value Badge

`handleEditSecondValue` is called (line 842):

```typescript
// Line 860-870: Preserve current state
setPreservedSearchMode(searchMode);
preservedFilterRef.current = {
  operator: 'gt', // Greater Than
  value: '50000', // First value
  join: 'AND',
  secondOperator: 'lt', // Less Than
  secondValue: '100000', // ← OLD second value preserved here
};

// Line 873: Build input value for editing
const newValue = `#HargaPokok #gt 50000 #and #lt 100000`; // FULL pattern (no ##)
onChange({ target: { value: newValue } });
```

**Key Issue #1:** The input shows the FULL pattern, including both conditions.

#### Step 2: User Edits to "80000"

Input now contains:

```
#HargaPokok #gt 50000 #and #lt 80000
```

#### Step 3: User Presses Enter

The keyboard handler (`useSearchKeyboard.ts`, lines 52-73) detects this is a multi-condition edit:

```typescript
// Parse current value:
// searchMode.partialJoin = "AND"
// searchMode.secondOperator = "lt"
// searchMode.isFilterMode = false

if (
  searchMode.partialJoin && // ✓ "AND"
  searchMode.secondOperator && // ✓ "lt"
  !searchMode.isFilterMode // ✓ false
) {
  const newValue = currentValue + '##'; // Add confirmation marker
  onChange({ target: { value: newValue } }); // ← Call onChange FIRST
  onClearPreservedState?.(); // ← Clear state AFTER
}
```

**Key Issue #2:** `onChange` is called BEFORE `onClearPreservedState`, so preserved state is still available.

#### Step 4: Reconstruction (THE BUG)

`handleOnChangeWithReconstruction` receives:

```
inputValue = "#HargaPokok #gt 50000 #and #lt 80000##"
```

The function executes:

```typescript
if (
  inputValue.endsWith('##') && // ✓ true
  preservedFilterRef.current?.secondOperator && // ✓ "lt"
  preservedFilterRef.current?.secondValue // ✓ "100000" (OLD VALUE!)
) {
  const baseValue = inputValue.slice(0, -2);
  // baseValue = "#HargaPokok #gt 50000 #and #lt 80000"  ← Already contains NEW second value!

  // Reconstruct by APPENDING preserved second condition:
  const fullPattern = `${baseValue} #${preservedFilterRef.current.join?.toLowerCase()} #${preservedFilterRef.current.secondOperator} ${preservedFilterRef.current.secondValue}##`;

  // Result: "#HargaPokok #gt 50000 #and #lt 80000 #and #lt 100000##"
  //                                 ↑ NEW VALUE ↑  ↑ OLD VALUE APPENDED ↑
  //                                    DUPLICATE!

  onChange({ target: { value: fullPattern } });
}
```

**This is the bug!** The function:

1. Receives `baseValue` that **already contains** the edited second value (80000)
2. Then **appends** the preserved second condition (100000) from `preservedFilterRef`
3. Creates a **duplicate**: `...#and #lt 80000 #and #lt 100000##`

### Why This Works for First Value Edit

When editing the **first value** (Test E1 / E3):

```typescript
// handleEditValue shows ONLY first value (line 820):
newValue = `#HargaPokok #gt 50000`; // Does NOT include second condition

// User edits to 60000:
('#HargaPokok #gt 60000');

// Press Enter:
('#HargaPokok #gt 60000##');

// Reconstruction:
baseValue = '#HargaPokok #gt 60000'; // ← Only first value
fullPattern = `${baseValue} #and #lt 100000##`;
// Result: "#HargaPokok #gt 60000 #and #lt 100000##"  ✓ CORRECT!
```

The reconstruction works because `baseValue` **does NOT contain** the second condition, so appending it is correct.

---

## 🔧 The Fix

### Solution: Skip Reconstruction for Second Value Edits

Update `handleOnChangeWithReconstruction` to detect if the user is editing the second value by checking if `baseValue` already contains the join operator:

```typescript
const handleOnChangeWithReconstruction = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Detect confirmation of value edit (## marker added)
    if (
      inputValue.endsWith('##') &&
      preservedFilterRef.current?.secondOperator &&
      preservedFilterRef.current?.secondValue
    ) {
      // Remove ## marker
      const baseValue = inputValue.slice(0, -2);

      // Check if baseValue already contains the join operator
      // If yes → editing second value (full pattern present)
      // If no  → editing first value (only first condition present)
      const joinPattern = `#${preservedFilterRef.current.join?.toLowerCase()}`;
      const hasJoinInBase = baseValue.includes(joinPattern);

      if (hasJoinInBase) {
        // Editing second value - baseValue already contains the full pattern
        // Don't reconstruct, just pass through
        console.log('🔵 Second value edit detected - skipping reconstruction');
        onChange(e);
      } else {
        // Editing first value - reconstruct full multi-condition pattern
        const fullPattern = `${baseValue} ${joinPattern} #${preservedFilterRef.current.secondOperator} ${preservedFilterRef.current.secondValue}##`;

        console.log('🔧 Reconstructing multi-condition:', {
          inputValue,
          baseValue,
          preservedFilter: preservedFilterRef.current,
          fullPattern,
        });

        // Call parent onChange with reconstructed pattern
        onChange({
          ...e,
          target: { ...e.target, value: fullPattern },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      // Normal onChange - pass through
      onChange(e);
    }
  },
  [onChange]
);
```

### Key Changes

1. **Line 14-15:** Check if `baseValue` contains the join pattern
2. **Lines 17-21:** If join is present, skip reconstruction (editing second value)
3. **Lines 22-35:** If join is absent, reconstruct (editing first value)

---

## ✅ Verification

After applying the fix, test E2 should pass:

```
Initial:  [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
Edit:     Change 100000 → 80000
Expected: [Harga Pokok][Greater Than][50000][AND][Less Than][80000]
Result:   [Harga Pokok][Greater Than][50000][AND][Less Than][80000]  ✓
Badges:   6 badges
Filter:   "> 50000 AND < 80000"
```

Additionally verify:

- **E1:** Edit first value in simple filter (should still work)
- **E3:** Edit first value in multi-condition filter (should still work)
- **All deletion tests (D1-D5):** Should not be affected
- **All creation tests (0-4):** Should not be affected

---

## 📁 Files Affected

- `src/components/search-bar/EnhancedSearchBar.tsx` (lines 895-929)
  - Function: `handleOnChangeWithReconstruction`

---

## 🔗 Related Files

- `src/components/search-bar/hooks/useSearchKeyboard.ts` - Enter key handling
- `src/components/search-bar/utils/searchUtils.ts` - Pattern parsing
- `scripts/e2e-tests/searchbar/TEST-FLOWS.md` - Test case E2

---

## 📊 Impact Assessment

**Affected Scenarios:**

- Editing second value in multi-condition filters (Test E2)

**Not Affected:**

- Simple filter value editing (Test E1)
- First value editing in multi-condition filters (Test E3)
- All badge creation tests
- All badge deletion tests
- Synchronization tests

**User Impact:**

- Users cannot properly edit the second value in range filters
- Workaround: Delete and recreate the filter
- Data integrity: No data corruption (only UI issue)

---

## 🎯 Test Execution After Fix

Run these tests to verify the fix:

```
Test E1: Edit Value Badge (Simple Filter)
Test E2: Edit Second Value Badge (Multi-Condition Filter)  ← Primary fix validation
Test E3: Edit First Value Badge (Multi-Condition Filter)
```

All three should pass with 6 badges each after editing.
