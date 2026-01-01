import { useMemo } from 'react';
import {
  EnhancedSearchState,
  FilterConditionNode,
  FilterGroup,
} from '../types';
import { BadgeConfig } from '../types/badge';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';

// ============ Scalable Index-Based Handler Types ============
type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface BadgeHandlers {
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

interface GroupInlineEditingProps {
  editingBadge: {
    path: number[];
    field: 'value' | 'valueTo';
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: (finalValue?: string) => void;
}

interface GroupBadgeHandlers {
  onEditValue?: (
    path: number[],
    field: 'value' | 'valueTo',
    value: string
  ) => void;
  onClearCondition?: (path: number[]) => void;
  onClearGroup?: (path: number[]) => void;
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

const noop = () => {};

const createStaticBadge = (
  id: string,
  type: BadgeConfig['type'],
  label: string,
  columnType?: BadgeConfig['columnType'],
  options?: {
    onClear?: () => void;
    canClear?: boolean;
    onEdit?: () => void;
    canEdit?: boolean;
  }
): BadgeConfig => ({
  id,
  type,
  label,
  onClear: options?.onClear ?? noop,
  canClear: options?.canClear ?? false,
  onEdit: options?.onEdit,
  canEdit: options?.canEdit ?? false,
  columnType,
});

const createStaticSeparatorBadge = (id: string): BadgeConfig => ({
  id,
  type: 'separator',
  label: 'to',
  onClear: () => {},
  canClear: false,
  canEdit: false,
});

const getGroupValueBadgeInlineProps = (
  inlineEditingProps: GroupInlineEditingProps | undefined,
  path: number[],
  field: 'value' | 'valueTo'
): Pick<
  BadgeConfig,
  'isEditing' | 'editingValue' | 'onValueChange' | 'onEditComplete'
> | null => {
  if (!inlineEditingProps?.editingBadge) return null;
  const { editingBadge } = inlineEditingProps;
  const samePath =
    editingBadge.path.length === path.length &&
    editingBadge.path.every((value, index) => value === path[index]);
  if (!samePath || editingBadge.field !== field) return null;

  return {
    isEditing: true,
    editingValue: editingBadge.value,
    onValueChange: inlineEditingProps.onInlineValueChange,
    onEditComplete: inlineEditingProps.onInlineEditComplete,
  };
};

const buildBadgesFromCondition = (
  condition: FilterConditionNode,
  key: string,
  path: number[],
  inlineEditingProps?: GroupInlineEditingProps,
  groupHandlers?: GroupBadgeHandlers
): BadgeConfig[] => {
  const columnLabel = condition.column?.headerName || condition.field || '';
  const columnType = condition.column?.type;
  const operatorLabel = condition.column
    ? getOperatorLabelForColumn(condition.column, condition.operator)
    : condition.operator;

  const badges: BadgeConfig[] = [
    createStaticBadge(`condition-${key}-column`, 'column', columnLabel),
    createStaticBadge(`condition-${key}-operator`, 'operator', operatorLabel),
  ];

  if (condition.operator === 'inRange') {
    if (condition.value) {
      const inlineProps = getGroupValueBadgeInlineProps(
        inlineEditingProps,
        path,
        'value'
      );
      const onEdit = groupHandlers?.onEditValue
        ? () => groupHandlers.onEditValue?.(path, 'value', condition.value)
        : undefined;
      const onClear = groupHandlers?.onClearCondition
        ? () => groupHandlers.onClearCondition?.(path)
        : undefined;
      badges.push({
        ...createStaticBadge(
          `condition-${key}-value-from`,
          'value',
          condition.value,
          columnType,
          {
            onEdit,
            canEdit: !!groupHandlers?.onEditValue,
            onClear,
            canClear: !!groupHandlers?.onClearCondition,
          }
        ),
        ...(inlineProps ?? {}),
      });
      badges.push(createStaticSeparatorBadge(`condition-${key}-separator`));
    }
    if (condition.valueTo) {
      const inlineProps = getGroupValueBadgeInlineProps(
        inlineEditingProps,
        path,
        'valueTo'
      );
      const onEdit = groupHandlers?.onEditValue
        ? () => groupHandlers.onEditValue?.(path, 'valueTo', condition.valueTo!)
        : undefined;
      const onClear = groupHandlers?.onClearCondition
        ? () => groupHandlers.onClearCondition?.(path)
        : undefined;
      badges.push({
        ...createStaticBadge(
          `condition-${key}-value-to`,
          'valueTo',
          condition.valueTo,
          columnType,
          {
            onEdit,
            canEdit: !!groupHandlers?.onEditValue,
            onClear,
            canClear: !!groupHandlers?.onClearCondition,
          }
        ),
        ...(inlineProps ?? {}),
      });
    }
  } else if (condition.value) {
    const inlineProps = getGroupValueBadgeInlineProps(
      inlineEditingProps,
      path,
      'value'
    );
    const onEdit = groupHandlers?.onEditValue
      ? () => groupHandlers.onEditValue?.(path, 'value', condition.value)
      : undefined;
    const onClear = groupHandlers?.onClearCondition
      ? () => groupHandlers.onClearCondition?.(path)
      : undefined;
    badges.push({
      ...createStaticBadge(
        `condition-${key}-value`,
        'value',
        condition.value,
        columnType,
        {
          onEdit,
          canEdit: !!groupHandlers?.onEditValue,
          onClear,
          canClear: !!groupHandlers?.onClearCondition,
        }
      ),
      ...(inlineProps ?? {}),
    });
  }

  return badges;
};

const buildBadgesFromGroup = (
  group: FilterGroup,
  path: number[] = [],
  inlineEditingProps?: GroupInlineEditingProps,
  groupHandlers?: GroupBadgeHandlers
): BadgeConfig[] => {
  const pathKey = path.length > 0 ? path.join('-') : 'root';
  const onClearGroup = groupHandlers?.onClearGroup
    ? () => groupHandlers.onClearGroup?.(path)
    : undefined;
  const isExplicit = group.isExplicit !== false;
  const badges: BadgeConfig[] = [];

  if (isExplicit) {
    badges.push(
      createStaticBadge(`group-open-${pathKey}`, 'groupOpen', '(', undefined, {
        onClear: onClearGroup,
        canClear: !!groupHandlers?.onClearGroup,
      })
    );
  }

  group.nodes.forEach((node, index) => {
    const childPath = [...path, index];
    const childKey = childPath.join('-');

    if (node.kind === 'group') {
      badges.push(
        ...buildBadgesFromGroup(
          node,
          childPath,
          inlineEditingProps,
          groupHandlers
        )
      );
    } else {
      badges.push(
        ...buildBadgesFromCondition(
          node,
          childKey,
          childPath,
          inlineEditingProps,
          groupHandlers
        )
      );
    }

    if (index < group.nodes.length - 1) {
      badges.push(
        createStaticBadge(`join-${pathKey}-${index}`, 'join', group.join)
      );
    }
  });

  if (isExplicit && group.isClosed !== false) {
    badges.push(
      createStaticBadge(
        `group-close-${pathKey}`,
        'groupClose',
        ')',
        undefined,
        {
          onClear: onClearGroup,
          canClear: !!groupHandlers?.onClearGroup,
        }
      )
    );
  }
  return badges;
};

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
 */
function getValueBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number,
  isValueTo: boolean
): { onClear: () => void; onEdit?: () => void; canEdit: boolean } {
  const target: BadgeTarget = isValueTo ? 'valueTo' : 'value';

  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, target),
    onEdit: () => handlers.editValueN(conditionIndex, target),
    canEdit: true,
  };
}

/**
 * Get column badge handlers for a condition at given index.
 */
function getColumnBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number
): { onClear: () => void; onEdit: () => void } {
  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, 'column'),
    onEdit: () => handlers.editConditionPart(conditionIndex, 'column'),
  };
}

/**
 * Get operator badge handlers for a condition at given index.
 */
function getOperatorBadgeHandlers(
  handlers: BadgeHandlers,
  conditionIndex: number
): { onClear: () => void; onEdit: () => void } {
  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, 'operator'),
    onEdit: () => handlers.editConditionPart(conditionIndex, 'operator'),
  };
}

/**
 * Get join badge handlers for a join at given index.
 */
function getJoinBadgeHandlers(
  handlers: BadgeHandlers,
  joinIndex: number
): { onClear: () => void; onEdit: () => void } {
  return {
    onClear: () => handlers.clearJoin(joinIndex),
    onEdit: () => handlers.editJoin(joinIndex),
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
  selectedBadgeIndex?: number | null,
  groupInlineEditingProps?: GroupInlineEditingProps,
  groupHandlers?: GroupBadgeHandlers
): BadgeConfig[] => {
  return useMemo(() => {
    const badges: BadgeConfig[] = [];

    // Early return if no badges should be shown
    if (
      !searchMode.isFilterMode &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector &&
      !searchMode.showColumnSelector &&
      !searchMode.selectedColumn &&
      !isMultiConditionMode(searchMode)
    ) {
      return badges;
    }

    const filter = searchMode.filterSearch;

    if (filter?.filterGroup && searchMode.isFilterMode) {
      const groupBadges = buildBadgesFromGroup(
        filter.filterGroup,
        [],
        groupInlineEditingProps,
        groupHandlers
      );
      return selectedBadgeIndex !== null && selectedBadgeIndex !== undefined
        ? groupBadges.map((b, i) => ({
            ...b,
            isSelected: i === selectedBadgeIndex,
          }))
        : groupBadges;
    }
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
      const columnHandlers = getColumnBadgeHandlers(handlers, 0);
      badges.push({
        id: 'condition-0-column',
        type: 'column',
        label:
          filter?.column.headerName ||
          searchMode.selectedColumn?.headerName ||
          '',
        onClear: columnHandlers.onClear,
        canClear: true,
        onEdit: columnHandlers.onEdit,
        canEdit: true,
      });
    }

    // 2. Handle Multi-Condition Badges (when filter is confirmed with multiple conditions)
    if (
      (searchMode.isFilterMode || searchMode.showJoinOperatorSelector) &&
      isMultiCondition &&
      filter.conditions
    ) {
      filter.conditions.forEach((condition, index) => {
        const conditionColumn = condition.column || filter.column;
        const conditionColumnType = conditionColumn.type;
        const operatorLabel = getOperatorLabelForColumn(
          conditionColumn,
          condition.operator
        );

        // For condition[N] (index >= 1), add column badge
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

        // Operator badge
        const operatorHandlers = getOperatorBadgeHandlers(handlers, index);
        badges.push({
          id: `condition-${index}-operator`,
          type: 'operator',
          label: operatorLabel,
          onClear: operatorHandlers.onClear,
          canClear: true,
          onEdit: operatorHandlers.onEdit,
          canEdit: true,
        });

        // Value badge(s)
        const isTypingThisValue =
          searchMode.activeConditionIndex === index &&
          !searchMode.showJoinOperatorSelector &&
          !searchMode.showColumnSelector &&
          !searchMode.showOperatorSelector;

        if (condition.value && !isTypingThisValue) {
          const isBetween = condition.operator === 'inRange';

          if (isBetween) {
            // Value-from
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(index, false, true),
                condition.value,
                'value',
                getValueBadgeHandlers(handlers, index, false),
                conditionColumnType,
                getValueBadgeInlineProps(inlineEditingProps, index, false)
              )
            );
            badges.push(createSeparatorBadge(index));
            // Value-to
            if (condition.valueTo) {
              badges.push(
                createValueBadgeConfig(
                  getValueBadgeId(index, true, true),
                  condition.valueTo,
                  'valueTo',
                  getValueBadgeHandlers(handlers, index, true),
                  conditionColumnType,
                  getValueBadgeInlineProps(inlineEditingProps, index, true)
                )
              );
            }
          } else {
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(index, false, false),
                condition.value,
                'value',
                getValueBadgeHandlers(handlers, index, false),
                conditionColumnType,
                getValueBadgeInlineProps(inlineEditingProps, index, false)
              )
            );
          }
        }

        // Join badge
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
            canEdit: true,
          });
        }
      });

      // Special case: Partial condition being built beyond complete ones
      const completeCount = filter.conditions?.length ?? 0;
      const partialCount = searchMode.partialConditions?.length ?? 0;
      if (partialCount <= completeCount) {
        return selectedBadgeIndex !== null && selectedBadgeIndex !== undefined
          ? badges.map((b, i) => ({
              ...b,
              isSelected: i === selectedBadgeIndex,
            }))
          : badges;
      }
    }

    // 3. Single-Condition Operator & Value (Fallback/Building)
    const isBuildingN = (searchMode.activeConditionIndex ?? 0) > 0;
    const isNPartial = (searchMode.partialConditions?.length ?? 0) > 1;
    const mBlockExec =
      (searchMode.isFilterMode || searchMode.showJoinOperatorSelector) &&
      isMultiCondition &&
      filter?.conditions;

    if (
      !mBlockExec &&
      filter &&
      (filter.operator !== 'contains' || filter.isExplicitOperator)
    ) {
      if (!isBuildingN || isNPartial) {
        const opHandlers = getOperatorBadgeHandlers(handlers, 0);
        badges.push({
          id: 'condition-0-operator',
          type: 'operator',
          label: getOperatorLabelForColumn(filter.column, filter.operator),
          onClear: opHandlers.onClear,
          canClear: true,
          onEdit: opHandlers.onEdit,
          canEdit: true,
        });
      }

      // Only show value badge if value is confirmed (Enter/Space pressed)
      // OR if user has moved on to add another condition (partialJoin exists)
      // OR if Between operator is waiting for valueTo (first value should be visible as badge)
      // OR if Between operator is typing valueTo (both values visible as badges while typing)
      if (
        filter.value &&
        (filter.isConfirmed ||
          searchMode.partialJoin ||
          filter.waitingForValueTo ||
          (filter.operator === 'inRange' &&
            filter.valueTo &&
            !filter.isConfirmed))
      ) {
        const valHandlersFrom = getValueBadgeHandlers(handlers, 0, false);
        const isBetween = filter.operator === 'inRange';

        if (isBetween) {
          badges.push(
            createValueBadgeConfig(
              getValueBadgeId(0, false, true),
              filter.value,
              'value',
              valHandlersFrom,
              filter.column.type,
              getValueBadgeInlineProps(inlineEditingProps, 0, false)
            )
          );
          badges.push(createSeparatorBadge(0));
          if (
            filter.valueTo &&
            (filter.isConfirmed || searchMode.partialJoin)
          ) {
            const valHandlersTo = getValueBadgeHandlers(handlers, 0, true);
            badges.push(
              createValueBadgeConfig(
                getValueBadgeId(0, true, true),
                filter.valueTo,
                'valueTo',
                valHandlersTo,
                filter.column.type,
                getValueBadgeInlineProps(inlineEditingProps, 0, true)
              )
            );
          }
        } else {
          badges.push(
            createValueBadgeConfig(
              getValueBadgeId(0, false, false),
              filter.value,
              'value',
              valHandlersFrom,
              filter.column.type,
              getValueBadgeInlineProps(inlineEditingProps, 0, false)
            )
          );
        }
      }
    }

    // 4. Scalable N-Condition Loop (for partial conditions)
    const partialConditions = searchMode.partialConditions || [];
    const nStart = mBlockExec ? filter!.conditions!.length : 1;

    for (let i = nStart; i < partialConditions.length; i++) {
      const cond = getConditionAt(searchMode, i);
      const jIdx = i - 1;

      // Join
      const jVal = searchMode.joins?.[jIdx] || searchMode.partialJoin;
      if (jVal) {
        const jHandlers = getJoinBadgeHandlers(handlers, jIdx);
        badges.push({
          id: `join-${jIdx}`,
          type: 'join',
          label: jVal,
          onClear: jHandlers.onClear,
          canClear: true,
          onEdit: jHandlers.onEdit,
          canEdit: true,
        });
      }

      // Column
      if (cond.column) {
        const cHandlers = getColumnBadgeHandlers(handlers, i);
        badges.push({
          id: `condition-${i}-column`,
          type: 'column',
          label: cond.column.headerName,
          onClear: cHandlers.onClear,
          canClear: true,
          onEdit: cHandlers.onEdit,
          canEdit: true,
        });
      }

      // Operator
      if (cond.operator) {
        const oHandlers = getOperatorBadgeHandlers(handlers, i);
        badges.push({
          id: `condition-${i}-operator`,
          type: 'operator',
          label: getOperatorLabelForColumn(
            cond.column || filter!.column,
            cond.operator
          ),
          onClear: oHandlers.onClear,
          canClear: true,
          onEdit: oHandlers.onEdit,
          canEdit: true,
        });
      }

      // Value
      const isTyping =
        searchMode.activeConditionIndex === i &&
        !searchMode.showJoinOperatorSelector &&
        !searchMode.showColumnSelector &&
        !searchMode.showOperatorSelector;

      if (
        cond.operator &&
        cond.value &&
        (!isTyping || cond.waitingForValueTo || cond.valueTo)
      ) {
        const isBetween = cond.operator === 'inRange';
        if (isBetween) {
          badges.push(
            createValueBadgeConfig(
              `condition-${i}-value-from`,
              cond.value,
              'value',
              getValueBadgeHandlers(handlers, i, false),
              (cond.column || filter?.column)?.type,
              getValueBadgeInlineProps(inlineEditingProps, i, false)
            )
          );
          badges.push(createSeparatorBadge(i));
          if (cond.valueTo && !isTyping) {
            badges.push(
              createValueBadgeConfig(
                `condition-${i}-value-to`,
                cond.valueTo,
                'valueTo',
                getValueBadgeHandlers(handlers, i, true),
                (cond.column || filter?.column)?.type,
                getValueBadgeInlineProps(inlineEditingProps, i, true)
              )
            );
          }
        } else {
          badges.push(
            createValueBadgeConfig(
              `condition-${i}-value`,
              cond.value,
              'value',
              getValueBadgeHandlers(handlers, i, false),
              (cond.column || filter?.column)?.type,
              getValueBadgeInlineProps(inlineEditingProps, i, false)
            )
          );
        }
      }
    }

    if (selectedBadgeIndex !== null && selectedBadgeIndex !== undefined) {
      return badges.map((b, i) => ({
        ...b,
        isSelected: i === selectedBadgeIndex,
      }));
    }

    return badges;
  }, [
    searchMode,
    handlers,
    inlineEditingProps,
    selectedBadgeIndex,
    groupInlineEditingProps,
    groupHandlers,
  ]);
};
