/**
 * useBadgeHandlers Hook
 *
 * Consolidates badge handlers from EnhancedSearchBar into a reusable hook.
 * Provides both:
 * 1. Index-based scalable handlers (new)
 * 2. Legacy handlers for backward compatibility with current useBadgeBuilder
 *
 * This hook keeps badge handler logic out of EnhancedSearchBar.tsx.
 */

import { RefObject, useCallback } from 'react';
import { EnhancedSearchState } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  extractMultiConditionPreservation,
  getConditionAt,
  PreservedFilter,
  setFilterValue,
} from '../utils/handlerHelpers';
import { restoreConfirmedPattern } from '../utils/patternRestoration';
import { getBadgeJoinParts } from './badgeHandlerState';
import { useBadgeClearHandlers } from './useBadgeClearHandlers';

// ============ Types ============

export type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

export interface UseBadgeHandlersProps {
  /** Current search value */
  value: string;
  /** onChange handler for input */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input ref for focus management */
  inputRef: RefObject<HTMLInputElement | null> | null | undefined;
  /** Current search mode state */
  searchMode: EnhancedSearchState;
  /** Preserved search mode for edit mode */
  preservedSearchMode: EnhancedSearchState | null;
  /** Set preserved search mode */
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  /** Preserved filter ref */
  preservedFilterRef: React.MutableRefObject<PreservedFilter | null>;
  /** Clear preserved state callback */
  onClearPreservedState: () => void;
  /** Clear search callback */
  onClearSearch?: () => void;
  /** Set which condition's column/operator is being edited (for N-condition support) */
  setEditingSelectorTarget?: (
    target: {
      conditionIndex: number;
      target: 'column' | 'operator' | 'join';
    } | null
  ) => void;
  /** Set which badge's value is being edited (for inline editing) */
  setEditingBadge?: (
    badge: {
      conditionIndex: number;
      field: 'value' | 'valueTo';
      value: string;
    } | null
  ) => void;
  /** Set current join operator for selector highlighting */
  setCurrentJoinOperator?: (operator: 'AND' | 'OR' | undefined) => void;
}

export interface BadgeHandlersReturn {
  // ============ Scalable Index-Based Handlers ============
  /** Clear a specific part of a condition */
  clearConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  /** Clear a join operator */
  clearJoin: (joinIndex: number) => void;
  /** Clear everything */
  clearAll: () => void;
  /** Edit a specific part of a condition */
  editConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  /** Edit join at given index */
  editJoin: (joinIndex: number) => void;
  /** Edit value badge at given index (triggers inline editing) */
  editValueN: (conditionIndex: number, target: 'value' | 'valueTo') => void;
}

// ============ Hook Implementation ============

export function useBadgeHandlers(
  props: UseBadgeHandlersProps
): BadgeHandlersReturn {
  const {
    value,
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    onClearPreservedState,
    onClearSearch,
    setEditingSelectorTarget,
    setEditingBadge,
    setCurrentJoinOperator,
  } = props;

  // ============ Helper: Get effective state ============
  const getEffectiveState = useCallback(() => {
    return preservedSearchMode || searchMode;
  }, [preservedSearchMode, searchMode]);

  const { clearAll, clearConditionPart, clearJoin } = useBadgeClearHandlers({
    getEffectiveState,
    onClearPreservedState,
    onClearSearch,
    onChange,
    inputRef,
    setCurrentJoinOperator,
  });

  // ============ EDIT HANDLERS ============

  /**
   * Edit value badge at given index (triggers inline editing)
   */
  const editValueN = useCallback(
    (conditionIndex: number, target: 'value' | 'valueTo') => {
      const state = getEffectiveState();

      if (!state.filterSearch) {
        return;
      }

      // Preserve state before edit
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      // If we're in edit mode (confirmed filter), restore the confirmed pattern first
      // to "close" any open selectors and ensure we're looking at badges
      if (state.filterSearch.isConfirmed) {
        const restoredPattern = restoreConfirmedPattern(state.filterSearch);

        // Only call onChange if the pattern is actually different
        // This prevents redundant updates that can break state sync in multi-condition mode
        if (value !== restoredPattern) {
          onChange({
            target: { value: restoredPattern },
          } as React.ChangeEvent<HTMLInputElement>);
        }

        // Note: we don't clear preservedSearchMode here because we're about to enter inline edit
      }

      // Update preserved filter data for consistency with other edit handlers
      preservedFilterRef.current = extractMultiConditionPreservation(state);

      // Robustly get condition data using helper (handles both confirmed and partial conditions)
      const cond = getConditionAt(state.filterSearch, state, conditionIndex);
      const currentValue = cond
        ? target === 'value'
          ? cond.value
          : cond.valueTo || ''
        : '';

      // Enter inline editing mode - removed empty value early return to ensure
      // typer appears even if value extraction is temporarily lagging
      setEditingBadge?.({
        conditionIndex,
        field: target,
        value: currentValue || '',
      });
    },
    [
      getEffectiveState,
      preservedSearchMode,
      searchMode,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
      value,
      preservedFilterRef,
    ]
  );

  /**
   * Edit a specific part of a condition at given index
   */
  const editConditionPart = useCallback(
    (conditionIndex: number, target: BadgeTarget) => {
      const state = getEffectiveState();

      // For column/operator edits, we need to preserve state and open selector
      // For value edits, we enter inline editing mode (handled in EnhancedSearchBar)

      if (!state.filterSearch && !state.selectedColumn) {
        return;
      }

      // Preserve state before edit
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      // Extract and preserve filter data
      preservedFilterRef.current = extractMultiConditionPreservation(state);

      // Track which condition's column/operator is being edited
      // This is used for correct selector positioning in N-condition editing
      if (target === 'column' || target === 'operator') {
        setEditingSelectorTarget?.({ conditionIndex, target });
      }

      const filter = state.filterSearch;
      const columnName = filter?.field || state.selectedColumn?.field || '';

      switch (target) {
        case 'column': {
          // Extract all current conditions and joins
          const preservation = extractMultiConditionPreservation(state);
          if (!preservation) {
            // For first condition (index 0)
            const newValue = PatternBuilder.column('');
            setFilterValue(newValue, onChange, inputRef);
            return;
          }

          const { conditions, joins } = preservation;
          const defaultField = state.filterSearch?.field || '';

          if (conditionIndex === 0) {
            // Edit first column
            const newValue = PatternBuilder.column('');
            setFilterValue(newValue, onChange, inputRef);
          } else {
            // Edit Nth column - build up to previous condition, then add join + #
            const basePattern = PatternBuilder.buildNConditions(
              conditions,
              joins,
              true, // Force multi-column to include all field names
              defaultField,
              { confirmed: false, stopAfterIndex: conditionIndex - 1 }
            );
            const joinOp = joins[conditionIndex - 1] || 'AND';
            const newValue = `${basePattern} #${joinOp.toLowerCase()} #`;
            setFilterValue(newValue, onChange, inputRef);
          }
          break;
        }

        case 'operator': {
          // Extract all current conditions and joins
          const preservation = extractMultiConditionPreservation(state);
          if (!preservation) {
            // Fallback for unexpected state
            const newValue =
              PatternBuilder.columnWithOperatorSelector(columnName);
            setFilterValue(newValue, onChange, inputRef);
            return;
          }

          const { conditions, joins } = preservation;
          const defaultField = state.filterSearch?.field || '';

          // To edit operator at conditionIndex, we need column at conditionIndex
          const cond = conditions[conditionIndex] || { field: columnName };
          const targetField = cond.field || columnName;

          if (conditionIndex === 0) {
            // Edit first operator
            const newValue =
              PatternBuilder.columnWithOperatorSelector(targetField);
            setFilterValue(newValue, onChange, inputRef);
          } else {
            // Edit Nth operator - build up to previous condition, then add join + current column + #
            const basePattern = PatternBuilder.buildNConditions(
              conditions,
              joins,
              true, // Force multi-column to include all field names
              defaultField,
              { confirmed: false, stopAfterIndex: conditionIndex - 1 }
            );

            const joinOp = joins[conditionIndex - 1] || 'AND';
            const newValue = `${basePattern} #${joinOp.toLowerCase()} #${targetField} #`;
            setFilterValue(newValue, onChange, inputRef);
          }
          break;
        }

        case 'value':
        case 'valueTo':
          editValueN(conditionIndex, target);
          break;
      }
    },
    [
      getEffectiveState,
      preservedSearchMode,
      searchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      onChange,
      inputRef,
      setEditingSelectorTarget,
      editValueN,
    ]
  );

  /**
   * Edit a join operator at given index
   * Scalable: supports N joins (joinIndex 0 to N-1)
   *
   * Behavior:
   * - Opens join selector after condition[joinIndex]
   * - Preserves all other conditions and joins
   */
  const editJoin = useCallback(
    (joinIndex: number) => {
      const state = getEffectiveState();

      if (!state.filterSearch) {
        return;
      }

      // Preserve state before edit
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      setEditingSelectorTarget?.({ conditionIndex: joinIndex, target: 'join' });

      preservedFilterRef.current = extractMultiConditionPreservation(state);

      const filter = state.filterSearch;
      const joinParts = getBadgeJoinParts(state);
      if (!joinParts) {
        return;
      }

      const { columnName, conditions, joins, isMultiColumn } = joinParts;
      const activeJoin = joins[joinIndex] || filter.joinOperator || 'AND';
      setCurrentJoinOperator?.(activeJoin);

      // Build pattern with join selector open at specified index
      const newValue = PatternBuilder.withJoinSelectorAtIndex(
        conditions,
        joins,
        isMultiColumn,
        columnName,
        joinIndex
      );

      setFilterValue(newValue, onChange, inputRef);
    },
    [
      getEffectiveState,
      preservedSearchMode,
      searchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      onChange,
      inputRef,
      setCurrentJoinOperator,
      setEditingSelectorTarget,
    ]
  );

  return {
    clearConditionPart,
    clearJoin,
    clearAll,
    editConditionPart,
    editJoin,
    editValueN,
  };
}
