import type { FilterGroup } from '../types';

export interface PatternCondition {
  field?: string;
  operator?: string;
  value?: string;
  valueTo?: string;
}

export interface CompletePatternCondition {
  field?: string;
  operator: string;
  value: string;
  valueTo?: string;
}

export interface BuildNConditionsOptions {
  confirmed?: boolean;
  openSelector?: boolean;
  stopAfterIndex?: number;
}

export const buildConditionPart = (
  field: string,
  operator?: string,
  value?: string,
  valueTo?: string,
  includeField: boolean = true
): string => {
  const fieldPart = includeField ? `#${field}` : '';

  if (!operator) {
    return fieldPart;
  }

  const opPart = ` #${operator}`;

  if (value === undefined) {
    return `${fieldPart}${opPart} `;
  }

  if (operator === 'inRange' && valueTo !== undefined) {
    return `${fieldPart}${opPart} ${value} #to ${valueTo}`;
  }

  return `${fieldPart}${opPart} ${value}`;
};

export const conditionPartNoField = (
  operator: string,
  value: string,
  valueTo?: string
): string => {
  if (operator === 'inRange' && valueTo) {
    return `#${operator} ${value} #to ${valueTo}`;
  }
  return `#${operator} ${value}`;
};

export const buildNConditions = (
  conditions: PatternCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  options?: BuildNConditionsOptions
): string => {
  const {
    confirmed = true,
    openSelector = false,
    stopAfterIndex,
  } = options || {};

  if (conditions.length === 0) {
    return openSelector ? '#' : '';
  }

  const maxIndex = stopAfterIndex ?? conditions.length - 1;
  let pattern = '';

  for (let index = 0; index <= maxIndex && index < conditions.length; index++) {
    const condition = conditions[index];
    const conditionField = condition.field || defaultField;

    if (index > 0) {
      const join = joins[index - 1] || 'AND';
      pattern += ` #${join.toLowerCase()} `;
    }

    const isLastConditionWithoutOperator =
      index === maxIndex && !condition.operator && openSelector;
    const includeField =
      index === 0 || isMultiColumn || isLastConditionWithoutOperator;

    pattern += buildConditionPart(
      conditionField,
      condition.operator,
      condition.value,
      condition.valueTo,
      includeField
    );

    if (index === maxIndex && openSelector) {
      if (!condition.operator) {
        pattern += ' #';
      } else if (condition.value !== undefined) {
        pattern += ' #';
      }
    }
  }

  if (confirmed && !openSelector) {
    const lastCondition = conditions[maxIndex];
    if (
      lastCondition &&
      lastCondition.operator &&
      lastCondition.value !== undefined
    ) {
      pattern += '##';
    }
  }

  return pattern;
};

export const buildPartialForEdit = (
  conditions: CompletePatternCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  editingIndex: number = -1
): string => {
  if (editingIndex >= 0 && editingIndex < conditions.length) {
    return buildNConditions(conditions, joins, isMultiColumn, defaultField, {
      confirmed: false,
      stopAfterIndex: editingIndex,
    });
  }

  return buildNConditions(conditions, joins, isMultiColumn, defaultField, {
    confirmed: false,
  });
};

export const buildWithSelectorOpen = (
  conditions: CompletePatternCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  selectorType: 'column' | 'operator' | 'join',
  atIndex?: number
): string => {
  if (selectorType === 'column' && conditions.length === 0) {
    return '#';
  }

  if (selectorType === 'operator' && conditions.length > 0) {
    const index = atIndex ?? 0;
    if (index < conditions.length) {
      const condition = conditions[index];
      const conditionField = condition.field || defaultField;

      if (index === 0) {
        return `#${conditionField} #`;
      }

      const previousPattern = buildNConditions(
        conditions.slice(0, index),
        joins.slice(0, index - 1),
        isMultiColumn,
        defaultField,
        { confirmed: false }
      );
      const join = joins[index - 1] || 'AND';
      return `${previousPattern} #${join.toLowerCase()} #${conditionField} #`;
    }
  }

  if (selectorType === 'join') {
    return buildNConditions(conditions, joins, isMultiColumn, defaultField, {
      confirmed: false,
      openSelector: true,
    });
  }

  return buildNConditions(conditions, joins, isMultiColumn, defaultField, {
    confirmed: false,
    openSelector: true,
  });
};

export const withJoinSelectorAtIndex = (
  conditions: CompletePatternCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  joinIndex: number
): string => {
  const conditionsUpToJoin = conditions.slice(0, joinIndex + 1);
  const joinsUpToJoin = joins.slice(0, joinIndex);

  return buildNConditions(
    conditionsUpToJoin,
    joinsUpToJoin,
    isMultiColumn,
    defaultField,
    {
      confirmed: false,
      openSelector: true,
    }
  );
};

export const confirmedUpToIndex = (
  conditions: CompletePatternCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  upToIndex: number
): string => {
  return buildNConditions(
    conditions.slice(0, upToIndex + 1),
    joins.slice(0, upToIndex),
    isMultiColumn,
    defaultField,
    { confirmed: true }
  );
};

const buildGroupNode = (
  group: FilterGroup,
  isRoot: boolean = false
): string => {
  const parts = group.nodes.map(node => {
    if (node.kind === 'group') {
      return buildGroupNode(node);
    }
    return buildConditionPart(
      node.field || '',
      node.operator,
      node.value,
      node.valueTo,
      true
    ).trim();
  });

  const joinToken = `#${group.join.toLowerCase()}`;
  const joined = parts.join(` ${joinToken} `);
  const shouldWrap = !isRoot || group.isExplicit !== false;
  return shouldWrap ? `#( ${joined} #)` : joined;
};

export const buildGroupedPattern = (
  group: FilterGroup,
  confirmed: boolean = true
): string => {
  const pattern = buildGroupNode(group, true);
  return confirmed ? `${pattern}##` : pattern;
};
