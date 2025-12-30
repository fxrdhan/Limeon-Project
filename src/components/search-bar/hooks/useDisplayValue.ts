/**
 * Display Value Hook
 *
 * Extracted from useSearchInput.ts to compute display value for the search input.
 * Handles complex logic for what to show in the input field based on search state.
 */

import { useMemo } from 'react';
import type { EnhancedSearchState } from '../types';
import { getOperatorSearchTerm } from '../utils/searchUtils';

// ============================================================================
// Types
// ============================================================================

export interface UseDisplayValueProps {
  value: string;
  searchMode: EnhancedSearchState;
}

export interface UseDisplayValueReturn {
  displayValue: string;
  showTargetedIndicator: boolean;
  operatorSearchTerm: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDisplayValue({
  value,
  searchMode,
}: UseDisplayValueProps): UseDisplayValueReturn {
  const operatorSearchTerm = useMemo(
    () => getOperatorSearchTerm(value),
    [value]
  );

  const showTargetedIndicator = useMemo(
    () =>
      (searchMode.isFilterMode && !!searchMode.filterSearch) ||
      (searchMode.showOperatorSelector &&
        (!!searchMode.selectedColumn || !!searchMode.filterSearch)) ||
      (searchMode.showJoinOperatorSelector && !!searchMode.filterSearch) ||
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
    if (searchMode.showColumnSelector) {
      return '';
    }
    if (searchMode.showOperatorSelector) {
      return '';
    }
    if (searchMode.showJoinOperatorSelector) {
      return '';
    }

    // PRIORITY 0.5: Building condition N (index >= 2) value
    const isBuildingConditionNValue =
      searchMode.activeConditionIndex !== undefined &&
      searchMode.activeConditionIndex >= 2 &&
      !searchMode.showColumnSelector &&
      !searchMode.showOperatorSelector &&
      !searchMode.showJoinOperatorSelector;

    if (isBuildingConditionNValue) {
      const activeIdx = searchMode.activeConditionIndex!;
      const nthCondition = searchMode.partialConditions?.[activeIdx];

      // Between operator waiting for valueTo
      if (
        nthCondition?.operator === 'inRange' &&
        nthCondition?.waitingForValueTo
      ) {
        return '';
      }

      // Between operator typing valueTo
      if (nthCondition?.valueTo && nthCondition?.operator === 'inRange') {
        return nthCondition.valueTo;
      }

      if (nthCondition?.value !== undefined) {
        return nthCondition.value;
      }
      return '';
    }

    // PRIORITY 1: Multi-condition verbose mode
    if (
      searchMode.filterSearch?.isMultiCondition &&
      searchMode.filterSearch?.conditions &&
      searchMode.filterSearch.conditions.length > 1 &&
      searchMode.isFilterMode
    ) {
      return '';
    }

    // PRIORITY 2: Confirmed single-condition
    if (
      searchMode.isFilterMode &&
      searchMode.filterSearch?.isConfirmed &&
      !searchMode.filterSearch?.isMultiCondition
    ) {
      return '';
    }

    // PRIORITY 3: Incomplete multi-condition (building condition N >= 1)
    if (
      !searchMode.isFilterMode &&
      searchMode.partialJoin &&
      searchMode.filterSearch &&
      searchMode.selectedColumn
    ) {
      const activeIdx = searchMode.activeConditionIndex ?? 1;
      const activeCondition = searchMode.partialConditions?.[activeIdx];

      // Between operator waiting for valueTo
      if (activeCondition?.waitingForValueTo && activeCondition?.value) {
        return '';
      }

      // Between operator with valueTo being typed
      if (activeCondition?.valueTo) {
        return activeCondition.valueTo;
      }

      // Operator selected, ready for value input
      if (activeCondition?.value !== undefined) {
        return activeCondition.value;
      }
      return '';
    }

    // PRIORITY 4: Single-condition filter mode
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      // Between operator waiting for second value
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.waitingForValueTo
      ) {
        return '';
      }
      // Between operator typing valueTo
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.valueTo &&
        !searchMode.filterSearch.isConfirmed
      ) {
        return searchMode.filterSearch.valueTo;
      }
      // Confirmed inRange
      if (
        searchMode.filterSearch.operator === 'inRange' &&
        searchMode.filterSearch.valueTo &&
        searchMode.filterSearch.isConfirmed
      ) {
        return '';
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

  return {
    displayValue,
    showTargetedIndicator,
    operatorSearchTerm,
  };
}
