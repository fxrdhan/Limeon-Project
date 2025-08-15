import { useState, useMemo, useCallback } from 'react';
import {
  useRowGroupingPreference,
  type RowGroupingState,
} from '@/hooks/queries/useUserPreferences';

export const useRowGrouping = () => {
  // Use database-backed user preferences
  const {
    rowGroupingState: dbRowGroupingState,
    setRowGroupingState: setDbRowGroupingState,
    isLoading: isDbLoading,
    error: dbError,
  } = useRowGroupingPreference();

  // Local state for optimistic updates
  const [optimisticState, setOptimisticState] = useState<RowGroupingState | null>(null);

  // Use optimistic state during saves, otherwise use DB state
  const currentState = useMemo(() => {
    return optimisticState || dbRowGroupingState;
  }, [optimisticState, dbRowGroupingState]);

  // Toggle row grouping enabled state
  const toggleRowGrouping = useCallback(async () => {
    const newState: RowGroupingState = {
      ...currentState,
      enabled: !currentState.enabled,
    };

    // Set optimistic state for immediate UI update
    setOptimisticState(newState);

    try {
      // Save to database
      await setDbRowGroupingState(newState);
      
      // Clear optimistic state after successful save
      setOptimisticState(null);
    } catch (error) {
      console.error('Failed to save row grouping state to database:', error);
      
      // Revert optimistic state on error
      setOptimisticState(null);
    }
  }, [currentState, setDbRowGroupingState]);

  // Update grouped columns
  const setGroupedColumns = useCallback(async (columns: string[]) => {
    const newState: RowGroupingState = {
      ...currentState,
      groupedColumns: columns,
    };

    // Set optimistic state for immediate UI update
    setOptimisticState(newState);

    try {
      // Save to database
      await setDbRowGroupingState(newState);
      
      // Clear optimistic state after successful save
      setOptimisticState(null);
    } catch (error) {
      console.error('Failed to save row grouping state to database:', error);
      
      // Revert optimistic state on error
      setOptimisticState(null);
    }
  }, [currentState, setDbRowGroupingState]);

  // Note: setDefaultExpanded removed - now uses fixed value of 1

  // Force disable grouping (for tab switching)
  const disableRowGrouping = useCallback(async () => {
    if (!currentState.enabled) return; // Already disabled

    const newState: RowGroupingState = {
      ...currentState,
      enabled: false,
    };

    // Set optimistic state for immediate UI update
    setOptimisticState(newState);

    try {
      // Save to database
      await setDbRowGroupingState(newState);
      
      // Clear optimistic state after successful save
      setOptimisticState(null);
    } catch (error) {
      console.error('Failed to save row grouping state to database:', error);
      
      // Revert optimistic state on error
      setOptimisticState(null);
    }
  }, [currentState, setDbRowGroupingState]);

  return {
    // State
    isRowGroupingEnabled: currentState.enabled,
    groupedColumns: currentState.groupedColumns,
    
    // Fixed UI values (no need to persist)
    defaultExpanded: 1, // Always expand first level
    showGroupPanel: currentState.enabled, // Always show when enabled
    
    // Actions
    toggleRowGrouping,
    setGroupedColumns,
    disableRowGrouping,
    
    // Meta
    isLoading: isDbLoading,
    error: dbError,
  };
};