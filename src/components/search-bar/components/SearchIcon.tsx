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
  // Don't move icon when:
  // 1. Column selector is active
  // 2. Value starts with '#' (hashtag mode - prevents flash during state update)
  const shouldShowLeftIcon =
    displayValue &&
    !displayValue.startsWith('#') &&
    !searchMode.showColumnSelector;

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
    if (searchMode.isFilterMode) {
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
