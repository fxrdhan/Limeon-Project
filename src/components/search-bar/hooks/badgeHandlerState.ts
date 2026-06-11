import type { EnhancedSearchState } from '../types';

export interface BadgeJoinCondition {
  field?: string;
  operator: string;
  value: string;
  valueTo?: string;
}

export interface BadgeJoinParts {
  columnName: string;
  conditions: BadgeJoinCondition[];
  joins: ('AND' | 'OR')[];
  isMultiColumn: boolean;
}

export const getBadgeJoinParts = (
  state: EnhancedSearchState
): BadgeJoinParts | null => {
  const filter = state.filterSearch;
  if (!filter) {
    return null;
  }

  const conditions: BadgeJoinCondition[] = [];

  if (filter.isMultiCondition && filter.conditions) {
    filter.conditions.forEach(condition => {
      conditions.push({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        valueTo: condition.valueTo,
      });
    });
  } else {
    conditions.push({
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo,
    });

    state.partialConditions?.forEach((partial, index) => {
      if (index > 0 && partial.operator) {
        conditions.push({
          field: partial.field,
          operator: partial.operator,
          value: partial.value || '',
          valueTo: partial.valueTo,
        });
      }
    });
  }

  const joins: ('AND' | 'OR')[] = [];
  if (filter.joinOperator) {
    joins.push(filter.joinOperator);
  } else if (state.partialJoin) {
    joins.push(state.partialJoin);
  }

  state.joins?.forEach((join, index) => {
    if (index >= joins.length) {
      joins.push(join);
    }
  });

  return {
    columnName: filter.field,
    conditions,
    joins,
    isMultiColumn: filter.isMultiColumn || false,
  };
};
