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

// ============================================================================
// Dynamic Ref Map for N-Condition Support
// ============================================================================

/**
 * Badge ID format for scalable ref system:
 * - Column: condition-{index}-column
 * - Operator: condition-{index}-operator
 * - Join: join-{index}
 * - Value: condition-{index}-value or condition-{index}-value-{from|to}
 */

export const useSearchInput = ({
  value,
  searchMode,
  onChange,
  inputRef,
}: UseSearchInputProps) => {
  // ============ Dynamic Ref Map ============
  // Map<badgeId, HTMLDivElement | null>
  const badgeRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());

  /**
   * Get ref for a badge by ID
   */
  const getBadgeRef = useCallback((badgeId: string): HTMLDivElement | null => {
    return badgeRefsMap.current.get(badgeId) || null;
  }, []);

  /**
   * Set ref for a badge by ID (used as callback ref)
   */
  const setBadgeRef = useCallback(
    (badgeId: string, element: HTMLDivElement | null) => {
      if (element) {
        badgeRefsMap.current.set(badgeId, element);
      } else {
        badgeRefsMap.current.delete(badgeId);
      }
    },
    []
  );

  /**
   * Get column badge ref by condition index
   */
  const getColumnRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-column`);
    },
    [getBadgeRef]
  );

  /**
   * Get operator badge ref by condition index
   */
  const getOperatorRef = useCallback(
    (conditionIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`condition-${conditionIndex}-operator`);
    },
    [getBadgeRef]
  );

  /**
   * Get join badge ref by index (join-0 = between condition 0 and 1)
   */
  const getJoinRef = useCallback(
    (joinIndex: number): HTMLDivElement | null => {
      return getBadgeRef(`join-${joinIndex}`);
    },
    [getBadgeRef]
  );

  // ============ Static Refs for Selector Positioning ============
  // These are needed for useSelectorPosition which requires RefObjects
  // Dynamic refs are preferred via getColumnRef(n), getOperatorRef(n), getJoinRef(n)
  const badgeRef = useRef<HTMLDivElement>(null); // Column badge (condition-0-column)
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const operatorBadgeRef = useRef<HTMLDivElement>(null); // First operator badge (condition-0-operator)
  const joinBadgeRef = useRef<HTMLDivElement>(null); // Join badge (join-0)
  const secondColumnBadgeRef = useRef<HTMLDivElement>(null); // Second column badge (condition-1-column)
  const secondOperatorBadgeRef = useRef<HTMLDivElement>(null); // Second operator badge (condition-1-operator)

  // ============ Dynamic Ref Wrapper for N-Condition Support ============
  // Creates a "lazy ref" that looks up the element from the badge map on access
  // This ensures we always get the current element, even if the map was updated after render
  const createLazyColumnRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      // Create an object with a getter for 'current' that looks up dynamically
      return {
        get current() {
          return getColumnRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;
    },
    [getColumnRef]
  );

  // Lazy ref for operator badges (similar to column refs)
  const createLazyOperatorRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      return {
        get current() {
          return getOperatorRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;
    },
    [getOperatorRef]
  );

  // Lazy ref for join badges
  const createLazyJoinRef = useCallback(
    (joinIndex: number): React.RefObject<HTMLDivElement | null> => {
      return {
        get current() {
          return getJoinRef(joinIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;
    },
    [getJoinRef]
  );

  // Memoized lazy refs for each condition index (to avoid creating new objects on every render)
  const condition2ColumnRef = useMemo(
    () => createLazyColumnRef(2),
    [createLazyColumnRef]
  );
  const condition3ColumnRef = useMemo(
    () => createLazyColumnRef(3),
    [createLazyColumnRef]
  );
  const condition4ColumnRef = useMemo(
    () => createLazyColumnRef(4),
    [createLazyColumnRef]
  );

  // Memoized lazy refs for operator badges
  const condition2OperatorRef = useMemo(
    () => createLazyOperatorRef(2),
    [createLazyOperatorRef]
  );
  const condition3OperatorRef = useMemo(
    () => createLazyOperatorRef(3),
    [createLazyOperatorRef]
  );
  const condition4OperatorRef = useMemo(
    () => createLazyOperatorRef(4),
    [createLazyOperatorRef]
  );

  /**
   * Get the appropriate lazy ref for a condition index >= 2
   */
  const getConditionNColumnRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      switch (conditionIndex) {
        case 2:
          return condition2ColumnRef;
        case 3:
          return condition3ColumnRef;
        case 4:
          return condition4ColumnRef;
        default:
          // For indices > 4, create a new lazy ref (less optimal but handles edge cases)
          return createLazyColumnRef(conditionIndex);
      }
    },
    [
      condition2ColumnRef,
      condition3ColumnRef,
      condition4ColumnRef,
      createLazyColumnRef,
    ]
  );

  /**
   * Get the appropriate lazy ref for an operator badge at condition index >= 2
   */
  const getConditionNOperatorRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      switch (conditionIndex) {
        case 2:
          return condition2OperatorRef;
        case 3:
          return condition3OperatorRef;
        case 4:
          return condition4OperatorRef;
        default:
          return createLazyOperatorRef(conditionIndex);
      }
    },
    [
      condition2OperatorRef,
      condition3OperatorRef,
      condition4OperatorRef,
      createLazyOperatorRef,
    ]
  );

  /**
   * Get the appropriate lazy ref for a join badge at index >= 1
   */
  const getConditionNJoinRef = useCallback(
    (joinIndex: number): React.RefObject<HTMLDivElement | null> => {
      switch (joinIndex) {
        case 0:
          return joinBadgeRef;
        default:
          return createLazyJoinRef(joinIndex);
      }
    },
    [joinBadgeRef, createLazyJoinRef]
  );

  const operatorSearchTerm = useMemo(
    () => getOperatorSearchTerm(value),
    [value]
  );

  // Compute stable boolean for second condition operator to avoid dependency array size changes
  const hasSecondConditionOperator =
    !!searchMode.partialConditions?.[1]?.operator;

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

    // PRIORITY 0.5: Building condition N (index >= 2) value - show the value being typed
    // This takes precedence over multi-condition verbose mode
    const isBuildingConditionNValue =
      searchMode.activeConditionIndex !== undefined &&
      searchMode.activeConditionIndex >= 2 &&
      !searchMode.showColumnSelector &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector;

    if (isBuildingConditionNValue) {
      // Extract the value being typed for condition N from the pattern
      // Pattern: ...#col #op value → extract value
      const lastValueMatch = value.match(/#[^\s#]+\s+#[^\s#]+\s+([^#]*)$/);
      if (lastValueMatch) {
        return lastValueMatch[1].trim();
      }
      return '';
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
      // Special case: Second Between operator waiting for valueTo - badge shows [value][to], input empty
      const secondCondition = searchMode.partialConditions?.[1];
      if (secondCondition?.waitingForValueTo && secondCondition?.value) {
        return ''; // Value already shown in badge, input empty for typing second value
      }

      // Special case: Second Between operator with valueTo being typed - show only valueTo
      if (secondCondition?.valueTo) {
        return secondCondition.valueTo; // Show only valueTo being typed
      }

      // Case: Second operator selected, ready for second value input - show the second value being typed
      // Multi-column pattern: #col1 #op1 val1 #and #col2 #op2 val2 → extract val2
      // Same-column pattern:  #col1 #op1 val1 #and #op2 val2 → extract val2
      // Detect multi-column by checking if secondCondition.column exists
      if (secondCondition?.column) {
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
    searchMode.partialConditions,
    searchMode.activeConditionIndex,
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
      searchMode.partialConditions?.[1]?.operator ||
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
    searchMode.partialConditions,
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
        (searchMode.showOperatorSelector && hasSecondConditionOperator) ||
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
    hasSecondConditionOperator,
    currentBadgeCount,
  ]);

  const handleHoverChange = useCallback(() => {
    // No-op - kept for compatibility
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isFilterMode && searchMode.filterSearch) {
        // SPECIAL CASE: Confirmed filter + user types # or SPACE for join selector
        // Remove ## marker first, then append # to open join selector
        // Works for both single-condition AND multi-condition (N-condition support)
        const isHashTrigger = inputValue.trim() === '#';
        const isSpaceTrigger = inputValue === ' ';

        if (
          searchMode.filterSearch.isConfirmed &&
          (isHashTrigger || isSpaceTrigger)
        ) {
          // For multi-condition: rebuild full pattern, then append #
          // For single-condition: just remove ## and append #
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
        // NOTE: Skip this when building condition 2+ (activeConditionIndex >= 2) to avoid losing partial condition
        const isBuildingConditionN =
          searchMode.activeConditionIndex !== undefined &&
          searchMode.activeConditionIndex >= 2;
        const hasPartialConditionsBeyondConfirmed =
          searchMode.partialConditions &&
          searchMode.partialConditions.length >
            (searchMode.filterSearch.conditions?.length ?? 0);

        if (
          searchMode.filterSearch.isConfirmed &&
          searchMode.filterSearch.isMultiCondition &&
          searchMode.filterSearch.conditions &&
          searchMode.filterSearch.conditions.length >= 2 &&
          inputValue.trim() !== '' &&
          inputValue.trim() !== '#' &&
          !isBuildingConditionN && // Not building condition 2+
          !hasPartialConditionsBeyondConfirmed // No partial conditions beyond confirmed
        ) {
          // Signal to parent: user wants to edit second value
          // We'll add a special marker that parent can detect
          const columnName = searchMode.filterSearch.field;
          const firstCondition = searchMode.filterSearch.conditions[0];
          const secondCondition = searchMode.filterSearch.conditions[1];
          const joinOp = searchMode.filterSearch.joinOperator || 'AND';

          // Check if this is multi-COLUMN (second condition has different column)
          const secondColumnField = secondCondition.column?.field;
          const isMultiColumn =
            secondColumnField && secondColumnField !== columnName;

          // Handle Between operator valueTo for first condition
          const firstValueTo = firstCondition.valueTo
            ? ` #to ${firstCondition.valueTo}`
            : '';

          // Build pattern for editing second value (without ## marker)
          // Multi-column: #col1 #op1 val1 [#to val1To] #join #col2 #op2 inputValue
          // Same-column: #col1 #op1 val1 [#to val1To] #join #op2 inputValue
          const newValue = isMultiColumn
            ? `#${columnName} #${firstCondition.operator} ${firstCondition.value}${firstValueTo} #${joinOp.toLowerCase()} #${secondColumnField} #${secondCondition.operator} ${inputValue}`
            : `#${columnName} #${firstCondition.operator} ${firstCondition.value}${firstValueTo} #${joinOp.toLowerCase()} #${secondCondition.operator} ${inputValue}`;

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

        // SPECIAL CASE: Building condition 2+ (N-condition) value
        // Append inputValue to the last condition's value position in the pattern
        if (isBuildingConditionN || hasPartialConditionsBeyondConfirmed) {
          // Pattern structure: ...#join #col #op [value]
          // Find the last "#col #op" and append inputValue after it
          const lastConditionMatch = value.match(
            /^(.*#[^\s#]+\s+#[^\s#]+)\s*.*$/
          );
          if (lastConditionMatch) {
            const basePattern = lastConditionMatch[1];
            const newValue = inputValue
              ? `${basePattern} ${inputValue}`
              : basePattern;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }
          // Fallback: append to current value
          onChange({
            target: { value: value + inputValue },
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
        (searchMode.activeConditionIndex ?? 0) > 0 &&
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
        const isMultiColumn =
          searchMode.partialConditions?.[1]?.column && multiColMatch;

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

        // SPECIAL CASE: Second Between operator - preserve first value and #to marker
        // When waitingForValueTo is true, append typed value after #to
        const cond1 = searchMode.partialConditions?.[1];
        if (
          cond1?.waitingForValueTo &&
          cond1?.value &&
          cond1?.operator === 'inRange'
        ) {
          // Pattern: #col1 #op1 val1 #and #col2 #inRange secondVal #to → append typed value
          const basePattern = isMultiColumn
            ? currentValue.replace(
                /#(and|or)\s+#([^\s#]+)\s+#inRange\s+.+$/i,
                ''
              )
            : currentValue.replace(/#(and|or)\s+#inRange\s+.+$/i, '');

          const newValue = isMultiColumn
            ? `${basePattern.trim()} #${join} #${col2} #inRange ${cond1.value} #to ${inputValue}`
            : `${basePattern.trim()} #${join} #inRange ${cond1.value} #to ${inputValue}`;

          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        // SPECIAL CASE: Second Between operator typing valueTo - preserve first value and #to marker
        if (cond1?.valueTo && cond1?.operator === 'inRange') {
          const basePattern = isMultiColumn
            ? currentValue.replace(
                /#(and|or)\s+#([^\s#]+)\s+#inRange\s+.+$/i,
                ''
              )
            : currentValue.replace(/#(and|or)\s+#inRange\s+.+$/i, '');

          const newValue = isMultiColumn
            ? `${basePattern.trim()} #${join} #${col2} #inRange ${cond1.value} #to ${inputValue}`
            : `${basePattern.trim()} #${join} #inRange ${cond1.value} #to ${inputValue}`;

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
        // SPECIAL CASE: First SPACE on empty input triggers column selector (like #)
        // This makes it easier to enter filter mode without typing #
        if (inputValue === ' ' && value.trim() === '') {
          onChange({
            target: { value: '#' },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }
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
    // ============ Dynamic Ref Map API (N-Condition Support) ============
    getBadgeRef,
    setBadgeRef,
    getColumnRef,
    getOperatorRef,
    getJoinRef,
    // ============ Static Refs for Selector Positioning ============
    badgeRef,
    badgesContainerRef,
    operatorBadgeRef,
    joinBadgeRef,
    secondColumnBadgeRef,
    secondOperatorBadgeRef,
    // ============ Dynamic Lazy Ref for N-Condition Selector Positioning ============
    getConditionNColumnRef,
    getConditionNOperatorRef,
    getConditionNJoinRef,
  };
};
