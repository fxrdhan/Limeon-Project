import { useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
import {
  buildBadgesFromGroup,
  type GroupBadgeHandlers,
  type GroupInlineEditingProps,
} from '../utils/groupBadgeBuilder';
import { getOperatorLabelForColumn } from '../utils/operatorUtils';
import {
  createSeparatorBadge,
  createValueBadgeConfig,
  getColumnBadgeHandlers,
  getConditionAt,
  getJoinBadgeHandlers,
  getOperatorBadgeHandlers,
  getValueBadgeHandlers,
  getValueBadgeId,
  getValueBadgeInlineProps,
  isMultiConditionMode,
  type BadgeHandlers,
  type InlineEditingProps,
} from './badgeBuilderHelpers';

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
      const attachInsertAfter = (
        badge: BadgeConfig,
        conditionIndex: number,
        badgeType: 'value' | 'valueTo'
      ): BadgeConfig => {
        // Insert should appear on the last value badge of a condition:
        // - normal operators: `value`
        // - Between/inRange: `valueTo`
        const condition = filter.conditions?.[conditionIndex];
        const isBetween = condition?.operator === 'inRange';
        const isLastValueBadge = isBetween
          ? badgeType === 'valueTo'
          : badgeType === 'value';

        const canInsert =
          isLastValueBadge &&
          !!handlers.insertConditionAfter &&
          !!filter.isConfirmed &&
          conditionIndex < filter.conditions!.length - 1;

        if (!canInsert) return badge;
        return {
          ...badge,
          canInsert: true,
          onInsert: () => handlers.insertConditionAfter?.(conditionIndex),
        };
      };

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
              // For Between, the "last value" of the condition is the valueTo badge.
              // Insert (plus) should appear on valueTo (if present), not on the from-value.
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
                attachInsertAfter(
                  createValueBadgeConfig(
                    getValueBadgeId(index, true, true),
                    condition.valueTo,
                    'valueTo',
                    getValueBadgeHandlers(handlers, index, true),
                    conditionColumnType,
                    getValueBadgeInlineProps(inlineEditingProps, index, true)
                  ),
                  index,
                  'valueTo'
                )
              );
            }
          } else {
            badges.push(
              attachInsertAfter(
                createValueBadgeConfig(
                  getValueBadgeId(index, false, false),
                  condition.value,
                  'value',
                  getValueBadgeHandlers(handlers, index, false),
                  conditionColumnType,
                  getValueBadgeInlineProps(inlineEditingProps, index, false)
                ),
                index,
                'value'
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
