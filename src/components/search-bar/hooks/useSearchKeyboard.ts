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
  onEditValueTo?: () => void; // Edit "to" value in Between operator (first condition)
  onEditCondition1Value?: () => void;
  onEditCondition1ValueTo?: () => void; // Edit "to" value in Between operator (second condition)
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
  onEditCondition1Value,
  onEditCondition1ValueTo,
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

            // Check if second value exists (not just operator with no value)
            // Pattern: #col #op val #join #col2 #op2 secondValue
            // If pattern ends with #operator (no value after), don't confirm
            const secondOpPattern = new RegExp(
              `#${searchMode.secondOperator}\\s*$`
            );
            const hasSecondValue = !secondOpPattern.test(currentValue);

            if (
              hasSecondValue &&
              !currentValue.endsWith('#') &&
              !currentValue.endsWith('##')
            ) {
              // Special handling for Between (inRange) operator on second condition
              // If second operator is inRange and doesn't have #to marker yet, add it
              if (searchMode.secondOperator === 'inRange') {
                // Check if pattern already has #to marker for second condition
                // Pattern with #to: "#col1 #op1 val1 #to val1b #and #col2 #inRange val2 #to"
                // Pattern without #to: "#col1 #op1 val1 #to val1b #and #col2 #inRange val2"
                // Need to check if there's #to AFTER the second #inRange
                const secondInRangeMatch = currentValue.match(
                  /#(and|or)\s+(?:#[^\s#]+\s+)?#inRange\s+(.*)$/i
                );
                if (secondInRangeMatch) {
                  const afterSecondInRange = secondInRangeMatch[2].trim();
                  // If there's no #to after the second inRange value
                  if (!afterSecondInRange.includes('#to')) {
                    // IMPORTANT: Check for dash-separated format first (e.g., "700-900")
                    // If dash format, confirm with ## instead of adding #to
                    const dashMatch = afterSecondInRange.match(/^(.+?)-(.+)$/);
                    if (dashMatch) {
                      const [, firstVal, secondVal] = dashMatch;
                      if (firstVal.trim() && secondVal.trim()) {
                        // Has both values in dash format - confirm with ##
                        const newValue = currentValue.trim() + '##';
                        onChange({
                          target: { value: newValue },
                        } as React.ChangeEvent<HTMLInputElement>);
                        onClearPreservedState?.();
                        return;
                      }
                    }
                    // No dash format - add #to marker for entering second value
                    const newValue = currentValue + ' #to ';
                    onChange({
                      target: { value: newValue },
                    } as React.ChangeEvent<HTMLInputElement>);
                    return;
                  }
                }
              }

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
              // Special handling for Between (inRange) operator: requires both values
              // When only first value exists, transition to "waiting for valueTo" state
              if (
                searchMode.filterSearch.operator === 'inRange' &&
                !searchMode.filterSearch.valueTo
              ) {
                // Check if we're already waiting for valueTo (pattern contains #to marker)
                if (value.includes('#to')) {
                  // Already waiting for second value - don't confirm yet
                  return;
                }

                // IMPORTANT: Check if value contains dash-separated format (e.g., "500-600")
                // If it does, confirm with ## instead of adding #to marker
                // Extract the value part from pattern: "#col #inRange 500-600"
                // Use [^\s#]+ to match field names with dashes, dots, etc. (any char except space and hash)
                const valueMatch = value.match(/#[^\s#]+\s+#inRange\s+(.+)$/i);
                if (valueMatch) {
                  const typedValue = valueMatch[1].trim();
                  // Check if it's a dash-separated format: "500-600"
                  // Simple regex: starts with non-dash chars, has a dash, ends with non-dash chars
                  const dashMatch = typedValue.match(/^(.+?)-(.+)$/);
                  if (dashMatch) {
                    const [, firstVal, secondVal] = dashMatch;
                    // Ensure both parts are non-empty
                    if (firstVal.trim() && secondVal.trim()) {
                      // Has both values in dash format - confirm with ##
                      const currentValue = value.trim();
                      const newValue = currentValue + '##';
                      onChange({
                        target: { value: newValue },
                      } as React.ChangeEvent<HTMLInputElement>);
                      return;
                    }
                  }
                }

                // Add #to marker to transition to "waiting for valueTo" state
                // Pattern: #col #inRange 500 → #col #inRange 500 #to
                // This makes the input area empty after badges, ready for second value
                const currentValue = value.trim();
                const newValue = currentValue + ' #to ';
                onChange({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLInputElement>);
                return;
              }

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
          // Delete on confirmed multi-condition filter: Enter edit mode for 2nd condition's valueTo first
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            // Get second condition
            const secondCondition = searchMode.filterSearch.conditions?.[1];
            // For Between operator with valueTo on second condition, edit valueTo first
            if (
              secondCondition?.operator === 'inRange' &&
              secondCondition?.valueTo &&
              onEditCondition1ValueTo
            ) {
              onEditCondition1ValueTo();
              return;
            }
            // Otherwise edit second condition's value
            if (onEditCondition1Value) {
              onEditCondition1Value();
              return;
            }
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

          // Delete on Between operator waiting for valueTo: Enter edit mode for first value
          // This handles the case when user has [Column][Between][Value][to] and presses Delete
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.operator === 'inRange' &&
            searchMode.filterSearch?.waitingForValueTo &&
            searchMode.filterSearch?.value &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
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

            // For Between (inRange) operator, include valueTo if it exists
            const valueToPart =
              operator === 'inRange' && searchMode.filterSearch.valueTo
                ? ` #to ${searchMode.filterSearch.valueTo}`
                : '';

            const newValue =
              filterValue.trim() !== ''
                ? `#${columnName} #${operator} ${filterValue}${valueToPart} #${joinOp} #${col2} #`
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

              // For Between (inRange) operator, include valueTo if it exists
              const valueToPart =
                operator === 'inRange' && searchMode.filterSearch.valueTo
                  ? ` #to ${searchMode.filterSearch.valueTo}`
                  : '';

              const newValue =
                filterValue.trim() !== ''
                  ? `#${columnName} #${operator} ${filterValue}${valueToPart} #${joinOp} #`
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
      onEditCondition1Value,
      onEditCondition1ValueTo,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
