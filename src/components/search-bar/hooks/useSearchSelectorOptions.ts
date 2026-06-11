import fuzzysort from 'fuzzysort';
import { useMemo } from 'react';
import { SEARCH_CONSTANTS } from '../constants';
import { JOIN_OPERATORS } from '../operators';
import type {
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from '../types';
import { findGroupNodeAtPath } from '../utils/groupEditingUtils';
import { normalizeGroupSearchTerm } from '../utils/groupPatternUtils';
import { getOperatorsForColumn } from '../utils/operatorUtils';
import type { GroupEditingSelectorTarget } from './useGroupSelectorEditing';

interface EditingSelectorTarget {
  conditionIndex: number;
  target: 'column' | 'operator' | 'join';
}

interface ActiveGroupState {
  depth: number;
  join?: 'AND' | 'OR';
}

interface UseSearchSelectorOptionsParams {
  value: string;
  columns: SearchColumn[];
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  isSelectingConditionNColumn: boolean;
  activeGroupState: ActiveGroupState;
  isEditingJoinOperator: boolean;
  groupEditingSelectorTarget: GroupEditingSelectorTarget | null;
  editingSelectorTarget: EditingSelectorTarget | null;
  isEditingSecondOperator: boolean;
  isEditingSecondColumnState: boolean;
  currentJoinOperator?: 'AND' | 'OR';
}

export const useSearchSelectorOptions = ({
  value,
  columns,
  searchMode,
  preservedSearchMode,
  isSelectingConditionNColumn,
  activeGroupState,
  isEditingJoinOperator,
  groupEditingSelectorTarget,
  editingSelectorTarget,
  isEditingSecondOperator,
  isEditingSecondColumnState,
  currentJoinOperator,
}: UseSearchSelectorOptionsParams) => {
  const searchTerm = useMemo(() => {
    if (isSelectingConditionNColumn) {
      const cond1ColMatch = value.match(/#(?:and|or)\s+#([^\s#]*)$/i);
      return normalizeGroupSearchTerm(cond1ColMatch ? cond1ColMatch[1] : '');
    }

    if (value.startsWith('#')) {
      if (/#\(\s*$/.test(value) || /#(?:and|or)\s+#\(\s*$/i.test(value)) {
        return '';
      }
      return normalizeGroupSearchTerm(value.slice(1).split(':', 1)[0]);
    }
    return '';
  }, [value, isSelectingConditionNColumn]);

  const searchableColumns = useMemo(() => {
    return columns.filter(col => col.searchable);
  }, [columns]);

  const sortedColumns = useMemo(() => {
    if (!searchTerm) return searchableColumns;

    const searchTargets = searchableColumns.map(col => ({
      column: col,
      headerName: col.headerName,
      field: col.field,
    }));

    const headerResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'headerName',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'field',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const combinedResults = new Map();

    headerResults.forEach(result => {
      combinedResults.set(result.obj.column.field, {
        column: result.obj.column,
        score: result.score + 1000,
      });
    });

    fieldResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 500,
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.column);
  }, [searchableColumns, searchTerm]);

  const restrictedJoinOperators = useMemo(() => {
    const isEditingJoinSelector =
      searchMode.showJoinOperatorSelector &&
      (isEditingJoinOperator || groupEditingSelectorTarget?.target === 'join');
    if (isEditingJoinSelector) {
      return JOIN_OPERATORS;
    }

    if (searchMode.showJoinOperatorSelector && activeGroupState.depth > 0) {
      if (activeGroupState.join) {
        return JOIN_OPERATORS.filter(
          op => op.value === activeGroupState.join!.toLowerCase()
        );
      }
      return JOIN_OPERATORS;
    }

    let lockedJoin = searchMode.filterSearch?.joins?.[0];

    if (!lockedJoin) {
      lockedJoin = searchMode.filterSearch?.joinOperator;
    }

    if (!lockedJoin) {
      lockedJoin = searchMode.partialJoin;
    }

    if (lockedJoin) {
      const lowerLocked = lockedJoin.toLowerCase();
      return JOIN_OPERATORS.filter(op => op.value === lowerLocked);
    }

    return JOIN_OPERATORS;
  }, [
    searchMode.filterSearch,
    searchMode.partialJoin,
    searchMode.showJoinOperatorSelector,
    activeGroupState.depth,
    activeGroupState.join,
    isEditingJoinOperator,
    groupEditingSelectorTarget,
  ]);

  const operators = useMemo(() => {
    if (searchMode.selectedColumn) {
      return getOperatorsForColumn(searchMode.selectedColumn);
    }
    return [];
  }, [searchMode.selectedColumn]);

  const defaultOperatorIndex = useMemo(() => {
    if (groupEditingSelectorTarget?.target === 'operator') {
      const baseGroup =
        preservedSearchMode?.filterSearch?.filterGroup ||
        searchMode.filterSearch?.filterGroup ||
        null;
      const node = baseGroup
        ? findGroupNodeAtPath(baseGroup, groupEditingSelectorTarget.path)
        : undefined;
      if (node?.kind === 'condition') {
        const index = operators.findIndex(op => op.value === node.operator);
        return index >= 0 ? index : undefined;
      }
    }

    const editingIdx =
      editingSelectorTarget?.target === 'operator'
        ? editingSelectorTarget.conditionIndex
        : searchMode.activeConditionIndex;
    if (editingIdx !== undefined && editingIdx >= 2) {
      const condNOperator =
        preservedSearchMode?.filterSearch?.conditions?.[editingIdx]?.operator ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.operator;
      if (condNOperator) {
        const index = operators.findIndex(op => op.value === condNOperator);
        return index >= 0 ? index : undefined;
      }
    }

    if (
      isEditingSecondOperator &&
      preservedSearchMode?.filterSearch?.isMultiCondition &&
      preservedSearchMode?.filterSearch?.conditions &&
      preservedSearchMode.filterSearch.conditions.length >= 2
    ) {
      const currentOperator =
        preservedSearchMode.filterSearch.conditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    } else if (
      isEditingSecondOperator &&
      preservedSearchMode?.partialConditions?.[1]?.operator
    ) {
      const currentOperator = preservedSearchMode.partialConditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    } else if (preservedSearchMode?.filterSearch?.operator) {
      const currentOperator = preservedSearchMode.filterSearch.operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [
    groupEditingSelectorTarget,
    preservedSearchMode,
    isEditingSecondOperator,
    operators,
    editingSelectorTarget,
    searchMode.activeConditionIndex,
    searchMode.filterSearch,
  ]);

  const defaultColumnIndex = useMemo(() => {
    if (groupEditingSelectorTarget?.target === 'column') {
      const baseGroup =
        preservedSearchMode?.filterSearch?.filterGroup ||
        searchMode.filterSearch?.filterGroup ||
        null;
      const node = baseGroup
        ? findGroupNodeAtPath(baseGroup, groupEditingSelectorTarget.path)
        : undefined;
      if (node?.kind === 'condition') {
        const columnField = node.field || node.column?.field;
        if (columnField) {
          const index = sortedColumns.findIndex(
            col => col.field === columnField
          );
          return index >= 0 ? index : undefined;
        }
      }
    }

    const editingIdx =
      editingSelectorTarget?.target === 'column'
        ? editingSelectorTarget.conditionIndex
        : searchMode.activeConditionIndex;
    if (editingIdx !== undefined && editingIdx >= 2) {
      const condNColumnField =
        preservedSearchMode?.filterSearch?.conditions?.[editingIdx]?.field ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.column?.field ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.field;
      if (condNColumnField) {
        const index = sortedColumns.findIndex(
          col => col.field === condNColumnField
        );
        return index >= 0 ? index : undefined;
      }
    }

    if (isEditingSecondColumnState) {
      const cond1ColFromConditions =
        preservedSearchMode?.filterSearch?.conditions?.[1]?.field;
      const cond1ColFromState =
        preservedSearchMode?.partialConditions?.[1]?.column?.field;
      const cond1ColumnField = cond1ColFromConditions || cond1ColFromState;

      if (cond1ColumnField) {
        const index = sortedColumns.findIndex(
          col => col.field === cond1ColumnField
        );
        return index >= 0 ? index : undefined;
      }
    }

    if (preservedSearchMode?.filterSearch?.field) {
      const currentColumnField = preservedSearchMode.filterSearch.field;
      const index = sortedColumns.findIndex(
        col => col.field === currentColumnField
      );
      return index >= 0 ? index : undefined;
    }

    if (preservedSearchMode?.selectedColumn?.field) {
      const currentColumnField = preservedSearchMode.selectedColumn.field;
      const index = sortedColumns.findIndex(
        col => col.field === currentColumnField
      );
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [
    groupEditingSelectorTarget,
    preservedSearchMode,
    sortedColumns,
    isEditingSecondColumnState,
    editingSelectorTarget,
    searchMode.activeConditionIndex,
    searchMode.filterSearch,
  ]);

  const currentJoinSelectorValue =
    activeGroupState.depth > 0
      ? activeGroupState.join
      : currentJoinOperator ||
        searchMode.partialJoin ||
        searchMode.filterSearch?.joinOperator;

  const defaultJoinOperatorIndex = useMemo(() => {
    if (!currentJoinSelectorValue) return 0;
    const index = restrictedJoinOperators.findIndex(
      op => op.label === currentJoinSelectorValue
    );
    return index >= 0 ? index : 0;
  }, [currentJoinSelectorValue, restrictedJoinOperators]);

  return {
    searchTerm,
    sortedColumns,
    restrictedJoinOperators,
    operators: operators as FilterOperator[],
    defaultOperatorIndex,
    defaultColumnIndex,
    defaultJoinOperatorIndex,
  };
};
