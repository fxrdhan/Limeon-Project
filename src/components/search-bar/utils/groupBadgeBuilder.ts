import type {
  FilterConditionNode,
  FilterGroup,
} from '@/components/search-bar/types';
import type { BadgeConfig } from '@/components/search-bar/types/badge';
import { getOperatorLabelForColumn } from './operatorUtils';

export interface GroupInlineEditingProps {
  editingBadge: {
    path: number[];
    field: 'value' | 'valueTo';
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: (finalValue?: string) => void;
}

export interface GroupBadgeHandlers {
  onEditValue?: (
    path: number[],
    field: 'value' | 'valueTo',
    value: string
  ) => void;
  onEditColumn?: (path: number[]) => void;
  onEditOperator?: (path: number[]) => void;
  onEditJoin?: (path: number[], joinIndex: number) => void;
  onClearCondition?: (path: number[]) => void;
  onClearGroup?: (path: number[]) => void;
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
  onClear: noop,
  canClear: false,
  canEdit: false,
});

const getGroupValueBadgeInlineProps = (
  inlineEditingProps: GroupInlineEditingProps | undefined,
  path: number[],
  field: 'value' | 'valueTo'
): Partial<
  Pick<
    BadgeConfig,
    'isEditing' | 'editingValue' | 'onValueChange' | 'onEditComplete'
  >
> => {
  if (!inlineEditingProps?.editingBadge) return {};
  const { editingBadge } = inlineEditingProps;
  const samePath =
    editingBadge.path.length === path.length &&
    editingBadge.path.every((value, index) => value === path[index]);
  if (!samePath || editingBadge.field !== field) return {};

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
  const onEditColumn = groupHandlers?.onEditColumn
    ? () => groupHandlers.onEditColumn?.(path)
    : undefined;
  const onEditOperator = groupHandlers?.onEditOperator
    ? () => groupHandlers.onEditOperator?.(path)
    : undefined;
  const onDeleteCondition = groupHandlers?.onClearCondition
    ? () => groupHandlers.onClearCondition?.(path)
    : undefined;

  const badges: BadgeConfig[] = [
    createStaticBadge(
      `condition-${key}-column`,
      'column',
      columnLabel,
      undefined,
      {
        onClear: onDeleteCondition,
        canClear: !!onDeleteCondition,
        onEdit: onEditColumn,
        canEdit: !!onEditColumn,
      }
    ),
    createStaticBadge(
      `condition-${key}-operator`,
      'operator',
      operatorLabel,
      undefined,
      {
        onClear: onDeleteCondition,
        canClear: !!onDeleteCondition,
        onEdit: onEditOperator,
        canEdit: !!onEditOperator,
      }
    ),
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
        ...inlineProps,
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
        ...inlineProps,
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
      ...inlineProps,
    });
  }

  return badges;
};

export const buildBadgesFromGroup = (
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
      const onEditJoin = groupHandlers?.onEditJoin
        ? () => groupHandlers.onEditJoin?.(path, index)
        : undefined;
      badges.push(
        createStaticBadge(
          `join-${pathKey}-${index}`,
          'join',
          group.join,
          undefined,
          {
            onEdit: onEditJoin,
            canEdit: !!onEditJoin,
          }
        )
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
