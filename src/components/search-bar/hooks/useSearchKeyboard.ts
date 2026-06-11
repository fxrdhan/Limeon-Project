import { useCallback } from 'react';
import { KEY_CODES } from '../constants';
import { EnhancedSearchState } from '../types';
import { handleSearchDeleteKey } from './searchKeyboardDelete';
import { handleSearchEnterKey } from './searchKeyboardEnter';
import { useSearchSelectorGlobalDelete } from './useSearchSelectorGlobalDelete';
import {
  insertGroupCloseToken,
  insertGroupOpenToken,
} from '../utils/groupPatternUtils';

// NOTE: We intentionally do not mutate FilterGroup objects for Delete key handling.
// Delete behaves as a pure "remove 1 badge" operation, driven by the raw pattern string.

// Scalable type for edit targets
type EditValueTarget = 'value' | 'valueTo';

interface UseSearchKeyboardProps {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClearSearch?: () => void;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector?: () => void;
  onClearPreservedState?: () => void;
  onStepBackDelete?: () => boolean;
  onInvalidGroupOpen?: () => void;
  // Scalable handlers for N-condition support
  editConditionValue?: (
    conditionIndex: number,
    target: EditValueTarget
  ) => void;
  clearConditionPart?: (
    conditionIndex: number,
    target: 'column' | 'operator' | 'value' | 'valueTo'
  ) => void;
}

export const useSearchKeyboard = ({
  value,
  searchMode,
  onChange,
  onKeyDown,
  onClearSearch,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
  onClearPreservedState,
  onStepBackDelete,
  onInvalidGroupOpen,
  editConditionValue,
  clearConditionPart,
}: UseSearchKeyboardProps) => {
  useSearchSelectorGlobalDelete({
    value,
    searchMode,
    onChange,
    onStepBackDelete,
  });

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // PROTECTION: When modal selector is open, prevent character input to searchbar
        // Let BaseSelector handle all typing for its internal search
        const isModalOpen =
          searchMode.showColumnSelector ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector;

        const isPatternMode =
          value.trimStart().startsWith('#') ||
          searchMode.showColumnSelector ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector ||
          searchMode.isFilterMode;

        const canInsertGroupOpen = /#(?:and|or)\s+#\s*$/i.test(value.trimEnd());

        if ((e.key === '(' || e.key === ')') && isPatternMode) {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === '(') {
            if (!canInsertGroupOpen) {
              onInvalidGroupOpen?.();
              return;
            }
            const newValue = insertGroupOpenToken(value);
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          const pendingValue = e.currentTarget.value.trim();
          let baseValue = value;
          if (pendingValue) {
            const trimmedValue = value.trimEnd();
            if (!trimmedValue.endsWith(pendingValue)) {
              const separator = trimmedValue ? ' ' : '';
              baseValue = `${trimmedValue}${separator}${pendingValue}`;
            }
          }

          const newValue = insertGroupCloseToken(baseValue);
          if (newValue) {
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
          }
          return;
        }

        if (isModalOpen) {
          // Allow navigation keys (Arrow, Enter, Escape) - BaseSelector handles these too
          // But prevent character keys from going to the input
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            return;
          }
        }

        if (e.key === KEY_CODES.ESCAPE) {
          if (searchMode.showColumnSelector) {
            handleCloseColumnSelector();
            return;
          } else if (searchMode.showOperatorSelector) {
            handleCloseOperatorSelector();
            return;
          } else if (searchMode.showJoinOperatorSelector) {
            handleCloseJoinOperatorSelector?.();
            return;
          } else if (value && onClearSearch) {
            onClearSearch();
            return;
          }
        }

        // Enter key: Confirm filter value (add ## marker)
        if (
          e.key === KEY_CODES.ENTER &&
          handleSearchEnterKey({
            e,
            isModalOpen,
            searchMode,
            value,
            onChange,
            onClearPreservedState,
          })
        ) {
          return;
        }

        // DELETE key: Used for badge deletion (works even when modal is open)
        // This is separate from Backspace which is used for modal internal search
        if (
          e.key === KEY_CODES.DELETE &&
          handleSearchDeleteKey({
            e,
            isModalOpen,
            searchMode,
            value,
            onChange,
            onClearSearch,
            onClearPreservedState,
            onStepBackDelete,
            editConditionValue,
            clearConditionPart,
          })
        ) {
          return;
        }

        if (
          (searchMode.showColumnSelector ||
            searchMode.showOperatorSelector ||
            searchMode.showJoinOperatorSelector) &&
          (e.key === KEY_CODES.TAB ||
            e.key === KEY_CODES.ARROW_DOWN ||
            e.key === KEY_CODES.ARROW_UP ||
            e.key === KEY_CODES.ENTER)
        ) {
          return;
        }

        onKeyDown?.(e);
      } catch (error) {
        console.error('Error in handleInputKeyDown:', error);
        onKeyDown?.(e);
      }
    },
    [
      searchMode,
      onChange,
      onKeyDown,
      onClearSearch,
      value,
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
      onClearPreservedState,
      onStepBackDelete,
      onInvalidGroupOpen,
      editConditionValue,
      clearConditionPart,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
