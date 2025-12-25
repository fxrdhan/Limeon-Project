/**
 * useBadgeHandlers Hook
 *
 * Consolidates badge handlers from EnhancedSearchBar into a reusable hook.
 * Provides both:
 * 1. Index-based scalable handlers (new)
 * 2. Legacy handlers for backward compatibility with current useBadgeBuilder
 *
 * This hook eliminates ~500+ lines of handler code from EnhancedSearchBar.tsx
 */

import { RefObject, useCallback } from 'react';
import { EnhancedSearchState, FilterSearch, SearchColumn } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  extractMultiConditionPreservation,
  PreservedFilter,
  setFilterValue,
} from '../utils/handlerHelpers';

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
  /** Filter search callback */
  onFilterSearch?: (filter: FilterSearch | null) => void;
  /** Clear search callback */
  onClearSearch?: () => void;
  /** Available columns */
  columns: SearchColumn[];
  /** Set which condition's column/operator is being edited (for N-condition support) */
  setEditingSelectorTarget?: (
    target: { conditionIndex: number; target: 'column' | 'operator' } | null
  ) => void;
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
  /** Edit a join operator */
  editJoin: (joinIndex: number) => void;

  // ============ Legacy Handlers (for backward compat with useBadgeBuilder) ============
  legacy: {
    onClearColumn: () => void;
    onClearOperator: () => void;
    onClearValue: () => void;
    onClearValueTo: () => void;
    onClearPartialJoin: () => void;
    onClearCondition1Column: () => void;
    onClearCondition1Operator: () => void;
    onClearCondition1Value: () => void;
    onClearCondition1ValueTo: () => void;
    onClearAll: () => void;
    onEditColumn: () => void;
    onEditCondition1Column: () => void;
    onEditOperator: (isSecond?: boolean) => void;
    onEditJoin: () => void;
    onEditValue: () => void;
    onEditValueTo: () => void;
    onEditCondition1Value: () => void;
    onEditCondition1ValueTo: () => void;
  };
}

// ============ Hook Implementation ============

export function useBadgeHandlers(
  props: UseBadgeHandlersProps
): BadgeHandlersReturn {
  const {
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    onClearPreservedState,
    onFilterSearch,
    onClearSearch,
    setEditingSelectorTarget,
  } = props;

  // ============ Helper: Get effective state ============
  const getEffectiveState = useCallback(() => {
    return preservedSearchMode || searchMode;
  }, [preservedSearchMode, searchMode]);

  // ============ CLEAR HANDLERS ============

  /**
   * Clear everything - reset to empty
   */
  const clearAll = useCallback(() => {
    onClearPreservedState();
    if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClearPreservedState, onClearSearch, onChange]);

  /**
   * Clear a specific part of a condition at given index
   */
  const clearConditionPart = useCallback(
    (conditionIndex: number, target: BadgeTarget) => {
      const state = getEffectiveState();

      onClearPreservedState();
      onFilterSearch?.(null);

      // Extract all current conditions and joins
      const preservation = extractMultiConditionPreservation(state);
      if (!preservation) {
        clearAll();
        return;
      }

      const { conditions, joins, isMultiColumn } = preservation;
      const defaultField = state.filterSearch?.field || '';

      // Handle based on target
      switch (target) {
        case 'column': {
          if (conditionIndex === 0) {
            // Clear first column = clear all
            clearAll();
          } else {
            // Clear nth column = go back to join selector after previous condition
            // Remove condition at index and its preceding join
            conditions.splice(conditionIndex);
            if (joins.length >= conditionIndex) {
              joins.splice(conditionIndex - 1);
            }

            // Build pattern with conditions 0 to Index-1, then add trailing # for join selector
            const newValue = PatternBuilder.buildNConditions(
              conditions,
              joins,
              !!isMultiColumn,
              defaultField,
              { confirmed: false, openSelector: true }
            );
            setFilterValue(newValue, onChange, inputRef);
          }
          break;
        }

        case 'operator': {
          // Clear operator and everything after it in the targeted condition
          conditions[conditionIndex].operator = undefined;
          conditions[conditionIndex].value = undefined;
          conditions[conditionIndex].valueTo = undefined;

          // Remove subsequent conditions and joins
          if (conditions.length > conditionIndex + 1) {
            conditions.splice(conditionIndex + 1);
          }
          if (joins.length > conditionIndex) {
            joins.splice(conditionIndex);
          }

          // Rebuild with trailing # for operator selector
          const newValueOp = PatternBuilder.buildNConditions(
            conditions,
            joins,
            !!isMultiColumn,
            defaultField,
            { confirmed: false, openSelector: true }
          );
          setFilterValue(newValueOp, onChange, inputRef);
          break;
        }

        case 'value': {
          // Clear value and everything after it in the targeted condition
          conditions[conditionIndex].value = undefined;
          conditions[conditionIndex].valueTo = undefined;

          // Remove subsequent conditions and joins
          if (conditions.length > conditionIndex + 1) {
            conditions.splice(conditionIndex + 1);
          }
          if (joins.length > conditionIndex) {
            joins.splice(conditionIndex);
          }

          // Rebuild pattern (builder will add trailing space for value input)
          const newValueVal = PatternBuilder.buildNConditions(
            conditions,
            joins,
            !!isMultiColumn,
            defaultField,
            { confirmed: false, openSelector: false }
          );
          setFilterValue(newValueVal, onChange, inputRef, {
            focus: true,
            cursorAtEnd: true,
          });
          break;
        }

        case 'valueTo': {
          // Clear only valueTo of the targeted condition, keep it unconfirmed
          conditions[conditionIndex].valueTo = undefined;

          // Keep all conditions intact - just clear valueTo
          const newValueValTo = PatternBuilder.buildNConditions(
            conditions,
            joins,
            !!isMultiColumn,
            defaultField,
            { confirmed: false, openSelector: false }
          );

          // Special case for Between operator: if we just cleared valueTo,
          // we might want the cursor after " #to "
          let finalPattern = newValueValTo;
          if (conditions[conditionIndex].operator === 'inRange') {
            finalPattern = `${newValueValTo} #to `;
          }

          setFilterValue(finalPattern, onChange, inputRef, {
            focus: true,
            cursorAtEnd: true,
          });
          break;
        }
      }
    },
    [
      getEffectiveState,
      clearAll,
      onClearPreservedState,
      onFilterSearch,
      onChange,
      inputRef,
    ]
  );

  /**
   * Clear a join operator at given index
   * Scalable: supports N joins (joinIndex 0 to N-1)
   *
   * Behavior:
   * - joinIndex 0: Clear first join, return to confirmed single condition
   * - joinIndex N: Keep conditions 0 to N, clear everything after
   */
  const clearJoin = useCallback(
    (joinIndex: number) => {
      const state = getEffectiveState();
      onClearPreservedState();

      if (!state.filterSearch) {
        clearAll();
        return;
      }

      const filter = state.filterSearch;
      const columnName = filter.field;

      // Extract all conditions from filter
      const conditions: Array<{
        field?: string;
        operator: string;
        value: string;
        valueTo?: string;
      }> = [];

      // Get conditions from multi-condition filter or build from single + partial
      if (filter.isMultiCondition && filter.conditions) {
        filter.conditions.forEach(cond => {
          conditions.push({
            field: cond.field,
            operator: cond.operator,
            value: cond.value,
            valueTo: cond.valueTo,
          });
        });
      } else {
        // First condition from filter itself
        conditions.push({
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          valueTo: filter.valueTo,
        });

        // Add partial conditions if any
        if (state.partialConditions) {
          state.partialConditions.forEach((partial, idx) => {
            if (idx > 0 && partial.operator) {
              conditions.push({
                field: partial.field,
                operator: partial.operator,
                value: partial.value || '',
                valueTo: partial.valueTo,
              });
            }
          });
        }
      }

      // Extract joins
      const joins: ('AND' | 'OR')[] = [];
      if (filter.joinOperator) {
        joins.push(filter.joinOperator);
      } else if (state.partialJoin) {
        joins.push(state.partialJoin);
      }
      if (state.joins) {
        state.joins.forEach((j, i) => {
          if (i >= joins.length) joins.push(j);
        });
      }

      const isMultiColumn = filter.isMultiColumn || false;

      // Build pattern with conditions 0 to Index, then add trailing # for join selector
      const newValue = PatternBuilder.buildNConditions(
        conditions.slice(0, joinIndex + 1),
        joins.slice(0, joinIndex),
        !!isMultiColumn,
        columnName || '',
        { confirmed: false, openSelector: true }
      );

      setFilterValue(newValue, onChange, inputRef);
    },
    [getEffectiveState, onClearPreservedState, clearAll, onChange, inputRef]
  );

  // ============ EDIT HANDLERS ============

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

          const { conditions, joins, isMultiColumn } = preservation;
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
              !!isMultiColumn,
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

          const { conditions, joins, isMultiColumn } = preservation;
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
              !!isMultiColumn,
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
          // Value editing is handled via inline edit in EnhancedSearchBar
          // This handler just sets up the state (which was done above by setting preservedFilterRef)
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

      preservedFilterRef.current = extractMultiConditionPreservation(state);

      const filter = state.filterSearch;
      const columnName = filter.field;

      // Extract all conditions from filter
      const conditions: Array<{
        field?: string;
        operator: string;
        value: string;
        valueTo?: string;
      }> = [];

      // Get conditions from multi-condition filter or build from single + partial
      if (filter.isMultiCondition && filter.conditions) {
        filter.conditions.forEach(cond => {
          conditions.push({
            field: cond.field,
            operator: cond.operator,
            value: cond.value,
            valueTo: cond.valueTo,
          });
        });
      } else {
        // First condition from filter itself
        conditions.push({
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          valueTo: filter.valueTo,
        });

        // Add partial conditions if any
        if (state.partialConditions) {
          state.partialConditions.forEach((partial, idx) => {
            if (idx > 0 && partial.operator) {
              conditions.push({
                field: partial.field,
                operator: partial.operator,
                value: partial.value || '',
                valueTo: partial.valueTo,
              });
            }
          });
        }
      }

      // Extract joins
      const joins: ('AND' | 'OR')[] = [];
      if (filter.joinOperator) {
        joins.push(filter.joinOperator);
      } else if (state.partialJoin) {
        joins.push(state.partialJoin);
      }
      if (state.joins) {
        state.joins.forEach((j, i) => {
          if (i >= joins.length) joins.push(j);
        });
      }

      const isMultiColumn = filter.isMultiColumn || false;

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
    ]
  );

  // ============ LEGACY HANDLERS ============
  // These map to the new index-based handlers for backward compatibility

  const legacyHandlers = {
    onClearColumn: useCallback(
      () => clearConditionPart(0, 'column'),
      [clearConditionPart]
    ),
    onClearOperator: useCallback(
      () => clearConditionPart(0, 'operator'),
      [clearConditionPart]
    ),
    onClearValue: useCallback(
      () => clearConditionPart(0, 'value'),
      [clearConditionPart]
    ),
    onClearValueTo: useCallback(
      () => clearConditionPart(0, 'valueTo'),
      [clearConditionPart]
    ),
    onClearPartialJoin: useCallback(() => clearJoin(0), [clearJoin]),
    onClearCondition1Column: useCallback(
      () => clearConditionPart(1, 'column'),
      [clearConditionPart]
    ),
    onClearCondition1Operator: useCallback(
      () => clearConditionPart(1, 'operator'),
      [clearConditionPart]
    ),
    onClearCondition1Value: useCallback(
      () => clearConditionPart(1, 'value'),
      [clearConditionPart]
    ),
    onClearCondition1ValueTo: useCallback(
      () => clearConditionPart(1, 'valueTo'),
      [clearConditionPart]
    ),
    onClearAll: clearAll,
    onEditColumn: useCallback(
      () => editConditionPart(0, 'column'),
      [editConditionPart]
    ),
    onEditCondition1Column: useCallback(
      () => editConditionPart(1, 'column'),
      [editConditionPart]
    ),
    onEditOperator: useCallback(
      (isSecond?: boolean) => editConditionPart(isSecond ? 1 : 0, 'operator'),
      [editConditionPart]
    ),
    onEditJoin: useCallback(() => editJoin(0), [editJoin]),
    onEditValue: useCallback(
      () => editConditionPart(0, 'value'),
      [editConditionPart]
    ),
    onEditValueTo: useCallback(
      () => editConditionPart(0, 'valueTo'),
      [editConditionPart]
    ),
    onEditCondition1Value: useCallback(
      () => editConditionPart(1, 'value'),
      [editConditionPart]
    ),
    onEditCondition1ValueTo: useCallback(
      () => editConditionPart(1, 'valueTo'),
      [editConditionPart]
    ),
  };

  return {
    clearConditionPart,
    clearJoin,
    clearAll,
    editConditionPart,
    editJoin,
    legacy: legacyHandlers,
  };
}
