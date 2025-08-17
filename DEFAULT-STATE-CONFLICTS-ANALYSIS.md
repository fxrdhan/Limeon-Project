# 🔍 Default State Conflicts Analysis

## Overview

Investigation untuk identifikasi default configurations yang bisa **OVERRIDE** atau **CONFLICT** dengan saved grid state, menyebabkan inconsistent behavior.

## 🚨 Identified Conflicts

### **1. Row Grouping Default Configurations**

**File:** `MasterDataGrid.tsx`

#### **❌ CONFLICT:**

```typescript
// Hard-coded defaults yang bisa override saved grouping state
groupDefaultExpanded={
  activeTab === 'items' && isRowGroupingEnabled
    ? defaultExpanded  // ← FIXED VALUE (-1)
    : undefined
}

defaultExpanded = -1; // ← Hard-coded: expand all groups
```

#### **❌ PROBLEM:**

- Saved state mungkin punya `rowGroupExpansion: { expandedGroupIds: ['specific_groups'] }`
- Tapi `groupDefaultExpanded={-1}` OVERRIDE dan expand ALL groups
- User saved state untuk expand specific groups tapi malah semua groups expanded

---

### **2. Sidebar Default State**

**File:** `MasterDataGrid.tsx`

#### **❌ CONFLICT:**

```typescript
sideBar={{
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columns',  // ← Fixed default
      // ...
    },
  ],
  // No defaultToolPanel = sidebar closed by default  ← OVERRIDE saved state
}}
```

#### **❌ PROBLEM:**

- Saved state mungkin punya `sideBar: { visible: true, defaultToolPanel: 'columns' }`
- Tapi configuration di atas FORCE sidebar closed
- User saved state untuk open sidebar tapi malah closed

---

### **3. Column Default Definitions**

**File:** `DataGrid.tsx`

#### **❌ CONFLICT:**

```typescript
const defaultColDef: ColDef = {
  sortable: true, // ← Could override saved sort settings
  resizable: true, // ← Could override saved resize settings
  filter: disableFiltering ? false : 'agTextColumnFilter', // ← Default filter
  // ...
};
```

#### **❌ PROBLEM:**

- `defaultColDef` applied to ALL columns bisa override individual column settings dari saved state
- Contoh: User save specific column sebagai non-sortable, tapi `sortable: true` override it

---

### **4. Pagination Force Settings**

**File:** `MasterDataGrid.tsx`

#### **❌ CONFLICT:**

```typescript
// Set initial page if needed (for items)
if (activeTab === 'items' && currentPage > 1) {
  params.api.paginationGoToPage(currentPage - 1); // ← FORCE page setting
}
```

#### **❌ PROBLEM:**

- Meskipun kita exclude pagination dari saved state, tapi ada FORCE pagination logic
- Bisa interfere dengan natural pagination behavior after restore

---

### **5. Fixed Props Override**

**File:** `MasterDataGrid.tsx`

#### **❌ CONFLICT:**

```typescript
// Fixed props yang tidak bisa di-override
rowNumbers={true}                           // ← FIXED: always show
suppressColumnMoveAnimation={true}          // ← FIXED: always suppress
suppressDragLeaveHidesColumns={true}       // ← FIXED: always suppress
```

#### **❌ PROBLEM:**

- Props ini FIXED dan tidak bisa di-override oleh saved state
- Jika saved state expect different values, akan conflict

---

## 🎯 Required Fixes

### **Fix 1: Conditional Row Grouping Defaults**

```typescript
// ❌ BEFORE: Fixed defaults
groupDefaultExpanded={
  activeTab === 'items' && isRowGroupingEnabled
    ? defaultExpanded
    : undefined
}

// ✅ AFTER: Only apply if no saved state
groupDefaultExpanded={
  activeTab === 'items' && isRowGroupingEnabled && !hasSavedState(activeTab)
    ? defaultExpanded
    : undefined
}
```

### **Fix 2: Conditional Sidebar Defaults**

```typescript
// ❌ BEFORE: Fixed sidebar config
sideBar={{
  toolPanels: [...],
  // No defaultToolPanel = sidebar closed by default
}}

// ✅ AFTER: Only apply defaults if no saved state
sideBar={
  hasSavedState(activeTab)
    ? true  // Let saved state control sidebar
    : {
        toolPanels: [...],
        // No defaultToolPanel = closed by default
      }
}
```

### **Fix 3: Conditional Column Defaults**

```typescript
// ❌ BEFORE: Always apply defaultColDef
defaultColDef = { defaultColDef };

// ✅ AFTER: Minimal defaultColDef to avoid conflicts
const safeDefaultColDef: ColDef = {
  // Only essential defaults that don't conflict with saved state
  cellDataType: false,
  enableCellChangeFlash: true,
  // Remove: sortable, resizable, filter (let saved state control these)
};
```

### **Fix 4: Remove Force Pagination**

```typescript
// ❌ BEFORE: Force pagination setting
if (activeTab === 'items' && currentPage > 1) {
  params.api.paginationGoToPage(currentPage - 1);
}

// ✅ AFTER: Let auto-restore handle pagination naturally
// Remove this logic entirely since we exclude pagination from saved state
```

### **Fix 5: Make Fixed Props Conditional**

```typescript
// ❌ BEFORE: Fixed props
rowNumbers={true}
suppressColumnMoveAnimation={true}

// ✅ AFTER: Let saved state control these if available
rowNumbers={hasSavedState(activeTab) ? undefined : true}
suppressColumnMoveAnimation={hasSavedState(activeTab) ? undefined : true}
```

## 🔧 Implementation Strategy

### **Phase 1: Safe Defaults**

- Create conditional defaults yang hanya apply jika TIDAK ada saved state
- Use `hasSavedState(activeTab)` untuk detection

### **Phase 2: Minimal Override**

- Remove semua hard-coded configurations yang bisa conflict
- Keep only essential defaults yang tidak interfere

### **Phase 3: Testing**

- Test edge cases: saved state vs no saved state
- Verify tidak ada unexpected overrides
- Ensure graceful fallback behavior

## 🎯 Expected Results

### **✅ AFTER Fixes:**

- **No Conflicts**: Saved state fully respected tanpa override
- **Clean Fallback**: Default behavior hanya jika tidak ada saved state
- **Predictable**: User expectations met consistently
- **Flexible**: System adapt to any saved state configuration

### **🔍 Testing Scenarios:**

1. **Fresh User**: No saved state → Use defaults
2. **Existing User**: Has saved state → Respect saved configuration completely
3. **Mixed Tabs**: Some have saved state, some don't → Each tab behave independently
4. **Edge Cases**: Corrupted saved state → Graceful fallback to defaults

## 📋 Action Items

1. ✅ Identify all conflicting defaults
2. 🔄 Implement conditional configurations
3. 🔄 Remove hard-coded overrides
4. 🔄 Test all scenarios
5. 🔄 Verify no regressions

**Priority: HIGH** - These conflicts dapat significantly undermine user saved preferences!
