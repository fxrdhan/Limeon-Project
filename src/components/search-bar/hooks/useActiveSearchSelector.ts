import { useMemo } from 'react';
import {
  columnSelectorConfig,
  joinSelectorConfig,
  operatorSelectorConfig,
  type ActiveSelectorItem,
} from '../selectorConfigs';
import type {
  BaseSelectorConfig,
  BaseSelectorProps,
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from '../types';
import type { JoinOperator } from '../operators';
import type { GroupEditingSelectorTarget } from './useGroupSelectorEditing';

interface EditingSelectorTarget {
  conditionIndex: number;
  target: 'column' | 'operator' | 'join';
}

type SelectorPosition = BaseSelectorProps<ActiveSelectorItem>['position'];

export type ActiveSearchSelector = Omit<
  BaseSelectorProps<ActiveSelectorItem>,
  | 'isOpen'
  | 'outsideClickIgnoreRef'
  | 'outsideClickIgnoreRefs'
  | 'isVisuallyReady'
>;

interface UseActiveSearchSelectorParams {
  searchMode: EnhancedSearchState;
  activeConditionIndex: number;
  editingSelectorTarget: EditingSelectorTarget | null;
  groupEditingSelectorTarget: GroupEditingSelectorTarget | null;
  sortedColumns: readonly SearchColumn[];
  operators: readonly FilterOperator[];
  restrictedJoinOperators: readonly JoinOperator[];
  handleColumnSelectWithGroups: (column: SearchColumn) => void;
  handleOperatorSelectWithGroups: (operator: FilterOperator) => void;
  handleJoinOperatorSelectWithGroups: (joinOperator: JoinOperator) => void;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector: () => void;
  columnSelectorPosition: SelectorPosition;
  operatorSelectorPosition: SelectorPosition;
  joinOperatorSelectorPosition: SelectorPosition;
  searchTerm: string;
  operatorSearchTerm: string;
  defaultColumnIndex: number | undefined;
  defaultOperatorIndex: number | undefined;
  defaultJoinOperatorIndex: number | undefined;
  setPreviewColumn: (column: SearchColumn | null) => void;
  setPreviewOperator: (operator: FilterOperator | null) => void;
}

export const useActiveSearchSelector = ({
  searchMode,
  activeConditionIndex,
  editingSelectorTarget,
  groupEditingSelectorTarget,
  sortedColumns,
  operators,
  restrictedJoinOperators,
  handleColumnSelectWithGroups,
  handleOperatorSelectWithGroups,
  handleJoinOperatorSelectWithGroups,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
  columnSelectorPosition,
  operatorSelectorPosition,
  joinOperatorSelectorPosition,
  searchTerm,
  operatorSearchTerm,
  defaultColumnIndex,
  defaultOperatorIndex,
  defaultJoinOperatorIndex,
  setPreviewColumn,
  setPreviewOperator,
}: UseActiveSearchSelectorParams): ActiveSearchSelector | null => {
  return useMemo(() => {
    const targetKey = groupEditingSelectorTarget
      ? `group:${groupEditingSelectorTarget.target}:${groupEditingSelectorTarget.path.join('.')}:${
          groupEditingSelectorTarget.joinIndex ?? 'none'
        }`
      : editingSelectorTarget
        ? `edit:${editingSelectorTarget.target}:${editingSelectorTarget.conditionIndex}`
        : `active:${activeConditionIndex}`;

    if (searchMode.showColumnSelector) {
      return {
        contentKey: `column:${targetKey}`,
        items: sortedColumns as readonly ActiveSelectorItem[],
        onSelect: item => {
          handleColumnSelectWithGroups(item as SearchColumn);
        },
        onClose: handleCloseColumnSelector,
        position: columnSelectorPosition,
        searchTerm,
        defaultSelectedIndex: defaultColumnIndex,
        config: columnSelectorConfig as BaseSelectorConfig<ActiveSelectorItem>,
        onHighlightChange: item => {
          setPreviewColumn(item as SearchColumn | null);
          setPreviewOperator(null);
        },
      };
    }

    if (searchMode.showOperatorSelector) {
      return {
        contentKey: `operator:${targetKey}`,
        items: operators as readonly ActiveSelectorItem[],
        onSelect: item => {
          handleOperatorSelectWithGroups(item as FilterOperator);
        },
        onClose: handleCloseOperatorSelector,
        position: operatorSelectorPosition,
        searchTerm: operatorSearchTerm,
        defaultSelectedIndex: defaultOperatorIndex,
        config:
          operatorSelectorConfig as BaseSelectorConfig<ActiveSelectorItem>,
        onHighlightChange: item => {
          setPreviewColumn(null);
          setPreviewOperator(item as FilterOperator | null);
        },
      };
    }

    if (searchMode.showJoinOperatorSelector) {
      return {
        contentKey: `join:${targetKey}`,
        items: restrictedJoinOperators as readonly ActiveSelectorItem[],
        onSelect: item => {
          handleJoinOperatorSelectWithGroups(item as JoinOperator);
        },
        onClose: handleCloseJoinOperatorSelector,
        position: joinOperatorSelectorPosition,
        searchTerm: '',
        defaultSelectedIndex: defaultJoinOperatorIndex,
        config: joinSelectorConfig as BaseSelectorConfig<ActiveSelectorItem>,
        onHighlightChange: () => {
          setPreviewColumn(null);
          setPreviewOperator(null);
        },
      };
    }

    return null;
  }, [
    activeConditionIndex,
    columnSelectorPosition,
    defaultColumnIndex,
    defaultJoinOperatorIndex,
    defaultOperatorIndex,
    editingSelectorTarget,
    groupEditingSelectorTarget,
    handleCloseColumnSelector,
    handleCloseJoinOperatorSelector,
    handleCloseOperatorSelector,
    handleColumnSelectWithGroups,
    handleJoinOperatorSelectWithGroups,
    handleOperatorSelectWithGroups,
    joinOperatorSelectorPosition,
    operatorSearchTerm,
    operatorSelectorPosition,
    operators,
    restrictedJoinOperators,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    searchTerm,
    setPreviewColumn,
    setPreviewOperator,
    sortedColumns,
  ]);
};
