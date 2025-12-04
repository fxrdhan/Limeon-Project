import { useCallback } from 'react';
import { EnhancedSearchState } from '../types';
import { KEY_CODES } from '../constants';

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
  onEditValue?: () => void;
  onEditValueTo?: () => void; // Edit "to" value in Between operator
  onEditSecondValue?: () => void;
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
  onEditValue,
  onEditValueTo,
  onEditSecondValue,
}: UseSearchKeyboardProps) => {
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // PROTECTION: When modal selector is open, prevent character input to searchbar
        // Let BaseSelector handle all typing for its internal search
        const isModalOpen =
          searchMode.showColumnSelector ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector;

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

              // Clear preserved state after confirming edit
              onClearPreservedState?.();
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

                // Clear preserved state after confirming edit
                onClearPreservedState?.();
              }
            }
            return;
          }
        }

        // DELETE key: Used for badge deletion (works even when modal is open)
        // This is separate from Backspace which is used for modal internal search
        if (e.key === KEY_CODES.DELETE) {
          // Delete on confirmed multi-condition filter: Enter edit mode for 2nd value
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            searchMode.filterSearch?.isMultiCondition &&
            onEditSecondValue
          ) {
            e.preventDefault();
            // Trigger edit mode for second value badge
            onEditSecondValue();
            return;
          }

          // Delete on confirmed single-condition filter: Enter in-badge edit mode
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            // For Between (inRange) operator with valueTo, edit the second value (valueTo)
            // This is more intuitive: DELETE removes the last value entered
            if (
              searchMode.filterSearch.operator === 'inRange' &&
              searchMode.filterSearch.valueTo &&
              onEditValueTo
            ) {
              onEditValueTo();
              return;
            }
            // For other operators, edit the first/only value
            if (onEditValue) {
              onEditValue();
            }
            return;
          }

          // E9 Step 6: Delete on partial multi-condition (5 badges) removes second operator and opens operator selector
          // Pattern: [Column][Operator][Value][Join][SecondOperator] + Delete -> [Column][Operator][Value][Join] with operator selector open
          if (
            searchMode.partialJoin &&
            searchMode.secondOperator &&
            searchMode.filterSearch && // filterSearch exists (value may be empty after Step 5)
            !searchMode.isFilterMode
          ) {
            e.preventDefault();

            // Remove second operator, keep join operator with trailing # to open operator selector
            // Pattern: #field #operator value #join #secondOperator -> #field #operator value #join #
            // For multi-column: preserve second column -> #col1 #op1 val1 #join #col2 #
            const columnName = searchMode.filterSearch.field;
            const operator = searchMode.filterSearch.operator;
            const filterValue = searchMode.filterSearch.value || ''; // value may be empty
            const joinOp = searchMode.partialJoin.toLowerCase();

            // Always include second column in pattern (even if same as first)
            // This ensures the second column badge is shown consistently
            const col2 = searchMode.secondColumn?.field || columnName;

            const newValue =
              filterValue.trim() !== ''
                ? `#${columnName} #${operator} ${filterValue} #${joinOp} #${col2} #`
                : `#${columnName} #${operator} #${joinOp} #${col2} #`;

            // Clear preserved state to remove second operator badge from UI
            onClearPreservedState?.();

            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          // D6 Step 3: Remove trailing join operator from confirmed filter
          // Pattern: #field #operator value #join # -> #field #operator value##
          // This handles when user added join operator but wants to remove it and go back to confirmed state
          if (value.match(/^(#\w+ #\w+ .+?)\s+#(and|or)\s+#\s*$/)) {
            e.preventDefault();
            // Remove trailing join operator and restore ## marker
            const match = value.match(/^(#\w+ #\w+ .+?)\s+#(and|or)\s+#\s*$/);
            if (match) {
              const baseFilter = match[1];
              const newValue = `${baseFilter}##`;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }

          // Delete on empty value: Navigate back to operator/column selection
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
              e.preventDefault();
              const columnName = searchMode.filterSearch.field;
              // Auto-open operator selector when deleting to column
              const newValue = `#${columnName} #`;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          } else if (
            searchMode.showOperatorSelector &&
            searchMode.selectedColumn
          ) {
            e.preventDefault();

            // Check if this is second operator selector in multi-column filter
            if (searchMode.partialJoin && searchMode.filterSearch) {
              // This is second operator selector - go back to join state with column selector open
              // Pattern: #col1 #op1 val1 #join #col2 # -> #col1 #op1 val1 #join #
              const columnName = searchMode.filterSearch.field;
              const operator = searchMode.filterSearch.operator;
              const filterValue = searchMode.filterSearch.value || '';
              const joinOp = searchMode.partialJoin.toLowerCase();

              const newValue =
                filterValue.trim() !== ''
                  ? `#${columnName} #${operator} ${filterValue} #${joinOp} #`
                  : `#${columnName} #${operator} #${joinOp} #`;

              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }

            // Delete on operator selector with only column badge -> clear everything
            if (onClearSearch) {
              onClearSearch();
            } else {
              onChange({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>);
            }
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
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
      onClearPreservedState,
      onEditValue,
      onEditValueTo,
      onEditSecondValue,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
