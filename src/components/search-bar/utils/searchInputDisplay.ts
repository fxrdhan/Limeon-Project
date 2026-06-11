import type { EnhancedSearchState } from '../types';

export const getSearchInputDisplayValue = (
  value: string,
  searchMode: EnhancedSearchState
): string => {
  if (searchMode.showColumnSelector) {
    return '';
  }
  if (searchMode.showOperatorSelector) {
    return '';
  }
  if (searchMode.showJoinOperatorSelector) {
    return '';
  }

  const isBuildingConditionNValue =
    searchMode.activeConditionIndex !== undefined &&
    searchMode.activeConditionIndex >= 2 &&
    !searchMode.showColumnSelector &&
    !searchMode.showOperatorSelector &&
    !searchMode.showJoinOperatorSelector;

  if (isBuildingConditionNValue) {
    const activeIdx = searchMode.activeConditionIndex!;
    const nthCondition = searchMode.partialConditions?.[activeIdx];

    if (
      nthCondition?.operator === 'inRange' &&
      nthCondition?.waitingForValueTo
    ) {
      return '';
    }

    if (nthCondition?.valueTo && nthCondition?.operator === 'inRange') {
      return nthCondition.valueTo;
    }

    if (nthCondition?.value !== undefined) {
      return nthCondition.value;
    }

    return '';
  }

  if (searchMode.filterSearch?.filterGroup && searchMode.isFilterMode) {
    return '';
  }

  if (
    searchMode.filterSearch?.isMultiCondition &&
    searchMode.filterSearch?.conditions &&
    searchMode.filterSearch.conditions.length > 1 &&
    searchMode.isFilterMode
  ) {
    return '';
  }

  if (
    searchMode.isFilterMode &&
    searchMode.filterSearch?.isConfirmed &&
    !searchMode.filterSearch?.isMultiCondition
  ) {
    return '';
  }

  if (
    !searchMode.isFilterMode &&
    searchMode.partialJoin &&
    searchMode.filterSearch &&
    searchMode.selectedColumn
  ) {
    const activeIdx = searchMode.activeConditionIndex ?? 1;
    const activeCondition = searchMode.partialConditions?.[activeIdx];

    if (activeCondition?.waitingForValueTo && activeCondition?.value) {
      return '';
    }

    if (activeCondition?.valueTo) {
      return activeCondition.valueTo;
    }

    if (activeCondition?.value !== undefined) {
      return activeCondition.value;
    }

    return '';
  }

  if (searchMode.isFilterMode && searchMode.filterSearch) {
    if (
      searchMode.filterSearch.operator === 'inRange' &&
      searchMode.filterSearch.waitingForValueTo
    ) {
      return '';
    }

    if (
      searchMode.filterSearch.operator === 'inRange' &&
      searchMode.filterSearch.valueTo &&
      !searchMode.filterSearch.isConfirmed
    ) {
      return searchMode.filterSearch.valueTo;
    }

    if (
      searchMode.filterSearch.operator === 'inRange' &&
      searchMode.filterSearch.valueTo &&
      searchMode.filterSearch.isConfirmed
    ) {
      return '';
    }

    return searchMode.filterSearch.value;
  }

  if (searchMode.selectedColumn && !searchMode.showColumnSelector) {
    return '';
  }

  return value;
};
