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
    !searchMode.selectedColumn
  ) {
    return null;
  }

  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Purple badge - Column name (always shown when in filter/operator mode) */}
      <AnimatePresence>
        {(searchMode.isFilterMode ||
          searchMode.showOperatorSelector ||
          searchMode.selectedColumn) && (
          <motion.div
            key="purple-badge"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: 0.2,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-100 text-purple-700"
          >
            <span>
              {searchMode.filterSearch?.column.headerName ||
                searchMode.selectedColumn?.headerName}
            </span>
            {/* Show X button only if no blue badge (i.e., no explicit operator) */}
            {!(
              searchMode.isFilterMode &&
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

      {/* Blue badge - Operator (only shown when explicit operator is selected) */}
      <AnimatePresence>
        {searchMode.isFilterMode &&
          searchMode.filterSearch &&
          (searchMode.filterSearch.operator !== 'contains' ||
            searchMode.filterSearch.isExplicitOperator) && (
            <motion.div
              key="blue-badge"
              ref={badgeRef}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                duration: 0.2,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="group flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700"
            >
              <span>
                {(() => {
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
    </div>
  );
};

export default SearchBadge;
