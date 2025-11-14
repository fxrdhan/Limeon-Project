import React from 'react';
import { LuX } from 'react-icons/lu';
import { EnhancedSearchState } from '../types';
import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
} from '../operators';

interface SearchBadgeProps {
  searchMode: EnhancedSearchState;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;
  onClearTargeted: () => void;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  onClearTargeted,
}) => {
  if (
    !searchMode.isFilterMode &&
    !searchMode.showOperatorSelector &&
    !searchMode.selectedColumn
  ) {
    return null;
  }

  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5"
    >
      {searchMode.isFilterMode && searchMode.filterSearch ? (
        searchMode.filterSearch.operator === 'contains' &&
        !searchMode.filterSearch.isExplicitOperator ? (
          <div
            ref={badgeRef}
            className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700 transition-all"
          >
            <span>{searchMode.filterSearch.column.headerName}</span>
            <button
              onClick={onClearTargeted}
              className="w-0 opacity-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 group-hover:ml-1.5 rounded-sm p-0.5 transition-all hover:bg-purple-200"
              type="button"
            >
              <LuX className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700">
              <span>{searchMode.filterSearch.column.headerName}</span>
            </div>

            <div
              ref={badgeRef}
              className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 transition-all"
            >
              <span>
                {(() => {
                  // Search in appropriate operators based on column type
                  const availableOperators =
                    searchMode.filterSearch!.column.type === 'number'
                      ? NUMBER_FILTER_OPERATORS
                      : DEFAULT_FILTER_OPERATORS;

                  return availableOperators.find(
                    op => op.value === searchMode.filterSearch!.operator
                  )?.label;
                })()}
              </span>
              <button
                onClick={onClearTargeted}
                className="w-0 opacity-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 group-hover:ml-1.5 rounded-sm p-0.5 transition-all hover:bg-blue-200"
                type="button"
              >
                <LuX className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )
      ) : searchMode.showOperatorSelector && searchMode.selectedColumn ? (
        <div
          key="operator-selector-badge"
          ref={badgeRef}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700"
        >
          <span>{searchMode.selectedColumn.headerName}</span>
        </div>
      ) : searchMode.selectedColumn && !searchMode.showColumnSelector ? (
        <div
          key="selected-column-badge"
          ref={badgeRef}
          className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700 transition-all"
        >
          <span>{searchMode.selectedColumn.headerName}</span>
          <button
            onClick={onClearTargeted}
            className="w-0 opacity-0 overflow-hidden group-hover:w-auto group-hover:opacity-100 group-hover:ml-1.5 rounded-sm p-0.5 transition-all hover:bg-purple-200"
            type="button"
          >
            <LuX className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SearchBadge;
