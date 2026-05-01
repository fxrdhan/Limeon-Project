import { forwardRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbSearch } from 'react-icons/tb';
import SearchInput from './search/SearchInput';
import SearchIcon from './search/SearchIcon';
import AddNewButton from './search/AddNewButton';
import { SEARCH_STATES } from '../constants';
import { getSearchIconColor } from '../utils/comboboxUtils';
import { useComboboxContext } from '../hooks/useComboboxContext';
import type { SearchBarProps } from '../types';

const addNewIconVariants = {
  enter: {
    opacity: 0,
    x: -18,
    scale: 0.92,
    filter: 'blur(2px)',
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    x: -18,
    scale: 0.92,
    filter: 'blur(2px)',
  },
};

const searchIconVariants = {
  enter: {
    opacity: 0,
    x: -18,
    scale: 0.92,
    filter: 'blur(2px)',
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    x: -18,
    scale: 0.92,
    filter: 'blur(2px)',
  },
};

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onKeyDown, onFocus, leaveTimeoutRef }, ref) => {
    const {
      searchTerm,
      searchState,
      isOpen,
      highlightedIndex,
      filteredOptions,
      onAddNew,
      onSearchChange,
    } = useComboboxContext();

    const handleAddNewFromSearch = (term: string) => {
      onAddNew?.(term);
    };
    const showAddNew =
      (searchState === SEARCH_STATES.NOT_FOUND ||
        (searchState === SEARCH_STATES.TYPING &&
          filteredOptions.length === 0)) &&
      onAddNew;
    const iconColor = getSearchIconColor(searchState);

    return (
      <div className="p-2 border-b border-slate-200 sticky top-0 z-10">
        <div className="relative flex items-center min-w-0">
          <div className="relative flex-1 min-w-0">
            <SearchInput
              ref={ref}
              searchTerm={searchTerm}
              searchState={searchState}
              isOpen={isOpen}
              highlightedIndex={highlightedIndex}
              currentFilteredOptions={filteredOptions}
              onSearchChange={onSearchChange}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              leaveTimeoutRef={leaveTimeoutRef}
            />
            <SearchIcon
              searchState={searchState}
              hasSearchTerm={!!searchTerm}
              position="absolute"
            />
          </div>
          <motion.div
            layout
            className="relative flex h-6 shrink-0 items-center justify-center overflow-hidden"
            initial={false}
            animate={{
              width: searchTerm ? 24 : 0,
              opacity: searchTerm ? 1 : 0,
              marginLeft: searchTerm ? 8 : 0,
              marginRight: searchTerm ? 4 : 0,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {showAddNew ? (
                <motion.div
                  key="add-new"
                  variants={addNewIconVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <AddNewButton
                    searchTerm={searchTerm}
                    onAddNew={handleAddNewFromSearch}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  variants={searchIconVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className={`${iconColor} absolute inset-0 flex items-center justify-center text-xl transition-colors duration-150 ease-out`}
                >
                  <TbSearch aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
