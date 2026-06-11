import type { RefObject } from 'react';
import type { EnhancedSearchState } from '../types';
import { useSelectorPosition } from './useSelectorPosition';

interface EditingSelectorTarget {
  conditionIndex: number;
  target: 'column' | 'operator' | 'join';
}

interface GroupEditingSelectorTarget {
  path: number[];
  target: 'column' | 'operator' | 'join';
  joinIndex?: number;
}

interface UseSearchSelectorPositionsParams {
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  editingSelectorTarget: EditingSelectorTarget | null;
  groupEditingSelectorTarget: GroupEditingSelectorTarget | null;
  activeConditionIndex: number;
  containerRef: RefObject<HTMLDivElement | null>;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  getLazyColumnRef: (index: number) => RefObject<HTMLElement | null>;
  getLazyOperatorRef: (index: number) => RefObject<HTMLElement | null>;
  getLazyJoinRef: (index: number) => RefObject<HTMLElement | null>;
  getLazyBadgeRef: (id: string) => RefObject<HTMLElement | null>;
  getGroupConditionBadgeId: (
    path: number[],
    type: 'column' | 'operator'
  ) => string;
  getGroupJoinBadgeId: (path: number[], joinIndex: number) => string;
}

export const useSearchSelectorPositions = ({
  searchMode,
  preservedSearchMode,
  editingSelectorTarget,
  groupEditingSelectorTarget,
  activeConditionIndex,
  containerRef,
  scrollAreaRef,
  inputRef,
  getLazyColumnRef,
  getLazyOperatorRef,
  getLazyJoinRef,
  getLazyBadgeRef,
  getGroupConditionBadgeId,
  getGroupJoinBadgeId,
}: UseSearchSelectorPositionsParams) => {
  const isSelectingConditionNColumn =
    (searchMode.activeConditionIndex ?? 0) > 0;
  const isEditingConditionNColumn =
    preservedSearchMode !== null && isSelectingConditionNColumn;

  const getColumnAnchorRef = (): RefObject<HTMLElement | null> | undefined => {
    if (groupEditingSelectorTarget?.target === 'column') {
      return getLazyBadgeRef(
        getGroupConditionBadgeId(groupEditingSelectorTarget.path, 'column')
      );
    }
    if (!isSelectingConditionNColumn) {
      return scrollAreaRef as RefObject<HTMLElement | null>;
    }
    if (!isEditingConditionNColumn) {
      return inputRef as RefObject<HTMLElement | null>;
    }
    if (activeConditionIndex === 1) return getLazyColumnRef(1);
    return getLazyColumnRef(activeConditionIndex);
  };

  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
    anchorRef: getColumnAnchorRef(),
    anchorAlign: 'left',
  });

  const isBuildingConditionN = activeConditionIndex > 0;
  const hasActiveConditionColumn =
    searchMode.partialConditions?.[activeConditionIndex]?.column;
  const isEditingOperator =
    preservedSearchMode !== null && searchMode.showOperatorSelector;
  const isCreatingConditionNOp =
    !isEditingOperator &&
    isBuildingConditionN &&
    hasActiveConditionColumn &&
    searchMode.showOperatorSelector;

  let operatorAnchorRef: RefObject<HTMLElement | null>;
  let operatorAnchorAlign: 'left' | 'right';

  if (groupEditingSelectorTarget?.target === 'operator') {
    operatorAnchorRef = getLazyBadgeRef(
      getGroupConditionBadgeId(groupEditingSelectorTarget.path, 'operator')
    );
    operatorAnchorAlign = 'left';
  } else if (isEditingOperator) {
    if (activeConditionIndex === 0) {
      operatorAnchorRef = getLazyOperatorRef(0);
    } else if (activeConditionIndex === 1) {
      operatorAnchorRef = getLazyOperatorRef(1);
    } else {
      operatorAnchorRef = getLazyOperatorRef(activeConditionIndex);
    }
    operatorAnchorAlign = 'left';
  } else if (isCreatingConditionNOp) {
    operatorAnchorRef = inputRef as RefObject<HTMLElement | null>;
    operatorAnchorAlign = 'left';
  } else {
    operatorAnchorRef = getLazyColumnRef(0);
    operatorAnchorAlign = 'right';
  }

  const operatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showOperatorSelector,
    containerRef,
    anchorRef: operatorAnchorRef,
    anchorAlign: operatorAnchorAlign,
  });

  const isEditingJoinOperator =
    editingSelectorTarget?.target === 'join' && preservedSearchMode !== null;

  const getJoinAnchorRef = (): RefObject<HTMLElement | null> => {
    if (
      groupEditingSelectorTarget?.target === 'join' &&
      groupEditingSelectorTarget.joinIndex !== undefined
    ) {
      return getLazyBadgeRef(
        getGroupJoinBadgeId(
          groupEditingSelectorTarget.path,
          groupEditingSelectorTarget.joinIndex
        )
      );
    }

    if (
      isEditingJoinOperator &&
      editingSelectorTarget?.conditionIndex !== undefined
    ) {
      return getLazyJoinRef(editingSelectorTarget.conditionIndex);
    }

    return inputRef as RefObject<HTMLElement | null>;
  };

  const joinOperatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showJoinOperatorSelector,
    containerRef,
    anchorRef: getJoinAnchorRef(),
    anchorAlign: 'left',
  });

  return {
    columnSelectorPosition,
    operatorSelectorPosition,
    joinOperatorSelectorPosition,
    isSelectingConditionNColumn,
    isEditingJoinOperator,
  };
};
