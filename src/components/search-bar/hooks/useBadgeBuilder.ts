import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';

interface BadgeHandlers {
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearValueTo?: () => void; // Clear "to" value in Between operator (first condition)
  onClearPartialJoin: () => void;
  onClearSecondColumn?: () => void; // Clear second column (multi-column filter)
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearSecondValueTo?: () => void; // Clear "to" value in Between operator (second condition)
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditSecondColumn?: () => void; // Edit second column (multi-column filter)
  onEditOperator: (isSecond?: boolean) => void; // Updated to accept optional parameter
  onEditJoin: () => void;
  onEditValue: () => void; // Edit first value (or "from" value in Between)
  onEditValueTo?: () => void; // Edit "to" value in Between operator (first condition)
  onEditSecondValue?: () => void; // Edit second condition value
  onEditSecondValueTo?: () => void; // Edit "to" value in Between operator (second condition)
}

interface InlineEditingProps {
  editingBadge: {
    type: 'firstValue' | 'secondValue' | 'firstValueTo' | 'secondValueTo';
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: (finalValue?: string) => void;
  onNavigateEdit?: (direction: 'left' | 'right') => void; // Ctrl+E (left) or Ctrl+Shift+E (right)
  onFocusInput?: () => void; // Ctrl+I to exit edit and focus main input
}

export const useBadgeBuilder = (
  searchMode: EnhancedSearchState,
  handlers: BadgeHandlers,
  inlineEditingProps?: InlineEditingProps,
  selectedBadgeIndex?: number | null
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
    // Supports N conditions (up to MAX_FILTER_CONDITIONS)
    if (searchMode.isFilterMode && isMultiCondition && filter.conditions) {
      const conditionsCount = filter.conditions.length;
      // Use new joinOperators array if available, fallback to legacy joinOperator
      const joinOps =
        filter.joinOperators ||
        (filter.joinOperator ? [filter.joinOperator] : []);

      filter.conditions.forEach((condition, index) => {
        // Use condition's column if available (multi-column), otherwise use filter's column
        const conditionColumn = condition.column || filter.column;
        const conditionColumnType = conditionColumn.type;
        const operatorLabel = getOperatorLabelForColumn(
          conditionColumn,
          condition.operator
        );

        // For conditions after the first, add column badge BEFORE operator
        // Show even if same column as first (no simplification)
        if (index > 0) {
          const columnLabel =
            condition.column?.headerName || filter.column.headerName;
          badges.push({
            // Use dynamic ID for N conditions, but keep 'second-column' for index 1 for backward compat
            id: index === 1 ? 'second-column' : `condition-${index}-column`,
            type: 'column',
            label: columnLabel,
            onClear:
              index === 1
                ? handlers.onClearSecondColumn || handlers.onClearSecondOperator
                : handlers.onClearAll,
            canClear: true,
            onEdit:
              index === 1
                ? handlers.onEditSecondColumn || handlers.onEditColumn
                : handlers.onEditColumn,
            canEdit: true,
            conditionIndex: index,
          });
        }

        // Operator badge for this condition
        // Dynamic IDs: 'operator' for first, 'second-operator' for second, 'condition-N-operator' for N>1
        badges.push({
          id:
            index === 0
              ? 'operator'
              : index === 1
                ? 'second-operator'
                : `condition-${index}-operator`,
          type: 'operator',
          label: operatorLabel,
          onClear:
            index === 0
              ? handlers.onClearOperator
              : index === 1
                ? handlers.onClearSecondOperator
                : handlers.onClearAll,
          canClear: true,
          onEdit: () =>
            handlers.onEditOperator(index > 0 && filter.isMultiCondition),
          canEdit: true,
          conditionIndex: index,
        });

        // Value badge(s) for this condition (skip if value is empty)
        if (condition.value) {
          // Check if this is a Between (inRange) operator - needs 2 value badges + separator
          if (condition.operator === 'inRange' && condition.valueTo) {
            // Determine if this badge is being edited (only supports first 2 conditions for inline edit)
            const isFirstValue = index === 0;
            const isEditingFrom =
              index <= 1 &&
              inlineEditingProps?.editingBadge?.type ===
                (isFirstValue ? 'firstValue' : 'secondValue');

            // First value badge - dynamic IDs
            badges.push({
              id:
                index === 0
                  ? 'value-from'
                  : index === 1
                    ? 'second-value-from'
                    : `condition-${index}-value-from`,
              type: 'value',
              label: condition.value,
              onClear:
                index === 0
                  ? handlers.onClearValue
                  : index === 1
                    ? handlers.onClearSecondValue
                    : handlers.onClearAll,
              canClear: true,
              onEdit:
                index === 0
                  ? handlers.onEditValue
                  : index === 1
                    ? handlers.onEditSecondValue
                    : undefined,
              canEdit: index <= 1,
              // Inline editing props (only for first 2 conditions)
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
              onNavigateEdit: isEditingFrom
                ? inlineEditingProps?.onNavigateEdit
                : undefined,
              onFocusInput: isEditingFrom
                ? inlineEditingProps?.onFocusInput
                : undefined,
              columnType: conditionColumnType,
              conditionIndex: index,
            });

            // "to" separator badge - dynamic IDs
            badges.push({
              id:
                index === 0
                  ? 'separator'
                  : index === 1
                    ? 'second-separator'
                    : `condition-${index}-separator`,
              type: 'separator',
              label: 'to',
              onClear: () => {},
              canClear: false,
              canEdit: false,
              conditionIndex: index,
            });

            // Determine if the "to" value badge is being edited
            const isEditingTo =
              index <= 1 &&
              inlineEditingProps?.editingBadge?.type ===
                (isFirstValue ? 'firstValueTo' : 'secondValueTo');

            // Second value badge (valueTo) - dynamic IDs
            badges.push({
              id:
                index === 0
                  ? 'value-to'
                  : index === 1
                    ? 'second-value-to'
                    : `condition-${index}-value-to`,
              type: 'valueSecond',
              label: condition.valueTo,
              onClear:
                index === 0
                  ? (handlers.onClearValueTo ?? handlers.onClearValue)
                  : index === 1
                    ? (handlers.onClearSecondValueTo ??
                      handlers.onClearSecondValue)
                    : handlers.onClearAll,
              canClear: true,
              onEdit:
                index === 0
                  ? handlers.onEditValueTo
                  : index === 1
                    ? handlers.onEditSecondValueTo
                    : undefined,
              canEdit:
                index <= 1 &&
                !!(index === 0
                  ? handlers.onEditValueTo
                  : handlers.onEditSecondValueTo),
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
              onNavigateEdit: isEditingTo
                ? inlineEditingProps?.onNavigateEdit
                : undefined,
              onFocusInput: isEditingTo
                ? inlineEditingProps?.onFocusInput
                : undefined,
              columnType: conditionColumnType,
              conditionIndex: index,
            });
          } else {
            // Determine if this badge is being edited (only supports first 2 conditions for inline edit)
            const isFirstValue = index === 0;
            const isEditingValue =
              index <= 1 &&
              inlineEditingProps?.editingBadge?.type ===
                (isFirstValue ? 'firstValue' : 'secondValue');

            // Normal operator with single value - dynamic IDs
            badges.push({
              id:
                index === 0
                  ? 'value'
                  : index === 1
                    ? 'second-value'
                    : `condition-${index}-value`,
              type: 'value',
              label: condition.value,
              onClear:
                index === 0
                  ? handlers.onClearValue
                  : index === 1
                    ? handlers.onClearSecondValue
                    : handlers.onClearAll,
              canClear: true,
              onEdit:
                index === 0
                  ? handlers.onEditValue
                  : index === 1
                    ? handlers.onEditSecondValue
                    : undefined,
              canEdit: index <= 1,
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
              onNavigateEdit: isEditingValue
                ? inlineEditingProps?.onNavigateEdit
                : undefined,
              onFocusInput: isEditingValue
                ? inlineEditingProps?.onFocusInput
                : undefined,
              columnType: conditionColumnType,
              conditionIndex: index,
            });
          }
        }

        // Join badge between conditions (not after last one)
        // Use joinOperators array for N conditions
        if (index < conditionsCount - 1) {
          const joinLabel = joinOps[index] || filter.joinOperator || '';
          badges.push({
            // Dynamic ID for N joins: 'join' for first, 'join-1', 'join-2', etc.
            id: index === 0 ? 'join' : `join-${index}`,
            type: 'join',
            label: joinLabel,
            onClear: handlers.onClearPartialJoin,
            canClear: true,
            onEdit: handlers.onEditJoin,
            canEdit: true,
            joinIndex: index,
          });
        }
      });

      // Apply isSelected for multi-condition case before returning
      if (selectedBadgeIndex !== null && selectedBadgeIndex !== undefined) {
        return badges.map((badge, idx) => ({
          ...badge,
          isSelected: idx === selectedBadgeIndex,
        }));
      }
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
    // Special case: Between operator waiting for valueTo (using waitingForValueTo flag)
    const isWaitingForBetweenValueTo =
      searchMode.isFilterMode &&
      filter?.operator === 'inRange' &&
      filter?.waitingForValueTo === true;

    // Special case: Between operator with valueTo being typed (not confirmed yet)
    const isBetweenTypingValueTo =
      searchMode.isFilterMode &&
      filter?.operator === 'inRange' &&
      filter?.valueTo &&
      !filter?.isConfirmed;

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
          !filter?.isMultiCondition) ||
        isWaitingForBetweenValueTo ||
        isBetweenTypingValueTo) &&
      filter?.value &&
      !filter?.isMultiCondition;

    if (shouldShowSingleValue) {
      // NOTE: This section handles Single-Condition Value Badges
      // The value displayed is always filter.value (first/only condition value)
      // Even when selecting second operator, this badge is for FIRST condition
      // So isSecondValue should always be false here
      // The "second value" only exists in multi-condition filters (handled in section 2)
      const isSecondValue = false;
      const filterColumnType = filter.column.type;

      // Check if this is a Between (inRange) operator
      // Handle both complete (with valueTo) and waiting state (waitingForValueTo flag)
      const isWaitingForValueTo =
        filter.operator === 'inRange' &&
        !filter.valueTo &&
        filter.waitingForValueTo === true;

      if (
        filter.operator === 'inRange' &&
        (filter.valueTo || isWaitingForValueTo)
      ) {
        // Determine if this badge is being edited
        const editType = isSecondValue ? 'secondValue' : 'firstValue';
        const isEditingFrom =
          inlineEditingProps?.editingBadge?.type === editType;

        // Display value (already trimmed by parser)
        const displayValue = filter.value;

        badges.push({
          id: 'value-from',
          type: 'value',
          label: displayValue,
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
          onNavigateEdit: isEditingFrom
            ? inlineEditingProps?.onNavigateEdit
            : undefined,
          onFocusInput: isEditingFrom
            ? inlineEditingProps?.onFocusInput
            : undefined,
          columnType: filterColumnType,
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

        // Only add valueTo badge if we have the value AND it's confirmed (or in partialJoin state)
        // When typing (not confirmed), valueTo is shown in input, not as badge
        // Exception: When partialJoin is set, the filter WAS confirmed before user opened join selector
        if (filter.valueTo && (filter.isConfirmed || searchMode.partialJoin)) {
          // Determine if the "to" value badge is being edited
          const editTypeTo = isSecondValue ? 'secondValueTo' : 'firstValueTo';
          const isEditingTo =
            inlineEditingProps?.editingBadge?.type === editTypeTo;

          // Second value badge (valueTo)
          badges.push({
            id: 'value-to',
            type: 'valueSecond',
            label: filter.valueTo,
            // Use specific handler to clear only the "to" value, keeping "from" value
            onClear: isSecondValue
              ? (handlers.onClearSecondValueTo ?? handlers.onClearSecondValue)
              : (handlers.onClearValueTo ?? handlers.onClearValue),
            canClear: true,
            onEdit: isSecondValue
              ? handlers.onEditSecondValueTo
              : handlers.onEditValueTo,
            // Only show edit if handler exists
            canEdit: !!(isSecondValue
              ? handlers.onEditSecondValueTo
              : handlers.onEditValueTo),
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
            onNavigateEdit: isEditingTo
              ? inlineEditingProps?.onNavigateEdit
              : undefined,
            onFocusInput: isEditingTo
              ? inlineEditingProps?.onFocusInput
              : undefined,
            columnType: filterColumnType,
          });
        }
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
          onNavigateEdit: isEditingValue
            ? inlineEditingProps?.onNavigateEdit
            : undefined,
          onFocusInput: isEditingValue
            ? inlineEditingProps?.onFocusInput
            : undefined,
          columnType: filterColumnType,
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

    // 8. Second Value Badge(s) (Gray) - Show [value][to] after user presses Enter (adds #to marker)
    // Show when waitingForSecondValueTo OR secondValueTo exists (user is typing second value)
    // But DON'T show secondValueTo as badge - it stays in input until final confirmation
    if (
      searchMode.secondOperator &&
      searchMode.secondValue &&
      searchMode.secondOperator === 'inRange' &&
      (searchMode.waitingForSecondValueTo || searchMode.secondValueTo)
    ) {
      // Get column type for second condition (use secondColumn if available, otherwise filter's column)
      const secondConditionColumnType = (
        searchMode.secondColumn || filter?.column
      )?.type;

      // Between operator with #to marker - show [value][to] only
      badges.push({
        id: 'second-value-from',
        type: 'value',
        label: searchMode.secondValue,
        onClear: handlers.onClearSecondValue,
        canClear: true,
        canEdit: false, // Not editable while typing
        columnType: secondConditionColumnType,
      });

      // "to" separator badge
      badges.push({
        id: 'second-separator',
        type: 'separator',
        label: 'to',
        onClear: () => {},
        canClear: false,
        canEdit: false,
      });
      // Note: secondValueTo badge is NOT shown here - user is still typing it in input
      // It will show as part of confirmed multi-condition badges (section 2)
    }

    // Apply isSelected to badge at selectedBadgeIndex
    if (selectedBadgeIndex !== null && selectedBadgeIndex !== undefined) {
      return badges.map((badge, index) => ({
        ...badge,
        isSelected: index === selectedBadgeIndex,
      }));
    }

    return badges;
  }, [searchMode, handlers, inlineEditingProps, selectedBadgeIndex]);
};
