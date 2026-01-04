/**
 * Hook for handling column and operator selection logic
 *
 * This hook orchestrates selection handlers extracted to:
 * - selection/useColumnSelection.ts - Column selection helpers
 * - selection/useOperatorSelection.ts - Operator selection helpers
 */

import { useCallback, type RefObject } from 'react';
import { SEARCH_CONSTANTS } from '../constants';
import type { JoinOperator } from '../operators';
import type {
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from '../types';
import type { PreservedFilter } from '../utils/handlerHelpers';
import {
  extractMultiConditionPreservation,
  setFilterValue,
} from '../utils/handlerHelpers';
import { isOperatorCompatibleWithColumn } from '../utils/operatorUtils';
import { PatternBuilder } from '../utils/PatternBuilder';

// Import from modular selection hooks
import {
  getActiveConditionIndex,
  handleColumnSelectMultiColumn,
  handleColumnSelectWithPreservedFilter,
  handleOperatorSelectEditFirst,
  handleOperatorSelectEditSecond,
  handleOperatorSelectNormal,
  handleOperatorSelectSecond,
  isBuildingConditionN,
} from './selection';

// Re-export helpers for external use
export { getActiveConditionIndex, isBuildingConditionN } from './selection';

// ============================================================================
// Types
// ============================================================================

export interface EditingBadgeState {
  conditionIndex: number;
  field: 'value' | 'valueTo';
  value: string;
}

export interface SelectionHandlersProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  preservedFilterRef: RefObject<PreservedFilter | null>;
  memoizedColumns: SearchColumn[];
  isEditingSecondOperator: boolean;
  setIsEditingSecondOperator: (editing: boolean) => void;
  setEditingBadge: (badge: EditingBadgeState | null) => void;
}

export interface SelectionHandlersReturn {
  handleColumnSelect: (column: SearchColumn) => void;
  handleOperatorSelect: (operator: FilterOperator) => void;
  handleJoinOperatorSelect: (joinOp: JoinOperator) => void;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSelectionHandlers(
  props: SelectionHandlersProps
): SelectionHandlersReturn {
  const {
    value,
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    memoizedColumns,
    isEditingSecondOperator,
    setIsEditingSecondOperator,
    setEditingBadge,
  } = props;

  // ============================================================================
  // Column Selection Handler
  // ============================================================================
  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      const filter = searchMode.filterSearch;
      const activeIdx = getActiveConditionIndex(searchMode);

      // CASE 0-EDIT: EDITING an existing condition's column (N >= 2)
      if (
        activeIdx >= 2 &&
        searchMode.showColumnSelector &&
        preservedFilterRef.current?.conditions?.[activeIdx]
      ) {
        const preserved = preservedFilterRef.current!;
        const conditions = preserved.conditions!;
        const joins = preserved.joins || [];
        const defaultField = conditions[0]?.field || filter?.field || '';

        const updatedConditions = conditions.map((cond, idx) => {
          if (idx === activeIdx) {
            return {
              field: column.field,
              operator: cond.operator || '',
              value: cond.value || '',
              valueTo: cond.valueTo,
            };
          }
          return {
            field: cond.field,
            operator: cond.operator || '',
            value: cond.value || '',
            valueTo: cond.valueTo,
          };
        });

        const editedCondOp = conditions[activeIdx]?.operator;
        const isOpCompatible = isOperatorCompatibleWithColumn(
          column,
          editedCondOp || ''
        );

        if (isOpCompatible && conditions[activeIdx]?.value) {
          const newValue = PatternBuilder.buildNConditions(
            updatedConditions,
            joins,
            true,
            defaultField,
            { confirmed: true }
          );

          preservedFilterRef.current = null;
          setPreservedSearchMode(null);
          setFilterValue(newValue, onChange, inputRef);
        } else {
          const conditionsUpToEdit = updatedConditions
            .slice(0, activeIdx)
            .map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            }));
          const joinsUpToEdit = joins.slice(0, activeIdx - 1);
          const joinForEdit = joins[activeIdx - 1] || 'AND';

          const basePattern = PatternBuilder.buildNConditions(
            conditionsUpToEdit,
            joinsUpToEdit,
            true,
            defaultField,
            { confirmed: false }
          );

          const newValue = `${basePattern} #${joinForEdit.toLowerCase()} #${column.field} #`;

          if (preserved.conditions?.[activeIdx]) {
            preserved.conditions[activeIdx].field = column.field;
          }

          setFilterValue(newValue, onChange, inputRef);
        }

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 0a: Adding NEW condition to existing multi-condition filter
      const existingConditionsCount = filter?.conditions?.length ?? 0;
      const partialConditionsCount = searchMode.partialConditions?.length ?? 0;

      const hasMultipleCompleteConditions =
        existingConditionsCount >= 2 ||
        (partialConditionsCount >= 3 &&
          searchMode.partialConditions?.[0]?.value &&
          searchMode.partialConditions?.[1]?.value);

      const isAddingNewConditionToMulti =
        hasMultipleCompleteConditions &&
        activeIdx >= 2 &&
        searchMode.showColumnSelector &&
        !preservedFilterRef.current?.conditions?.[activeIdx];

      if (isAddingNewConditionToMulti) {
        const existingConditions =
          filter?.conditions ||
          (searchMode.partialConditions || [])
            .filter(c => c.operator && c.value)
            .map(c => ({
              field: c.field || '',
              column: c.column!,
              operator: c.operator!,
              value: c.value!,
              valueTo: c.valueTo,
            }));

        const existingJoins = filter?.joins ||
          searchMode.joins?.slice(0, existingConditions.length - 1) || [
            searchMode.partialJoin || 'AND',
          ];
        const defaultField =
          existingConditions[0]?.field || filter?.field || '';
        const newJoinIndex = existingConditions.length - 1;
        const newJoin =
          searchMode.joins?.[newJoinIndex] || searchMode.partialJoin || 'AND';
        const isMultiColumn =
          filter?.isMultiColumn ||
          existingConditions.some(
            (c, i) => i > 0 && c.field !== existingConditions[0]?.field
          );

        const basePattern = PatternBuilder.buildNConditions(
          existingConditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            valueTo: c.valueTo,
          })),
          existingJoins,
          isMultiColumn,
          defaultField,
          { confirmed: false }
        );

        const newValue = `${basePattern} #${newJoin.toLowerCase()} #${column.field} #`;

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        setIsEditingSecondOperator(false);

        setFilterValue(newValue, onChange, inputRef);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 0b: MULTI-COLUMN - selecting column for condition[1] after join
      if (
        isBuildingConditionN(searchMode) &&
        searchMode.filterSearch &&
        searchMode.partialJoin &&
        !isAddingNewConditionToMulti
      ) {
        handleColumnSelectMultiColumn(
          column,
          searchMode,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingSecondOperator,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 1: Preserved filter from edit column
      if (preservedFilterRef.current) {
        handleColumnSelectWithPreservedFilter(
          column,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          memoizedColumns,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 2: Normal column selection
      const newValue = PatternBuilder.columnWithOperatorSelector(column.field);
      setPreservedSearchMode(null);
      setFilterValue(newValue, onChange, inputRef);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [
      onChange,
      inputRef,
      searchMode,
      memoizedColumns,
      preservedSearchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      setIsEditingSecondOperator,
    ]
  );

  // ============================================================================
  // Operator Selection Handler
  // ============================================================================
  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const columnMatch = value.match(/^#([^:\s]+)/);
      if (!columnMatch) return;

      const columnName = columnMatch[1];
      const filter = searchMode.filterSearch;
      const activeIdx = getActiveConditionIndex(searchMode);

      // CASE 1: EDITING second operator
      if (
        isEditingSecondOperator &&
        preservedFilterRef.current?.joins?.[0] &&
        (preservedFilterRef.current.joins[0] === 'AND' ||
          preservedFilterRef.current.joins[0] === 'OR')
      ) {
        handleOperatorSelectEditSecond(
          operator,
          columnName,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingSecondOperator,
          setEditingBadge,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 2: EDITING first operator with preserved filter
      if (preservedFilterRef.current && !isBuildingConditionN(searchMode)) {
        handleOperatorSelectEditFirst(
          operator,
          columnName,
          preservedFilterRef,
          setPreservedSearchMode,
          setEditingBadge,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 2b-EDIT: EDITING condition N's operator (N >= 2)
      if (
        activeIdx >= 2 &&
        searchMode.showOperatorSelector &&
        preservedFilterRef.current?.conditions?.[activeIdx]
      ) {
        const preserved = preservedFilterRef.current!;
        const conditions = preserved.conditions!;
        const joins = preserved.joins || [];
        const defaultField =
          conditions[0]?.field || searchMode.filterSearch?.field || '';

        const updatedConditions = conditions.map((cond, idx) => {
          if (idx === activeIdx) {
            return {
              field: cond.field || '',
              operator: operator.value,
              value: cond.value || '',
              valueTo: cond.valueTo,
            };
          }
          return {
            field: cond.field || '',
            operator: cond.operator || '',
            value: cond.value || '',
            valueTo: cond.valueTo,
          };
        });

        const newValue = PatternBuilder.buildNConditions(
          updatedConditions,
          joins,
          preserved.isMultiColumn || true,
          defaultField,
          { confirmed: true }
        );

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        setFilterValue(newValue, onChange, inputRef);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 3a: Adding operator to NEW condition (N+1)
      const existingConditionsCount = filter?.conditions?.length ?? 0;
      const partialConditionsCount = searchMode.partialConditions?.length ?? 0;
      const hasMultipleCompleteConditions =
        existingConditionsCount >= 2 ||
        (partialConditionsCount >= 3 &&
          searchMode.partialConditions?.[0]?.value &&
          searchMode.partialConditions?.[1]?.value);

      const lastPartialCondition =
        searchMode.partialConditions?.[partialConditionsCount - 1];

      const isAddingOperatorToNewCondition =
        hasMultipleCompleteConditions &&
        activeIdx >= 2 &&
        searchMode.showOperatorSelector &&
        !preservedFilterRef.current?.conditions?.[activeIdx] &&
        (lastPartialCondition?.column ||
          (searchMode.selectedColumn && partialConditionsCount >= 3));

      if (isAddingOperatorToNewCondition) {
        const existingConditions =
          filter?.conditions ||
          (searchMode.partialConditions || [])
            .filter(c => c.operator && c.value)
            .map(c => ({
              field: c.field || '',
              column: c.column!,
              operator: c.operator!,
              value: c.value!,
              valueTo: c.valueTo,
            }));

        const existingJoins = filter?.joins ||
          searchMode.joins?.slice(0, existingConditions.length - 1) || [
            searchMode.partialJoin || 'AND',
          ];
        const isMultiColumn =
          filter?.isMultiColumn ||
          existingConditions.some(
            (c, i) => i > 0 && c.field !== existingConditions[0]?.field
          );
        const defaultField =
          existingConditions[0]?.field || filter?.field || '';
        const newJoinIndex = existingConditions.length - 1;
        const newJoin =
          searchMode.joins?.[newJoinIndex] || searchMode.partialJoin || 'AND';

        let newColumnField =
          lastPartialCondition?.column?.field ||
          searchMode.selectedColumn?.field ||
          '';

        if (!newColumnField) {
          const colFromValueMatch = value.match(
            /#(?:and|or)\s+#([^\s#]+)\s+#\s*$/i
          );
          if (colFromValueMatch) {
            newColumnField = colFromValueMatch[1];
          }
        }

        if (newColumnField) {
          const basePattern = PatternBuilder.buildNConditions(
            existingConditions.map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            })),
            existingJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );

          const newValue = `${basePattern} #${newJoin.toLowerCase()} #${newColumnField} #${operator.value} `;

          preservedFilterRef.current = null;
          setPreservedSearchMode(null);
          setIsEditingSecondOperator(false);

          setFilterValue(newValue, onChange, inputRef);

          setTimeout(() => {
            inputRef?.current?.focus();
          }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
          return;
        }
      }

      // CASE 3b: Selecting operator for condition[1]
      if (
        activeIdx === 1 &&
        isBuildingConditionN(searchMode) &&
        searchMode.partialJoin &&
        searchMode.filterSearch?.value
      ) {
        handleOperatorSelectSecond(operator, searchMode, onChange, inputRef);
        return;
      }

      // CASE 4: Normal operator selection
      handleOperatorSelectNormal(operator, columnName, onChange, inputRef);
    },
    [
      value,
      onChange,
      inputRef,
      searchMode,
      isEditingSecondOperator,
      preservedFilterRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      setEditingBadge,
    ]
  );

  // ============================================================================
  // Join Operator Selection Handler
  // ============================================================================
  const handleJoinOperatorSelect = useCallback(
    (joinOp: JoinOperator) => {
      const preserved = preservedFilterRef.current;
      const joinOperator = joinOp.value.toUpperCase() as 'AND' | 'OR';
      const editingJoinIndex = searchMode.editingJoinIndex;

      let newValue: string;

      // CASE 1: Editing join at specific index with preserved N-conditions
      // [FIX] Skip to CASE 2 if preserved conditions don't have valueTo but filter does
      // This happens when join selector is opened for inRange operator
      const filterHasValueTo =
        searchMode.filterSearch?.valueTo ||
        searchMode.filterSearch?.conditions?.[0]?.valueTo;
      const preservedHasValueTo = preserved?.conditions?.[0]?.valueTo;
      const shouldUseFiterInstead =
        filterHasValueTo &&
        !preservedHasValueTo &&
        searchMode.filterSearch?.isConfirmed;

      if (
        preserved &&
        preserved.conditions &&
        preserved.conditions.length > 0 &&
        !shouldUseFiterInstead
      ) {
        const conditions = preserved.conditions;
        const defaultField = conditions[0]?.field || '';
        const isMultiColumn = preserved.isMultiColumn || false;

        const newJoins: ('AND' | 'OR')[] = [...(preserved.joins || [])];
        const targetJoinIndex = editingJoinIndex ?? 0;

        while (newJoins.length <= targetJoinIndex) {
          newJoins.push('AND');
        }
        newJoins[targetJoinIndex] = joinOperator;

        const allConditionsComplete = conditions.every(
          c => c.value && c.value.trim() !== ''
        );

        if (allConditionsComplete) {
          newValue = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator || '',
              value: c.value || '',
              valueTo: c.valueTo,
            })),
            newJoins,
            isMultiColumn,
            defaultField,
            { confirmed: true }
          );
        } else {
          newValue = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator || '',
              value: c.value || '',
              valueTo: c.valueTo,
            })),
            newJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );
        }

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      } else if (searchMode.filterSearch?.isConfirmed) {
        // CASE 2: Normal join selection after confirmed filter
        const filter = searchMode.filterSearch;

        const extraction = extractMultiConditionPreservation(searchMode);
        preservedFilterRef.current = extraction;

        if (
          filter.isMultiCondition &&
          filter.conditions &&
          filter.conditions.length > 0
        ) {
          const conditions = filter.conditions;
          const existingJoins = filter.joins || [filter.joinOperator || 'AND'];
          const isMultiColumn = filter.isMultiColumn || false;
          const defaultField = conditions[0]?.field || filter.field;

          const basePattern = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            })),
            existingJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );

          newValue = `${basePattern} #${joinOperator.toLowerCase()} #`;
        } else if (filter.valueTo) {
          newValue = `#${filter.field} #${filter.operator} ${filter.value} #to ${filter.valueTo} #${joinOperator.toLowerCase()} #`;
        } else {
          newValue = PatternBuilder.partialMulti(
            filter.field,
            filter.operator,
            filter.value,
            joinOperator
          );
        }
      } else {
        return;
      }

      setFilterValue(newValue, onChange, inputRef);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [onChange, inputRef, searchMode, preservedFilterRef, setPreservedSearchMode]
  );

  return {
    handleColumnSelect,
    handleOperatorSelect,
    handleJoinOperatorSelect,
  };
}
