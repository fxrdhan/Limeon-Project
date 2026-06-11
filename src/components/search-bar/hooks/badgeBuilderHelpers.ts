import type { EnhancedSearchState, SearchColumn } from '../types';
import type { BadgeConfig } from '../types/badge';

export type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

export interface BadgeHandlers {
  clearConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  clearJoin: (joinIndex: number) => void;
  clearAll: () => void;
  editConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  editJoin: (joinIndex: number) => void;
  editValueN: (conditionIndex: number, target: 'value' | 'valueTo') => void;
  insertConditionAfter?: (conditionIndex: number) => void;
}

export interface InlineEditingProps {
  editingBadge: {
    conditionIndex: number;
    field: 'value' | 'valueTo';
    value: string;
  } | null;
  onInlineValueChange: (value: string) => void;
  onInlineEditComplete: (finalValue?: string) => void;
  onNavigateEdit?: (direction: 'left' | 'right') => void;
  onFocusInput?: () => void;
}

export interface PartialConditionData {
  column?: SearchColumn;
  operator?: string;
  value?: string;
  valueTo?: string;
  waitingForValueTo?: boolean;
}

export const getConditionAt = (
  searchMode: EnhancedSearchState,
  index: number
): PartialConditionData => {
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
};

export const isMultiConditionMode = (
  searchMode: EnhancedSearchState
): boolean => {
  return (searchMode.partialConditions?.length ?? 1) > 1;
};

export const getValueBadgeInlineProps = (
  inlineEditingProps: InlineEditingProps | undefined,
  conditionIndex: number,
  isValueTo: boolean
): Partial<
  Pick<
    BadgeConfig,
    | 'isEditing'
    | 'editingValue'
    | 'onValueChange'
    | 'onEditComplete'
    | 'onNavigateEdit'
    | 'onFocusInput'
  >
> => {
  if (!inlineEditingProps?.editingBadge) return {};

  const { conditionIndex: editingIndex, field: editingField } =
    inlineEditingProps.editingBadge;
  const expectedField = isValueTo ? 'valueTo' : 'value';
  const isEditing =
    editingIndex === conditionIndex && editingField === expectedField;
  if (!isEditing) return {};

  return {
    isEditing: true,
    editingValue: inlineEditingProps.editingBadge.value,
    onValueChange: inlineEditingProps.onInlineValueChange,
    onEditComplete: inlineEditingProps.onInlineEditComplete,
    onNavigateEdit: inlineEditingProps.onNavigateEdit,
    onFocusInput: inlineEditingProps.onFocusInput,
  };
};

export const getValueBadgeHandlers = (
  handlers: BadgeHandlers,
  conditionIndex: number,
  isValueTo: boolean
): { onClear: () => void; onEdit?: () => void; canEdit: boolean } => {
  const target: BadgeTarget = isValueTo ? 'valueTo' : 'value';

  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, target),
    onEdit: () => handlers.editValueN(conditionIndex, target),
    canEdit: true,
  };
};

export const getColumnBadgeHandlers = (
  handlers: BadgeHandlers,
  conditionIndex: number
): { onClear: () => void; onEdit: () => void } => {
  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, 'column'),
    onEdit: () => handlers.editConditionPart(conditionIndex, 'column'),
  };
};

export const getOperatorBadgeHandlers = (
  handlers: BadgeHandlers,
  conditionIndex: number
): { onClear: () => void; onEdit: () => void } => {
  return {
    onClear: () => handlers.clearConditionPart(conditionIndex, 'operator'),
    onEdit: () => handlers.editConditionPart(conditionIndex, 'operator'),
  };
};

export const getJoinBadgeHandlers = (
  handlers: BadgeHandlers,
  joinIndex: number
): { onClear: () => void; onEdit: () => void } => {
  return {
    onClear: () => handlers.clearJoin(joinIndex),
    onEdit: () => handlers.editJoin(joinIndex),
  };
};

export const getValueBadgeId = (
  conditionIndex: number,
  isValueTo: boolean,
  isBetween: boolean
): string => {
  const prefix = `condition-${conditionIndex}`;
  if (!isBetween) return `${prefix}-value`;
  return `${prefix}-value-${isValueTo ? 'to' : 'from'}`;
};

export const createValueBadgeConfig = (
  id: string,
  label: string,
  badgeType: 'value' | 'valueTo',
  handlers: { onClear: () => void; onEdit?: () => void; canEdit: boolean },
  columnType: 'text' | 'number' | 'date' | 'currency' | undefined,
  inlineProps: ReturnType<typeof getValueBadgeInlineProps>
): BadgeConfig => {
  return {
    id,
    type: badgeType,
    label,
    onClear: handlers.onClear,
    canClear: true,
    onEdit: handlers.onEdit,
    canEdit: handlers.canEdit,
    ...inlineProps,
    columnType,
  };
};

export const createSeparatorBadge = (conditionIndex: number): BadgeConfig => {
  return {
    id: `condition-${conditionIndex}-separator`,
    type: 'separator',
    label: 'to',
    onClear: () => {},
    canClear: false,
    canEdit: false,
  };
};
