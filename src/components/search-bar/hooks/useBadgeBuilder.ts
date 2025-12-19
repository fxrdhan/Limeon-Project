import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';

// ============ Scalable Index-Based Handler Types ============
type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface ScalableHandlers {
  /** Clear a specific part of a condition at given index */
  clearConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  /** Clear a join at given index */
  clearJoin: (joinIndex: number) => void;
  /** Clear everything */
  clearAll: () => void;
  /** Edit a specific part of a condition at given index */
  editConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  /** Edit a join at given index */
  editJoin: (joinIndex: number) => void;
  /** Edit value badge at given index (triggers inline editing) */
  editValueN: (conditionIndex: number, target: 'value' | 'valueTo') => void;
}

// ============ Legacy Handler Types (for backward compatibility) ============
interface LegacyHandlers {
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearValueTo?: () => void;
  onClearPartialJoin: () => void;
  onClearCondition1Column?: () => void;
  onClearCondition1Operator: () => void;
  onClearCondition1Value: () => void;
  onClearCondition1ValueTo?: () => void;
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditCondition1Column?: () => void;
  onEditOperator: (isSecond?: boolean) => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditValueTo?: () => void;
  onEditCondition1Value?: () => void;
  onEditCondition1ValueTo?: () => void;
}

// Combined interface - supports both scalable and legacy
interface BadgeHandlers extends Partial<ScalableHandlers>, LegacyHandlers {}

interface InlineEditingProps {
  editingBadge: {
    conditionIndex: number; // 0 = first condition, 1 = second, etc.
    field: 'value' | 'valueTo'; // Which field is being edited
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: (finalValue?: string) => void;
  onNavigateEdit?: (direction: 'left' | 'right') => void; // Ctrl+E (left) or Ctrl+Shift+E (right)
  onFocusInput?: () => void; // Ctrl+I to exit edit and focus main input
}

// ============ Scalable Helper Functions (Index-Based) ============

import type { SearchColumn } from '../types';

interface PartialConditionData {
  column?: SearchColumn;
  operator?: string;
  value?: string;
  valueTo?: string;
  waitingForValueTo?: boolean;
}

/**
 * Get condition at specific index from scalable partialConditions.
 *
 * @param searchMode - The search state
 * @param index - Condition index (0 = first, 1 = second, etc.)
 */
function getConditionAt(
  searchMode: EnhancedSearchState,
  index: number
): PartialConditionData {
  const partial = searchMode.partialConditions?.[index];
  if (partial) {
    return {
      column: partial.column,
      operator: partial.operator,
      value: partial.value,
      valueTo: partial.valueTo,
      waitingForValueTo: partial.waitingForValueTo,
    };
  }
  return {};
}

/**
 * Get the number of conditions being built.
 */
function getConditionCount(searchMode: EnhancedSearchState): number {
  return searchMode.partialConditions?.length ?? 1;
}

/**
 * Check if currently building condition at index > 0.
 */
function isMultiConditionMode(searchMode: EnhancedSearchState): boolean {
  return getConditionCount(searchMode) > 1;
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

  // Check if this badge matches the editing state using index-based comparison
  const { conditionIndex: editingIndex, field: editingField } =
    inlineEditingProps.editingBadge;
  const expectedField = isValueTo ? 'valueTo' : 'value';
  const isEditing =
    editingIndex === conditionIndex && editingField === expectedField;
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
 * Uses scalable handlers when available, falls back to legacy.
 */
function getValueBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number,
  totalConditions: number,
  isValueTo: boolean
): { onClear: () => void; onEdit?: () => void; canEdit: boolean } {
  const target: BadgeTarget = isValueTo ? 'valueTo' : 'value';

  const isFirst = conditionIndex === 0;
  const isLast = conditionIndex === totalConditions - 1;
  const isTwoConditions = totalConditions === 2;

  // For value editing: prefer scalable editValueN handler when available.
  // This properly triggers inline editing via setEditingBadge with correct conditionIndex.
  // Fall back to legacy handlers (onEditValue/onEditCondition1Value) for backward compatibility.
  // For clearing: prefer scalable handlers if available.

  // Scalable onEdit handler - works for any conditionIndex
  const scalableOnEdit = handlers.editValueN
    ? () =>
        handlers.editValueN!(conditionIndex, isValueTo ? 'valueTo' : 'value')
    : undefined;

  if (isValueTo) {
    // Legacy fallback for valueTo editing
    const legacyOnEdit = isFirst
      ? handlers.onEditValueTo
      : handlers.onEditCondition1ValueTo;

    return {
      onClear: handlers.clearConditionPart
        ? () => handlers.clearConditionPart!(conditionIndex, target)
        : isFirst
          ? (handlers.onClearValueTo ?? handlers.onClearValue)
          : (handlers.onClearCondition1ValueTo ??
            handlers.onClearCondition1Value),
      onEdit: scalableOnEdit ?? legacyOnEdit,
      canEdit: !!(scalableOnEdit ?? legacyOnEdit),
    };
  }

  // Legacy fallback for value editing
  const legacyOnEdit = isFirst
    ? handlers.onEditValue
    : handlers.onEditCondition1Value;

  return {
    onClear: handlers.clearConditionPart
      ? () => handlers.clearConditionPart!(conditionIndex, target)
      : isFirst
        ? handlers.onClearValue
        : isLast && isTwoConditions
          ? handlers.onClearCondition1Value
          : handlers.onClearAll,
    onEdit: scalableOnEdit ?? legacyOnEdit,
    canEdit: true,
  };
}

/**
 * Get column badge handlers for a condition at given index.
 * Uses scalable handlers when available, falls back to legacy.
 */
function getColumnBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number
): { onClear: () => void; onEdit: () => void } {
  // Prefer scalable handlers if available
  if (handlers.clearConditionPart && handlers.editConditionPart) {
    return {
      onClear: () => handlers.clearConditionPart!(conditionIndex, 'column'),
      onEdit: () => handlers.editConditionPart!(conditionIndex, 'column'),
    };
  }

  // Fallback to legacy handlers
  if (conditionIndex === 0) {
    return {
      onClear: handlers.onClearColumn,
      onEdit: handlers.onEditColumn,
    };
  }
  return {
    onClear:
      handlers.onClearCondition1Column ?? handlers.onClearCondition1Operator,
    onEdit: handlers.onEditCondition1Column ?? handlers.onEditColumn,
  };
}

/**
 * Get operator badge handlers for a condition at given index.
 * Uses scalable handlers when available, falls back to legacy.
 */
function getOperatorBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number,
  totalConditions: number
): { onClear: () => void; onEdit: () => void } {
  // Prefer scalable handlers if available
  if (handlers.clearConditionPart && handlers.editConditionPart) {
    return {
      onClear: () => handlers.clearConditionPart!(conditionIndex, 'operator'),
      onEdit: () => handlers.editConditionPart!(conditionIndex, 'operator'),
    };
  }

  // Fallback to legacy handlers
  if (conditionIndex === 0) {
    return {
      onClear: handlers.onClearOperator,
      onEdit: () => handlers.onEditOperator(false),
    };
  }

  const isLast = conditionIndex === totalConditions - 1;
  return {
    onClear:
      isLast && totalConditions === 2
        ? handlers.onClearCondition1Operator
        : handlers.onClearAll,
    onEdit: () => handlers.onEditOperator(true),
  };
}

/**
 * Get join badge handlers for a join at given index.
 * Uses scalable handlers when available, falls back to legacy.
 */
function getJoinBadgeHandlers(
  handlers: BadgeHandlers,
  joinIndex: number
): { onClear: () => void; onEdit: () => void } {
  // Prefer scalable handlers if available
  if (handlers.clearJoin && handlers.editJoin) {
    return {
      onClear: () => handlers.clearJoin!(joinIndex),
      onEdit: () => handlers.editJoin!(joinIndex),
    };
  }

  // Fallback to legacy handlers
  return {
    onClear: handlers.onClearPartialJoin,
    onEdit: handlers.onEditJoin,
  };
}

/**
 * Get badge ID for value badges.
 * Uses consistent index-based IDs for AnimatePresence compatibility.
 * Format: condition-{index}-value or condition-{index}-value-{from|to}
 */
function getValueBadgeId(
  conditionIndex: number,
  isValueTo: boolean,
  isBetween: boolean
): string {
  const prefix = `condition-${conditionIndex}`;
  if (!isBetween) return `${prefix}-value`;
  return `${prefix}-value-${isValueTo ? 'to' : 'from'}`;
}

/**
 * Get badge ID for separator badges.
 * Format: condition-{index}-separator
 */
function getSeparatorBadgeId(conditionIndex: number): string {
  return `condition-${conditionIndex}-separator`;
}

/**
 * Create a value badge configuration with all inline editing props.
 */
function createValueBadgeConfig(
  id: string,
  label: string,
  badgeType: 'value' | 'valueTo',
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
    // Use scalable helper: isMultiConditionMode checks if building condition[1+]
    if (
      !searchMode.isFilterMode &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector &&
      !searchMode.showColumnSelector && // Include column selector for second column
      !searchMode.selectedColumn &&
      !isMultiConditionMode(searchMode) // Include multi-column filters
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
        id: 'condition-0-column',
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
    // Also handle when join selector is open on multi-condition (for adding N+1 condition)
    if (
      (searchMode.isFilterMode || searchMode.showJoinOperatorSelector) &&
      isMultiCondition &&
      filter.conditions
    ) {
      filter.conditions.forEach((condition, index) => {
        // Use condition's column if available (multi-column), otherwise use filter's column
        const conditionColumn = condition.column || filter.column;
        const conditionColumnType = conditionColumn.type;
        const operatorLabel = getOperatorLabelForColumn(
          conditionColumn,
          condition.operator
        );

        // For condition[N] (index >= 1), always add column badge BEFORE operator
        // Show even if same column as first (no simplification)
        if (index >= 1) {
          const condNColumnLabel =
            condition.column?.headerName || filter.column.headerName;
          const columnHandlers = getColumnBadgeHandlers(handlers, index);
          badges.push({
            id: `condition-${index}-column`,
            type: 'column',
            label: condNColumnLabel,
            onClear: columnHandlers.onClear,
            canClear: true,
            onEdit: columnHandlers.onEdit,
            canEdit: true,
          });
        }

        // Operator badge for this condition
        // Use index-based IDs: 'condition-0-operator', 'condition-1-operator', etc.
        // This ensures AnimatePresence doesn't see them as new badges on state transitions
        // IMPORTANT: Use scalable handlers for N-condition support
        const operatorHandlers = getOperatorBadgeHandlers(
          handlers,
          index,
          filter.conditions!.length
        );
        badges.push({
          id: `condition-${index}-operator`,
          type: 'operator',
          label: operatorLabel,
          onClear: operatorHandlers.onClear,
          canClear: true,
          onEdit: operatorHandlers.onEdit,
          canEdit: true, // Operator badges are editable
        });

        // Value badge(s) for this condition (skip if value is empty)
        // Also skip if user is actively typing this condition's value
        const isTypingThisConditionValue =
          searchMode.activeConditionIndex === index &&
          !searchMode.showJoinOperatorSelector &&
          !searchMode.showColumnSelector &&
          !searchMode.showOperatorSelector;

        if (condition.value && !isTypingThisConditionValue) {
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
                'valueTo',
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

        // Join badge between conditions (not after last one) - use index-based ID
        // Use filter.joins[index] for the correct join at each position
        if (index < filter.conditions!.length - 1) {
          const joinLabel = filter.joins?.[index] || filter.joinOperator || '';
          const joinHandlers = getJoinBadgeHandlers(handlers, index);
          badges.push({
            id: `join-${index}`,
            type: 'join',
            label: joinLabel,
            onClear: joinHandlers.onClear,
            canClear: true,
            onEdit: joinHandlers.onEdit,
            canEdit: true, // Join badges are editable
          });
        }
      });

      // Check if there are additional partial conditions being built beyond complete ones
      // If so, DON'T return early - continue to N-condition loop to render them
      const completeConditionsCount = filter.conditions?.length ?? 0;
      const partialConditionsCount = searchMode.partialConditions?.length ?? 0;
      const hasPartialConditionsBeingBuilt =
        partialConditionsCount > completeConditionsCount;

      if (!hasPartialConditionsBeingBuilt) {
        // Apply isSelected for multi-condition case before returning
        if (selectedBadgeIndex !== null && selectedBadgeIndex !== undefined) {
          return badges.map((badge, index) => ({
            ...badge,
            isSelected: index === selectedBadgeIndex,
          }));
        }
        return badges; // Return early for multi-condition case
      }
      // Otherwise, continue to N-condition loop for partial condition being built
    }

    // Track if multi-condition block executed (used to skip single-condition sections)
    // Multi-condition block runs when: (isFilterMode || showJoinOperatorSelector) && isMultiCondition
    const multiConditionBlockDidExecute =
      (searchMode.isFilterMode || searchMode.showJoinOperatorSelector) &&
      isMultiCondition &&
      filter?.conditions;

    // 3. Single-Condition Operator Badge (Blue)
    // SKIP if multi-condition block already rendered condition 0
    // Check if building condition at index > 0 using scalable activeConditionIndex
    const isBuildingConditionN =
      searchMode.activeConditionIndex !== undefined &&
      searchMode.activeConditionIndex > 0;

    // Check if we're in N-condition partial state (using partialConditions array)
    // In this state, we need to render condition 0 via single-condition sections
    // ONLY if multi-condition block didn't execute
    const isNConditionPartialState =
      (searchMode.partialConditions?.length ?? 0) > 1;

    const shouldShowSingleOperator =
      !multiConditionBlockDidExecute && // Skip if multi-condition block already rendered
      (searchMode.isFilterMode ||
        searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && isBuildingConditionN) ||
        (!searchMode.isFilterMode && searchMode.partialJoin && filter)) &&
      filter &&
      (filter.operator !== 'contains' || filter.isExplicitOperator) &&
      (!filter.isMultiCondition || isNConditionPartialState);

    if (shouldShowSingleOperator) {
      const operatorLabel = getOperatorLabelForColumn(
        filter.column,
        filter.operator
      );

      badges.push({
        id: 'condition-0-operator',
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
      !multiConditionBlockDidExecute && // Skip if multi-condition block already rendered
      (searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && isBuildingConditionN && filter) ||
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
      (!filter?.isMultiCondition || isNConditionPartialState);

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
              'valueTo',
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

    // ============ SCALABLE N-CONDITION BADGES (index > 0) ============
    // Loop over all conditions at index > 0 (second, third, etc.)
    // This replaces hardcoded condition[1] handling
    const partialConditions = searchMode.partialConditions || [];
    const totalPartialConditions = partialConditions.length;

    // Determine starting index for N-condition loop
    // Only skip conditions that were ACTUALLY rendered by multi-condition block
    // Uses multiConditionBlockDidExecute flag defined earlier
    const multiConditionRenderedCount = multiConditionBlockDidExecute
      ? filter!.conditions!.length
      : 0;
    const nConditionStartIdx = Math.max(1, multiConditionRenderedCount);

    for (
      let condIdx = nConditionStartIdx;
      condIdx < totalPartialConditions;
      condIdx++
    ) {
      const condition = getConditionAt(searchMode, condIdx);
      const joinIndex = condIdx - 1;

      // 5. Join Badge (Orange) - AND/OR between conditions
      // Use partialJoin for first join, or joins array for N joins
      const joinLabel = searchMode.joins?.[joinIndex] || searchMode.partialJoin;
      if (joinLabel) {
        const joinHandlers = getJoinBadgeHandlers(handlers, joinIndex);
        badges.push({
          id: `join-${joinIndex}`,
          type: 'join',
          label: joinLabel,
          onClear: joinHandlers.onClear,
          canClear: true,
          onEdit: joinHandlers.onEdit,
          canEdit: true,
        });
      }

      // 6. Column Badge (Purple) - for multi-column filters
      if (condition.column) {
        const columnHandlers = getColumnBadgeHandlers(handlers, condIdx);
        badges.push({
          id: `condition-${condIdx}-column`,
          type: 'column',
          label: condition.column.headerName,
          onClear: columnHandlers.onClear,
          canClear: true,
          onEdit: columnHandlers.onEdit,
          canEdit: true,
        });
      }

      // 7. Operator Badge (Blue)
      if (condition.operator && filter) {
        const columnForLabel = condition.column || filter.column;
        const operatorLabel = getOperatorLabelForColumn(
          columnForLabel,
          condition.operator
        );
        const operatorHandlers = getOperatorBadgeHandlers(
          handlers,
          condIdx,
          totalPartialConditions
        );

        badges.push({
          id: `condition-${condIdx}-operator`,
          type: 'operatorN',
          label: operatorLabel,
          onClear: operatorHandlers.onClear,
          canClear: true,
          onEdit: operatorHandlers.onEdit,
          canEdit: true,
        });
      }

      // 8. Value Badge(s) (Gray) - for condition N (index > 0)
      // Don't show value badge if user is actively typing this condition's value
      // Only show when: we've moved past this condition OR join/column selector is open
      const isTypingThisConditionValue =
        searchMode.activeConditionIndex === condIdx &&
        !searchMode.showJoinOperatorSelector &&
        !searchMode.showColumnSelector;

      // Special check for Between operator: show value badge if we have first value
      // and are waiting for second value (even if "active")
      const isBetweenWaiting =
        condition.operator === 'inRange' && condition.waitingForValueTo;

      if (
        condition.operator &&
        condition.value &&
        (!isTypingThisConditionValue ||
          isBetweenWaiting ||
          (condition.operator === 'inRange' && !!condition.valueTo))
      ) {
        const columnType = (condition.column || filter?.column)?.type;
        const isBetween =
          condition.operator === 'inRange' &&
          (condition.waitingForValueTo || condition.valueTo);

        if (isBetween) {
          // Between operator: value-from, separator, value-to
          const valueFromHandlers = getValueBadgeHandlers(
            handlers,
            condIdx,
            totalPartialConditions,
            false
          );

          // Value-from badge
          badges.push(
            createValueBadgeConfig(
              `condition-${condIdx}-value-from`,
              condition.value,
              'value',
              { onClear: valueFromHandlers.onClear, canEdit: false },
              columnType,
              null
            )
          );

          // "to" separator badge
          badges.push(createSeparatorBadge(condIdx));

          // Value-to badge (if available)
          // Hide if actively typing this condition (logic handled by input)
          if (condition.valueTo && !isTypingThisConditionValue) {
            const valueToHandlers = getValueBadgeHandlers(
              handlers,
              condIdx,
              totalPartialConditions,
              true
            );
            badges.push(
              createValueBadgeConfig(
                `condition-${condIdx}-value-to`,
                condition.valueTo,
                'valueTo',
                { onClear: valueToHandlers.onClear, canEdit: false },
                columnType,
                null
              )
            );
          }
        } else {
          // Normal operator: single value badge
          const valueHandlers = getValueBadgeHandlers(
            handlers,
            condIdx,
            totalPartialConditions,
            false
          );

          badges.push(
            createValueBadgeConfig(
              `condition-${condIdx}-value`,
              condition.value,
              'value',
              {
                onClear: valueHandlers.onClear,
                onEdit: valueHandlers.onEdit,
                canEdit: valueHandlers.canEdit,
              },
              columnType,
              getValueBadgeInlineProps(inlineEditingProps, condIdx, false)
            )
          );
        }
      }
    }

    // Handle legacy case: partialJoin exists but no partialConditions[1]
    // This maintains backward compatibility during transition
    if (searchMode.partialJoin && totalPartialConditions <= 1) {
      const joinHandlers = getJoinBadgeHandlers(handlers, 0);
      badges.push({
        id: 'join-0',
        type: 'join',
        label: searchMode.partialJoin,
        onClear: joinHandlers.onClear,
        canClear: true,
        onEdit: joinHandlers.onEdit,
        canEdit: true,
      });
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
