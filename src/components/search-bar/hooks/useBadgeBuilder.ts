import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';

interface BadgeHandlers {
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearPartialJoin: () => void;
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditOperator: (isSecond?: boolean) => void; // Updated to accept optional parameter
  onEditJoin: () => void;
  onEditValue: () => void; // Edit value handler
  onEditSecondValue?: () => void; // Edit second value handler (optional)
}

interface InlineEditingProps {
  editingBadge: {
    type: 'firstValue' | 'secondValue' | 'firstValueTo' | 'secondValueTo';
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: () => void;
}

export const useBadgeBuilder = (
  searchMode: EnhancedSearchState,
  handlers: BadgeHandlers,
  inlineEditingProps?: InlineEditingProps
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
      badges.push({
        id: 'column',
        type: 'column',
        label:
          filter?.column.headerName ||
          searchMode.selectedColumn?.headerName ||
          '',
        onClear: handlers.onClearColumn,
        canClear: true, // Column badge can always be cleared
        onEdit: handlers.onEditColumn,
        canEdit: true, // Column badge is always editable
      });
    }

    // 2. Handle Multi-Condition Badges (when filter is confirmed with multiple conditions)
    if (searchMode.isFilterMode && isMultiCondition && filter.conditions) {
      filter.conditions.forEach((condition, index) => {
        const operatorLabel = getOperatorLabelForColumn(
          filter.column,
          condition.operator
        );

        // Operator badge for this condition
        badges.push({
          id: `multi-operator-${index}`,
          type: 'operator',
          label: operatorLabel,
          onClear:
            index === 0
              ? handlers.onClearOperator // First operator: clear to column with operator selector
              : index === filter.conditions!.length - 1 &&
                  filter.conditions!.length === 2
                ? handlers.onClearSecondOperator
                : handlers.onClearAll,
          canClear: true,
          onEdit: () =>
            handlers.onEditOperator(index > 0 && filter.isMultiCondition),
          canEdit: true, // Operator badges are editable
        });

        // Value badge(s) for this condition (skip if value is empty)
        if (condition.value) {
          // Check if this is a Between (inRange) operator - needs 2 value badges + separator
          if (condition.operator === 'inRange' && condition.valueTo) {
            // Determine if this badge is being edited
            const isFirstValue = index === 0;
            const isEditingFrom =
              inlineEditingProps?.editingBadge?.type ===
              (isFirstValue ? 'firstValue' : 'secondValue');

            // First value badge
            badges.push({
              id: `multi-value-${index}-from`,
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
              onEdit:
                index === 0 ? handlers.onEditValue : handlers.onEditSecondValue,
              canEdit: true,
              // Inline editing props
              isEditing: isEditingFrom,
              editingValue: isEditingFrom
                ? inlineEditingProps?.editingBadge?.value
                : undefined,
              onValueChange: isEditingFrom
                ? inlineEditingProps?.onInlineValueChange
                : undefined,
              onEditComplete: isEditingFrom
                ? inlineEditingProps?.onInlineEditComplete
                : undefined,
            });

            // "to" separator badge
            badges.push({
              id: `multi-separator-${index}`,
              type: 'separator',
              label: 'to',
              onClear: () => {}, // Separator cannot be cleared independently
              canClear: false,
              canEdit: false,
            });

            // Determine if the "to" value badge is being edited
            const isEditingTo =
              inlineEditingProps?.editingBadge?.type ===
              (isFirstValue ? 'firstValueTo' : 'secondValueTo');

            // Second value badge (valueTo)
            badges.push({
              id: `multi-value-${index}-to`,
              type: 'valueSecond',
              label: condition.valueTo,
              onClear:
                index === 0
                  ? handlers.onClearValue
                  : index === filter.conditions!.length - 1 &&
                      filter.conditions!.length === 2
                    ? handlers.onClearSecondValue
                    : handlers.onClearAll,
              canClear: true,
              onEdit:
                index === 0 ? handlers.onEditValue : handlers.onEditSecondValue,
              canEdit: true,
              // Inline editing props
              isEditing: isEditingTo,
              editingValue: isEditingTo
                ? inlineEditingProps?.editingBadge?.value
                : undefined,
              onValueChange: isEditingTo
                ? inlineEditingProps?.onInlineValueChange
                : undefined,
              onEditComplete: isEditingTo
                ? inlineEditingProps?.onInlineEditComplete
                : undefined,
            });
          } else {
            // Determine if this badge is being edited
            const isFirstValue = index === 0;
            const isEditingValue =
              inlineEditingProps?.editingBadge?.type ===
              (isFirstValue ? 'firstValue' : 'secondValue');

            // Normal operator with single value
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
              onEdit:
                index === 0 ? handlers.onEditValue : handlers.onEditSecondValue,
              canEdit: true, // Value badges are now editable
              // Inline editing props
              isEditing: isEditingValue,
              editingValue: isEditingValue
                ? inlineEditingProps?.editingBadge?.value
                : undefined,
              onValueChange: isEditingValue
                ? inlineEditingProps?.onInlineValueChange
                : undefined,
              onEditComplete: isEditingValue
                ? inlineEditingProps?.onInlineEditComplete
                : undefined,
            });
          }
        }

        // Join badge between conditions (not after last one)
        if (index < filter.conditions!.length - 1) {
          badges.push({
            id: `multi-join-${index}`,
            type: 'join',
            label: filter.joinOperator || '',
            onClear: handlers.onClearPartialJoin,
            canClear: true,
            onEdit: handlers.onEditJoin,
            canEdit: true, // Join badges are editable
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
      const operatorLabel = getOperatorLabelForColumn(
        filter.column,
        filter.operator
      );

      badges.push({
        id: 'operator',
        type: 'operator',
        label: operatorLabel,
        onClear: handlers.onClearOperator,
        canClear: true,
        onEdit: () => handlers.onEditOperator(false), // Edit first operator
        canEdit: true, // Operator badges are editable
      });
    }

    // 4. Single-Condition Value Badge(s) (Gray)
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

      // Check if this is a Between (inRange) operator with valueTo
      if (filter.operator === 'inRange' && filter.valueTo) {
        // Determine if this badge is being edited
        const editType = isSecondValue ? 'secondValue' : 'firstValue';
        const isEditingFrom =
          inlineEditingProps?.editingBadge?.type === editType;

        // First value badge
        badges.push({
          id: 'value-from',
          type: 'value',
          label: filter.value,
          onClear: isSecondValue
            ? handlers.onClearSecondValue
            : handlers.onClearValue,
          canClear: true,
          onEdit: isSecondValue
            ? handlers.onEditSecondValue
            : handlers.onEditValue,
          canEdit: true,
          // Inline editing props
          isEditing: isEditingFrom,
          editingValue: isEditingFrom
            ? inlineEditingProps?.editingBadge?.value
            : undefined,
          onValueChange: isEditingFrom
            ? inlineEditingProps?.onInlineValueChange
            : undefined,
          onEditComplete: isEditingFrom
            ? inlineEditingProps?.onInlineEditComplete
            : undefined,
        });

        // "to" separator badge
        badges.push({
          id: 'separator',
          type: 'separator',
          label: 'to',
          onClear: () => {}, // Separator cannot be cleared independently
          canClear: false,
          canEdit: false,
        });

        // Determine if the "to" value badge is being edited
        const editTypeTo = isSecondValue ? 'secondValueTo' : 'firstValueTo';
        const isEditingTo =
          inlineEditingProps?.editingBadge?.type === editTypeTo;

        // Second value badge (valueTo)
        badges.push({
          id: 'value-to',
          type: 'valueSecond',
          label: filter.valueTo,
          onClear: isSecondValue
            ? handlers.onClearSecondValue
            : handlers.onClearValue,
          canClear: true,
          onEdit: isSecondValue
            ? handlers.onEditSecondValue
            : handlers.onEditValue,
          canEdit: true,
          // Inline editing props
          isEditing: isEditingTo,
          editingValue: isEditingTo
            ? inlineEditingProps?.editingBadge?.value
            : undefined,
          onValueChange: isEditingTo
            ? inlineEditingProps?.onInlineValueChange
            : undefined,
          onEditComplete: isEditingTo
            ? inlineEditingProps?.onInlineEditComplete
            : undefined,
        });
      } else {
        // Determine if this badge is being edited
        const editType = isSecondValue ? 'secondValue' : 'firstValue';
        const isEditingValue =
          inlineEditingProps?.editingBadge?.type === editType;

        // Normal operator with single value
        badges.push({
          id: 'value',
          type: 'value',
          label: filter.value,
          onClear: isSecondValue
            ? handlers.onClearSecondValue
            : handlers.onClearValue,
          canClear: true,
          onEdit: isSecondValue
            ? handlers.onEditSecondValue
            : handlers.onEditValue,
          canEdit: true, // Value badges are now editable
          // Inline editing props
          isEditing: isEditingValue,
          editingValue: isEditingValue
            ? inlineEditingProps?.editingBadge?.value
            : undefined,
          onValueChange: isEditingValue
            ? inlineEditingProps?.onInlineValueChange
            : undefined,
          onEditComplete: isEditingValue
            ? inlineEditingProps?.onInlineEditComplete
            : undefined,
        });
      }
    }

    // 5. Join Badge (Orange) - AND/OR
    if (searchMode.partialJoin) {
      badges.push({
        id: 'join',
        type: 'join',
        label: searchMode.partialJoin,
        onClear: handlers.onClearPartialJoin,
        canClear: true,
        onEdit: handlers.onEditJoin,
        canEdit: true, // Join badges are editable
      });
    }

    // 6. Second Operator Badge (Blue)
    if (searchMode.secondOperator && filter) {
      const operatorLabel = getOperatorLabelForColumn(
        filter.column,
        searchMode.secondOperator
      );

      badges.push({
        id: 'second-operator',
        type: 'secondOperator',
        label: operatorLabel,
        onClear: handlers.onClearSecondOperator,
        canClear: true,
        onEdit: () => handlers.onEditOperator(true), // Edit second operator
        canEdit: true, // Second operator badge is also editable
      });
    }

    return badges;
  }, [searchMode, handlers, inlineEditingProps]);
};
