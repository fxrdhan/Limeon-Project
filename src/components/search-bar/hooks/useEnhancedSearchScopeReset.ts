import { useLayoutEffect, type MutableRefObject } from 'react';
import type { ConditionInsertTail } from './useConditionInsertFlow';

interface UseEnhancedSearchScopeResetProps {
  stateScopeKey?: string;
  onClearPreservedState: () => void;
  resetBadgeKeyboardState: () => void;
  resetInputError: () => void;
  setEditingBadge: (value: null) => void;
  setEditingGroupBadge: (value: null) => void;
  setPreviewColumn: (value: null) => void;
  setPreviewOperator: (value: null) => void;
  interruptedSelectorRef: MutableRefObject<unknown>;
  insertTailRef: MutableRefObject<ConditionInsertTail | null>;
  resetDeleteConfirmationCarry: () => void;
  setIsInsertFlowActive: (value: boolean) => void;
}

export const useEnhancedSearchScopeReset = ({
  stateScopeKey,
  onClearPreservedState,
  resetBadgeKeyboardState,
  resetInputError,
  setEditingBadge,
  setEditingGroupBadge,
  setPreviewColumn,
  setPreviewOperator,
  interruptedSelectorRef,
  insertTailRef,
  resetDeleteConfirmationCarry,
  setIsInsertFlowActive,
}: UseEnhancedSearchScopeResetProps) => {
  useLayoutEffect(() => {
    resetInputError();
    onClearPreservedState();
    setEditingBadge(null);
    setEditingGroupBadge(null);
    resetBadgeKeyboardState();
    setPreviewColumn(null);
    setPreviewOperator(null);
    interruptedSelectorRef.current = null;
    insertTailRef.current = null;
    resetDeleteConfirmationCarry();
    setIsInsertFlowActive(false);
  }, [
    stateScopeKey,
    onClearPreservedState,
    resetBadgeKeyboardState,
    resetDeleteConfirmationCarry,
    resetInputError,
    setEditingBadge,
    setEditingGroupBadge,
    setIsInsertFlowActive,
    setPreviewColumn,
    setPreviewOperator,
    interruptedSelectorRef,
    insertTailRef,
  ]);
};
