import type { AdvancedFilterModel } from 'ag-grid-community';
import { PatternBuilder } from '@/components/search-bar/utils/PatternBuilder';
import type {
  FilterConditionNode,
  FilterExpression,
  FilterGroup,
} from '@/components/search-bar/types';

type JoinAdvancedFilterModel = {
  filterType: 'join';
  type: string;
  conditions: unknown[];
};

type LeafAdvancedFilterModel = {
  filterType: string;
  colId: string;
  type: string;
  filter?: unknown;
  filterTo?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isJoinModel = (model: unknown): model is JoinAdvancedFilterModel => {
  if (!isObject(model)) return false;
  if (model.filterType !== 'join') return false;
  return Array.isArray(model.conditions);
};

const isLeafModel = (model: unknown): model is LeafAdvancedFilterModel => {
  if (!isObject(model)) return false;
  return typeof model.colId === 'string' && typeof model.type === 'string';
};

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
};

const normalizeJoinType = (value: unknown): 'AND' | 'OR' => {
  const upper = String(value).toUpperCase();
  return upper === 'OR' ? 'OR' : 'AND';
};

const extractFilterValue = (model: LeafAdvancedFilterModel): string => {
  return toStringValue(model.filter).trim();
};

const extractFilterValueTo = (
  model: LeafAdvancedFilterModel
): string | undefined => {
  const value = model.filterTo;
  if (value === null || value === undefined) return undefined;
  const str = toStringValue(value).trim();
  return str === '' ? undefined : str;
};

const extractInRangeFromJoin = (
  model: JoinAdvancedFilterModel
): { field: string; value: string; valueTo: string } | null => {
  if (normalizeJoinType(model.type) !== 'AND') return null;
  if (model.conditions.length !== 2) return null;

  const [first, second] = model.conditions;
  if (!isLeafModel(first) || !isLeafModel(second)) return null;
  if (first.colId !== second.colId) return null;

  const firstType = first.type;
  const secondType = second.type;

  const isFirstLower = firstType === 'greaterThanOrEqual';
  const isFirstUpper = firstType === 'lessThanOrEqual';
  const isSecondLower = secondType === 'greaterThanOrEqual';
  const isSecondUpper = secondType === 'lessThanOrEqual';

  if (!((isFirstLower && isSecondUpper) || (isFirstUpper && isSecondLower))) {
    return null;
  }

  const lower = isFirstLower ? first : second;
  const upper = isFirstUpper ? first : second;

  const value = extractFilterValue(lower);
  const valueTo = extractFilterValue(upper);
  if (!value || !valueTo) return null;

  return {
    field: first.colId,
    value,
    valueTo,
  };
};

const toExpression = (
  model: unknown,
  isRoot: boolean
): FilterExpression | null => {
  if (!model) return null;

  if (isJoinModel(model)) {
    const inRange = extractInRangeFromJoin(model);
    if (inRange) {
      return {
        kind: 'condition',
        field: inRange.field,
        operator: 'inRange',
        value: inRange.value,
        valueTo: inRange.valueTo,
      } satisfies FilterConditionNode;
    }

    const nodes = model.conditions
      .map(child => toExpression(child, false))
      .filter((node): node is FilterExpression => !!node);

    if (nodes.length === 0) return null;
    if (nodes.length === 1) return nodes[0];

    const group: FilterGroup = {
      kind: 'group',
      join: normalizeJoinType(model.type),
      nodes,
      isExplicit: !isRoot,
    };

    return group;
  }

  if (isLeafModel(model)) {
    const operator = model.type;
    const value = extractFilterValue(model);
    const valueTo = extractFilterValueTo(model);

    // Some Advanced Filter models can represent ranges directly.
    if (operator === 'inRange' && valueTo) {
      return {
        kind: 'condition',
        field: model.colId,
        operator: 'inRange',
        value,
        valueTo,
      } satisfies FilterConditionNode;
    }

    return {
      kind: 'condition',
      field: model.colId,
      operator,
      value,
      valueTo,
    } satisfies FilterConditionNode;
  }

  return null;
};

export const advancedFilterModelToSearchPattern = (
  model: AdvancedFilterModel | null | undefined
): string | null => {
  if (!model) return null;

  const expression = toExpression(model, true);
  if (!expression) return null;

  if (expression.kind === 'group') {
    // Root join group should not be wrapped unless it was explicit.
    return PatternBuilder.buildGroupedPattern(expression, true);
  }

  if (!expression.field) return null;

  const condition = PatternBuilder.buildConditionPart(
    expression.field,
    expression.operator,
    expression.value,
    expression.valueTo,
    true
  ).trim();

  return condition ? `${condition}##` : null;
};

export const extractAdvancedFilterModelFromGridState = (
  gridState: unknown
): AdvancedFilterModel | null => {
  if (!isObject(gridState)) return null;

  const rootCandidate = gridState.advancedFilterModel;
  if (rootCandidate) {
    return rootCandidate as AdvancedFilterModel;
  }

  const filterState = gridState.filter;
  if (isObject(filterState) && filterState.advancedFilterModel) {
    return filterState.advancedFilterModel as AdvancedFilterModel;
  }

  return null;
};

export const deriveSearchPatternFromGridState = (
  gridState: unknown
): string | null => {
  const model = extractAdvancedFilterModelFromGridState(gridState);
  return advancedFilterModelToSearchPattern(model);
};
