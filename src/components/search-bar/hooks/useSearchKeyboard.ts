import { useCallback } from 'react';
import { KEY_CODES } from '../constants';
import { EnhancedSearchState } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';

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
  // Scalable handlers for N-condition support
  editConditionValue?: (
    conditionIndex: number,
    target: EditValueTarget
  ) => void;
  clearConditionPart?: (
    conditionIndex: number,
    target: 'column' | 'operator' | 'value' | 'valueTo'
  ) => void;
  clearJoin?: (joinIndex: number) => void;
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
  editConditionValue,
  clearConditionPart,
  clearJoin,
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
          // IMPORTANT: When modal selector is open, let BaseSelector handle Enter key
          // Don't intercept Enter for value confirmation when selector is open
          if (isModalOpen) {
            // Don't prevent default - let BaseSelector handle it
            return;
          }

          // Handle confirmation for any condition after the first (index >= 1)
          const activeIdx = searchMode.activeConditionIndex ?? 0;
          const currentPartialCond = searchMode.partialConditions?.[activeIdx];
          const hasOperator = !!currentPartialCond?.operator;

          if (activeIdx > 0 && hasOperator && searchMode.partialJoin) {
            e.preventDefault();
            e.stopPropagation();

            const currentValue = value.trim();

            // Check if current condition has a value being typed
            // (Exclude cases where input ends exactly with the operator badge pattern)
            const opPattern = new RegExp(
              `#${currentPartialCond.operator}\\s*$`
            );
            const hasCondValue = !opPattern.test(currentValue);

            if (
              hasCondValue &&
              !currentValue.endsWith('#') &&
              !currentValue.endsWith('##')
            ) {
              // Special handling for Between (inRange) operator
              if (currentPartialCond.operator === 'inRange') {
                // Check if current condition already has #to marker
                // Pattern: ... #and [#col] #inRange val [#to]
                const inRangeRegex =
                  /#(and|or)\s+(?:#[^\s#]+\s+)?#inRange\s+(.*)$/i;
                const match = currentValue.match(inRangeRegex);
                if (match) {
                  const valPart = match[2].trim();
                  if (!valPart.includes('#to')) {
                    // Check for dash format first
                    const dashMatch = valPart.match(/^(.+?)-(.+)$/);
                    if (
                      dashMatch &&
                      dashMatch[1].trim() &&
                      dashMatch[2].trim()
                    ) {
                      // Confirm with ##
                      onChange({
                        target: { value: currentValue + '##' },
                      } as React.ChangeEvent<HTMLInputElement>);
                      onClearPreservedState?.();
                      return;
                    }
                    // Add #to marker
                    onChange({
                      target: { value: currentValue + ' #to ' },
                    } as React.ChangeEvent<HTMLInputElement>);
                    return;
                  }
                }
              }

              // Confirm pattern
              const newValue = currentValue + '##';
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
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
          // Delete on confirmed multi-condition filter: Enter edit mode for the last condition's valueTo first
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            const conditions = searchMode.filterSearch.conditions || [];

            // FIX: For partial patterns where user is typing a new condition,
            // partialConditions may have more elements than conditions.
            // Use the actual count of all conditions (including the one being typed).
            const partialConditions = searchMode.partialConditions || [];
            const totalConditions = Math.max(
              conditions.length,
              partialConditions.length
            );
            const lastIdx = totalConditions - 1;

            // Get the last condition from either partialConditions or conditions
            const lastCondition =
              partialConditions[lastIdx] || conditions[lastIdx];

            if (lastIdx >= 0 && lastCondition && clearConditionPart) {
              // 1. For Between operator with valueTo: Enter edit mode for valueTo first
              // [FIX] Use editConditionValue to enter edit mode instead of clearConditionPart
              if (
                lastCondition.operator === 'inRange' &&
                lastCondition.valueTo
              ) {
                if (editConditionValue) {
                  editConditionValue(lastIdx, 'valueTo');
                } else {
                  clearConditionPart(lastIdx, 'valueTo');
                }
                return;
              }

              // 2. Delete value if it exists and is non-empty
              // [FIX] For Between operator, enter edit mode for value
              if (lastCondition.value && lastCondition.value.trim() !== '') {
                if (
                  lastCondition.operator === 'inRange' &&
                  editConditionValue
                ) {
                  editConditionValue(lastIdx, 'value');
                } else {
                  clearConditionPart(lastIdx, 'value');
                }
                return;
              }

              // 3. Delete operator if it exists
              if (lastCondition.operator) {
                clearConditionPart(lastIdx, 'operator');
                return;
              }

              // 4. Delete column if it exists
              if (lastCondition.column) {
                clearConditionPart(lastIdx, 'column');
                return;
              }
            }
          }

          // Delete on confirmed single-condition filter: Enter in-badge edit mode
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            // For Between (inRange) operator with valueTo, enter edit mode for valueTo
            // [FIX] Use editConditionValue to enter edit mode instead of clearConditionPart
            if (
              searchMode.filterSearch.operator === 'inRange' &&
              searchMode.filterSearch.valueTo
            ) {
              if (editConditionValue) {
                editConditionValue(0, 'valueTo');
              } else if (clearConditionPart) {
                clearConditionPart(0, 'valueTo');
              }
              return;
            }
            // For Between operator with only value (no valueTo), enter edit mode for value
            if (
              searchMode.filterSearch.operator === 'inRange' &&
              searchMode.filterSearch.value
            ) {
              if (editConditionValue) {
                editConditionValue(0, 'value');
              } else if (clearConditionPart) {
                clearConditionPart(0, 'value');
              }
              return;
            }
            // For other operators, delete the first/only value
            if (clearConditionPart) {
              clearConditionPart(0, 'value');
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
            if (clearConditionPart) {
              clearConditionPart(0, 'value');
            }
            return;
          }

          // Generalize Step 6: Delete on partial multi-condition removes the last operator and opens operator selector
          // Pattern: ...[Join][Column][Operator] + Delete -> ...[Join][Column] with operator selector open (#)
          const activeIdx = searchMode.activeConditionIndex ?? 0;
          const currentPartialCond = searchMode.partialConditions?.[activeIdx];
          const currentOp = currentPartialCond?.operator;

          if (
            activeIdx > 0 &&
            currentOp &&
            searchMode.partialJoin &&
            !searchMode.isFilterMode
          ) {
            e.preventDefault();

            // Use PatternBuilder to reconstruct the pattern up to the current column, then add trailing '#'
            // This ensures the operator selector opens for the current condition.
            const conditions = (searchMode.partialConditions || []).map(c => ({
              field: c.column?.field || c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            }));

            // To "delete" the operator, we clear it from the last condition and use openSelector: true
            if (conditions[activeIdx]) {
              conditions[activeIdx].operator = undefined;
              conditions[activeIdx].value = undefined;
              conditions[activeIdx].valueTo = undefined;
            }

            const newValue = PatternBuilder.buildNConditions(
              conditions,
              searchMode.joins || [],
              searchMode.filterSearch?.isMultiColumn || false,
              searchMode.filterSearch?.column?.field || '',
              {
                confirmed: false,
                openSelector: true,
                stopAfterIndex: activeIdx,
              }
            );

            // Clear preserved state to remove the operator badge from UI
            onClearPreservedState?.();

            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          // D6 Step 3: Remove trailing join operator from confirmed filter
          // Pattern: ... [Value] #join # -> ... [Value]##
          // This handles when user added join operator but wants to remove it and go back to confirmed state
          const trailingJoinRegex = /(.*)\s+#(?:and|or)\s+#\s*$/i;
          if (value.match(trailingJoinRegex)) {
            e.preventDefault();
            // Remove trailing join operator and restore ## marker
            const match = value.match(trailingJoinRegex);
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
          // Only for single condition filters (multi-condition uses generalized logic above)
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.value === '' &&
            !searchMode.filterSearch?.isMultiCondition
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

            // Generalize: check if this is a subsequent condition's operator selector
            if (
              searchMode.partialJoin &&
              searchMode.activeConditionIndex &&
              searchMode.activeConditionIndex > 0
            ) {
              e.preventDefault();

              // Go back to column selector while preserving the join badge
              // Pattern: ...[Join][Column]# -> ...[Join]#
              // This removes the column badge but keeps the join and opens column selector
              const conditions = (searchMode.partialConditions || []).map(
                c => ({
                  field: c.column?.field || c.field,
                  operator: c.operator,
                  value: c.value,
                  valueTo: c.valueTo,
                })
              );

              // Build pattern up to previous condition (confirmed), then add join + # for column selector
              const prevActiveIdx = searchMode.activeConditionIndex - 1;
              const basePattern = PatternBuilder.buildNConditions(
                conditions.slice(0, prevActiveIdx + 1),
                (searchMode.joins || []).slice(0, prevActiveIdx),
                searchMode.filterSearch?.isMultiColumn || false,
                searchMode.filterSearch?.column?.field || '',
                {
                  confirmed: false,
                  openSelector: false, // Don't add trailing # here
                }
              );

              // Preserve the join operator and add trailing # for column selector
              const preservedJoin =
                searchMode.joins?.[prevActiveIdx] ||
                searchMode.partialJoin ||
                'AND';
              const newValue = `${basePattern} #${preservedJoin.toLowerCase()} #`;

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
      editConditionValue,
      clearConditionPart,
      clearJoin,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
