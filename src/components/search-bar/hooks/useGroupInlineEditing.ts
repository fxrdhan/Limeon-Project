import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { EnhancedSearchState, FilterGroup } from '../types';
import {
  findGroupNodeAtPath,
  removeGroupNodeAtPath,
  updateGroupConditionValue,
} from '../utils/groupEditingUtils';

export interface GroupEditingBadgeState {
  path: number[];
  field: 'value' | 'valueTo';
  value: string;
}

interface UseGroupInlineEditingParams {
  editingGroupBadge: GroupEditingBadgeState | null;
  setEditingGroupBadge: Dispatch<SetStateAction<GroupEditingBadgeState | null>>;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  applyGroupedPattern: (group: FilterGroup) => void;
}

export const useGroupInlineEditing = ({
  editingGroupBadge,
  setEditingGroupBadge,
  searchMode,
  preservedSearchMode,
  applyGroupedPattern,
}: UseGroupInlineEditingParams) => {
  const handleGroupEditStart = useCallback(
    (path: number[], field: 'value' | 'valueTo', currentValue: string) => {
      setEditingGroupBadge({ path, field, value: currentValue });
    },
    [setEditingGroupBadge]
  );

  const handleGroupInlineValueChange = useCallback(
    (nextValue: string) => {
      setEditingGroupBadge(prev =>
        prev ? { ...prev, value: nextValue } : null
      );
    },
    [setEditingGroupBadge]
  );

  const handleGroupInlineEditComplete = useCallback(
    (finalValue?: string) => {
      if (!editingGroupBadge) return;

      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;

      if (!group) {
        setEditingGroupBadge(null);
        return;
      }

      const valueToUse =
        finalValue !== undefined ? finalValue : editingGroupBadge.value;

      if (!valueToUse || valueToUse.trim() === '') {
        const updated = removeGroupNodeAtPath(group, editingGroupBadge.path);
        applyGroupedPattern(updated);
        setEditingGroupBadge(null);
        return;
      }

      const node = findGroupNodeAtPath(group, editingGroupBadge.path);
      const isBetween =
        node?.kind === 'condition' && node.operator === 'inRange';

      if (isBetween && editingGroupBadge.field === 'value') {
        const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
        if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
          const updated = updateGroupConditionValue(
            group,
            editingGroupBadge.path,
            'value',
            dashMatch[1].trim(),
            dashMatch[2].trim()
          );
          applyGroupedPattern(updated);
          setEditingGroupBadge(null);
          return;
        }
      }

      const updated = updateGroupConditionValue(
        group,
        editingGroupBadge.path,
        editingGroupBadge.field,
        valueToUse
      );
      applyGroupedPattern(updated);
      setEditingGroupBadge(null);
    },
    [
      editingGroupBadge,
      searchMode.filterSearch,
      preservedSearchMode,
      applyGroupedPattern,
      setEditingGroupBadge,
    ]
  );

  return {
    handleGroupEditStart,
    handleGroupInlineValueChange,
    handleGroupInlineEditComplete,
  };
};
