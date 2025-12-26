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
import { EnhancedSearchState } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  extractMultiConditionPreservation,
  PreservedFilter,
  setFilterValue,
} from '../utils/handlerHelpers';
import { restoreConfirmedPattern } from '../utils/patternRestoration';

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

      // Extract all current conditions and joins
      const preservation = extractMultiConditionPreservation(state);
      if (!preservation) {
        clearAll();
        return;
      }

      const { conditions, joins } = preservation;
      const defaultField = state.filterSearch?.field || '';

      // Handle based on target
      switch (target) {
        case 'column': {
          if (conditionIndex === 0) {
            // Clear first column = clear all
            clearAll();
          } else {
            // Clear nth column = keep preceding join and open column selector
            // Remove condition at index and everything after
            conditions.splice(conditionIndex);

            // Build pattern with conditions 0 to conditionIndex-1
            // IMPORTANT: Force isMultiColumn=true so all field names are included,
            // which is needed when opening column selector for the next condition
            const basePattern = PatternBuilder.buildNConditions(
              conditions,
              joins.slice(0, conditionIndex - 1), // joins for connections between remaining conditions
              true, // Force multi-column to include all field names
              defaultField,
              { confirmed: false, openSelector: false }
            );

            // Add the preserved join (the one before deleted condition) + column selector
            const preservedJoin = joins[conditionIndex - 1] || 'AND';
            const newValue = `${basePattern} #${preservedJoin.toLowerCase()} #`;

            setFilterValue(newValue, onChange, inputRef);
          }
          break;
        }

        case 'operator': {
          // Check if condition exists - it might be a partial condition not in the array
          if (conditionIndex >= conditions.length) {
            // Partial condition being built - check if we have column info from partialConditions
            const partialConds = state.partialConditions || [];
            const partialCond = partialConds[conditionIndex];
            const partialField =
              partialCond?.field ||
              partialCond?.column?.field ||
              state.selectedColumn?.field;

            // Keep all complete conditions and their joins
            const joinsToKeep = joins.slice(0, conditionIndex - 1);
            const conditionsToKeep = conditions.slice(0, conditionIndex);

            if (conditionsToKeep.length === 0 && !partialField) {
              clearAll();
              return;
            }

            // Build pattern with existing conditions
            const basePattern = PatternBuilder.buildNConditions(
              conditionsToKeep,
              joinsToKeep,
              true, // Force multi-column to include all field names
              defaultField,
              { confirmed: false, openSelector: false }
            );

            const preservedJoin = joins[conditionIndex - 1] || 'AND';

            // If we have a partial field (column was selected), keep it and open operator selector
            // Otherwise, go back to column selector
            let newValuePartial: string;
            if (partialField) {
              // Keep column, open operator selector: basePattern #join #column #
              newValuePartial = `${basePattern} #${preservedJoin.toLowerCase()} #${partialField} #`;
            } else {
              // No column info, go back to column selector: basePattern #join #
              newValuePartial = `${basePattern} #${preservedJoin.toLowerCase()} #`;
            }

            setFilterValue(newValuePartial, onChange, inputRef);
            return;
          }

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
          // IMPORTANT: Force isMultiColumn=true so all field names are included
          // This ensures the parser correctly identifies each condition's column
          const newValueOp = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true, // Force multi-column to include all field names
            defaultField,
            { confirmed: false, openSelector: true }
          );
          setFilterValue(newValueOp, onChange, inputRef);
          break;
        }

        case 'value': {
          // Check if condition exists
          if (
            conditionIndex >= conditions.length ||
            !conditions[conditionIndex]
          ) {
            // Partial condition - shouldn't happen for value, but handle gracefully
            return;
          }

          // Clear value and valueTo of the targeted condition
          // BUT keep all other conditions intact (don't remove subsequent conditions)
          conditions[conditionIndex].value = undefined;
          conditions[conditionIndex].valueTo = undefined;

          // Rebuild pattern with all conditions preserved
          // Force isMultiColumn=true so all field names are included
          const newValueVal = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true, // Force multi-column to include all field names
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
          // Check if condition exists
          if (
            conditionIndex >= conditions.length ||
            !conditions[conditionIndex]
          ) {
            // Partial condition - shouldn't happen for valueTo, but handle gracefully
            return;
          }

          // Clear only valueTo of the targeted condition, keep it unconfirmed
          conditions[conditionIndex].valueTo = undefined;

          // Keep all conditions intact - just clear valueTo
          // Force isMultiColumn=true so all field names are included
          const newValueValTo = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true, // Force multi-column to include all field names
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
    [getEffectiveState, clearAll, onClearPreservedState, onChange, inputRef]
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
        onChange({
          target: { value: restoredPattern },
        } as React.ChangeEvent<HTMLInputElement>);

        // Note: we don't clear preservedSearchMode here because we're about to enter inline edit
      }

      // Get current value to edit
      let currentValue = '';
      if (
        state.filterSearch.isMultiCondition &&
        state.filterSearch.conditions
      ) {
        const cond = state.filterSearch.conditions[conditionIndex];
        currentValue = target === 'value' ? cond.value : cond.valueTo || '';
      } else if (conditionIndex === 0) {
        currentValue =
          target === 'value'
            ? state.filterSearch.value
            : state.filterSearch.valueTo || '';
      }

      if (!currentValue) return;

      // Enter inline editing mode
      setEditingBadge?.({
        conditionIndex,
        field: target,
        value: currentValue,
      });
    },
    [
      getEffectiveState,
      preservedSearchMode,
      searchMode,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
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

  return {
    clearConditionPart,
    clearJoin,
    clearAll,
    editConditionPart,
    editJoin,
    editValueN,
  };
}
