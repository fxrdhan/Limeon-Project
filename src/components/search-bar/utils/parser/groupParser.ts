import {
  FilterConditionNode,
  FilterExpression,
  FilterGroup,
  FilterSearch,
  SearchColumn,
} from '../../types';
import { findOperatorForColumn } from '../operatorUtils';
import { findColumn } from './parserHelpers';
import { parseInRangeValues } from './inRangeParser';

type Token =
  | { type: 'groupOpen' }
  | { type: 'groupClose' }
  | { type: 'confirm' }
  | { type: 'hash'; value: string }
  | { type: 'value'; value: string };

const GROUP_TOKEN_REGEX = /##|#\(|#\)|#[^\s]+/g;

const tokenizeGroupedPattern = (input: string): Token[] => {
  GROUP_TOKEN_REGEX.lastIndex = 0;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = GROUP_TOKEN_REGEX.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const rawValue = input.slice(lastIndex, match.index).trim();
      if (rawValue) {
        tokens.push({ type: 'value', value: rawValue });
      }
    }

    const token = match[0];
    if (token === '##') {
      tokens.push({ type: 'confirm' });
    } else if (token === '#(') {
      tokens.push({ type: 'groupOpen' });
    } else if (token === '#)') {
      tokens.push({ type: 'groupClose' });
    } else {
      tokens.push({ type: 'hash', value: token.slice(1) });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < input.length) {
    const rawValue = input.slice(lastIndex).trim();
    if (rawValue) {
      tokens.push({ type: 'value', value: rawValue });
    }
  }

  return tokens;
};

const parseGroupedSequence = (
  tokens: Token[],
  columns: SearchColumn[],
  indexRef: { value: number },
  stopOnGroupClose: boolean
): {
  nodes: FilterExpression[];
  join: 'AND' | 'OR' | null;
  isClosed: boolean;
} | null => {
  const nodes: FilterExpression[] = [];
  let joinType: 'AND' | 'OR' | null = null;

  const firstNode = parseGroupedExpression(tokens, columns, indexRef);
  if (!firstNode) return null;
  nodes.push(firstNode);

  while (indexRef.value < tokens.length) {
    const token = tokens[indexRef.value];
    if (!token) break;

    if (token.type === 'groupClose') {
      if (!stopOnGroupClose) {
        return null;
      }
      indexRef.value += 1;
      return { nodes, join: joinType, isClosed: true };
    }

    if (token.type !== 'hash') return null;
    const joinToken = token.value.toLowerCase();
    if (joinToken !== 'and' && joinToken !== 'or') return null;

    const normalizedJoin = joinToken.toUpperCase() as 'AND' | 'OR';
    if (!joinType) {
      joinType = normalizedJoin;
    } else if (joinType !== normalizedJoin) {
      return null;
    }

    indexRef.value += 1;
    const nextNode = parseGroupedExpression(tokens, columns, indexRef);
    if (!nextNode) return null;
    nodes.push(nextNode);
  }

  if (stopOnGroupClose) {
    return { nodes, join: joinType, isClosed: false };
  }

  return { nodes, join: joinType, isClosed: true };
};

const parseGroupedExpression = (
  tokens: Token[],
  columns: SearchColumn[],
  indexRef: { value: number }
): FilterExpression | null => {
  const token = tokens[indexRef.value];
  if (!token) return null;

  if (token.type === 'groupOpen') {
    return parseGroupedFilter(tokens, columns, indexRef);
  }

  return parseGroupedCondition(tokens, columns, indexRef);
};

const parseGroupedCondition = (
  tokens: Token[],
  columns: SearchColumn[],
  indexRef: { value: number }
): FilterConditionNode | null => {
  const fieldToken = tokens[indexRef.value];
  if (!fieldToken || fieldToken.type !== 'hash') return null;
  indexRef.value += 1;

  const operatorToken = tokens[indexRef.value];
  if (!operatorToken || operatorToken.type !== 'hash') return null;
  indexRef.value += 1;

  const valueToken = tokens[indexRef.value];
  if (!valueToken || valueToken.type !== 'value') return null;
  indexRef.value += 1;

  const column = findColumn(columns, fieldToken.value);
  if (!column) return null;

  const operatorObj = findOperatorForColumn(column, operatorToken.value);
  if (!operatorObj) return null;

  let value = valueToken.value;
  let valueTo: string | undefined;

  if (operatorObj.value === 'inRange') {
    const nextToken = tokens[indexRef.value];
    if (nextToken?.type === 'hash' && nextToken.value.toLowerCase() === 'to') {
      indexRef.value += 1;
      const toValueToken = tokens[indexRef.value];
      if (!toValueToken || toValueToken.type !== 'value') return null;
      valueTo = toValueToken.value;
      indexRef.value += 1;
    } else {
      const inRangeValues = parseInRangeValues(value, true);
      if (inRangeValues) {
        value = inRangeValues.value;
        valueTo = inRangeValues.valueTo;
      }
    }

    if (!valueTo) {
      return null;
    }
  }

  return {
    kind: 'condition',
    field: column.field,
    column,
    operator: operatorObj.value,
    value: value.trim(),
    valueTo: valueTo?.trim(),
  };
};

const parseGroupedFilter = (
  tokens: Token[],
  columns: SearchColumn[],
  indexRef: { value: number }
): FilterGroup | null => {
  const openToken = tokens[indexRef.value];
  if (!openToken || openToken.type !== 'groupOpen') return null;
  indexRef.value += 1;

  const sequence = parseGroupedSequence(tokens, columns, indexRef, true);
  if (!sequence || !sequence.isClosed) return null;

  return {
    kind: 'group',
    join: sequence.join || 'AND',
    nodes: sequence.nodes,
    isExplicit: true,
  };
};

const findFirstCondition = (group: FilterGroup): FilterConditionNode | null => {
  for (const node of group.nodes) {
    if (node.kind === 'condition') {
      return node;
    }
    const nested = findFirstCondition(node);
    if (nested) return nested;
  }
  return null;
};

const collectFlatConditions = (
  group: FilterGroup
): { conditions: FilterConditionNode[]; joins: ('AND' | 'OR')[] } | null => {
  const conditions: FilterConditionNode[] = [];

  for (const node of group.nodes) {
    if (node.kind !== 'condition') {
      return null;
    }
    conditions.push(node);
  }

  const joins = Array(Math.max(conditions.length - 1, 0)).fill(group.join) as (
    | 'AND'
    | 'OR'
  )[];
  return { conditions, joins };
};

const hasMultiColumn = (group: FilterGroup): boolean => {
  const fields = new Set<string>();
  const walk = (node: FilterExpression) => {
    if (node.kind === 'condition') {
      if (node.field) fields.add(node.field);
      return;
    }
    node.nodes.forEach(child => walk(child));
  };
  walk(group);
  return fields.size > 1;
};

export const parseGroupedFilterPattern = (
  searchValue: string,
  columns: SearchColumn[]
): FilterSearch | null => {
  if (!searchValue.includes('#(')) return null;
  if (!searchValue.trimEnd().endsWith('##')) return null;

  const cleanValue = searchValue.trimEnd().slice(0, -2).trim();
  const tokens = tokenizeGroupedPattern(cleanValue);
  if (tokens.length === 0) return null;

  const indexRef = { value: 0 };
  const sequence = parseGroupedSequence(tokens, columns, indexRef, false);
  if (!sequence) return null;

  if (indexRef.value < tokens.length) {
    return null;
  }

  let group: FilterGroup;
  if (sequence.nodes.length === 1 && sequence.nodes[0].kind === 'group') {
    group = sequence.nodes[0];
  } else {
    if (sequence.nodes.length > 1 && !sequence.join) {
      return null;
    }
    group = {
      kind: 'group',
      join: sequence.join || 'AND',
      nodes: sequence.nodes,
      isExplicit: false,
    };
  }

  const firstCondition = findFirstCondition(group);
  if (!firstCondition?.column) return null;

  const flat = collectFlatConditions(group);
  const isMultiColumn = hasMultiColumn(group);

  return {
    field: firstCondition.field || firstCondition.column.field,
    value: firstCondition.value,
    valueTo: firstCondition.valueTo,
    column: firstCondition.column,
    operator: firstCondition.operator,
    isExplicitOperator: true,
    isConfirmed: true,
    isMultiCondition: group.nodes.length > 1 || !!flat?.joins.length,
    isMultiColumn,
    joinOperator: group.join,
    joins: flat?.joins,
    conditions: flat?.conditions,
    filterGroup: group,
  };
};
