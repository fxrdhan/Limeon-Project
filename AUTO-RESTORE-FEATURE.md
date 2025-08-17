# 🚀 Auto-Restore + Manual Grid State Management

## Overview

Sekarang grid state management punya **dual approach**:

- **🔄 Auto-Restore**: Otomatis restore saved layout saat grid pertama kali dibuat
- **💾 Manual Save**: User save layout kapan mau via button
- **🔄 Manual Restore**: User restore layout kapan mau via button

## User Experience Flow

### 🎯 **Typical Workflow:**

```
1. User buka Item Master → Grid load dengan default layout
2. User customize (hide columns, resize, filter, etc.)
3. User click 💾 Save → Layout tersimpan ke localStorage
4. User reload page → 🔄 AUTO-RESTORE: Grid langsung load dengan saved layout! (instant)
5. User switch tabs → 🔄 AUTO-RESTORE: Loading overlay + layout restored! (150ms)
6. User customize lagi → Bisa click 🔄 Manual Restore untuk balik ke saved layout
```

### 🎨 **UI Elements:**

```
[Search Bar] [Add] [💾 Save] [🔄 Restore] [Export]
```

## Technical Implementation

### **Auto-Restore on Initialization (Page Reload)**

```typescript
// MasterDataGrid.tsx
const autoRestoreInitialState = useMemo(() => {
  const tableType = activeTab as TableType;
  const savedState = loadSavedStateForInit(tableType);

  if (savedState) {
    console.log(`🔄 Auto-restore: Found saved layout for ${tableType}`);
    return savedState;
  }

  return undefined;
}, [activeTab]);

// Pass to DataGrid
<DataGrid
  initialState={autoRestoreInitialState}
  // ... other props
/>
```

### **Auto-Restore on Tab Switch (Same Session)**

```typescript
// MasterDataGrid.tsx - Tab change detection
const [isAutoRestoring, setIsAutoRestoring] = useState(false);

useEffect(() => {
  if (!gridApi || gridApi.isDestroyed()) return;

  const tableType = activeTab as TableType;

  if (hasSavedState(tableType)) {
    console.log(`🔄 Tab switch auto-restore: Loading saved layout for ${tableType}`);

    setIsAutoRestoring(true);

    const savedState = loadSavedStateForInit(tableType);
    if (savedState) {
      gridApi.setState(savedState); // Apply via setState API

      setTimeout(() => {
        gridApi.paginationGoToPage(0);
        gridApi.autoSizeAllColumns();
        setIsAutoRestoring(false);
      }, 150);
    }
  } else {
    gridApi.autoSizeAllColumns();
  }
}, [gridApi, activeTab]);

// Combined loading state
<DataGrid loading={isLoading || isAutoRestoring} />
```

### **Manual Operations**

```typescript
// Save (Manual)
const handleSaveState = () => {
  saveGridState(gridApi, currentTableType);
  // Toast: "Layout grid packages berhasil disimpan (tanpa pagination)"
};

// Restore (Manual)
const handleRestoreState = () => {
  restoreGridState(gridApi, currentTableType);
  // Toast: "Layout grid packages berhasil direstore manual (pagination direset)"
};
```

## Feature Benefits

### 🎯 **Best of Both Worlds:**

- **Auto-Restore**: Seamless experience, layout preserved automatically
- **Manual Control**: User tetap punya full control kapan save/restore

### 🚀 **Improved UX:**

- **No Setup Required**: Auto-restore work out of the box
- **Complete Coverage**: Page reload (instant) + tab switching (with loading overlay)
- **Persistent Preferences**: Layout automatically preserved across sessions
- **Flexible Control**: Manual buttons for on-demand operations

### 🔧 **Technical Advantages:**

- **Dual Strategy**: initialState (reload) + setState (tab switch)
- **Smart Loading**: Loading overlay hanya saat diperlukan (tab switch)
- **Error Handling**: Graceful fallback jika auto-restore fails
- **Consistent State**: Same exclude pagination logic untuk auto dan manual

## State Management Logic

### **What Gets Auto-Restored:**

- ✅ Column visibility, order, sizes
- ✅ Column pinning, sorting
- ✅ Filters, grouping
- ✅ Side bar state
- ❌ **Pagination** (excluded untuk avoid conflicts)

### **Storage Structure:**

```
localStorage keys:
- pharmasys_manual_grid_state_items
- pharmasys_manual_grid_state_categories
- pharmasys_manual_grid_state_packages
- ... (per table)
```

## Console Logs for Debugging

### **Auto-Restore Logs:**

```javascript
// Page reload auto-restore
'🔄 Auto-restore: Found saved layout for packages';

// Tab switch auto-restore
'🔄 Tab switch auto-restore: Loading saved layout for packages';

// Error scenarios
'Failed to auto-restore on tab switch: [error details]';
```

### **Manual Operation Logs:**

```javascript
// Save
'Layout grid packages berhasil disimpan (tanpa pagination)';

// Manual Restore
'Layout grid packages berhasil direstore manual (pagination direset)';
```

## Migration & Compatibility

### **Existing Users:**

- ✅ **Auto-works**: Existing saved states automatically auto-restore
- ✅ **No Breaking Changes**: All manual functionality preserved
- ✅ **Backwards Compatible**: Old localStorage format supported

### **New Users:**

- ✅ **Progressive Enhancement**: Start with default, save when needed
- ✅ **Auto-restore kicks in**: After first manual save

## Usage Scenarios

### **Scenario 1: First Time User**

```
1. Open Item Master → Default layout
2. Customize layout
3. Click 💾 Save
4. Reload page → Auto-restore kicks in! ✨
```

### **Scenario 2: Power User**

```
1. Open page → Auto-restore to saved layout ✨
2. Quick customization for specific task
3. Click 🔄 Manual Restore → Back to preferred layout
4. Continue working with optimal setup
```

### **Scenario 3: Team Environment**

```
1. Each user saves their preferred layout
2. Auto-restore ensures consistent personal experience
3. Manual restore for quick layout switching
4. No interference between team members
```

## Error Handling

### **Auto-Restore Failures:**

- **Silent Fallback**: Grid loads dengan default layout
- **Console Log**: Error logged untuk debugging
- **No User Disruption**: Normal grid functionality continues

### **Manual Operation Failures:**

- **Toast Notifications**: Clear error messages
- **Graceful Degradation**: Grid state remains unchanged
- **Console Logs**: Detailed error info for debugging

## Performance Impact

### **Minimal Overhead:**

- **Auto-restore**: Single localStorage read per tab (fast)
- **No Network Calls**: Pure localStorage operations
- **Lazy Loading**: Only load when grid initialized

### **Optimizations:**

- **Memoized State**: Only recalculate when activeTab changes
- **Exclude Pagination**: Avoid conflicts and reduce state size
- **Error Boundaries**: Prevent auto-restore failures from breaking grid

✅ **Auto-Restore + Manual Control = Perfect Grid State Management!** 🎉
