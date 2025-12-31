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

  // ============ Ref Map Helpers ============
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

  // ============ Container Ref ============
  // Used for measuring the total width of all badges combined
  const badgesContainerRef = useRef<HTMLDivElement>(null);

  // ============ Generalized Lazy Ref System ============
  // Cache for lazy refs to ensure stability across renders
  const lazyRefsCache = useRef<
    Map<string, React.RefObject<HTMLDivElement | null>>
  >(new Map());

  /**
   * Creates a "lazy ref" that looks up the element from the badge map on access.
   * This is required for Selector components that expect a React.RefObject.
   * Stability is GUARANTEED by the lazyRefsCache to avoid infinite re-render loops.
   */
  const getLazyColumnRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `column-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getColumnRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getColumnRef]
  );

  const getLazyOperatorRef = useCallback(
    (conditionIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `operator-${conditionIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getOperatorRef(conditionIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getOperatorRef]
  );

  const getLazyJoinRef = useCallback(
    (joinIndex: number): React.RefObject<HTMLDivElement | null> => {
      const cacheKey = `join-${joinIndex}`;
      if (lazyRefsCache.current.has(cacheKey)) {
        return lazyRefsCache.current.get(cacheKey)!;
      }

      const lazyRef = {
        get current() {
          return getJoinRef(joinIndex);
        },
      } as React.RefObject<HTMLDivElement | null>;

      lazyRefsCache.current.set(cacheKey, lazyRef);
      return lazyRef;
    },
    [getJoinRef]
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
      // Use state-based extraction (more reliable than regex)
      const activeIdx = searchMode.activeConditionIndex!; // Safe: isBuildingConditionNValue ensures this is defined
      const nthCondition = searchMode.partialConditions?.[activeIdx];

      // [FIX] For Between operator waiting for valueTo, return empty to allow typing valueTo
      if (
        nthCondition?.operator === 'inRange' &&
        nthCondition?.waitingForValueTo
      ) {
        return ''; // Empty input, user types valueTo fresh
      }

      // [FIX] For Between operator typing valueTo, show only valueTo being typed
      if (nthCondition?.valueTo && nthCondition?.operator === 'inRange') {
        return nthCondition.valueTo;
      }

      if (nthCondition?.value !== undefined) {
        return nthCondition.value;
      }
      // No value yet - return empty to allow typing
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

    // PRIORITY 3: Incomplete multi-condition (building condition N where N >= 1)
    // When user has selected join operator and is either selecting operator OR ready to type value
    if (
      !searchMode.isFilterMode &&
      searchMode.partialJoin &&
      searchMode.filterSearch &&
      searchMode.selectedColumn
    ) {
      // Use activeConditionIndex for N-condition scalability (defaults to 1 in this context)
      const activeIdx = searchMode.activeConditionIndex ?? 1;
      const activeCondition = searchMode.partialConditions?.[activeIdx];

      // Special case: Between operator waiting for valueTo - badge shows [value][to], input empty
      if (activeCondition?.waitingForValueTo && activeCondition?.value) {
        return ''; // Value already shown in badge, input empty for typing second value
      }

      // Special case: Between operator with valueTo being typed - show only valueTo
      if (activeCondition?.valueTo) {
        return activeCondition.valueTo; // Show only valueTo being typed
      }

      // Case: Operator selected, ready for value input
      // Use state-based extraction first (more reliable than regex)
      if (activeCondition?.value !== undefined) {
        return activeCondition.value;
      }
      // No value yet - return empty to allow typing
      return '';
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
    const filter = searchMode.filterSearch;

    // 1. Column badge
    if (searchMode.selectedColumn || filter?.field) count++;

    // 2. Operator badge
    if (filter?.operator) count++;

    // 3. First Value badge
    if (filter?.value) count++;

    // 4. "Between" (inRange) specific badges
    if (filter?.operator === 'inRange') {
      // Separator badge ("to")
      if (filter.valueTo || filter.waitingForValueTo) count++;
      // Second value badge
      if (filter.valueTo) count++;
    }

    // 5. Join badge
    if (searchMode.partialJoin || filter?.joinOperator) count++;

    // 6. Second condition badges (if any)
    const hasSecondCond =
      (filter?.conditions && filter.conditions.length >= 2) ||
      searchMode.partialConditions?.[1]?.operator;

    if (hasSecondCond) {
      // Second condition operator
      count++;
      // Second condition value(s)
      const secondCond =
        filter?.conditions?.[1] || searchMode.partialConditions?.[1];
      if (secondCond?.value) count++;
      if (secondCond?.operator === 'inRange') {
        const waitingForValueTo = (
          secondCond as { waitingForValueTo?: boolean }
        ).waitingForValueTo;
        if (secondCond.valueTo || waitingForValueTo) count++;
        if (secondCond.valueTo) count++;
      }
    }

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
        : getColumnRef(0);

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
    getColumnRef,
  ]);

  const handleHoverChange = useCallback(() => {
    // No-op - kept for compatibility
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isFilterMode && searchMode.filterSearch) {
        // Calculate early: Are we building condition 3+ (index >= 2)?
        const isBuildingConditionN =
          searchMode.activeConditionIndex !== undefined &&
          searchMode.activeConditionIndex >= 2;
        const hasPartialConditionsBeyondConfirmed =
          searchMode.partialConditions &&
          searchMode.partialConditions.length >
            (searchMode.filterSearch.conditions?.length ?? 0);

        // SPECIAL CASE: Confirmed filter + user types # or SPACE for join selector
        // Remove ## marker first, then append # to open join selector
        // Works for both single-condition AND multi-condition (N-condition support)
        // BUT: Skip when building condition 3+ (user is typing a value, not triggering join)
        const isHashTrigger = inputValue.trim() === '#';
        const isSpaceTrigger = inputValue === ' ';

        if (
          searchMode.filterSearch.isConfirmed &&
          (isHashTrigger || isSpaceTrigger) &&
          !isBuildingConditionN && // Don't trigger join selector when building condition 3+
          !hasPartialConditionsBeyondConfirmed // Don't trigger when there are partial conditions
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
          // N-CONDITION SUPPORT: Build pattern with ALL conditions, replacing LAST condition's value
          const conditions = searchMode.filterSearch.conditions;
          const joins = searchMode.filterSearch.joins || [
            searchMode.filterSearch.joinOperator || 'AND',
          ];
          const firstColumn =
            conditions[0].column?.field || searchMode.filterSearch.field;

          // Build pattern for all conditions
          let newValue = '';

          for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            const condColumn = cond.column?.field || cond.field;
            const isMultiCol = condColumn !== firstColumn;

            // Handle Between operator valueTo
            const valueToStr = cond.valueTo ? ` #to ${cond.valueTo}` : '';

            if (i === 0) {
              // First condition: #col #op value [#to valueTo]
              newValue = `#${condColumn} #${cond.operator} ${cond.value}${valueToStr}`;
            } else {
              // Subsequent conditions: #join [#col] #op value [#to valueTo]
              const joinOp = joins[i - 1] || 'AND';

              if (i === conditions.length - 1) {
                // LAST condition: use inputValue instead of stored value
                if (isMultiCol) {
                  newValue += ` #${joinOp.toLowerCase()} #${condColumn} #${cond.operator} ${inputValue}`;
                } else {
                  newValue += ` #${joinOp.toLowerCase()} #${cond.operator} ${inputValue}`;
                }
              } else {
                // Middle conditions: keep original value
                if (isMultiCol) {
                  newValue += ` #${joinOp.toLowerCase()} #${condColumn} #${cond.operator} ${cond.value}${valueToStr}`;
                } else {
                  newValue += ` #${joinOp.toLowerCase()} #${cond.operator} ${cond.value}${valueToStr}`;
                }
              }
            }
          }

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

        // SPECIAL CASE: N-condition Between operator waiting for valueTo
        // When condition N (index >= 2) is Between and waiting for valueTo, append to #to marker
        if (isBuildingConditionN) {
          const activeIdx = searchMode.activeConditionIndex!;
          const nthCondition = searchMode.partialConditions?.[activeIdx];

          if (
            nthCondition?.operator === 'inRange' &&
            (nthCondition?.waitingForValueTo || nthCondition?.valueTo)
          ) {
            // Pattern: ...#hargaPokok #inRange 500 #to → ...#hargaPokok #inRange 500 #to 700
            // Find pattern up to and including "#to" and append inputValue
            const toMarkerMatch = value.match(/^(.*#to)\s*.*$/i);
            if (toMarkerMatch) {
              const basePatternWithTo = toMarkerMatch[1];
              const newValue = inputValue
                ? `${basePatternWithTo} ${inputValue}`
                : basePatternWithTo;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          }
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

        // SAME-COLUMN: Check for pattern #col1 #op1 val1 #join #op2 [value]
        // NOTE: Removed $ anchor to also match when user is typing value (e.g., "#and #contains m")
        const sameColMatch = currentValue.match(/#(and|or)\s+#([^\s]+)/i);

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
        if (inputValue === '') {
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

        // SPECIAL CASE: Between operator - preserve first value and #to marker
        // When waitingForValueTo is true, append typed value after #to
        // N-CONDITION: Use activeConditionIndex for scalability
        const activeIdx = searchMode.activeConditionIndex ?? 1;
        const activeCondN = searchMode.partialConditions?.[activeIdx];
        if (
          activeCondN?.waitingForValueTo &&
          activeCondN?.value &&
          activeCondN?.operator === 'inRange'
        ) {
          // Pattern: #col1 #op1 val1 #and #col2 #inRange secondVal #to → append typed value
          const basePattern = isMultiColumn
            ? currentValue.replace(
                /#(and|or)\s+#([^\s#]+)\s+#inRange\s+.+$/i,
                ''
              )
            : currentValue.replace(/#(and|or)\s+#inRange\s+.+$/i, '');

          const newValue = isMultiColumn
            ? `${basePattern.trim()} #${join} #${col2} #inRange ${activeCondN.value} #to ${inputValue}`
            : `${basePattern.trim()} #${join} #inRange ${activeCondN.value} #to ${inputValue}`;

          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        // SPECIAL CASE: Between operator typing valueTo - preserve first value and #to marker
        if (activeCondN?.valueTo && activeCondN?.operator === 'inRange') {
          const basePattern = isMultiColumn
            ? currentValue.replace(
                /#(and|or)\s+#([^\s#]+)\s+#inRange\s+.+$/i,
                ''
              )
            : currentValue.replace(/#(and|or)\s+#inRange\s+.+$/i, '');

          const newValue = isMultiColumn
            ? `${basePattern.trim()} #${join} #${col2} #inRange ${activeCondN.value} #to ${inputValue}`
            : `${basePattern.trim()} #${join} #inRange ${activeCondN.value} #to ${inputValue}`;

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
    // ============ Container Ref ============
    badgesContainerRef,
    // ============ Dynamic Lazy Ref for Selector Positioning ============
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
  };
};
