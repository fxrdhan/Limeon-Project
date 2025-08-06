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
        className={`transition-all duration-300 ease-in-out ${
          displayValue
            ? 'opacity-100 transform translate-x-0 scale-150 pl-2'
            : 'opacity-0 transform -translate-x-2 scale-100'
        }`}
        style={{
          visibility: displayValue ? 'visible' : 'hidden',
          width: displayValue ? 'auto' : '0',
          minWidth: displayValue ? '40px' : '0',
        }}
      >
        {getSearchIcon()}
      </div>

      {!showTargetedIndicator && (
        <div
          className={`absolute top-3.5 transition-all duration-300 ease-in-out ${
            displayValue
              ? 'opacity-0 transform translate-x-2 left-3'
              : 'opacity-100 transform translate-x-0 left-3'
          }`}
          style={{
            visibility: displayValue ? 'hidden' : 'visible',
          }}
        >
          {getSearchIcon()}
        </div>
      )}
    </>
  );
};

export default SearchIcon;