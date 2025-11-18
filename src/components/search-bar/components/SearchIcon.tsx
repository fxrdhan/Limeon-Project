import React from 'react';
import { LuSearch, LuHash, LuFilter } from 'react-icons/lu';
import { EnhancedSearchState } from '../types';
import { SearchState } from '../constants';

interface SearchIconProps {
  searchMode: EnhancedSearchState;
  searchState: SearchState;
  displayValue: string;
  showTargetedIndicator: boolean;
}

const SearchIcon: React.FC<SearchIconProps> = ({
  searchMode,
  searchState,
  displayValue,
  showTargetedIndicator,
}) => {
  // Show icon on the left when:
  // 1. There's a display value that doesn't start with '#' (normal typing)
  // 2. OR when there are blue badges (explicit operators) present
  const hasExplicitOperator =
    searchMode.filterSearch?.isExplicitOperator ||
    searchMode.filterSearch?.isMultiCondition ||
    searchMode.showOperatorSelector ||
    searchMode.showJoinOperatorSelector ||
    searchMode.partialJoin ||
    searchMode.secondOperator;

  const shouldShowLeftIcon =
    (((displayValue && !displayValue.startsWith('#')) || hasExplicitOperator) &&
      !searchMode.showColumnSelector) ||
    // Show purple hash icon when column selector is open
    searchMode.showColumnSelector;

  const getSearchIconColor = () => {
    if (
      searchMode.isFilterMode &&
      searchMode.filterSearch?.operator === 'contains' &&
      !searchMode.filterSearch?.isExplicitOperator
    )
      return 'text-purple-500';
    if (searchMode.isFilterMode) return 'text-blue-500';

    switch (searchState) {
      case 'idle':
        return 'text-gray-400';
      case 'typing':
        return 'text-gray-800';
      case 'found':
        return 'text-primary';
      case 'not-found':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getSearchIcon = () => {
    // Show Hash icon when column selector is open (user typed #)
    if (searchMode.showColumnSelector) {
      return <LuHash className="text-purple-500 transition-all duration-300" />;
    }

    // Show Hash icon for implicit contains operator (colon pattern)
    if (
      searchMode.isFilterMode &&
      searchMode.filterSearch?.operator === 'contains' &&
      !searchMode.filterSearch?.isExplicitOperator
    ) {
      return (
        <LuHash
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }

    // Show Filter icon for any explicit operator usage (blue badges present)
    // This includes:
    // - Filter mode with explicit operator
    // - Multi-condition filters
    // - Operator selector open
    // - Join operator selector open
    // - Building second condition (partialJoin state)
    // - Second operator selected
    if (
      searchMode.isFilterMode ||
      searchMode.filterSearch?.isExplicitOperator ||
      searchMode.filterSearch?.isMultiCondition ||
      (searchMode.showOperatorSelector && searchMode.selectedColumn) ||
      searchMode.showJoinOperatorSelector ||
      searchMode.partialJoin ||
      searchMode.secondOperator
    ) {
      return (
        <LuFilter
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }

    return (
      <LuSearch
        className={`${getSearchIconColor()} transition-all duration-300`}
      />
    );
  };

  return (
    <>
      <div
        className={`transition-all ease-out ${
          shouldShowLeftIcon
            ? 'opacity-100 transform translate-x-0 scale-150 pl-2'
            : 'opacity-0 transform -translate-x-2 scale-100'
        }`}
        style={{
          visibility: shouldShowLeftIcon ? 'visible' : 'hidden',
          width: shouldShowLeftIcon ? 'auto' : '0',
          minWidth: shouldShowLeftIcon ? '40px' : '0',
          transitionDuration: shouldShowLeftIcon ? '150ms' : '200ms',
        }}
      >
        {getSearchIcon()}
      </div>

      {!showTargetedIndicator && (
        <div
          className={`absolute top-3.5 transition-all ease-out ${
            shouldShowLeftIcon
              ? 'opacity-0 transform translate-x-2 left-3'
              : 'opacity-100 transform translate-x-0 left-3'
          }`}
          style={{
            visibility: shouldShowLeftIcon ? 'hidden' : 'visible',
            transitionDuration: shouldShowLeftIcon ? '200ms' : '150ms',
          }}
        >
          {getSearchIcon()}
        </div>
      )}
    </>
  );
};

export default SearchIcon;
