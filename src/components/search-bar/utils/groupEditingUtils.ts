import type {
  FilterConditionNode,
  FilterExpression,
  FilterGroup,
  SearchColumn,
} from '../types';

export const updateGroupConditionValue = (
  group: FilterGroup,
  path: number[],
  field: 'value' | 'valueTo',
  nextValue: string,
  nextValueTo?: string
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      return {
        ...node,
        value: field === 'value' ? nextValue : node.value,
        valueTo:
          field === 'valueTo' ? nextValue : (nextValueTo ?? node.valueTo),
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionValue(node, rest, field, nextValue, nextValueTo);
  });
  return { ...group, nodes };
};

export const updateGroupConditionColumn = (
  group: FilterGroup,
  path: number[],
  column: SearchColumn
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      return {
        ...node,
        field: column.field,
        column,
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionColumn(node, rest, column);
  });
  return { ...group, nodes };
};

export const updateGroupConditionOperator = (
  group: FilterGroup,
  path: number[],
  operator: string
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      const needsValueTo = operator === 'inRange' && !node.valueTo;
      return {
        ...node,
        operator,
        valueTo: needsValueTo ? node.value : node.valueTo,
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionOperator(node, rest, operator);
  });
  return { ...group, nodes };
};

export const updateGroupJoinAtPath = (
  group: FilterGroup,
  path: number[],
  join: 'AND' | 'OR'
): FilterGroup => {
  if (path.length === 0) {
    return { ...group, join };
  }
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (node.kind !== 'group') return node;
    return updateGroupJoinAtPath(node, rest, join);
  });
  return { ...group, nodes };
};

export const removeGroupNodeAtPath = (
  group: FilterGroup,
  path: number[]
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.flatMap((node, idx) => {
    if (idx !== index) return [node];
    if (rest.length === 0) return [];
    if (node.kind !== 'group') return [node];
    const updatedChild = removeGroupNodeAtPath(node, rest);
    if (updatedChild.nodes.length === 0) return [];
    return [{ ...node, nodes: updatedChild.nodes }];
  });
  return { ...group, nodes };
};

export const unwrapGroupAtPath = (
  group: FilterGroup,
  path: number[]
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.flatMap((node, idx) => {
    if (idx !== index) return [node];
    if (rest.length === 0) {
      if (node.kind !== 'group') return [node];
      return node.nodes;
    }
    if (node.kind !== 'group') return [node];
    const updatedChild = unwrapGroupAtPath(node, rest);
    return [{ ...node, nodes: updatedChild.nodes }];
  });
  return { ...group, nodes };
};

export const findGroupNodeAtPath = (
  group: FilterGroup,
  path: number[]
): FilterExpression | undefined => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const node = group.nodes[index];
  if (!node) return undefined;
  if (rest.length === 0) return node;
  if (node.kind !== 'group') return undefined;
  return findGroupNodeAtPath(node, rest);
};

export const findFirstConditionInGroup = (
  group: FilterGroup
): FilterConditionNode | undefined => {
  for (const node of group.nodes) {
    if (node.kind === 'condition') return node;
    const nested = findFirstConditionInGroup(node);
    if (nested) return nested;
  }
  return undefined;
};

export const getActiveGroupJoin = (
  pattern: string
): { depth: number; join?: 'AND' | 'OR' } => {
  const tokenRegex = /#\(|#\)|#(?:and|or)\b/gi;
  let depth = 0;
  const joinByDepth: Record<number, 'AND' | 'OR'> = {};
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(pattern)) !== null) {
    const token = match[0].toLowerCase();
    if (token === '#(') {
      depth += 1;
      continue;
    }
    if (token === '#)') {
      depth = Math.max(depth - 1, 0);
      continue;
    }
    if (depth > 0 && !joinByDepth[depth]) {
      joinByDepth[depth] = token === '#and' ? 'AND' : 'OR';
    }
  }

  return {
    depth,
    join: depth > 0 ? joinByDepth[depth] : undefined,
  };
};

export const stepBackPatternValue = (
  inputValue: string,
  carryConfirmation: boolean
): { handled: boolean; nextValue: string; nextCarry: boolean } => {
  const trimmedValue = inputValue.trimEnd();
  if (!trimmedValue.startsWith('#')) {
    return {
      handled: false,
      nextValue: inputValue,
      nextCarry: carryConfirmation,
    };
  }

  const hasConfirmation = carryConfirmation || trimmedValue.endsWith('##');
  const stripConfirmation = (input: string): string => {
    const cleaned = input.trimEnd();
    return cleaned.endsWith('##') ? cleaned.slice(0, -2).trimEnd() : cleaned;
  };
  const collapseWhitespace = (input: string): string => {
    return input.replace(/\s{2,}/g, ' ').trimStart();
  };
  const ensureTrailingHash = (input: string): string => {
    const trimmed = input.trimEnd();
    if (!trimmed) return '#';
    return trimmed.endsWith('#') ? trimmed : `${trimmed} #`;
  };

  let working = stripConfirmation(trimmedValue).trimEnd();
  if (!working) {
    return {
      handled: false,
      nextValue: inputValue,
      nextCarry: carryConfirmation,
    };
  }

  if (working.endsWith('#')) {
    working = working.replace(/\s*#\s*$/, '').trimEnd();
  }

  const finalize = (next: string): string => {
    const collapsed = collapseWhitespace(next);
    const trimmedEnd = collapsed.trimEnd();
    if (!trimmedEnd) return '';
    if (/#(?:and|or)$/i.test(trimmedEnd)) {
      return `${trimmedEnd} `;
    }
    return trimmedEnd;
  };

  const maybeRestoreConfirmation = (next: string): string => {
    if (!hasConfirmation) return next;
    const trimmedNext = next.trimEnd();
    if (!trimmedNext) return '';
    const withConfirmation = `${trimmedNext.replace(/##$/, '')}##`;
    if (trimmedNext.endsWith('#)')) {
      return withConfirmation;
    }
    const endsWithHashToken = /(?:^|\s)#[^\s#]+$/.test(trimmedNext);
    if (endsWithHashToken) return trimmedNext;
    return withConfirmation;
  };

  const toResult = (nextValue: string) => {
    const isNoOp = nextValue === inputValue;
    return {
      handled: !isNoOp,
      nextValue: isNoOp ? inputValue : nextValue,
      nextCarry: isNoOp
        ? carryConfirmation
        : nextValue.trimStart().startsWith('#'),
    };
  };

  if (working.endsWith('#)')) {
    return toResult(
      maybeRestoreConfirmation(finalize(working.replace(/\s*#\)\s*$/, '')))
    );
  }

  if (working.endsWith('#(')) {
    return toResult(finalize(working.replace(/\s*#\(\s*$/, '')));
  }

  const trailingTokenMatch = working.match(/(?:^|\s)#[^\s#]+$/);
  if (trailingTokenMatch) {
    const trailingToken = trailingTokenMatch[0].trim();
    const tokenLower = trailingToken.toLowerCase();
    const removed = working.replace(/(?:^|\s)#[^\s#]+$/, '').trimEnd();

    if (tokenLower === '#and' || tokenLower === '#or') {
      return toResult(maybeRestoreConfirmation(finalize(removed)));
    }

    const shouldOpenSelector = tokenLower !== '#to';
    const nextValue = shouldOpenSelector
      ? ensureTrailingHash(finalize(removed))
      : finalize(removed);
    return toResult(nextValue);
  }

  const tokenRegex = /#\(|#\)|#[^\s#]+/g;
  let lastToken: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(working)) !== null) {
    lastToken = match;
  }
  if (!lastToken) {
    return {
      handled: false,
      nextValue: inputValue,
      nextCarry: carryConfirmation,
    };
  }

  const cutIndex = lastToken.index + lastToken[0].length;
  const prefix = working.slice(0, cutIndex).trimEnd();
  const finalizedPrefix = finalize(prefix);
  const nextValue = `${finalizedPrefix} `.replace(/^ $/, '');
  return toResult(nextValue);
};
