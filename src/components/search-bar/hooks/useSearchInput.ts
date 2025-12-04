import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EnhancedSearchState } from '../types';
import {
  buildColumnValue,
  buildFilterValue,
  getOperatorSearchTerm,
} from '../utils/searchUtils';

interface UseSearchInputProps {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const useSearchInput = ({
  value,
  searchMode,
  onChange,
  inputRef,
}: UseSearchInputProps) => {
  const badgeRef = useRef<HTMLDivElement>(null); // Column badge (first badge, index 0)
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const operatorBadgeRef = useRef<HTMLDivElement>(null); // First operator badge
  const joinBadgeRef = useRef<HTMLDivElement>(null); // Join badge (AND/OR)
  const secondColumnBadgeRef = useRef<HTMLDivElement>(null); // Second column badge (multi-column)
  const secondOperatorBadgeRef = useRef<HTMLDivElement>(null); // Second operator badge

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
    // PRIORITY 0: When any modal selector is open, hide "#" from input
    // BaseSelector now handles its own internal search, so we don't need to show "#" trigger
    if (searchMode.showColumnSelector) {
      return ''; // Column selector open - hide "#"
    }
    if (searchMode.showOperatorSelector) {
      return ''; // Operator selector open - hide "#"
    }
    if (searchMode.showJoinOperatorSelector) {
      return ''; // Join operator selector open - hide "#"
    }

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
      // Case: Second operator selected, ready for second value input - show the second value being typed
      // Multi-column pattern: #col1 #op1 val1 #and #col2 #op2 val2 → extract val2
      // Same-column pattern:  #col1 #op1 val1 #and #op2 val2 → extract val2
      // Detect multi-column by checking if secondColumn exists
      if (searchMode.secondColumn) {
        // Multi-column: extract value after #col2 #op2
        const multiColMatch = value.match(
          /#(?:and|or)\s+#[^\s]+\s+#[^\s]+\s+(.*)$/i
        );
        return multiColMatch ? multiColMatch[1] : '';
      } else {
        // Same-column: extract value after #op2
        const sameColMatch = value.match(/#(?:and|or)\s+#[^\s]+\s+(.*)$/i);
        return sameColMatch ? sameColMatch[1] : '';
      }
    }

    // PRIORITY 4: Single-condition filter mode - show value for editing (NOT confirmed)
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      // For inRange (Between) operator waiting for second value - show empty input
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.waitingForValueTo
      ) {
        return ''; // Empty input, user types second value fresh
      }
      // For inRange (Between) operator with valueTo being typed - show only valueTo
      // The first value is already shown in badge, user is typing second value
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.valueTo &&
        !searchMode.filterSearch.isConfirmed
      ) {
        return searchMode.filterSearch.valueTo; // Show only second value being typed
      }
      // For confirmed inRange, show both values (for editing)
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.valueTo &&
        searchMode.filterSearch.isConfirmed
      ) {
        return ''; // Confirmed - values shown in badges, input empty
      }
      return searchMode.filterSearch.value;
    }

    // PRIORITY 5: Column selected, waiting for input
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
    searchMode.showColumnSelector,
    searchMode.partialJoin,
    searchMode.selectedColumn,
    searchMode.secondColumn,
  ]);

  // Ref to store last measured width - persists across renders
  const lastMeasuredWidthRef = useRef<number>(0);
  // Ref to track badge count for detecting additions/removals
  const lastBadgeCountRef = useRef<number>(0);

  // Calculate expected badge count based on current state
  const currentBadgeCount = useMemo(() => {
    if (!showTargetedIndicator) return 0;

    let count = 0;
    // Column badge
    if (searchMode.selectedColumn || searchMode.filterSearch?.field) count++;
    // Operator badge
    if (searchMode.filterSearch?.operator) count++;
    // Value badge
    if (searchMode.filterSearch?.value) count++;
    // Join badge
    if (searchMode.partialJoin || searchMode.filterSearch?.joinOperator)
      count++;
    // Second operator badge
    if (
      searchMode.secondOperator ||
      (searchMode.filterSearch?.conditions &&
        searchMode.filterSearch.conditions.length >= 2)
    )
      count++;
    // Second value badge
    if (searchMode.filterSearch?.conditions?.[1]?.value) count++;

    return count;
  }, [
    showTargetedIndicator,
    searchMode.selectedColumn,
    searchMode.filterSearch,
    searchMode.partialJoin,
    searchMode.secondOperator,
  ]);

  // Dynamic badge width tracking using CSS variable - no React state updates!
  useEffect(() => {
    if (!showTargetedIndicator || !inputRef?.current) {
      // Reset to default padding when no badge
      if (inputRef?.current) {
        inputRef.current.style.removeProperty('--badge-width');
      }
      lastMeasuredWidthRef.current = 0;
      lastBadgeCountRef.current = 0;
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

    // Detect badge count changes
    const badgeAdded = currentBadgeCount > lastBadgeCountRef.current;
    const badgeRemoved = currentBadgeCount < lastBadgeCountRef.current;
    lastBadgeCountRef.current = currentBadgeCount;

    const updatePadding = () => {
      if (!targetElement || !inputElement) return;

      const badgeWidth = targetElement.offsetWidth;

      // Skip if width is 0 (element not rendered yet)
      if (badgeWidth === 0) return;

      // Only update if width has changed significantly (>2px difference)
      if (Math.abs(badgeWidth - lastMeasuredWidthRef.current) > 2) {
        lastMeasuredWidthRef.current = badgeWidth;
        inputElement.style.setProperty('--badge-width', `${badgeWidth + 16}px`);
      }
    };

    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    if (badgeAdded) {
      // Badge ADDED: delay measurement to let animation complete
      // This prevents the "jump to the right" visual glitch
      initialTimer = setTimeout(() => {
        updatePadding();
      }, 300);
    } else if (badgeRemoved) {
      // Badge REMOVED: update immediately so placeholder follows badges
      // Don't wait for exit animation - user expects immediate feedback
      updatePadding();
    } else {
      // No count change, measure on next frame
      requestAnimationFrame(() => {
        updatePadding();
      });
    }

    // ResizeObserver for subsequent size changes
    // Use shorter debounce when badges are removed for faster response
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      // Shorter debounce for immediate feel
      debounceTimer = setTimeout(() => {
        updatePadding();
      }, 16); // ~1 frame
    });

    resizeObserver.observe(targetElement);

    return () => {
      resizeObserver.disconnect();
      if (initialTimer) clearTimeout(initialTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
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
    currentBadgeCount,
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

        // SPECIAL CASE: User types on confirmed multi-condition - trigger second value edit
        // This is Case 5 - user types any char on a confirmed 6-badge multi-condition filter
        // We need to trigger parent's handleEditSecondValue indirectly by setting a flag
        if (
          searchMode.filterSearch.isConfirmed &&
          searchMode.filterSearch.isMultiCondition &&
          searchMode.filterSearch.conditions &&
          searchMode.filterSearch.conditions.length >= 2 &&
          inputValue.trim() !== '' &&
          inputValue.trim() !== '#'
        ) {
          // Signal to parent: user wants to edit second value
          // We'll add a special marker that parent can detect
          const columnName = searchMode.filterSearch.field;
          const firstCondition = searchMode.filterSearch.conditions[0];
          const secondCondition = searchMode.filterSearch.conditions[1];
          const joinOp = searchMode.filterSearch.joinOperator || 'AND';

          // Build pattern for editing second value (without ## marker)
          const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp.toLowerCase()} #${secondCondition.operator} ${inputValue}`;

          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        // SPECIAL CASE: Between operator waiting for second value OR typing second value
        // Append typed value to the #to marker pattern
        if (
          searchMode.filterSearch.operator === 'inRange' &&
          (searchMode.filterSearch.waitingForValueTo ||
            (searchMode.filterSearch.valueTo &&
              !searchMode.filterSearch.isConfirmed))
        ) {
          // Pattern: #col #inRange 500 #to → #col #inRange 500 #to 700
          const columnName = searchMode.filterSearch.field;
          const operator = searchMode.filterSearch.operator;
          const firstValue = searchMode.filterSearch.value;
          const newValue = `#${columnName} #${operator} ${firstValue} #to ${inputValue}`;
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
        searchMode.showColumnSelector &&
        searchMode.isSecondColumn &&
        searchMode.partialJoin &&
        searchMode.filterSearch
      ) {
        // MULTI-COLUMN: User is typing to search for second column
        // Pattern: #col1 #op val #and #searchTerm
        const filter = searchMode.filterSearch;
        const join = searchMode.partialJoin.toLowerCase();
        const firstValTo = filter.valueTo ? ` ${filter.valueTo}` : '';
        const newValue = `#${filter.field} #${filter.operator} ${filter.value}${firstValTo} #${join} #${inputValue}`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (
        !searchMode.isFilterMode &&
        searchMode.partialJoin &&
        searchMode.filterSearch &&
        searchMode.selectedColumn &&
        !searchMode.showColumnSelector // Exclude when column selector is open
      ) {
        // Handle incomplete multi-condition - user is typing second value
        // Build pattern: #field #op1 val1 #join #op2 val2 (same-column)
        // Or: #field #op1 val1 #join #col2 #op2 val2 (multi-column)
        const currentValue = value;

        // MULTI-COLUMN: Check for pattern #col1 #op1 val1 #join #col2 #op2
        const multiColMatch = currentValue.match(
          /#(and|or)\s+#([^\s#]+)\s+#([^\s]+)/i
        );

        // SAME-COLUMN: Check for pattern #col1 #op1 val1 #join #op2
        const sameColMatch = currentValue.match(/#(and|or)\s+#([^\s]+)$/i);

        // Extract groups based on match type
        // multiColMatch: [full, join, col2, op2]
        // sameColMatch: [full, join, op2]
        const isMultiColumn = searchMode.secondColumn && multiColMatch;

        let join: string;
        let col2: string | undefined;
        let op2: string;

        if (isMultiColumn && multiColMatch) {
          [, join, col2, op2] = multiColMatch;
        } else if (sameColMatch) {
          [, join, op2] = sameColMatch;
        } else {
          // No match, use original onChange
          onChange(e);
          return;
        }

        // SPECIAL CASE: If input becomes empty, preserve second operator in partial multi-condition state
        // This handles when user deletes the second value completely
        // Step 5 of E9: Preserve 5 badges, then Step 6 backspace will trigger operator selector
        if (inputValue.trim() === '') {
          // Remove everything from #join onwards to get base pattern
          const basePattern = isMultiColumn
            ? currentValue.replace(
                /#(and|or)\s+#([^\s#]+)\s+#([^\s]+)(?:\s+.*)?$/i,
                ''
              )
            : currentValue.replace(/#(and|or)\s+#([^\s]+)(?:\s+.*)?$/i, '');

          // Preserve second operator to maintain partial multi-condition state (5 badges)
          // Step 6 backspace will be handled by useSearchKeyboard.ts to remove operator and open selector
          const newValue = isMultiColumn
            ? `${basePattern.trim()} #${join} #${col2} #${op2}`
            : `${basePattern.trim()} #${join} #${op2}`;

          // Keep preserved state to maintain second operator badge for Step 6
          // DO NOT call onClearPreservedState?.() - needed for useSearchKeyboard.ts handler

          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        // Build complete multi-condition pattern
        // Same-column: #field #op1 val1 #join #op2 val2
        // Multi-column: #field #op1 val1 #join #col2 #op2 val2
        const basePattern = isMultiColumn
          ? currentValue.replace(
              /#(and|or)\s+#([^\s#]+)\s+#([^\s]+)(?:\s+.*)?$/i,
              ''
            )
          : currentValue.replace(/#(and|or)\s+#([^\s]+)(?:\s+.*)?$/i, '');

        // inputValue now contains the full accumulated second value thanks to displayValue fix
        const newValue = isMultiColumn
          ? `${basePattern.trim()} #${join} #${col2} #${op2} ${inputValue}`
          : `${basePattern.trim()} #${join} #${op2} ${inputValue}`;

        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
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
    [searchMode, onChange, value]
  );

  return {
    displayValue,
    showTargetedIndicator,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    badgeRef,
    badgesContainerRef,
    operatorBadgeRef,
    joinBadgeRef,
    secondColumnBadgeRef,
    secondOperatorBadgeRef,
  };
};
