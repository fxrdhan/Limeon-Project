import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Check if multi-condition verbose display
  const isMultiConditionVerbose =
    searchMode.filterSearch?.isMultiCondition &&
    searchMode.filterSearch?.conditions &&
    searchMode.filterSearch.conditions.length > 1;

  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5 max-w-[70%] overflow-x-auto scrollbar-hide"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Purple badge - Column name (always shown when in filter/operator mode) */}
      <AnimatePresence>
        {(searchMode.isFilterMode ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector ||
          searchMode.selectedColumn) && (
          <motion.div
            key="purple-badge"
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: 0.2,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700 flex-shrink-0"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verbose Multi-Condition Badges */}
      {isMultiConditionVerbose &&
        searchMode.filterSearch!.conditions!.map((condition, index) => {
          const filter = searchMode.filterSearch!;
          const availableOperators =
            filter.column.type === 'number'
              ? NUMBER_FILTER_OPERATORS
              : DEFAULT_FILTER_OPERATORS;

          const operatorLabel =
            availableOperators.find(op => op.value === condition.operator)
              ?.label || condition.operator;

          return (
            <React.Fragment key={`condition-${index}`}>
              {/* Operator Badge (Blue) */}
              <motion.div
                key={`operator-${index}`}
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 flex-shrink-0"
              >
                <span>{operatorLabel}</span>
              </motion.div>

              {/* Value Badge (Gray) */}
              <motion.div
                key={`value-${index}`}
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 flex-shrink-0"
              >
                <span>{condition.value}</span>
              </motion.div>

              {/* JOIN Badge (Orange) - only show between conditions */}
              {index < filter.conditions!.length - 1 && (
                <motion.div
                  key={`join-${index}`}
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 flex-shrink-0"
                >
                  <span>{filter.joinOperator || 'AND'}</span>
                </motion.div>
              )}
            </React.Fragment>
          );
        })}

      {/* Single-Condition Badges (existing logic) */}
      {!isMultiConditionVerbose && (
        <>
          <AnimatePresence>
            {(searchMode.isFilterMode ||
              searchMode.showJoinOperatorSelector ||
              (searchMode.showOperatorSelector &&
                searchMode.isSecondOperator) ||
              // NEW: Show operator badge for incomplete multi-condition (waiting for second value)
              (!searchMode.isFilterMode &&
                searchMode.partialJoin &&
                searchMode.filterSearch)) &&
              searchMode.filterSearch &&
              (searchMode.filterSearch.operator !== 'contains' ||
                searchMode.filterSearch.isExplicitOperator) && (
                <motion.div
                  key="blue-badge"
                  ref={badgeRef}
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
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
                  {/* Show X button only if NOT confirmed (when confirmed, X is on value badge) */}
                  {!searchMode.filterSearch?.isConfirmed && (
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
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* Gray Value Badge - for confirmed single-condition OR building second condition */}
          <AnimatePresence>
            {(((searchMode.isFilterMode ||
              searchMode.showJoinOperatorSelector) &&
              searchMode.filterSearch?.isConfirmed) ||
              // Show value badge when building second condition (after AND/OR selection)
              (searchMode.showOperatorSelector &&
                searchMode.isSecondOperator &&
                searchMode.filterSearch) ||
              (!searchMode.isFilterMode &&
                !searchMode.showOperatorSelector &&
                searchMode.partialJoin &&
                searchMode.filterSearch)) &&
              !isMultiConditionVerbose && (
                <motion.div
                  key="value-badge"
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 flex-shrink-0"
                >
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
                </motion.div>
              )}
          </AnimatePresence>

          {/* JOIN Badge (Orange) - shown when building second condition */}
          <AnimatePresence>
            {searchMode.partialJoin && !isMultiConditionVerbose && (
              <motion.div
                key="join-badge"
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 flex-shrink-0"
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Second Operator Badge (Blue) - shown when user selected second operator */}
          <AnimatePresence>
            {searchMode.secondOperator && !isMultiConditionVerbose && (
              <motion.div
                key="second-operator-badge"
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 flex-shrink-0"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Clear button for multi-condition (at the end) */}
      {isMultiConditionVerbose && (
        <motion.div
          key="multi-clear-badge"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="group flex items-center px-2 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 flex-shrink-0"
        >
          <button
            onClick={onClearTargeted}
            className="flex items-center justify-center hover:bg-red-200 rounded-sm p-0.5"
            type="button"
          >
            <LuX className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default SearchBadge;
