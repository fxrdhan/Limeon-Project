import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';

interface BadgeHandlers {
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearPartialJoin: () => void;
  onClearSecondColumn?: () => void; // Clear second column (multi-column filter)
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditSecondColumn?: () => void; // Edit second column (multi-column filter)
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
  onInlineEditComplete: (finalValue?: string) => void;
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
      !searchMode.showColumnSelector && // Include column selector for second column
      !searchMode.selectedColumn &&
      !searchMode.secondColumn // Include second column for multi-column
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
        // Use condition's column if available (multi-column), otherwise use filter's column
        const conditionColumn = condition.column || filter.column;
        const operatorLabel = getOperatorLabelForColumn(
          conditionColumn,
          condition.operator
        );

        // For second condition, always add second column badge BEFORE operator
        // Show even if same column as first (no simplification)
        if (index === 1) {
          const secondColumnLabel =
            condition.column?.headerName || filter.column.headerName;
          badges.push({
            id: 'second-column',
            type: 'column',
            label: secondColumnLabel,
            onClear:
              handlers.onClearSecondColumn || handlers.onClearSecondOperator,
            canClear: true,
            onEdit: handlers.onEditSecondColumn || handlers.onEditColumn,
            canEdit: true,
          });
        }

        // Operator badge for this condition
        // Use consistent IDs: 'operator' for first, 'second-operator' for second
        // This ensures AnimatePresence doesn't see them as new badges on state transitions
        badges.push({
          id: index === 0 ? 'operator' : 'second-operator',
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

            // First value badge - use consistent IDs
            badges.push({
              id: index === 0 ? 'value-from' : 'second-value-from',
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

            // "to" separator badge - use consistent IDs
            badges.push({
              id: index === 0 ? 'separator' : 'second-separator',
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

            // Second value badge (valueTo) - use consistent IDs
            badges.push({
              id: index === 0 ? 'value-to' : 'second-value-to',
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

            // Normal operator with single value - use consistent IDs
            badges.push({
              id: index === 0 ? 'value' : 'second-value',
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

        // Join badge between conditions (not after last one) - use consistent ID
        if (index < filter.conditions!.length - 1) {
          badges.push({
            id: 'join',
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
      // NOTE: This section handles Single-Condition Value Badges
      // The value displayed is always filter.value (first/only condition value)
      // Even when selecting second operator, this badge is for FIRST condition
      // So isSecondValue should always be false here
      // The "second value" only exists in multi-condition filters (handled in section 2)
      const isSecondValue = false;

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

    // 6. Second Column Badge (Purple) - MULTI-COLUMN SUPPORT
    // Always show second column badge when it exists (even if same as first column)
    if (searchMode.secondColumn) {
      badges.push({
        id: 'second-column',
        type: 'column', // Same type as first column badge
        label: searchMode.secondColumn.headerName,
        onClear: handlers.onClearSecondColumn || handlers.onClearSecondOperator, // Fallback to clearing second operator
        canClear: true,
        onEdit: handlers.onEditSecondColumn || handlers.onEditColumn, // Fallback to first column edit
        canEdit: true,
      });
    }

    // 7. Second Operator Badge (Blue)
    if (searchMode.secondOperator && filter) {
      // For multi-column, use secondColumn for operator label
      const columnForLabel = searchMode.secondColumn || filter.column;
      const operatorLabel = getOperatorLabelForColumn(
        columnForLabel,
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
