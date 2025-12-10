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

import { useCallback, RefObject } from 'react';
import { EnhancedSearchState, FilterSearch, SearchColumn } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  setFilterValue,
  extractMultiConditionPreservation,
  PreservedFilter,
  getFirstCondition,
  getJoinOperator,
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
    onClearSecondColumn: () => void;
    onClearSecondOperator: () => void;
    onClearSecondValue: () => void;
    onClearSecondValueTo: () => void;
    onClearAll: () => void;
    onEditColumn: () => void;
    onEditSecondColumn: () => void;
    onEditOperator: (isSecond?: boolean) => void;
    onEditJoin: () => void;
    onEditValue: () => void;
    onEditValueTo: () => void;
    onEditSecondValue: () => void;
    onEditSecondValueTo: () => void;
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
      const filter = state.filterSearch;

      if (!filter) {
        clearAll();
        return;
      }

      onClearPreservedState();
      onFilterSearch?.(null);

      const columnName = filter.field;

      // Handle based on target
      switch (target) {
        case 'column':
          if (conditionIndex === 0) {
            // Clear first column = clear all
            clearAll();
          } else {
            // Clear nth column = go back to join + column selector
            const firstCondition = getFirstCondition(filter);
            const joinOp = getJoinOperator(filter, state);
            if (joinOp) {
              const newValue = PatternBuilder.partialMulti(
                columnName,
                firstCondition.operator,
                firstCondition.value,
                joinOp
              );
              setFilterValue(newValue, onChange, inputRef);
            } else {
              clearAll();
            }
          }
          break;

        case 'operator':
          if (conditionIndex === 0) {
            // Clear first operator = keep column, show operator selector
            const newValue =
              PatternBuilder.columnWithOperatorSelector(columnName);
            setFilterValue(newValue, onChange, inputRef);
          } else {
            // Clear nth operator = keep up to join + column, show operator selector
            const firstCondition = getFirstCondition(filter);
            const joinOp = getJoinOperator(filter, state);
            const secondColField =
              filter.conditions?.[conditionIndex]?.field ||
              state.secondColumn?.field ||
              columnName;
            if (joinOp) {
              const newValue = PatternBuilder.multiColumnPartial(
                columnName,
                firstCondition.operator,
                firstCondition.value,
                joinOp,
                secondColField
              );
              setFilterValue(newValue, onChange, inputRef);
            }
          }
          break;

        case 'value':
          if (conditionIndex === 0) {
            // Clear first value = keep column + operator
            const operator = filter.isMultiCondition
              ? filter.conditions?.[0]?.operator
              : filter.operator;
            const newValue = PatternBuilder.columnOperator(
              columnName,
              operator || ''
            );
            setFilterValue(newValue, onChange, inputRef, {
              focus: true,
              cursorAtEnd: true,
            });
          } else {
            // Clear nth value = keep up to join + column + operator
            const firstCondition = getFirstCondition(filter);
            const joinOp = getJoinOperator(filter, state);
            const secondColField =
              filter.conditions?.[conditionIndex]?.field ||
              state.secondColumn?.field ||
              columnName;
            const secondOp =
              filter.conditions?.[conditionIndex]?.operator ||
              state.secondOperator;
            if (joinOp && secondOp) {
              const newValue = PatternBuilder.multiColumnWithOperator(
                columnName,
                firstCondition.operator,
                firstCondition.value,
                joinOp,
                secondColField,
                secondOp,
                firstCondition.valueTo
              );
              setFilterValue(newValue, onChange, inputRef);
            }
          }
          break;

        case 'valueTo':
          // Clear valueTo (for Between operator) - keep value, clear valueTo
          // This is handled specially - transition to edit mode for value
          if (conditionIndex === 0) {
            const fromValue = filter.value;
            if (fromValue) {
              const newPattern = `#${columnName} #${filter.operator} ${fromValue}##`;
              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);
            }
          } else {
            // For second condition valueTo
            const conditions = filter.conditions;
            if (conditions && conditions.length > conditionIndex) {
              const cond = conditions[conditionIndex];
              const firstCondition = conditions[0];
              const joinOp = filter.joinOperator || 'AND';
              const isMultiColumn = filter.isMultiColumn;

              const firstPart = firstCondition.valueTo
                ? `#${firstCondition.field || columnName} #${firstCondition.operator} ${firstCondition.value} #to ${firstCondition.valueTo}`
                : `#${firstCondition.field || columnName} #${firstCondition.operator} ${firstCondition.value}`;

              let newPattern: string;
              if (isMultiColumn) {
                newPattern = `${firstPart} #${joinOp.toLowerCase()} #${cond.field || columnName} #${cond.operator} ${cond.value}##`;
              } else {
                newPattern = `${firstPart} #${joinOp.toLowerCase()} #${cond.operator} ${cond.value}##`;
              }
              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);
            }
          }
          break;
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
   * Note: joinIndex is for future N-condition support when we have N-1 joins
   */
  const clearJoin = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_joinIndex: number) => {
      const state = getEffectiveState();
      onClearPreservedState();

      if (!state.filterSearch) {
        clearAll();
        return;
      }

      const columnName = state.filterSearch.field;
      const firstCondition = getFirstCondition(state.filterSearch);

      // Back to confirmed single-condition
      let newValue: string;
      if (firstCondition.operator === 'inRange' && firstCondition.valueTo) {
        newValue = PatternBuilder.betweenConfirmed(
          columnName,
          firstCondition.value,
          firstCondition.valueTo
        );
      } else {
        newValue = PatternBuilder.confirmed(
          columnName,
          firstCondition.operator,
          firstCondition.value
        );
      }

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

      const filter = state.filterSearch;
      const columnName = filter?.field || state.selectedColumn?.field || '';

      switch (target) {
        case 'column':
          if (conditionIndex === 0) {
            // Edit first column - open column selector
            const newValue = PatternBuilder.column('');
            setFilterValue(newValue, onChange, inputRef);
          } else {
            // Edit nth column - open column selector for that position
            if (filter) {
              const firstCondition = getFirstCondition(filter);
              const joinOp = getJoinOperator(filter, state);
              if (joinOp) {
                // Build pattern to show column selector after join
                const newValue = PatternBuilder.partialMultiColumnWithValueTo(
                  columnName,
                  firstCondition.operator,
                  firstCondition.value,
                  firstCondition.valueTo,
                  joinOp
                );
                setFilterValue(newValue, onChange, inputRef);
              }
            }
          }
          break;

        case 'operator':
          if (conditionIndex === 0) {
            // Edit first operator - open operator selector
            const newValue =
              PatternBuilder.columnWithOperatorSelector(columnName);
            setFilterValue(newValue, onChange, inputRef);
          } else {
            // Edit nth operator - open operator selector for that condition
            if (filter) {
              const firstCondition = getFirstCondition(filter);
              const joinOp = getJoinOperator(filter, state);
              const secondColField =
                filter.conditions?.[conditionIndex]?.field ||
                state.secondColumn?.field ||
                columnName;

              if (joinOp) {
                let newValue: string;
                if (
                  firstCondition.operator === 'inRange' &&
                  firstCondition.valueTo
                ) {
                  newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #to ${firstCondition.valueTo} #${joinOp.toLowerCase()} #${secondColField} #`;
                } else {
                  newValue = PatternBuilder.multiColumnPartial(
                    columnName,
                    firstCondition.operator,
                    firstCondition.value,
                    joinOp,
                    secondColField
                  );
                }
                setFilterValue(newValue, onChange, inputRef);
              }
            }
          }
          break;

        case 'value':
        case 'valueTo':
          // Value editing is handled via inline edit in EnhancedSearchBar
          // This handler just sets up the state
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
    ]
  );

  /**
   * Edit a join operator at given index
   * Note: joinIndex is for future N-condition support when we have N-1 joins
   */
  const editJoin = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_joinIndex: number) => {
      const state = getEffectiveState();

      if (!state.filterSearch) {
        return;
      }

      // Preserve state before edit
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      preservedFilterRef.current = extractMultiConditionPreservation(state);

      const columnName = state.filterSearch.field;
      const firstCondition = getFirstCondition(state.filterSearch);

      // Build pattern to show join selector
      const newValue = PatternBuilder.withJoinSelector(
        columnName,
        firstCondition.operator,
        firstCondition.value,
        firstCondition.valueTo
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
    onClearSecondColumn: useCallback(
      () => clearConditionPart(1, 'column'),
      [clearConditionPart]
    ),
    onClearSecondOperator: useCallback(
      () => clearConditionPart(1, 'operator'),
      [clearConditionPart]
    ),
    onClearSecondValue: useCallback(
      () => clearConditionPart(1, 'value'),
      [clearConditionPart]
    ),
    onClearSecondValueTo: useCallback(
      () => clearConditionPart(1, 'valueTo'),
      [clearConditionPart]
    ),
    onClearAll: clearAll,
    onEditColumn: useCallback(
      () => editConditionPart(0, 'column'),
      [editConditionPart]
    ),
    onEditSecondColumn: useCallback(
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
    onEditSecondValue: useCallback(
      () => editConditionPart(1, 'value'),
      [editConditionPart]
    ),
    onEditSecondValueTo: useCallback(
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
