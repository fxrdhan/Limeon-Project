import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
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
  operatorBadgeRef: React.RefObject<HTMLDivElement | null>;
  joinBadgeRef: React.RefObject<HTMLDivElement | null>;
  secondColumnBadgeRef: React.RefObject<HTMLDivElement | null>;
  secondOperatorBadgeRef: React.RefObject<HTMLDivElement | null>;
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearValueTo?: () => void; // Clear "to" value in Between (first condition)
  onClearPartialJoin: () => void;
  onClearSecondColumn?: () => void; // Multi-column support
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearSecondValueTo?: () => void; // Clear "to" value in Between (second condition)
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditSecondColumn?: () => void; // Multi-column support
  onEditOperator: () => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditValueTo?: () => void; // Edit "to" value in Between operator (first condition)
  onEditSecondValue?: () => void;
  onEditSecondValueTo?: () => void; // Edit "to" value in Between operator (second condition)
  onHoverChange?: (isHovered: boolean) => void;
  preservedSearchMode?: EnhancedSearchState | null;
  // Inline editing props
  editingBadge?: {
    type: 'firstValue' | 'secondValue' | 'firstValueTo' | 'secondValueTo';
    value: string;
  } | null;
  onInlineValueChange?: (value: string) => void;
  onInlineEditComplete?: (finalValue?: string) => void;
  onNavigateEdit?: (direction: 'left' | 'right') => void; // Ctrl+E (left) or Ctrl+Shift+E (right)
  onFocusInput?: () => void; // Ctrl+I to exit edit and focus main input
  // Keyboard navigation props
  selectedBadgeIndex?: number | null;
  onBadgeCountChange?: (count: number) => void;
  onBadgesChange?: (badges: BadgeConfig[]) => void;
  // Live preview props - show highlighted selector item in badge
  previewColumn?: { headerName: string; field: string } | null;
  previewOperator?: { label: string; value: string } | null;
  // Explicit flag for which column is being edited (for preview)
  isEditingSecondColumn?: boolean;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  operatorBadgeRef,
  joinBadgeRef,
  secondColumnBadgeRef,
  secondOperatorBadgeRef,
  onClearColumn,
  onClearOperator,
  onClearValue,
  onClearValueTo,
  onClearPartialJoin,
  onClearSecondColumn,
  onClearSecondOperator,
  onClearSecondValue,
  onClearSecondValueTo,
  onClearAll,
  onEditColumn,
  onEditSecondColumn,
  onEditOperator,
  onEditJoin,
  onEditValue,
  onEditValueTo,
  onEditSecondValue,
  onEditSecondValueTo,
  onHoverChange,
  preservedSearchMode,
  editingBadge,
  onInlineValueChange,
  onInlineEditComplete,
  onNavigateEdit,
  onFocusInput,
  selectedBadgeIndex,
  onBadgeCountChange,
  onBadgesChange,
  previewColumn,
  previewOperator,
  isEditingSecondColumn,
}) => {
  // Use preserved search mode if available (during edit), otherwise use current
  const modeToRender = preservedSearchMode || searchMode;

  const rawBadges = useBadgeBuilder(
    modeToRender,
    {
      onClearColumn,
      onClearOperator,
      onClearValue,
      onClearValueTo,
      onClearPartialJoin,
      onClearSecondColumn,
      onClearSecondOperator,
      onClearSecondValue,
      onClearSecondValueTo,
      onClearAll,
      onEditColumn,
      onEditSecondColumn,
      onEditOperator,
      onEditJoin,
      onEditValue,
      onEditValueTo,
      onEditSecondValue,
      onEditSecondValueTo,
    },
    editingBadge && onInlineValueChange && onInlineEditComplete
      ? {
          editingBadge,
          onInlineValueChange,
          onInlineEditComplete,
          onNavigateEdit,
          onFocusInput,
        }
      : undefined,
    selectedBadgeIndex
  );

  // Apply preview values to badges for live preview during selector navigation
  // isEditingSecondColumn is passed as prop from EnhancedSearchBar
  // isEditingSecondOperator is derived from searchMode
  const isEditingSecondOperator = searchMode.isSecondOperator;

  const badges = useMemo(() => {
    if (!previewColumn && !previewOperator) {
      return rawBadges;
    }

    return rawBadges.map(badge => {
      // Preview column - apply to the correct column badge
      if (previewColumn) {
        // If editing second column, apply to second-column badge
        if (isEditingSecondColumn && badge.id === 'second-column') {
          return { ...badge, label: previewColumn.headerName };
        }
        // If editing first column (not second), apply to first column badge
        if (
          !isEditingSecondColumn &&
          badge.id === 'column' &&
          badge.type === 'column'
        ) {
          return { ...badge, label: previewColumn.headerName };
        }
      }

      // Preview operator - apply to the correct operator badge
      if (previewOperator) {
        // If editing second operator, apply to second-operator badge
        if (isEditingSecondOperator && badge.id === 'second-operator') {
          return { ...badge, label: previewOperator.label };
        }
        // If editing first operator (not second), apply to first operator badge
        if (
          !isEditingSecondOperator &&
          badge.id === 'operator' &&
          badge.type === 'operator'
        ) {
          return { ...badge, label: previewOperator.label };
        }
      }

      return badge;
    });
  }, [
    rawBadges,
    previewColumn,
    previewOperator,
    isEditingSecondColumn,
    isEditingSecondOperator,
  ]);

  // Notify parent of badge count changes for keyboard navigation
  useEffect(() => {
    onBadgeCountChange?.(badges.length);
  }, [badges.length, onBadgeCountChange]);

  // Notify parent of badges array changes for Ctrl+E edit
  useEffect(() => {
    onBadgesChange?.(badges);
  }, [badges, onBadgesChange]);

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
        {badges.map((badge, index) => {
          // Determine which ref to use for this badge
          let refToUse: React.RefObject<HTMLDivElement | null> | undefined =
            undefined;
          if (index === 0) {
            refToUse = badgeRef; // Column badge
          } else if (badge.id === 'operator') {
            refToUse = operatorBadgeRef; // First operator badge
          } else if (badge.id === 'join') {
            refToUse = joinBadgeRef; // Join badge (AND/OR)
          } else if (badge.id === 'second-column') {
            refToUse = secondColumnBadgeRef; // Second column badge (multi-column)
          } else if (badge.id === 'second-operator') {
            refToUse = secondOperatorBadgeRef; // Second operator badge
          }

          return (
            <motion.div
              key={badge.id}
              ref={refToUse}
              layout
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Badge config={badge} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SearchBadge;
