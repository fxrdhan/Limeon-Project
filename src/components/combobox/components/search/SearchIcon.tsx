import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbSearch } from 'react-icons/tb';
import { getSearchIconColor } from '../../utils/comboboxUtils';

interface SearchIconProps {
  searchState: string;
  hasSearchTerm: boolean;
  position?: 'absolute' | 'relative';
}

const SearchIcon: React.FC<SearchIconProps> = ({
  searchState,
  hasSearchTerm,
  position = 'absolute',
}) => {
  const iconColor = getSearchIconColor(searchState);
  const isRelativeIconVisible = hasSearchTerm && position === 'relative';
  const isAbsoluteIconVisible = !hasSearchTerm && position === 'absolute';

  const renderGlyph = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key="search"
        initial={{ opacity: 0, scale: 0.985, filter: 'blur(2px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.985, filter: 'blur(2px)' }}
        transition={{ duration: 0.09, ease: 'easeOut' }}
        className="flex h-full w-full items-center justify-center"
      >
        <TbSearch aria-hidden="true" />
      </motion.div>
    </AnimatePresence>
  );

  if (position === 'relative') {
    return (
      <motion.div
        layout
        className="flex h-6 shrink-0 items-center justify-center overflow-hidden"
        initial={false}
        animate={{
          width: isRelativeIconVisible ? 24 : 0,
          opacity: isRelativeIconVisible ? 1 : 0,
          scale: isRelativeIconVisible ? 1.25 : 1,
          x: isRelativeIconVisible ? 0 : -6,
          marginLeft: isRelativeIconVisible ? 8 : 0,
          marginRight: isRelativeIconVisible ? 4 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 28,
        }}
      >
        <div
          className={`${iconColor} flex h-4 w-4 items-center justify-center transition-colors duration-150 ease-out`}
        >
          {renderGlyph()}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${iconColor} pointer-events-none absolute right-2 top-2.5 flex h-4 w-4 items-center justify-center`}
      initial={false}
      animate={{
        opacity: isAbsoluteIconVisible ? 1 : 0,
        scale: isAbsoluteIconVisible ? 1 : 0.85,
        x: isAbsoluteIconVisible ? 0 : 8,
      }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 28,
      }}
    >
      {renderGlyph()}
    </motion.div>
  );
};

export default SearchIcon;
