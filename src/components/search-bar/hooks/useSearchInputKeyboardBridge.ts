import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { EnhancedSearchState } from '../types';
import type { BadgeConfig } from '../types/badge';
import type { PreservedFilter } from '../utils/handlerHelpers';
import { restoreEditableFilterPattern } from '../utils/patternRestoration';
import type { InlineEditingBadgeState } from './useInlineBadgeEditing';

interface UseSearchInputKeyboardBridgeParams {
  editingBadge: InlineEditingBadgeState | null;
  handleInlineEditComplete: (finalValue?: string) => void;
  selectedBadgeIndex: number | null;
  badgeCount: number;
  badgesRef: MutableRefObject<BadgeConfig[]>;
  setSelectedBadgeIndex: Dispatch<SetStateAction<number | null>>;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  preservedFilterRef: MutableRefObject<PreservedFilter | null>;
  searchMode: EnhancedSearchState;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector: () => void;
  handleBadgeEdit: (e: KeyboardEvent<HTMLInputElement>) => boolean;
  handleBadgeDelete: (e: KeyboardEvent<HTMLInputElement>) => boolean;
  handleBadgeNavigation: (e: KeyboardEvent<HTMLInputElement>) => boolean;
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  clearBadgeSelection: () => void;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const useSearchInputKeyboardBridge = ({
  editingBadge,
  handleInlineEditComplete,
  selectedBadgeIndex,
  badgeCount,
  badgesRef,
  setSelectedBadgeIndex,
  preservedSearchMode,
  setPreservedSearchMode,
  preservedFilterRef,
  searchMode,
  onChange,
  inputRef,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
  handleBadgeEdit,
  handleBadgeDelete,
  handleBadgeNavigation,
  handleInputKeyDown,
  clearBadgeSelection,
  handleInputChange,
}: UseSearchInputKeyboardBridgeParams) => {
  const restorePatternAndFocusInput = useCallback(() => {
    if (preservedSearchMode?.filterSearch) {
      onChange({
        target: {
          value: restoreEditableFilterPattern(preservedSearchMode.filterSearch),
        },
      } as ChangeEvent<HTMLInputElement>);

      setPreservedSearchMode(null);
      preservedFilterRef.current = null;
    } else {
      if (searchMode.showColumnSelector) {
        handleCloseColumnSelector();
      }
      if (searchMode.showOperatorSelector) {
        handleCloseOperatorSelector();
      }
      if (searchMode.showJoinOperatorSelector) {
        handleCloseJoinOperatorSelector();
      }
    }

    inputRef.current?.focus();
  }, [
    handleCloseColumnSelector,
    handleCloseJoinOperatorSelector,
    handleCloseOperatorSelector,
    inputRef,
    onChange,
    preservedFilterRef,
    preservedSearchMode,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    setPreservedSearchMode,
  ]);

  const handleNavigateEdit = useCallback(
    (direction: 'left' | 'right') => {
      const currentValue = editingBadge?.value;

      if (editingBadge) {
        handleInlineEditComplete(currentValue);
      }

      setTimeout(() => {
        if (badgeCount === 0) return;

        let targetIndex: number;

        if (selectedBadgeIndex === null) {
          targetIndex = direction === 'left' ? badgeCount - 1 : 0;
        } else if (direction === 'left') {
          targetIndex = selectedBadgeIndex - 1;
          if (targetIndex < 0) targetIndex = badgeCount - 1;
        } else {
          targetIndex = selectedBadgeIndex + 1;
          if (targetIndex >= badgeCount) targetIndex = 0;
        }

        let attempts = 0;
        while (attempts < badgeCount) {
          const badge = badgesRef.current[targetIndex];
          if (badge?.canEdit && badge?.onEdit) {
            setSelectedBadgeIndex(targetIndex);
            badge.onEdit();
            return;
          }

          if (direction === 'left') {
            targetIndex--;
            if (targetIndex < 0) targetIndex = badgeCount - 1;
          } else {
            targetIndex++;
            if (targetIndex >= badgeCount) targetIndex = 0;
          }
          attempts++;
        }
      }, 50);
    },
    [
      badgeCount,
      badgesRef,
      editingBadge,
      handleInlineEditComplete,
      selectedBadgeIndex,
      setSelectedBadgeIndex,
    ]
  );

  const handleFocusInputFromBadge = useCallback(() => {
    const currentValue = editingBadge?.value;
    if (editingBadge) {
      handleInlineEditComplete(currentValue);
    }

    if (selectedBadgeIndex !== null) {
      setSelectedBadgeIndex(null);
    }

    setTimeout(restorePatternAndFocusInput, 50);
  }, [
    editingBadge,
    handleInlineEditComplete,
    restorePatternAndFocusInput,
    selectedBadgeIndex,
    setSelectedBadgeIndex,
  ]);

  const handleFocusInput = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== 'i') {
        return false;
      }

      e.preventDefault();
      e.stopPropagation();

      if (selectedBadgeIndex !== null) {
        setSelectedBadgeIndex(null);
      }

      restorePatternAndFocusInput();
      return true;
    },
    [restorePatternAndFocusInput, selectedBadgeIndex, setSelectedBadgeIndex]
  );

  const wrappedKeyDownHandler = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (handleFocusInput(e)) {
        return;
      }
      if (handleBadgeEdit(e)) {
        return;
      }
      if (handleBadgeDelete(e)) {
        return;
      }
      if (handleBadgeNavigation(e)) {
        return;
      }
      handleInputKeyDown(e);
    },
    [
      handleBadgeDelete,
      handleBadgeEdit,
      handleBadgeNavigation,
      handleFocusInput,
      handleInputKeyDown,
    ]
  );

  const wrappedInputChangeHandler = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      clearBadgeSelection();
      handleInputChange(e);
    },
    [clearBadgeSelection, handleInputChange]
  );

  return {
    handleNavigateEdit,
    handleFocusInputFromBadge,
    wrappedKeyDownHandler,
    wrappedInputChangeHandler,
  };
};
