import { useCallback } from 'react';
import { EnhancedSearchState } from '../types';
import { buildColumnValue } from '../utils/searchUtils';
import { KEY_CODES } from '../constants';

interface UseSearchKeyboardProps {
  value: string;
  searchMode: EnhancedSearchState;
  operatorSearchTerm: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClearSearch?: () => void;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector?: () => void;
}

export const useSearchKeyboard = ({
  value,
  searchMode,
  operatorSearchTerm,
  onChange,
  onKeyDown,
  onClearSearch,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
}: UseSearchKeyboardProps) => {
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
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
        if (e.key === KEY_CODES.ENTER) {
          // Handle multi-condition confirmation (building second condition)
          if (
            searchMode.partialJoin &&
            searchMode.secondOperator &&
            !searchMode.isFilterMode
          ) {
            e.preventDefault();
            e.stopPropagation();

            // Add ## marker to confirm multi-condition pattern
            const currentValue = value.trim();
            if (!currentValue.endsWith('#') && !currentValue.endsWith('##')) {
              const newValue = currentValue + '##';
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }

          // Handle single-condition confirmation
          if (searchMode.isFilterMode) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling

            // Only add ## marker if not already confirmed and has value
            if (
              searchMode.filterSearch &&
              !searchMode.filterSearch.isConfirmed &&
              !searchMode.filterSearch.isMultiCondition &&
              searchMode.filterSearch.value.trim() !== ''
            ) {
              // Build new value with ## marker
              const currentValue = value.trim(); // Trim to avoid trailing spaces

              // Safety check: don't add ## if value already has # at end (which would corrupt pattern)
              if (!currentValue.endsWith('#')) {
                const newValue = currentValue + '##';
                onChange({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLInputElement>);
              }
            }
            return;
          }
        }

        if (e.key === KEY_CODES.BACKSPACE) {
          // Backspace on confirmed filter: Remove ## marker to enter edit mode
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            !searchMode.filterSearch?.isMultiCondition &&
            (e.currentTarget as HTMLInputElement).value === '' // Input is empty (value in badge)
          ) {
            e.preventDefault();

            // Remove confirmed marker (##) from value
            const currentValue = value;
            if (currentValue.endsWith('##')) {
              const newValue = currentValue.slice(0, -2);
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }

          // Backspace on empty value: Navigate back to operator/column selection
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.value === ''
          ) {
            if (
              searchMode.filterSearch.operator === 'contains' &&
              !searchMode.filterSearch.isExplicitOperator
            ) {
              if (onClearSearch) {
                onClearSearch();
              } else {
                onChange({
                  target: { value: '' },
                } as React.ChangeEvent<HTMLInputElement>);
              }
              return;
            } else {
              const columnName = searchMode.filterSearch.field;
              const newValue = buildColumnValue(columnName, 'colon');
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          } else if (
            searchMode.showOperatorSelector &&
            searchMode.selectedColumn &&
            operatorSearchTerm === ''
          ) {
            e.preventDefault();
            const columnName = searchMode.selectedColumn.field;
            const newValue = buildColumnValue(columnName, 'plain');
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          } else if (
            searchMode.selectedColumn &&
            !searchMode.showColumnSelector &&
            !searchMode.showOperatorSelector &&
            !searchMode.isFilterMode &&
            value === `#${searchMode.selectedColumn.field}`
          ) {
            if (onClearSearch) {
              onClearSearch();
            } else {
              onChange({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }
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

        // Don't propagate Enter key to parent if in filter mode (already handled above)
        if (e.key === KEY_CODES.ENTER && searchMode.isFilterMode) {
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
      operatorSearchTerm,
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
