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
  onHoverChange?: (isHovered: boolean) => void;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  onClearTargeted,
  onHoverChange,
}) => {
  const handleMouseEnter = () => {
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    onHoverChange?.(false);
  };

  if (
    !searchMode.isFilterMode &&
    !searchMode.showOperatorSelector &&
    !searchMode.showJoinOperatorSelector &&
    !searchMode.selectedColumn
  ) {
    return null;
  }

  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5 max-w-[70%] overflow-x-auto scrollbar-hide"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Purple badge - Column name (always shown when in filter/operator mode) */}
      {(searchMode.isFilterMode ||
        searchMode.showOperatorSelector ||
        searchMode.showJoinOperatorSelector ||
        searchMode.selectedColumn) && (
        <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700 flex-shrink-0">
          <span>
            {searchMode.filterSearch?.column.headerName ||
              searchMode.selectedColumn?.headerName}
          </span>
          {/* Show X button only if no explicit operator */}
          {!(
            (searchMode.isFilterMode ||
              searchMode.showJoinOperatorSelector ||
              (searchMode.showOperatorSelector &&
                searchMode.isSecondOperator)) &&
            searchMode.filterSearch &&
            (searchMode.filterSearch.operator !== 'contains' ||
              searchMode.filterSearch.isExplicitOperator)
          ) && (
            <button
              onClick={onClearTargeted}
              className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-purple-200 flex-shrink-0"
              type="button"
              style={{
                transition:
                  'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
              }}
            >
              <LuX className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Blue Badge - Operator */}
      {(searchMode.isFilterMode ||
        searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && searchMode.isSecondOperator) ||
        // Show operator badge for incomplete multi-condition (waiting for second value)
        (!searchMode.isFilterMode &&
          searchMode.partialJoin &&
          searchMode.filterSearch)) &&
        searchMode.filterSearch &&
        (searchMode.filterSearch.operator !== 'contains' ||
          searchMode.filterSearch.isExplicitOperator) &&
        // Don't show single-condition badge if multi-condition is active
        !searchMode.filterSearch.isMultiCondition && (
          <div
            ref={badgeRef}
            className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 flex-shrink-0"
          >
            <span>
              {(() => {
                const filter = searchMode.filterSearch!;

                // Single-condition badge
                const availableOperators =
                  filter.column.type === 'number'
                    ? NUMBER_FILTER_OPERATORS
                    : DEFAULT_FILTER_OPERATORS;

                return availableOperators.find(
                  op => op.value === filter.operator
                )?.label;
              })()}
            </span>
            <button
              onClick={onClearTargeted}
              className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-blue-200 flex-shrink-0"
              type="button"
              style={{
                transition:
                  'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
              }}
            >
              <LuX className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>
        )}

      {/* Gray Value Badge - only shown when value is finalized (not while typing first value) */}
      {(searchMode.showJoinOperatorSelector ||
        // Show value badge when building second condition (after AND/OR selection)
        (searchMode.showOperatorSelector &&
          searchMode.isSecondOperator &&
          searchMode.filterSearch) ||
        // Show value badge when in partial join state (multi-condition)
        (!searchMode.isFilterMode &&
          !searchMode.showOperatorSelector &&
          searchMode.partialJoin &&
          searchMode.filterSearch) ||
        // Show value badge for confirmed single-condition filter
        (searchMode.isFilterMode &&
          searchMode.filterSearch?.isConfirmed &&
          !searchMode.filterSearch?.isMultiCondition)) &&
        searchMode.filterSearch?.value &&
        // Don't show single-condition value badge if multi-condition is active
        !searchMode.filterSearch?.isMultiCondition && (
          <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 flex-shrink-0">
            <span>{searchMode.filterSearch.value}</span>
            <button
              onClick={onClearTargeted}
              className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-gray-200 flex-shrink-0"
              type="button"
              style={{
                transition:
                  'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
              }}
            >
              <LuX className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>
        )}

      {/* JOIN Badge (Orange) - shown when building second condition */}
      {searchMode.partialJoin && (
        <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 flex-shrink-0">
          <span>{searchMode.partialJoin}</span>
          <button
            onClick={onClearTargeted}
            className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-orange-200 flex-shrink-0"
            type="button"
            style={{
              transition:
                'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
            }}
          >
            <LuX className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Second Operator Badge (Blue) - shown when user selected second operator */}
      {searchMode.secondOperator && (
        <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 flex-shrink-0">
          <span>
            {(() => {
              const filter = searchMode.filterSearch!;
              const availableOperators =
                filter.column.type === 'number'
                  ? NUMBER_FILTER_OPERATORS
                  : DEFAULT_FILTER_OPERATORS;

              return (
                availableOperators.find(
                  op => op.value === searchMode.secondOperator
                )?.label || searchMode.secondOperator
              );
            })()}
          </span>
          <button
            onClick={onClearTargeted}
            className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-blue-200 flex-shrink-0"
            type="button"
            style={{
              transition:
                'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
            }}
          >
            <LuX className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Multi-Condition Badges - shown when filter is confirmed with multiple conditions */}
      {searchMode.isFilterMode &&
        searchMode.filterSearch?.isMultiCondition &&
        searchMode.filterSearch?.conditions &&
        searchMode.filterSearch.conditions.length > 1 && (
          <>
            {searchMode.filterSearch.conditions.map((condition, index) => {
              const availableOperators =
                searchMode.filterSearch!.column.type === 'number'
                  ? NUMBER_FILTER_OPERATORS
                  : DEFAULT_FILTER_OPERATORS;

              const operatorLabel = availableOperators.find(
                op => op.value === condition.operator
              )?.label;

              return (
                <React.Fragment key={`condition-${index}`}>
                  {/* Show operator badge for each condition */}
                  <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 flex-shrink-0">
                    <span>{operatorLabel}</span>
                    <button
                      onClick={onClearTargeted}
                      className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-blue-200 flex-shrink-0"
                      type="button"
                      style={{
                        transition:
                          'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
                      }}
                    >
                      <LuX className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  </div>

                  {/* Show value badge for each condition */}
                  <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                    <span>{condition.value}</span>
                    <button
                      onClick={onClearTargeted}
                      className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-gray-200 flex-shrink-0"
                      type="button"
                      style={{
                        transition:
                          'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
                      }}
                    >
                      <LuX className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  </div>

                  {/* Show JOIN operator badge between conditions (not after last one) */}
                  {index < searchMode.filterSearch!.conditions!.length - 1 && (
                    <div className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 flex-shrink-0">
                      <span>{searchMode.filterSearch!.joinOperator}</span>
                      <button
                        onClick={onClearTargeted}
                        className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 hover:bg-orange-200 flex-shrink-0"
                        type="button"
                        style={{
                          transition:
                            'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
                        }}
                      >
                        <LuX className="w-3.5 h-3.5 flex-shrink-0" />
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
    </div>
  );
};

export default SearchBadge;
