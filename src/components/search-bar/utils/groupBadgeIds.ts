export const getGroupPathKey = (path: number[]) =>
  path.length > 0 ? path.join('-') : 'root';

export const getGroupConditionBadgeId = (
  path: number[],
  type: 'column' | 'operator'
) => `condition-${getGroupPathKey(path)}-${type}`;

export const getGroupJoinBadgeId = (path: number[], joinIndex: number) =>
  `join-${getGroupPathKey(path)}-${joinIndex}`;
