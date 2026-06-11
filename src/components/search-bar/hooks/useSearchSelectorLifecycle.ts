import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type MutableRefObject,
} from 'react';
import type { EnhancedSearchState, FilterGroup, SearchColumn } from '../types';
import {
  extractMultiConditionPreservation,
  type PreservedFilter,
} from '../utils/handlerHelpers';
import { PatternBuilder } from '../utils/PatternBuilder';
import { restoreConfirmedPattern } from '../utils/patternRestoration';
import { buildColumnValue, findColumn } from '../utils/searchUtils';
import type { GroupEditingSelectorTarget } from './useGroupSelectorEditing';

interface EditingSelectorTarget {
  conditionIndex: number;
  target: 'column' | 'operator' | 'join';
}

interface UseSearchSelectorLifecycleParams {
  value: string;
  memoizedColumns: SearchColumn[];
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  preservedFilterRef: MutableRefObject<PreservedFilter | null>;
  groupEditDraftRef: MutableRefObject<FilterGroup | null>;
  setGroupEditingSelectorTarget: (
    target: GroupEditingSelectorTarget | null
  ) => void;
  setCurrentJoinOperator: (operator: 'AND' | 'OR' | undefined) => void;
  setEditingSelectorTarget: (target: EditingSelectorTarget | null) => void;
  onClearPreservedState: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch?: () => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  closeSelectorsSignal?: number;
  suppressSelectors: boolean;
  editingSelectorTarget: EditingSelectorTarget | null;
}

export const useSearchSelectorLifecycle = ({
  value,
  memoizedColumns,
  searchMode,
  preservedSearchMode,
  setPreservedSearchMode,
  preservedFilterRef,
  groupEditDraftRef,
  setGroupEditingSelectorTarget,
  setCurrentJoinOperator,
  setEditingSelectorTarget,
  onClearPreservedState,
  onChange,
  onClearSearch,
  onFocus,
  closeSelectorsSignal,
  suppressSelectors,
  editingSelectorTarget,
}: UseSearchSelectorLifecycleParams) => {
  const [dismissedSelectorValue, setDismissedSelectorValue] = useState<
    string | null
  >(null);
  const previousCloseSelectorsSignalRef = useRef(closeSelectorsSignal);

  useEffect(() => {
    if (dismissedSelectorValue !== null && dismissedSelectorValue !== value) {
      setDismissedSelectorValue(null);
    }
  }, [dismissedSelectorValue, value]);

  const tryRestorePreservedPattern = useCallback((): boolean => {
    if (preservedSearchMode && preservedSearchMode.filterSearch?.isConfirmed) {
      const filter = preservedSearchMode.filterSearch;
      const restoredPattern = restoreConfirmedPattern(filter);

      onChange({
        target: { value: restoredPattern },
      } as ChangeEvent<HTMLInputElement>);

      preservedFilterRef.current = null;
      setPreservedSearchMode(null);
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    }
    return false;
  }, [
    groupEditDraftRef,
    onChange,
    preservedFilterRef,
    preservedSearchMode,
    setGroupEditingSelectorTarget,
    setPreservedSearchMode,
  ]);

  const dismissCurrentSelector = useCallback(() => {
    setDismissedSelectorValue(value);
  }, [value]);

  const handleCloseColumnSelector = useCallback(() => {
    if (tryRestorePreservedPattern()) return;

    if (
      preservedSearchMode &&
      !preservedSearchMode.filterSearch &&
      preservedSearchMode.selectedColumn
    ) {
      const columnName = preservedSearchMode.selectedColumn.field;
      const restoredPattern =
        PatternBuilder.columnWithOperatorSelector(columnName);

      onChange({
        target: { value: restoredPattern },
      } as ChangeEvent<HTMLInputElement>);

      setPreservedSearchMode(null);
      return;
    }

    if (searchMode.partialJoin) {
      dismissCurrentSelector();
      return;
    }

    if (value.startsWith('#') && !searchMode.selectedColumn) {
      const searchTerm = value.substring(1);
      const exactMatch = findColumn(memoizedColumns, searchTerm);

      if (!exactMatch) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as ChangeEvent<HTMLInputElement>);
        }
      }
    }
  }, [
    dismissCurrentSelector,
    memoizedColumns,
    onChange,
    onClearSearch,
    preservedSearchMode,
    searchMode.partialJoin,
    searchMode.selectedColumn,
    setPreservedSearchMode,
    tryRestorePreservedPattern,
    value,
  ]);

  const handleCloseOperatorSelector = useCallback(() => {
    if (
      editingSelectorTarget?.target === 'operator' &&
      preservedSearchMode?.filterSearch &&
      !preservedSearchMode.filterSearch.isConfirmed
    ) {
      const preservation =
        extractMultiConditionPreservation(preservedSearchMode);
      if (preservation) {
        const newValue = PatternBuilder.buildNConditions(
          preservation.conditions,
          preservation.joins,
          preservation.isMultiColumn || false,
          preservedSearchMode.filterSearch.field,
          { confirmed: false, openSelector: false }
        );
        onChange({
          target: { value: newValue },
        } as ChangeEvent<HTMLInputElement>);
      } else {
        const columnName = preservedSearchMode.filterSearch.field;
        const newValue = buildColumnValue(columnName, 'plain');
        onChange({
          target: { value: newValue },
        } as ChangeEvent<HTMLInputElement>);
      }

      onClearPreservedState();
      return;
    }

    if (tryRestorePreservedPattern()) return;

    if (searchMode.partialJoin) {
      dismissCurrentSelector();
      return;
    }

    if (value.includes('##')) {
      return;
    }

    if (searchMode.selectedColumn) {
      const newValue = buildColumnValue(
        searchMode.selectedColumn.field,
        'plain'
      );
      onChange({
        target: { value: newValue },
      } as ChangeEvent<HTMLInputElement>);
    } else if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>);
    }
  }, [
    dismissCurrentSelector,
    editingSelectorTarget,
    onChange,
    onClearPreservedState,
    onClearSearch,
    preservedSearchMode,
    searchMode.partialJoin,
    searchMode.selectedColumn,
    tryRestorePreservedPattern,
    value,
  ]);

  const handleCloseJoinOperatorSelector = useCallback(() => {
    if (tryRestorePreservedPattern()) {
      setCurrentJoinOperator(undefined);
      setEditingSelectorTarget(null);
      return;
    }

    const trimmedValue = value.replace(/\s+#\s*$/, '');
    const singleConditionMatch = trimmedValue.match(/^#\w+\s+#\w+\s+.+$/);
    if (singleConditionMatch && !trimmedValue.includes('##')) {
      onChange({
        target: { value: trimmedValue + '##' },
      } as ChangeEvent<HTMLInputElement>);
    } else {
      onChange({
        target: { value: trimmedValue },
      } as ChangeEvent<HTMLInputElement>);
    }
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null);
  }, [
    onChange,
    setCurrentJoinOperator,
    setEditingSelectorTarget,
    tryRestorePreservedPattern,
    value,
  ]);

  useEffect(() => {
    if (closeSelectorsSignal === undefined) return;
    if (previousCloseSelectorsSignalRef.current === closeSelectorsSignal) {
      return;
    }

    previousCloseSelectorsSignalRef.current = closeSelectorsSignal;

    if (searchMode.showColumnSelector) {
      handleCloseColumnSelector();
      return;
    }

    if (searchMode.showOperatorSelector) {
      handleCloseOperatorSelector();
      return;
    }

    if (searchMode.showJoinOperatorSelector) {
      handleCloseJoinOperatorSelector();
    }
  }, [
    closeSelectorsSignal,
    handleCloseColumnSelector,
    handleCloseJoinOperatorSelector,
    handleCloseOperatorSelector,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
  ]);

  const openOperatorSelectorFromPlainColumn = useCallback(() => {
    if (
      suppressSelectors ||
      !searchMode.selectedColumn ||
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector ||
      searchMode.filterSearch ||
      searchMode.partialJoin
    ) {
      return;
    }

    const columnName = searchMode.selectedColumn.field;
    const plainColumnValue = buildColumnValue(columnName, 'plain');
    if (value.trim() !== plainColumnValue) {
      return;
    }

    onChange({
      target: {
        value: PatternBuilder.columnWithOperatorSelector(columnName),
      },
    } as ChangeEvent<HTMLInputElement>);
  }, [
    onChange,
    searchMode.filterSearch,
    searchMode.partialJoin,
    searchMode.selectedColumn,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    suppressSelectors,
    value,
  ]);

  const handleInputFocus = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      onFocus?.(e);
      if (!suppressSelectors) {
        setDismissedSelectorValue(null);
      }
      openOperatorSelectorFromPlainColumn();
    },
    [onFocus, openOperatorSelectorFromPlainColumn, suppressSelectors]
  );

  const handleInputClick = useCallback(() => {
    if (!suppressSelectors) {
      setDismissedSelectorValue(null);
    }
    openOperatorSelectorFromPlainColumn();
  }, [openOperatorSelectorFromPlainColumn, suppressSelectors]);

  return {
    dismissedSelectorValue,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    handleInputFocus,
    handleInputClick,
  };
};
