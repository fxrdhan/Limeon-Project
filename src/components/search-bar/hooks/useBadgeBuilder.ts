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

// ============ Scalable Helper Functions ============

/**
 * Get second condition from scalable partialConditions or deprecated fields.
 * Provides unified access to second condition data regardless of source.
 */
function getSecondCondition(searchMode: EnhancedSearchState): {
  column?: typeof searchMode.secondColumn;
  operator?: string;
  value?: string;
  valueTo?: string;
  waitingForValueTo?: boolean;
} {
  // Prefer new scalable field
  const partial = searchMode.partialConditions?.[1];
  if (partial) {
    return {
      column: partial.column,
      operator: partial.operator,
      value: partial.value,
      valueTo: partial.valueTo,
      waitingForValueTo: partial.waitingForValueTo,
    };
  }
  // Fallback to deprecated fields
  return {
    column: searchMode.secondColumn,
    operator: searchMode.secondOperator,
    value: searchMode.secondValue,
    valueTo: searchMode.secondValueTo,
    waitingForValueTo: searchMode.waitingForSecondValueTo,
  };
}

/**
 * Check if there is a second condition being built.
 * Uses scalable activeConditionIndex with fallback.
 */
function hasSecondCondition(searchMode: EnhancedSearchState): boolean {
  // Prefer new scalable field
  if (searchMode.activeConditionIndex !== undefined) {
    return searchMode.activeConditionIndex > 0;
  }
  // Fallback to deprecated fields
  return !!(
    searchMode.secondColumn ||
    searchMode.secondOperator ||
    searchMode.isSecondColumn ||
    searchMode.isSecondOperator
  );
}

// ============ Helper Functions for Badge Creation ============

/**
 * Get inline editing props for a specific value badge.
 * Returns undefined if this badge is not being edited.
 */
function getValueBadgeInlineProps(
  inlineEditingProps: InlineEditingProps | undefined,
  conditionIndex: number,
  isValueTo: boolean
): Pick<
  BadgeConfig,
  | 'isEditing'
  | 'editingValue'
  | 'onValueChange'
  | 'onEditComplete'
  | 'onNavigateEdit'
  | 'onFocusInput'
> | null {
  if (!inlineEditingProps?.editingBadge) return null;

  // Determine expected edit type based on condition index and isValueTo
  const editType =
    conditionIndex === 0
      ? isValueTo
        ? 'firstValueTo'
        : 'firstValue'
      : isValueTo
        ? 'secondValueTo'
        : 'secondValue';

  const isEditing = inlineEditingProps.editingBadge.type === editType;
  if (!isEditing) return null;

  return {
    isEditing: true,
    editingValue: inlineEditingProps.editingBadge.value,
    onValueChange: inlineEditingProps.onInlineValueChange,
    onEditComplete: inlineEditingProps.onInlineEditComplete,
    onNavigateEdit: inlineEditingProps.onNavigateEdit,
    onFocusInput: inlineEditingProps.onFocusInput,
  };
}

/**
 * Get value badge handlers based on condition index.
 * Handles both normal value and valueTo (Between operator).
 */
function getValueBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number,
  totalConditions: number,
  isValueTo: boolean
): { onClear: () => void; onEdit?: () => void; canEdit: boolean } {
  const isFirst = conditionIndex === 0;
  const isLast = conditionIndex === totalConditions - 1;
  const isTwoConditions = totalConditions === 2;

  if (isValueTo) {
    return {
      onClear: isFirst
        ? (handlers.onClearValueTo ?? handlers.onClearValue)
        : (handlers.onClearSecondValueTo ?? handlers.onClearSecondValue),
      onEdit: isFirst ? handlers.onEditValueTo : handlers.onEditSecondValueTo,
      canEdit: !!(isFirst
        ? handlers.onEditValueTo
        : handlers.onEditSecondValueTo),
    };
  }

  return {
    onClear: isFirst
      ? handlers.onClearValue
      : isLast && isTwoConditions
        ? handlers.onClearSecondValue
        : handlers.onClearAll,
    onEdit: isFirst ? handlers.onEditValue : handlers.onEditSecondValue,
    canEdit: true,
  };
}

/**
 * Get badge ID for value badges.
 * Uses consistent IDs for AnimatePresence compatibility.
 */
function getValueBadgeId(
  conditionIndex: number,
  isValueTo: boolean,
  isBetween: boolean
): string {
  const prefix = conditionIndex === 0 ? '' : 'second-';
  if (!isBetween) return `${prefix}value`.replace(/^-/, '') || 'value';
  return `${prefix}value-${isValueTo ? 'to' : 'from'}`.replace(/^-/, '');
}

/**
 * Get badge ID for separator badges.
 */
function getSeparatorBadgeId(conditionIndex: number): string {
  return conditionIndex === 0 ? 'separator' : 'second-separator';
}

/**
 * Create a value badge configuration with all inline editing props.
 */
function createValueBadgeConfig(
  id: string,
  label: string,
  badgeType: 'value' | 'valueSecond',
  handlers: { onClear: () => void; onEdit?: () => void; canEdit: boolean },
  columnType: 'text' | 'number' | 'date' | 'currency' | undefined,
  inlineProps: ReturnType<typeof getValueBadgeInlineProps>
): BadgeConfig {
  return {
    id,
    type: badgeType,
    label,
    onClear: handlers.onClear,
    canClear: true,
    onEdit: handlers.onEdit,
    canEdit: handlers.canEdit,
    ...(inlineProps ?? {}),
    columnType,
  };
}

/**
 * Create a separator badge configuration.
 */
function createSeparatorBadge(conditionIndex: number): BadgeConfig {
  return {
    id: getSeparatorBadgeId(conditionIndex),
    type: 'separator',
    label: 'to',
    onClear: () => {},
    canClear: false,
    canEdit: false,
  };
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
    // Use scalable helper for second condition check
    if (
      !searchMode.isFilterMode &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector &&
      !searchMode.showColumnSelector && // Include column selector for second column
      !searchMode.selectedColumn &&
      !hasSecondCondition(searchMode) // Include second column for multi-column
    ) {
      return badges;
    }

    // Get second condition data using scalable helper (with fallback to deprecated fields)
    const secondCond = getSecondCondition(searchMode);

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
        const conditionColumnType = conditionColumn.type;
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
          const totalConditions = filter.conditions!.length;
          const isBetween =
            condition.operator === 'inRange' && !!condition.valueTo;

          // Check if this is a Between (inRange) operator - needs 2 value badges + separator
          if (isBetween) {
            // Value-from badge
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(index, false, true),
                condition.value,
                'value',
                getValueBadgeHandlers(handlers, index, totalConditions, false),
                conditionColumnType,
                getValueBadgeInlineProps(inlineEditingProps, index, false)
              )
            );

            // "to" separator badge
            badges.push(createSeparatorBadge(index));

            // Value-to badge
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(index, true, true),
                condition.valueTo!,
                'valueSecond',
                getValueBadgeHandlers(handlers, index, totalConditions, true),
                conditionColumnType,
                getValueBadgeInlineProps(inlineEditingProps, index, true)
              )
            );
          } else {
            // Normal operator with single value
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(index, false, false),
                condition.value,
                'value',
                getValueBadgeHandlers(handlers, index, totalConditions, false),
                conditionColumnType,
                getValueBadgeInlineProps(inlineEditingProps, index, false)
              )
            );
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

      // Apply isSelected for multi-condition case before returning
      if (selectedBadgeIndex !== null && selectedBadgeIndex !== undefined) {
        return badges.map((badge, index) => ({
          ...badge,
          isSelected: index === selectedBadgeIndex,
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
      // Single-Condition Value Badges (conditionIndex=0, totalConditions=1)
      const filterColumnType = filter.column.type;
      const isWaitingForValueTo =
        filter.operator === 'inRange' &&
        !filter.valueTo &&
        filter.waitingForValueTo === true;

      const isBetween =
        filter.operator === 'inRange' &&
        (filter.valueTo || isWaitingForValueTo);

      if (isBetween) {
        // Value-from badge
        badges.push(
          createValueBadgeConfig(
            'value-from',
            filter.value,
            'value',
            getValueBadgeHandlers(handlers, 0, 1, false),
            filterColumnType,
            getValueBadgeInlineProps(inlineEditingProps, 0, false)
          )
        );

        // "to" separator badge
        badges.push(createSeparatorBadge(0));

        // Value-to badge (only if confirmed or in partialJoin state)
        if (filter.valueTo && (filter.isConfirmed || searchMode.partialJoin)) {
          badges.push(
            createValueBadgeConfig(
              'value-to',
              filter.valueTo,
              'valueSecond',
              getValueBadgeHandlers(handlers, 0, 1, true),
              filterColumnType,
              getValueBadgeInlineProps(inlineEditingProps, 0, true)
            )
          );
        }
      } else {
        // Normal operator with single value
        badges.push(
          createValueBadgeConfig(
            'value',
            filter.value,
            'value',
            getValueBadgeHandlers(handlers, 0, 1, false),
            filterColumnType,
            getValueBadgeInlineProps(inlineEditingProps, 0, false)
          )
        );
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
    // Use scalable helper: secondCond.column (from partialConditions[1] or deprecated secondColumn)
    if (secondCond.column) {
      badges.push({
        id: 'second-column',
        type: 'column', // Same type as first column badge
        label: secondCond.column.headerName,
        onClear: handlers.onClearSecondColumn || handlers.onClearSecondOperator, // Fallback to clearing second operator
        canClear: true,
        onEdit: handlers.onEditSecondColumn || handlers.onEditColumn, // Fallback to first column edit
        canEdit: true,
      });
    }

    // 7. Second Operator Badge (Blue)
    // Use scalable helper: secondCond.operator (from partialConditions[1] or deprecated secondOperator)
    if (secondCond.operator && filter) {
      // For multi-column, use secondCond.column for operator label
      const columnForLabel = secondCond.column || filter.column;
      const operatorLabel = getOperatorLabelForColumn(
        columnForLabel,
        secondCond.operator
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

    // 8. Second Value Badge(s) (Gray) - Partial state while user is typing
    // Show [value][to] after user presses Enter (adds #to marker)
    // Note: secondCond.valueTo badge is NOT shown here - user is still typing it in input
    // Use scalable helper: secondCond.* (from partialConditions[1] or deprecated second* fields)
    if (
      secondCond.operator &&
      secondCond.value &&
      secondCond.operator === 'inRange' &&
      (secondCond.waitingForValueTo || secondCond.valueTo)
    ) {
      const secondConditionColumnType = (secondCond.column || filter?.column)
        ?.type;

      // Value-from badge (not editable while typing)
      badges.push(
        createValueBadgeConfig(
          'second-value-from',
          secondCond.value,
          'value',
          { onClear: handlers.onClearSecondValue, canEdit: false },
          secondConditionColumnType,
          null
        )
      );

      // "to" separator badge
      badges.push(createSeparatorBadge(1));
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
