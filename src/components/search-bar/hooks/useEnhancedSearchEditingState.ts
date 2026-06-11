import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EnhancedSearchState,
  FilterGroup,
  FilterOperator,
  SearchColumn,
} from '../types';
import type { PreservedFilter } from '../utils/handlerHelpers';
import type { GroupEditingSelectorTarget } from './useGroupSelectorEditing';
import type { GroupEditingBadgeState } from './useGroupInlineEditing';
import type { InlineEditingBadgeState } from './useInlineBadgeEditing';

export const useEnhancedSearchEditingState = () => {
  const preservedFilterRef = useRef<PreservedFilter | null>(null);
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);
  const latestPreservedSearchModeRef = useRef<EnhancedSearchState | null>(null);
  const groupEditDraftRef = useRef<FilterGroup | null>(null);
  const [groupEditingSelectorTarget, setGroupEditingSelectorTarget] =
    useState<GroupEditingSelectorTarget | null>(null);
  const [editingSelectorTarget, setEditingSelectorTarget] = useState<{
    conditionIndex: number;
    target: 'column' | 'operator' | 'join';
  } | null>(null);
  const latestEditingSelectorTargetRef = useRef<{
    conditionIndex: number;
    target: 'column' | 'operator' | 'join';
  } | null>(null);
  const [currentJoinOperator, setCurrentJoinOperator] = useState<
    'AND' | 'OR' | undefined
  >(undefined);
  const [editingBadge, setEditingBadge] =
    useState<InlineEditingBadgeState | null>(null);
  const [editingGroupBadge, setEditingGroupBadge] =
    useState<GroupEditingBadgeState | null>(null);
  const [previewColumn, setPreviewColumn] = useState<SearchColumn | null>(null);
  const [previewOperator, setPreviewOperator] = useState<FilterOperator | null>(
    null
  );

  useEffect(() => {
    latestPreservedSearchModeRef.current = preservedSearchMode;
  }, [preservedSearchMode]);

  useEffect(() => {
    latestEditingSelectorTargetRef.current = editingSelectorTarget;
  }, [editingSelectorTarget]);

  const isEditingSecondOperator =
    editingSelectorTarget?.conditionIndex === 1 &&
    editingSelectorTarget?.target === 'operator';
  const isEditingSecondColumnState =
    editingSelectorTarget?.conditionIndex === 1 &&
    editingSelectorTarget?.target === 'column';

  const setIsEditingSecondOperator = useCallback((editing: boolean) => {
    setEditingSelectorTarget(currentTarget => {
      if (editing) {
        return { conditionIndex: 1, target: 'operator' };
      }

      if (
        currentTarget?.conditionIndex === 1 &&
        currentTarget.target === 'operator'
      ) {
        return null;
      }

      return currentTarget;
    });
  }, []);

  const handleClearPreservedState = useCallback(() => {
    setPreservedSearchMode(null);
    latestPreservedSearchModeRef.current = null;
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null);
    latestEditingSelectorTargetRef.current = null;
    setGroupEditingSelectorTarget(null);
    groupEditDraftRef.current = null;
  }, []);

  return {
    preservedFilterRef,
    preservedSearchMode,
    setPreservedSearchMode,
    groupEditDraftRef,
    groupEditingSelectorTarget,
    setGroupEditingSelectorTarget,
    editingSelectorTarget,
    setEditingSelectorTarget,
    isEditingSecondOperator,
    isEditingSecondColumnState,
    setIsEditingSecondOperator,
    currentJoinOperator,
    setCurrentJoinOperator,
    editingBadge,
    setEditingBadge,
    editingGroupBadge,
    setEditingGroupBadge,
    previewColumn,
    setPreviewColumn,
    previewOperator,
    setPreviewOperator,
    handleClearPreservedState,
  };
};
