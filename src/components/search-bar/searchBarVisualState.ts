import type { SearchState } from './constants';
import type { EnhancedSearchState } from './types';

export const getSearchPlaceholder = (
  showTargetedIndicator: boolean,
  placeholder: string
): string => {
  return showTargetedIndicator ? 'Cari...' : placeholder;
};

export const shouldShowSearchLeftIcon = (
  displayValue: string,
  searchMode: EnhancedSearchState
): boolean => {
  const hasExplicitOperator =
    searchMode.isFilterMode ||
    searchMode.filterSearch?.isExplicitOperator ||
    searchMode.filterSearch?.isMultiCondition ||
    searchMode.showOperatorSelector ||
    searchMode.showJoinOperatorSelector ||
    searchMode.partialJoin ||
    searchMode.partialConditions?.[1]?.operator ||
    (!!searchMode.selectedColumn && !searchMode.showColumnSelector);

  return (
    (((displayValue && !displayValue.startsWith('#')) || hasExplicitOperator) &&
      !searchMode.showColumnSelector) ||
    searchMode.showColumnSelector
  );
};

export const getSearchInputFrameClassName = ({
  shouldShowLeftIcon,
  showInputError,
  searchState,
  searchMode,
}: {
  shouldShowLeftIcon: boolean;
  showInputError: boolean;
  searchState: SearchState;
  searchMode: EnhancedSearchState;
}): string => {
  const baseClassName =
    'relative flex-1 min-w-0 flex flex-wrap items-center content-center gap-1 px-1 py-1 min-h-[42px] border transition-[border-color,box-shadow,padding] duration-200 ease-in-out rounded-xl overflow-visible';
  const paddingClassName = shouldShowLeftIcon ? 'pl-1' : 'pl-9';

  if (showInputError || searchState === 'not-found') {
    return `${baseClassName} ${paddingClassName} border-danger focus-within:border-danger focus-within:ring-3 focus-within:ring-red-100`;
  }

  if (searchMode.showColumnSelector) {
    return `${baseClassName} ${paddingClassName} border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100`;
  }

  if (searchMode.showJoinOperatorSelector) {
    return `${baseClassName} ${paddingClassName} border-orange-300 ring-3 ring-orange-100 focus-within:border-orange-500 focus-within:ring-3 focus-within:ring-orange-100`;
  }

  if (
    searchMode.isFilterMode &&
    searchMode.filterSearch &&
    searchMode.filterSearch.operator === 'contains' &&
    !searchMode.filterSearch.isExplicitOperator
  ) {
    return `${baseClassName} ${paddingClassName} border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100`;
  }

  if (searchMode.isFilterMode && searchMode.filterSearch) {
    return `${baseClassName} ${paddingClassName} border-blue-300 ring-3 ring-blue-100 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100`;
  }

  if (
    searchMode.showOperatorSelector ||
    !!searchMode.partialJoin ||
    (!!searchMode.selectedColumn && !searchMode.showColumnSelector)
  ) {
    return `${baseClassName} ${paddingClassName} border-blue-300 ring-3 ring-blue-100 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100`;
  }

  return `${baseClassName} ${paddingClassName} border-slate-300 focus-within:border-primary focus-within:ring-3 focus-within:ring-emerald-200`;
};
