import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
} from '../operators';

interface BadgeHandlers {
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearPartialJoin: () => void;
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearAll: () => void;
}

export const useBadgeBuilder = (
  searchMode: EnhancedSearchState,
  handlers: BadgeHandlers
): BadgeConfig[] => {
  return useMemo(() => {
    const badges: BadgeConfig[] = [];

    // Early return if no badges should be shown
    if (
      !searchMode.isFilterMode &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector &&
      !searchMode.selectedColumn
    ) {
      return badges;
    }

    const filter = searchMode.filterSearch;
    const isMultiCondition =
      filter?.isMultiCondition &&
      filter.conditions &&
      filter.conditions.length > 1;

    // 1. Column Badge (Purple) - Always shown when in filter/operator mode
    if (
      searchMode.isFilterMode ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector ||
      searchMode.selectedColumn
    ) {
      const canClearColumn = !(
        (searchMode.isFilterMode ||
          searchMode.showJoinOperatorSelector ||
          (searchMode.showOperatorSelector && searchMode.isSecondOperator)) &&
        filter &&
        (filter.operator !== 'contains' || filter.isExplicitOperator)
      );

      badges.push({
        id: 'column',
        type: 'column',
        label:
          filter?.column.headerName ||
          searchMode.selectedColumn?.headerName ||
          '',
        onClear: handlers.onClearColumn,
        canClear: canClearColumn,
      });
    }

    // 2. Handle Multi-Condition Badges (when filter is confirmed with multiple conditions)
    if (searchMode.isFilterMode && isMultiCondition && filter.conditions) {
      filter.conditions.forEach((condition, index) => {
        const availableOperators =
          filter.column.type === 'number'
            ? NUMBER_FILTER_OPERATORS
            : DEFAULT_FILTER_OPERATORS;

        const operatorLabel =
          availableOperators.find(op => op.value === condition.operator)
            ?.label || condition.operator;

        // Operator badge for this condition
        badges.push({
          id: `multi-operator-${index}`,
          type: 'operator',
          label: operatorLabel,
          onClear:
            index === filter.conditions!.length - 1 &&
            filter.conditions!.length === 2
              ? handlers.onClearSecondOperator
              : handlers.onClearAll,
          canClear: true,
        });

        // Value badge for this condition
        badges.push({
          id: `multi-value-${index}`,
          type: 'value',
          label: condition.value,
          onClear:
            index === 0
              ? handlers.onClearValue
              : index === filter.conditions!.length - 1 &&
                  filter.conditions!.length === 2
                ? handlers.onClearSecondValue
                : handlers.onClearAll,
          canClear: true,
        });

        // Join badge between conditions (not after last one)
        if (index < filter.conditions!.length - 1) {
          badges.push({
            id: `multi-join-${index}`,
            type: 'join',
            label: filter.joinOperator || '',
            onClear: handlers.onClearPartialJoin,
            canClear: true,
          });
        }
      });

      return badges; // Return early for multi-condition case
    }

    // 3. Single-Condition Operator Badge (Blue)
    const shouldShowSingleOperator =
      (searchMode.isFilterMode ||
        searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && searchMode.isSecondOperator) ||
        (!searchMode.isFilterMode && searchMode.partialJoin && filter)) &&
      filter &&
      (filter.operator !== 'contains' || filter.isExplicitOperator) &&
      !filter.isMultiCondition;

    if (shouldShowSingleOperator) {
      const availableOperators =
        filter.column.type === 'number'
          ? NUMBER_FILTER_OPERATORS
          : DEFAULT_FILTER_OPERATORS;

      const operatorLabel =
        availableOperators.find(op => op.value === filter.operator)?.label ||
        filter.operator;

      badges.push({
        id: 'operator',
        type: 'operator',
        label: operatorLabel,
        onClear: handlers.onClearOperator,
        canClear: true,
      });
    }

    // 4. Single-Condition Value Badge (Gray)
    const shouldShowSingleValue =
      (searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector &&
          searchMode.isSecondOperator &&
          filter) ||
        (!searchMode.isFilterMode &&
          !searchMode.showOperatorSelector &&
          searchMode.partialJoin &&
          filter) ||
        (searchMode.isFilterMode &&
          filter?.isConfirmed &&
          !filter?.isMultiCondition)) &&
      filter?.value &&
      !filter?.isMultiCondition;

    if (shouldShowSingleValue) {
      const isSecondValue =
        searchMode.showOperatorSelector &&
        searchMode.isSecondOperator &&
        filter;

      badges.push({
        id: 'value',
        type: 'value',
        label: filter.value,
        onClear: isSecondValue
          ? handlers.onClearSecondValue
          : handlers.onClearValue,
        canClear: true,
      });
    }

    // 5. Join Badge (Orange) - AND/OR
    if (searchMode.partialJoin) {
      badges.push({
        id: 'join',
        type: 'join',
        label: searchMode.partialJoin,
        onClear: handlers.onClearPartialJoin,
        canClear: true,
      });
    }

    // 6. Second Operator Badge (Blue)
    if (searchMode.secondOperator && filter) {
      const availableOperators =
        filter.column.type === 'number'
          ? NUMBER_FILTER_OPERATORS
          : DEFAULT_FILTER_OPERATORS;

      const operatorLabel =
        availableOperators.find(op => op.value === searchMode.secondOperator)
          ?.label || searchMode.secondOperator;

      badges.push({
        id: 'second-operator',
        type: 'secondOperator',
        label: operatorLabel,
        onClear: handlers.onClearSecondOperator,
        canClear: true,
      });
    }

    return badges;
  }, [searchMode, handlers]);
};
