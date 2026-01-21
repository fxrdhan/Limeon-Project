/**
 * Debug utilities for AG Grid state management
 *
 * Usage in browser console:
 * ```
 * import { enableGridDebug } from '@/utils/debug/gridStateDebug';
 * enableGridDebug();
 * ```
 */

// Global debug flag
let debugEnabled = false;

/**
 * Enable detailed grid state logging
 */
export const enableGridDebug = (): void => {
  debugEnabled = true;
  console.log('🔧 Grid state debugging enabled');
  console.log(
    '📊 Monitoring: auto-save events, restoration flags, column widths'
  );
};

/**
 * Disable grid state logging
 */
export const disableGridDebug = (): void => {
  debugEnabled = false;
  console.log('🔧 Grid state debugging disabled');
};

/**
 * Check current debugging status
 */
export const isDebugEnabled = (): boolean => debugEnabled;

/**
 * Log auto-save event with context
 */
export const logAutoSave = (
  tableType: string,
  isRestoring: boolean,
  columnWidths: Array<{ colId: string; width: number }>
): void => {
  if (!debugEnabled) return;

  const emoji = isRestoring ? '🔒' : '💾';
  const status = isRestoring ? '[BLOCKED - RESTORING]' : '[SAVED]';

  console.log(`${emoji} Auto-save ${status}: ${tableType}`, {
    isRestoring,
    timestamp: new Date().toISOString(),
    columnCount: columnWidths.length,
    columnWidths: columnWidths.slice(0, 3), // Show first 3 columns
  });
};

/**
 * Log restoration event
 */
export const logRestoration = (
  tableType: string,
  phase: 'start' | 'end',
  details?: Record<string, unknown>
): void => {
  if (!debugEnabled) return;

  const emoji = phase === 'start' ? '🔒' : '🔓';
  const action = phase === 'start' ? 'LOCKED' : 'UNLOCKED';

  console.log(`${emoji} Restoration ${action}: ${tableType}`, {
    phase,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * Log tab switch event
 */
export const logTabSwitch = (
  from: string,
  to: string,
  pendingTimeouts: number
): void => {
  if (!debugEnabled) return;

  console.log(`🔄 Tab switch: ${from} → ${to}`, {
    timestamp: new Date().toISOString(),
    pendingTimeouts,
    action: pendingTimeouts > 0 ? 'Cleared pending saves' : 'No pending saves',
  });
};

/**
 * Inspect all saved grid states in sessionStorage
 */
export const inspectAllGridStates = (): void => {
  console.group('📦 All Grid States in sessionStorage');

  const gridStateKeys = Object.keys(sessionStorage).filter(key =>
    key.startsWith('grid_state_')
  );

  if (gridStateKeys.length === 0) {
    console.log('No grid states found');
    console.groupEnd();
    return;
  }

  gridStateKeys.forEach(key => {
    const tableType = key.replace('grid_state_', '');
    const state = sessionStorage.getItem(key);

    if (!state) {
      console.log(`❌ ${tableType}: Empty`);
      return;
    }

    try {
      const parsed = JSON.parse(state);
      const columnWidths =
        parsed.columnSizing?.columnSizingModel?.map(
          (col: { colId: string; width: number }) => ({
            colId: col.colId,
            width: col.width,
          })
        ) || [];

      console.group(`✅ ${tableType}`);
      console.log('Version:', parsed.version);
      console.log('Column Count:', columnWidths.length);
      console.log('Column Widths:', columnWidths);
      console.log('Pagination:', parsed.pagination);
      console.log('Sidebar:', parsed.sideBar);
      console.groupEnd();
    } catch (error) {
      console.log(`❌ ${tableType}: Corrupted state`, error);
    }
  });

  console.groupEnd();
};

/**
 * Compare two grid states for differences
 */
export const compareGridStates = (
  tableType: string,
  beforeState: string,
  afterState: string
): void => {
  console.group(`🔍 Comparing Grid States: ${tableType}`);

  try {
    const before = JSON.parse(beforeState);
    const after = JSON.parse(afterState);

    // Compare column widths
    const beforeWidths = before.columnSizing?.columnSizingModel || [];
    const afterWidths = after.columnSizing?.columnSizingModel || [];

    console.log('Column Width Changes:');
    beforeWidths.forEach((col: { colId: string; width: number }) => {
      const afterCol = afterWidths.find(
        (c: { colId: string }) => c.colId === col.colId
      );
      if (afterCol && afterCol.width !== col.width) {
        console.log(`  📏 ${col.colId}: ${col.width} → ${afterCol.width}`);
      }
    });

    // Compare pagination
    if (
      JSON.stringify(before.pagination) !== JSON.stringify(after.pagination)
    ) {
      console.log('Pagination Changed:');
      console.log('  Before:', before.pagination);
      console.log('  After:', after.pagination);
    }

    // Compare sidebar
    if (JSON.stringify(before.sideBar) !== JSON.stringify(after.sideBar)) {
      console.log('Sidebar Changed:');
      console.log('  Before:', before.sideBar);
      console.log('  After:', after.sideBar);
    }
  } catch (error) {
    console.error('Failed to compare states:', error);
  }

  console.groupEnd();
};

/**
 * Clear all grid states (useful for testing)
 */
export const clearAllGridStates = (): void => {
  const gridStateKeys = Object.keys(sessionStorage).filter(key =>
    key.startsWith('grid_state_')
  );

  gridStateKeys.forEach(key => sessionStorage.removeItem(key));

  console.log(`🗑️  Cleared ${gridStateKeys.length} grid states`);
};

/**
 * Export current grid states to JSON file
 */
export const exportGridStates = (): void => {
  const gridStateKeys = Object.keys(sessionStorage).filter(key =>
    key.startsWith('grid_state_')
  );

  const states: Record<string, unknown> = {};

  gridStateKeys.forEach(key => {
    const tableType = key.replace('grid_state_', '');
    const state = sessionStorage.getItem(key);
    if (state) {
      try {
        states[tableType] = JSON.parse(state);
      } catch {
        states[tableType] = { error: 'Failed to parse' };
      }
    }
  });

  const json = JSON.stringify(states, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grid-states-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('📥 Grid states exported');
};

// Auto-expose to window for easy console access
if (typeof window !== 'undefined') {
  interface WindowWithGridDebug extends Window {
    gridDebug?: {
      enable: typeof enableGridDebug;
      disable: typeof disableGridDebug;
      inspect: typeof inspectAllGridStates;
      compare: typeof compareGridStates;
      clear: typeof clearAllGridStates;
      export: typeof exportGridStates;
    };
  }

  (window as WindowWithGridDebug).gridDebug = {
    enable: enableGridDebug,
    disable: disableGridDebug,
    inspect: inspectAllGridStates,
    compare: compareGridStates,
    clear: clearAllGridStates,
    export: exportGridStates,
  };
}
