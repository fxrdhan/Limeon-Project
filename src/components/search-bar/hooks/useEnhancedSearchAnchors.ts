/**
 * Enhanced Search Anchors Hook
 *
 * Extracted from EnhancedSearchBar.tsx to manage selector anchor positioning.
 * Determines correct anchor refs and alignment for column, operator, and join selectors.
 */

import type { RefObject } from 'react';
import type { EnhancedSearchState } from '../types';
import type { EditingSelectorTarget } from './useEnhancedSearchState';
import { Position, useSelectorPosition } from './useSelectorPosition';

// ============================================================================
// Types
// ============================================================================

export interface UseEnhancedSearchAnchorsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  editingSelectorTarget: EditingSelectorTarget | null;

  // Lazy ref getters from useSearchInput
  getLazyColumnRef: (index: number) => RefObject<HTMLElement | null>;
  getLazyOperatorRef: (index: number) => RefObject<HTMLElement | null>;
  getLazyJoinRef: (index: number) => RefObject<HTMLElement | null>;
}

export interface UseEnhancedSearchAnchorsReturn {
  columnSelectorPosition: Position;
  operatorSelectorPosition: Position;
  joinOperatorSelectorPosition: Position;

  // Derived state flags
  isSelectingConditionNColumn: boolean;
  isEditingConditionNColumn: boolean;
  isBuildingConditionN: boolean;
  isEditingOperator: boolean;
  isCreatingConditionNOp: boolean;
  isEditingJoinOperator: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnhancedSearchAnchors(
  props: UseEnhancedSearchAnchorsProps
): UseEnhancedSearchAnchorsReturn {
  const {
    containerRef,
    inputRef,
    searchMode,
    preservedSearchMode,
    editingSelectorTarget,
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
  } = props;

  const activeConditionIndex = searchMode.activeConditionIndex ?? 0;

  // ========== Column Selector Positioning ==========
  // - First column (index 0): appears at container left (no anchor)
  // - Condition N editing (preservedSearchMode + activeConditionIndex > 0): appears below Nth column badge
  // - Condition N creating (activeConditionIndex > 0 only): appears after all badges
  const isSelectingConditionNColumn = activeConditionIndex > 0;
  const isEditingConditionNColumn =
    preservedSearchMode !== null && isSelectingConditionNColumn;

  const getColumnAnchorRef = (): RefObject<HTMLElement | null> | undefined => {
    if (!isSelectingConditionNColumn) return undefined; // First column: no anchor
    if (!isEditingConditionNColumn)
      return inputRef as RefObject<HTMLElement | null>; // Create mode: position at input
    // Edit mode: position below the correct column badge
    if (activeConditionIndex === 1) return getLazyColumnRef(1);
    return getLazyColumnRef(activeConditionIndex); // N >= 2
  };

  const columnAnchorRef = getColumnAnchorRef();
  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
    anchorRef: columnAnchorRef,
    anchorAlign: 'left',
  });

  // ========== Operator Selector Positioning ==========
  // - First operator (index 0): anchor to column badge, align right
  // - Condition[1] operator: anchor to secondColumnBadgeRef
  // - Condition[N >= 2] operator: anchor to activeConditionColumnRef (dynamic)
  const isBuildingConditionN = activeConditionIndex > 0;
  const hasActiveConditionColumn = Boolean(
    searchMode.partialConditions?.[activeConditionIndex]?.column
  );

  // Determine which anchor ref to use based on activeConditionIndex
  const getConditionColumnAnchorRef = (): RefObject<HTMLElement | null> => {
    if (activeConditionIndex === 0) {
      return getLazyColumnRef(0);
    } else if (activeConditionIndex === 1) {
      return getLazyColumnRef(1);
    } else {
      return getLazyColumnRef(activeConditionIndex);
    }
  };

  // Detect editing operator for any condition index
  const isEditingOperator =
    preservedSearchMode !== null && searchMode.showOperatorSelector;

  // Creating operator - only when NOT in edit mode
  const isCreatingConditionNOp =
    !isEditingOperator &&
    isBuildingConditionN &&
    hasActiveConditionColumn &&
    Boolean(searchMode.showOperatorSelector);

  let operatorAnchorRef: RefObject<HTMLElement | null>;
  let operatorAnchorAlign: 'left' | 'right';

  if (isEditingOperator) {
    // EDIT existing operator: position below the OPERATOR badge being edited
    if (activeConditionIndex <= 1) {
      operatorAnchorRef = getLazyOperatorRef(activeConditionIndex);
    } else {
      operatorAnchorRef = getLazyOperatorRef(activeConditionIndex);
    }
    operatorAnchorAlign = 'left';
  } else if (isCreatingConditionNOp) {
    // CREATE/select operator for condition[N]: position after column badge
    operatorAnchorRef = getConditionColumnAnchorRef();
    operatorAnchorAlign = 'right';
  } else {
    // First operator: position after column badge
    operatorAnchorRef = getLazyColumnRef(0);
    operatorAnchorAlign = 'right';
  }

  const operatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showOperatorSelector,
    containerRef,
    anchorRef: operatorAnchorRef,
    anchorAlign: operatorAnchorAlign,
  });

  // ========== Join Operator Selector Positioning ==========
  // - CREATE mode (no join badge yet): Position after all badges (right edge)
  // - EDIT mode (join badge exists): Position below the join badge itself
  const isEditingJoinOperator = editingSelectorTarget?.target === 'join';

  const getJoinAnchorRef = (): RefObject<HTMLElement | null> => {
    // EDIT existing join: use the specific join badge being edited
    if (
      isEditingJoinOperator &&
      editingSelectorTarget?.conditionIndex !== undefined
    ) {
      return getLazyJoinRef(editingSelectorTarget.conditionIndex);
    }
    // CREATE new join: position at the input (after last confirmed badge)
    return inputRef as RefObject<HTMLElement | null>;
  };

  const joinAnchorRef = getJoinAnchorRef();

  const joinOperatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showJoinOperatorSelector,
    containerRef,
    anchorRef: joinAnchorRef,
    anchorAlign: 'left',
  });

  return {
    columnSelectorPosition,
    operatorSelectorPosition,
    joinOperatorSelectorPosition,

    // Derived state flags
    isSelectingConditionNColumn,
    isEditingConditionNColumn,
    isBuildingConditionN,
    isEditingOperator,
    isCreatingConditionNOp,
    isEditingJoinOperator,
  };
}
