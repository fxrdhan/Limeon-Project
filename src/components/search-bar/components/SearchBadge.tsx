import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedSearchState } from '../types';
import { useBadgeBuilder } from '../hooks/useBadgeBuilder';
import Badge from './Badge';

// Bouncy spring animation config
// Now works without "jumping" bug thanks to:
// - Consistent badge IDs (existing badges don't re-animate)
// - mode="popLayout" (exiting badges immediately leave layout flow)
// - layout prop (remaining badges smoothly reposition)
const badgeVariants = {
  initial: {
    opacity: 0,
    scale: 0.5,
    y: -8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 22,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.3,
    y: -12,
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const,
    },
  },
};

interface SearchBadgeProps {
  searchMode: EnhancedSearchState;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearPartialJoin: () => void;
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditOperator: () => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditSecondValue?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  preservedSearchMode?: EnhancedSearchState | null;
  // Inline editing props
  editingBadge?: {
    type: 'firstValue' | 'secondValue' | 'firstValueTo' | 'secondValueTo';
    value: string;
  } | null;
  onInlineValueChange?: (value: string) => void;
  onInlineEditComplete?: (finalValue?: string) => void;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  onClearColumn,
  onClearOperator,
  onClearValue,
  onClearPartialJoin,
  onClearSecondOperator,
  onClearSecondValue,
  onClearAll,
  onEditColumn,
  onEditOperator,
  onEditJoin,
  onEditValue,
  onEditSecondValue,
  onHoverChange,
  preservedSearchMode,
  editingBadge,
  onInlineValueChange,
  onInlineEditComplete,
}) => {
  // Use preserved search mode if available (during edit), otherwise use current
  const modeToRender = preservedSearchMode || searchMode;

  const badges = useBadgeBuilder(
    modeToRender,
    {
      onClearColumn,
      onClearOperator,
      onClearValue,
      onClearPartialJoin,
      onClearSecondOperator,
      onClearSecondValue,
      onClearAll,
      onEditColumn,
      onEditOperator,
      onEditJoin,
      onEditValue,
      onEditSecondValue,
    },
    editingBadge && onInlineValueChange && onInlineEditComplete
      ? {
          editingBadge,
          onInlineValueChange,
          onInlineEditComplete,
        }
      : undefined
  );

  const handleMouseEnter = () => {
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    onHoverChange?.(false);
  };

  // Always render container so AnimatePresence can handle exit animations
  // Use overflow-visible to allow exit animations to be visible (not clipped)
  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5 max-w-[70%] scrollbar-hide overflow-visible"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        pointerEvents: badges.length === 0 ? 'none' : 'auto',
      }}
    >
      <AnimatePresence mode="popLayout">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            ref={index === 0 ? badgeRef : undefined}
            layout
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Badge config={badge} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SearchBadge;
