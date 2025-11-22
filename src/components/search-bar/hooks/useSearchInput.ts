import { useCallback, useMemo, useRef, useEffect } from 'react';
import { EnhancedSearchState } from '../types';
import {
  buildFilterValue,
  buildColumnValue,
  getOperatorSearchTerm,
} from '../utils/searchUtils';

interface UseSearchInputProps {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onClearPreservedState?: () => void;
}

export const useSearchInput = ({
  value,
  searchMode,
  onChange,
  inputRef,
  onClearPreservedState,
}: UseSearchInputProps) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgesContainerRef = useRef<HTMLDivElement>(null);

  const operatorSearchTerm = useMemo(
    () => getOperatorSearchTerm(value),
    [value]
  );

  // Compute stable boolean for isSecondOperator to avoid dependency array size changes
  const isSecondOperator = !!searchMode.isSecondOperator;

  const showTargetedIndicator = useMemo(
    () =>
      (searchMode.isFilterMode && !!searchMode.filterSearch) ||
      (searchMode.showOperatorSelector &&
        (!!searchMode.selectedColumn || !!searchMode.filterSearch)) || // Include filterSearch for isSecondOperator
      (searchMode.showJoinOperatorSelector && !!searchMode.filterSearch) || // NEW: Show badge when join selector is open
      (!!searchMode.selectedColumn && !searchMode.showColumnSelector),
    [
      searchMode.isFilterMode,
      searchMode.filterSearch,
      searchMode.showOperatorSelector,
      searchMode.showJoinOperatorSelector,
      searchMode.selectedColumn,
      searchMode.showColumnSelector,
    ]
  );

  const displayValue = useMemo(() => {
    // PRIORITY 1: Multi-condition verbose mode - all values shown in badges, input empty
    if (
      searchMode.filterSearch?.isMultiCondition &&
      searchMode.filterSearch?.conditions &&
      searchMode.filterSearch.conditions.length > 1 &&
      searchMode.isFilterMode
    ) {
      return ''; // All values displayed in badges, input empty
    }

    // PRIORITY 2: Confirmed single-condition - value shown as gray badge, input empty
    if (
      searchMode.isFilterMode &&
      searchMode.filterSearch?.isConfirmed &&
      !searchMode.filterSearch?.isMultiCondition
    ) {
      return ''; // Value displayed in gray badge, input empty
    }

    // PRIORITY 3: Incomplete multi-condition (building second condition)
    // When user has selected join operator and is either selecting second operator OR ready to type second value
    if (
      !searchMode.isFilterMode &&
      searchMode.partialJoin &&
      searchMode.filterSearch &&
      searchMode.selectedColumn
    ) {
      // Case 1: Selecting second operator - show operator search term for filtering
      if (searchMode.showOperatorSelector && isSecondOperator) {
        // If operatorSearchTerm is empty, show empty string (not "#")
        return operatorSearchTerm ? `#${operatorSearchTerm}` : '';
      }
      // Case 2: Second operator selected, ready for second value input - show the second value being typed
      // Extract second value from pattern: #field #op1 val1 #join #op2 val2
      const secondValueMatch = value.match(/#(?:and|or)\s+#[^\s]+\s+(.*)$/i);
      return secondValueMatch ? secondValueMatch[1] : '';
    }

    // PRIORITY 4: Single-condition filter mode - show value for editing (NOT confirmed)
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      return searchMode.filterSearch.value;
    }

    // PRIORITY 5: Join operator selector open
    if (searchMode.showJoinOperatorSelector && searchMode.filterSearch) {
      // If confirmed, value shown in gray badge, input should be empty
      if (searchMode.filterSearch.isConfirmed) {
        return '';
      }
      // If not confirmed, show value for editing
      return searchMode.filterSearch.value;
    }

    // PRIORITY 6: Operator selector open
    if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
      // Check if this is second operator (after join) - show operator search term for selector
      if (isSecondOperator) {
        // If operatorSearchTerm is empty, show empty string (not "#")
        return operatorSearchTerm ? `#${operatorSearchTerm}` : '';
      }
      return `#${operatorSearchTerm}`;
    }

    // PRIORITY 7: Column selected, waiting for input
    if (searchMode.selectedColumn && !searchMode.showColumnSelector) {
      return '';
    }

    // DEFAULT: Show raw value
    return value;
  }, [
    value,
    searchMode.isFilterMode,
    searchMode.filterSearch,
    searchMode.showOperatorSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.partialJoin,
    isSecondOperator,
    searchMode.selectedColumn,
    searchMode.showColumnSelector,
    operatorSearchTerm,
  ]);

  // Dynamic badge width tracking using CSS variable - no React state updates!
  // This prevents flickering by updating DOM directly without triggering re-renders
  useEffect(() => {
    if (!showTargetedIndicator || !inputRef?.current) {
      // Reset to default padding when no badge
      if (inputRef?.current) {
        inputRef.current.style.removeProperty('--badge-width');
      }
      return;
    }

    // Determine if we should use badges container (when showing both purple + blue badges)
    const shouldUseContainer =
      (searchMode.isFilterMode ||
        searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && isSecondOperator) ||
        // Show container for incomplete multi-condition (waiting for second value)
        (!searchMode.isFilterMode &&
          searchMode.partialJoin &&
          !!searchMode.filterSearch) ||
        // Show container for confirmed multi-condition
        searchMode.filterSearch?.isMultiCondition) &&
      !!searchMode.filterSearch;

    const targetElement =
      shouldUseContainer && badgesContainerRef.current
        ? badgesContainerRef.current
        : badgeRef.current;

    if (!targetElement || !inputRef.current) {
      return;
    }

    const inputElement = inputRef.current;

    // Update padding instantly with current badge width
    const updatePadding = () => {
      if (targetElement && inputElement) {
        const badgeWidth = targetElement.offsetWidth;
        // Set CSS variable directly - NO React state, NO re-render!
        inputElement.style.setProperty('--badge-width', `${badgeWidth + 16}px`);
      }
    };

    // Initial measurement with RAF for DOM stability
    requestAnimationFrame(() => {
      updatePadding();
    });

    // Watch for badge size changes - instant updates (no throttling needed without animations)
    const resizeObserver = new ResizeObserver(() => {
      updatePadding();
    });

    resizeObserver.observe(targetElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    showTargetedIndicator,
    searchMode.isFilterMode,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    searchMode.filterSearch,
    searchMode.filterSearch?.isMultiCondition,
    searchMode.partialJoin,
    inputRef,
    isSecondOperator,
  ]);

  const handleHoverChange = useCallback(() => {
    // No-op - kept for compatibility
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isFilterMode && searchMode.filterSearch) {
        // SPECIAL CASE: Confirmed filter + user types # for join selector
        // Remove ## marker first, then append # to open join selector
        if (searchMode.filterSearch.isConfirmed && inputValue.trim() === '#') {
          const cleanValue = value.replace(/##\s*$/, '').trim();
          const newValue = cleanValue + ' #';
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        const newValue = buildFilterValue(searchMode.filterSearch, inputValue);
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (
        searchMode.showJoinOperatorSelector &&
        searchMode.filterSearch
      ) {
        // User is typing while join selector is open
        // Treat like filter mode - rebuild the value
        const newValue = buildFilterValue(searchMode.filterSearch, inputValue);
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (
        !searchMode.isFilterMode &&
        searchMode.partialJoin &&
        searchMode.filterSearch &&
        searchMode.selectedColumn
      ) {
        // Handle incomplete multi-condition - user is typing second value
        // Build pattern: #field #op1 val1 #join #op2 val2
        const currentValue = value;

        // Extract the join operator and second operator from current pattern
        const secondOpMatch = currentValue.match(/#(and|or)\s+#([^\s]+)/i);

        if (secondOpMatch) {
          const [, join, op2] = secondOpMatch;

          // SPECIAL CASE: If input becomes empty, remove second operator and add trailing # for operator selector
          // This handles when user deletes the second value completely
          if (inputValue.trim() === '') {
            // Remove everything from #join onwards to get base pattern
            const basePattern = currentValue.replace(
              /#(and|or)\s+#([^\s]+)(?:\s+.*)?$/i,
              ''
            );
            // Add trailing # to open operator selector with fresh state
            const newValue = `${basePattern.trim()} #${join} #`;
            console.log(
              '🔧 Input emptied while building second value - removing second operator:',
              {
                currentValue,
                newValue,
              }
            );

            // Clear preserved state to remove second operator badge
            onClearPreservedState?.();

            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          // Build complete multi-condition: #field #op1 val1 #join #op2 val2
          // Remove everything from #join onwards to get base pattern
          const basePattern = currentValue.replace(
            /#(and|or)\s+#([^\s]+)(?:\s+.*)?$/i,
            ''
          );
          // inputValue now contains the full accumulated second value thanks to displayValue fix
          const newValue = `${basePattern.trim()} #${join} #${op2} ${inputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
        const columnName = searchMode.selectedColumn.field;
        const cleanInputValue = inputValue.startsWith('#')
          ? inputValue.substring(1)
          : inputValue;

        if (cleanInputValue === '') {
          const newValue = buildColumnValue(columnName, 'plain');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else {
          const newValue = `#${columnName} #${cleanInputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else if (
        searchMode.selectedColumn &&
        !searchMode.showColumnSelector &&
        !searchMode.showOperatorSelector
      ) {
        const columnName = searchMode.selectedColumn.field;

        if (inputValue === ' ') {
          const newValue = buildColumnValue(columnName, 'space');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else if (inputValue === ':') {
          const newValue = buildColumnValue(columnName, 'colon');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else if (inputValue.trim() !== '') {
          const newValue = `#${columnName}:${inputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else {
          const newValue = buildColumnValue(columnName, 'plain');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        onChange(e);
      }
    },
    [searchMode, onChange, value, onClearPreservedState]
  );

  return {
    displayValue,
    showTargetedIndicator,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    badgeRef,
    badgesContainerRef,
  };
};
