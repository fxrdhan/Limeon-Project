# Grid State Race Condition Fix

## Problem Summary

When aggressively switching between tabs in `/master-data/item-master/*`, column widths were getting corrupted due to a race condition where:

1. **Delayed auto-save events** from tab A would fire AFTER switching to tab B
2. **Restoration events** during tab switch would trigger `onColumnResized` handlers
3. These handlers would save state to the WRONG tab due to `activeTab` changing mid-restoration

## Root Causes

### 1. Unguarded Auto-Save During Restoration

```typescript
// ❌ BEFORE: No protection
const handleColumnResized = useCallback(() => {
  setTimeout(autoSaveState, 100); // Could fire after tab switch!
}, [autoSaveState]);
```

### 2. Multiple Debounced setTimeout Without Cleanup

```typescript
// ❌ BEFORE: Multiple pending timeouts
handleColumnResized → setTimeout #1 (100ms)
handleColumnResized → setTimeout #2 (100ms)
[User switches tab]
setTimeout #1 fires → saves to WRONG tab
setTimeout #2 fires → saves to WRONG tab
```

### 3. No Restoration Lock Mechanism

State restoration triggered column events which triggered auto-save without any guard to prevent it.

---

## Solution Implemented

### ✅ Fix #1: Added Restoration Guard Flag

```typescript
// 🔒 Guard flag to prevent auto-save during state restoration
const isRestoringState = useRef<boolean>(false);
```

This flag is set to `true` during restoration and checked in all auto-save operations.

### ✅ Fix #2: Centralized Debounced Auto-Save

```typescript
// Debounced auto-save to batch multiple rapid changes
const debouncedAutoSave = useCallback(() => {
  // 🔒 Skip auto-save during state restoration
  if (isRestoringState.current) {
    return;
  }

  // Clear previous timeout
  if (autoSaveTimeoutRef.current) {
    clearTimeout(autoSaveTimeoutRef.current);
  }

  // Set new timeout
  autoSaveTimeoutRef.current = setTimeout(() => {
    autoSaveState();
    autoSaveTimeoutRef.current = null;
  }, 150);
}, [autoSaveState]);
```

### ✅ Fix #3: Restoration Lock/Unlock in handleGridReady

```typescript
const handleGridReady = useCallback(params => {
  // ...
  if (hasSaved) {
    isRestoringState.current = true; // 🔒 Lock

    restoreGridState(params.api, tableType);

    setTimeout(() => {
      // ...
      isRestoringState.current = false; // 🔓 Unlock
    }, 200);
  }
}, []);
```

### ✅ Fix #4: Restoration Lock/Unlock in Tab Switching

```typescript
useEffect(() => {
  if (previousTab !== currentTab && gridApi) {
    isRestoringState.current = true; // 🔒 Lock

    // Clear pending timeouts
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (hasSaved) {
      restoreGridState(gridApi, tableType);
      setTimeout(() => {
        isRestoringState.current = false; // 🔓 Unlock
      }, 200);
    } else {
      isRestoringState.current = false; // 🔓 Unlock
    }
  }
}, [activeTab, gridApi]);
```

### ✅ Fix #5: Cleanup on Unmount and Tab Change

```typescript
// Cleanup pending auto-save timeouts on unmount
useEffect(() => {
  return () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  };
}, []);

// Cleanup when activeTab changes
useEffect(() => {
  return () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  };
}, [activeTab]);
```

### ✅ Fix #6: Updated All Event Handlers

All handlers now use `debouncedAutoSave()` instead of individual `setTimeout`:

```typescript
const handleColumnResized = useCallback(() => {
  debouncedAutoSave();
}, [debouncedAutoSave]);

const handleColumnMoved = useCallback(() => {
  debouncedAutoSave();
}, [debouncedAutoSave]);

// ... etc for all handlers
```

---

## Testing Guide

### 1. Manual Aggressive Tab Switching Test

```
1. Open /master-data/item-master/units
2. Resize some columns
3. Rapidly switch tabs: units → items → categories → types → packages → dosages → manufacturers → units
4. Repeat 10 times rapidly
5. Check column widths remain stable on each tab
```

### 2. Browser Console Debug Commands

Open browser console and run:

```javascript
// Enable debug logging
window.gridDebug.enable();

// Inspect all saved states
window.gridDebug.inspect();

// After tab switching, compare states
window.gridDebug.compare('units', beforeState, afterState);

// Export states to JSON for analysis
window.gridDebug.export();

// Clear all states (for fresh testing)
window.gridDebug.clear();
```

### 3. Automated Test Script

Run this in browser console to automate aggressive tab switching:

```javascript
// Aggressive tab switching test
const tabs = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
];
let currentIndex = 0;

// Enable debug
window.gridDebug.enable();

// Before state snapshot
const beforeStates = {};
tabs.forEach(tab => {
  const key = `grid_state_${tab}`;
  beforeStates[tab] = localStorage.getItem(key);
});

// Rapid switching (10 cycles)
const interval = setInterval(() => {
  currentIndex = (currentIndex + 1) % tabs.length;
  const nextTab = tabs[currentIndex];

  // Trigger tab change
  window.location.hash = `/master-data/item-master/${nextTab}`;

  console.log(`🔄 Switched to: ${nextTab}`);
}, 200); // 200ms per switch = very aggressive

// Stop after 10 cycles
setTimeout(
  () => {
    clearInterval(interval);

    console.log('✅ Test complete. Inspecting results...');

    // After state snapshot
    const afterStates = {};
    tabs.forEach(tab => {
      const key = `grid_state_${tab}`;
      afterStates[tab] = localStorage.getItem(key);

      // Compare
      if (beforeStates[tab] !== afterStates[tab]) {
        console.warn(`⚠️  State changed for ${tab}`);
        window.gridDebug.compare(tab, beforeStates[tab], afterStates[tab]);
      } else {
        console.log(`✅ ${tab}: State unchanged (stable)`);
      }
    });

    window.gridDebug.inspect();
  },
  10 * 200 * tabs.length
); // 10 cycles
```

### 4. Expected Behavior

**✅ Correct Behavior:**

- Column widths remain stable for each tab
- No cross-contamination between tabs
- Console shows `[BLOCKED - RESTORING]` during restoration
- Console shows `[SAVED]` only after restoration complete

**❌ Bug Symptoms (if not fixed):**

- Column widths from one tab appear in another
- Console shows saves during restoration
- `grid_state_X` contains column IDs from different table

---

## Files Changed

### Modified

- `src/features/item-management/presentation/organisms/EntityGrid.tsx`
  - Added `isRestoringState` ref flag
  - Added `autoSaveTimeoutRef` for cleanup
  - Added `debouncedAutoSave` function
  - Updated `autoSaveState` with guard check
  - Updated `handleGridReady` with lock/unlock
  - Updated tab switching effect with lock/unlock
  - Updated all event handlers to use `debouncedAutoSave`
  - Added cleanup effects

### Created

- `src/utils/debug/gridStateDebug.ts` - Debug utilities
- `GRID_STATE_FIX.md` - This documentation

---

## Performance Impact

✅ **Positive:**

- Reduced localStorage writes (debouncing batches rapid changes)
- Eliminated race conditions
- Cleaner timeout management

❌ **Minimal Overhead:**

- One ref check per auto-save attempt (`isRestoringState.current`)
- Negligible performance impact

---

## Rollback Instructions

If issues occur, revert with:

```bash
git revert HEAD
```

Or manually:

1. Remove `isRestoringState` ref
2. Remove `debouncedAutoSave` function
3. Restore original `autoSaveState` (without guard)
4. Restore original event handlers (with individual `setTimeout`)
5. Remove cleanup effects

---

## Additional Notes

### Why 200ms Timeout?

Increased from 150ms to 200ms to ensure:

- All AG Grid internal events have settled
- Column state is fully applied
- Filter models are ready
- No pending DOM updates

### Why Debounce 150ms?

Balance between:

- Responsiveness (user sees save happening)
- Batching efficiency (multiple rapid changes)
- Race condition prevention

### Future Improvements

Consider:

- [ ] Add Sentry/monitoring for state corruption detection
- [ ] Add automated E2E tests for aggressive tab switching
- [ ] Add visual indicator when restoration is in progress
- [ ] Add state validation before save (detect corruption early)
