import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { CgFilters } from 'react-icons/cg';
import { LuFilter, LuFilterX, LuHash, LuSearch } from 'react-icons/lu';
import { SearchState } from '../constants';
import { EnhancedSearchState } from '../types';

interface SearchIconProps {
  searchMode: EnhancedSearchState;
  searchState: SearchState;
  displayValue: string;
  showError?: boolean;
}

const SearchIcon: React.FC<SearchIconProps> = ({
  searchMode,
  searchState,
  displayValue,
  showError = false,
}) => {
  // Consolidated active state determination
  // If it should show ANY icon other than the default Search icon, it is "Active"
  const currentIcon = (() => {
    if (showError) return 'error';
    if (searchMode.showColumnSelector) return 'hash-purple';
    if (searchMode.showJoinOperatorSelector) return 'filters-join';
    if (
      searchMode.isFilterMode &&
      searchMode.filterSearch?.operator === 'contains' &&
      !searchMode.filterSearch?.isExplicitOperator
    )
      return 'hash-dynamic';
    if (
      searchMode.isFilterMode ||
      searchMode.filterSearch?.isExplicitOperator ||
      searchMode.filterSearch?.isMultiCondition ||
      (searchMode.showOperatorSelector && searchMode.selectedColumn) ||
      searchMode.partialJoin ||
      searchMode.partialConditions?.[1]?.operator
    )
      return 'filter';
    return 'search';
  })();

  // If we are NOT showing the default search icon, we are in Active Mode.
  // This guarantees that Funnel (Filter) and Hash icons always get the "Active" styling.
  // We also consider non-empty input (not starting with #) as active typing mode.
  const isDefaultIcon = currentIcon === 'search';
  const isActiveMode =
    !isDefaultIcon || (!!displayValue && !displayValue.startsWith('#'));

  const getSearchIconColor = () => {
    if (currentIcon === 'error') return '#EF4444';
    if (currentIcon === 'hash-purple') return '#A855F7'; // text-purple-500
    if (currentIcon === 'hash-dynamic') return '#A855F7'; // text-purple-500
    if (currentIcon === 'filters-join') return '#F97316'; // text-orange-500
    if (currentIcon === 'filter' || searchMode.isFilterMode) return '#3B82F6'; // text-blue-500

    switch (searchState) {
      case 'idle':
        return '#9CA3AF'; // text-gray-400
      case 'typing':
        return '#1F2937'; // text-gray-800
      case 'found':
        return '#10B981'; // text-primary
      case 'not-found':
        return '#EF4444'; // text-red-500
      default:
        return '#9CA3AF';
    }
  };

  const renderIcon = () => {
    switch (currentIcon) {
      case 'hash-purple':
      case 'hash-dynamic':
        return <LuHash className="transition-colors duration-300" />;
      case 'filters-join':
        return <CgFilters className="transition-colors duration-300" />;
      case 'filter':
        return <LuFilter className="transition-colors duration-300" />;
      case 'error':
        return <LuFilterX className="transition-colors duration-300" />;
      default:
        return <LuSearch className="transition-colors duration-300" />;
    }
  };

  return (
    <motion.div
      layout
      className={`flex items-center justify-center flex-shrink-0 ${
        isActiveMode
          ? 'relative'
          : 'absolute left-3 top-1/2 -translate-y-1/2 z-10'
      }`}
      initial={false}
      animate={{
        scale: isActiveMode ? 1.6 : 1,
        width: isActiveMode ? '36px' : '24px',
        color: getSearchIconColor(),
        x: isActiveMode ? 2 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      style={{
        height: '24px',
        marginLeft: isActiveMode ? '4px' : '0',
        marginRight: isActiveMode ? '12px' : '4px',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIcon}
          initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center w-full h-full"
        >
          {renderIcon()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchIcon;
