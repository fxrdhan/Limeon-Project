import { useCallback, useMemo } from 'react';
import { EnhancedSearchState } from '../types';
import {
  buildColumnValue,
  buildFilterValue,
  getOperatorSearchTerm,
} from '../utils/searchUtils';
import { getSearchInputDisplayValue } from '../utils/searchInputDisplay';
import { useSearchBadgeRefs } from './useSearchBadgeRefs';
import { useSearchBadgeWidthSync } from './useSearchBadgeWidthSync';

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
  const {
    getBadgeRef,
    setBadgeRef,
    getColumnRef,
    getOperatorRef,
    getJoinRef,
    badgesContainerRef,
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
    getLazyBadgeRef,
  } = useSearchBadgeRefs();

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

  const displayValue = useMemo(
    () => getSearchInputDisplayValue(value, searchMode),
    [searchMode, value]
  );

  useSearchBadgeWidthSync({
    showTargetedIndicator,
    searchMode,
    inputRef,
    badgesContainerRef,
    hasSecondConditionOperator,
    getColumnRef,
  });

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
            /^(.*#(?![()])[^\s#]+\s+#(?![()])[^\s#]+)\s*.*$/
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
        const normalizedCurrentValue = currentValue
          .replace(/#\(|#\)/g, ' ')
          .replace(/\s+/g, ' ');

        // MULTI-COLUMN: Check for pattern #col1 #op1 val1 #join #col2 #op2
        const multiColMatch = normalizedCurrentValue.match(
          /#(and|or)\s+#([^\s#]+)\s+#([^\s]+)/i
        );

        // SAME-COLUMN: Check for pattern #col1 #op1 val1 #join #op2 [value]
        // NOTE: Removed $ anchor to also match when user is typing value (e.g., "#and #contains m")
        const sameColMatch = normalizedCurrentValue.match(
          /#(and|or)\s+#([^\s]+)/i
        );

        // Extract groups based on match type
        // multiColMatch: [full, join, col2, op2]
        // sameColMatch: [full, join, op2]
        const isMultiColumn =
          searchMode.partialConditions?.[1]?.column && multiColMatch;

        let op2: string | undefined;

        if (isMultiColumn && multiColMatch) {
          [, , , op2] = multiColMatch;
        } else if (sameColMatch) {
          [, , op2] = sameColMatch;
        } else {
          // No match, use original onChange
          onChange(e);
          return;
        }

        const activeIdx = searchMode.activeConditionIndex ?? 1;
        const activeCondN = searchMode.partialConditions?.[activeIdx];
        const operatorName = op2 || activeCondN?.operator;
        if (!operatorName) {
          onChange(e);
          return;
        }

        const getBasePatternFromToken = (token: string): string | null => {
          const lowerValue = currentValue.toLowerCase();
          const lowerToken = token.toLowerCase();
          const tokenIndex = lowerValue.lastIndexOf(lowerToken);
          if (tokenIndex === -1) {
            return null;
          }
          return currentValue.slice(0, tokenIndex + token.length).trimEnd();
        };

        // SPECIAL CASE: If input becomes empty, preserve second operator in partial multi-condition state
        // This handles when user deletes the second value completely
        // Step 5 of E9: Preserve 5 badges, then Step 6 backspace will trigger operator selector
        if (inputValue === '') {
          const basePattern = getBasePatternFromToken(`#${operatorName}`);
          if (!basePattern) {
            onChange(e);
            return;
          }

          // Keep preserved state to maintain second operator badge for Step 6
          // DO NOT call onClearPreservedState?.() - needed for useSearchKeyboard.ts handler

          onChange({
            target: { value: basePattern },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }

        // SPECIAL CASE: Between operator - preserve first value and #to marker
        // When waitingForValueTo is true, append typed value after #to
        // N-CONDITION: Use activeConditionIndex for scalability
        if (
          activeCondN?.waitingForValueTo &&
          activeCondN?.value &&
          activeCondN?.operator === 'inRange'
        ) {
          const basePattern = getBasePatternFromToken('#to');
          if (basePattern) {
            const newValue = inputValue
              ? `${basePattern} ${inputValue}`
              : basePattern;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          const operatorBase = getBasePatternFromToken(`#${operatorName}`);
          if (operatorBase) {
            const newValue = `${operatorBase} ${activeCondN.value} #to ${inputValue}`;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }
        }

        // SPECIAL CASE: Between operator typing valueTo - preserve first value and #to marker
        if (activeCondN?.valueTo && activeCondN?.operator === 'inRange') {
          const basePattern = getBasePatternFromToken('#to');
          if (basePattern) {
            const newValue = inputValue
              ? `${basePattern} ${inputValue}`
              : basePattern;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          const operatorBase = getBasePatternFromToken(`#${operatorName}`);
          if (operatorBase && activeCondN.value) {
            const newValue = `${operatorBase} ${activeCondN.value} #to ${inputValue}`;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }
        }

        const basePattern = getBasePatternFromToken(`#${operatorName}`);
        if (!basePattern) {
          onChange(e);
          return;
        }

        // inputValue now contains the full accumulated second value thanks to displayValue fix
        const newValue = inputValue
          ? `${basePattern} ${inputValue}`
          : basePattern;

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
    getLazyBadgeRef,
  };
};
