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
  condition1ColumnBadgeRef: React.RefObject<HTMLDivElement | null>;
  condition1OperatorBadgeRef: React.RefObject<HTMLDivElement | null>;
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearValueTo?: () => void; // Clear "to" value in Between (first condition)
  onClearPartialJoin: () => void;
  onClearCondition1Column?: () => void; // Multi-column support
  onClearCondition1Operator: () => void;
  onClearCondition1Value: () => void;
  onClearCondition1ValueTo?: () => void; // Clear "to" value in Between (second condition)
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditCondition1Column?: () => void; // Multi-column support
  onEditOperator: () => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditValueTo?: () => void; // Edit "to" value in Between operator (first condition)
  onEditCondition1Value?: () => void;
  onEditCondition1ValueTo?: () => void; // Edit "to" value in Between operator (second condition)
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
  // Explicit flags for which column/operator is being edited (for preview and glow)
  isEditingCondition1Column?: boolean;
  isEditingCondition1Operator?: boolean;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  operatorBadgeRef,
  joinBadgeRef,
  condition1ColumnBadgeRef,
  condition1OperatorBadgeRef,
  onClearColumn,
  onClearOperator,
  onClearValue,
  onClearValueTo,
  onClearPartialJoin,
  onClearCondition1Column,
  onClearCondition1Operator,
  onClearCondition1Value,
  onClearCondition1ValueTo,
  onClearAll,
  onEditColumn,
  onEditCondition1Column,
  onEditOperator,
  onEditJoin,
  onEditValue,
  onEditValueTo,
  onEditCondition1Value,
  onEditCondition1ValueTo,
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
  isEditingCondition1Column,
  isEditingCondition1Operator,
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
      onClearCondition1Column,
      onClearCondition1Operator,
      onClearCondition1Value,
      onClearCondition1ValueTo,
      onClearAll,
      onEditColumn,
      onEditCondition1Column,
      onEditOperator,
      onEditJoin,
      onEditValue,
      onEditValueTo,
      onEditCondition1Value,
      onEditCondition1ValueTo,
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
  // isEditingCondition1Column and isEditingCondition1Operator are passed as props from EnhancedSearchBar

  // Check if we're in edit mode (preservedSearchMode exists)
  // Preview should only apply when EDITING existing badges, not when CREATING new ones
  const isInEditMode = preservedSearchMode !== null;

  const badges = useMemo(() => {
    if (!previewColumn && !previewOperator) {
      return rawBadges;
    }

    return rawBadges.map(badge => {
      // Preview column - apply to the correct column badge
      // Only apply when in edit mode (not when creating new second column)
      // Uses index-based IDs: condition-{index}-column
      if (previewColumn && isInEditMode) {
        // If editing second column, apply to condition-1-column badge
        if (isEditingCondition1Column && badge.id === 'condition-1-column') {
          return { ...badge, label: previewColumn.headerName };
        }
        // If editing first column (not second), apply to condition-0-column badge
        if (
          !isEditingCondition1Column &&
          badge.id === 'condition-0-column' &&
          badge.type === 'column'
        ) {
          return { ...badge, label: previewColumn.headerName };
        }
      }

      // Preview operator - apply to the correct operator badge
      // Only apply when in edit mode (not when creating new operator)
      // Uses index-based IDs: condition-{index}-operator
      if (previewOperator && isInEditMode) {
        // If editing second operator, apply to condition-1-operator badge
        if (
          isEditingCondition1Operator &&
          badge.id === 'condition-1-operator'
        ) {
          return { ...badge, label: previewOperator.label };
        }
        // If editing first operator (not second), apply to condition-0-operator badge
        if (
          !isEditingCondition1Operator &&
          badge.id === 'condition-0-operator' &&
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
    isInEditMode,
    isEditingCondition1Column,
    isEditingCondition1Operator,
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

  // Determine which badge should have glow effect when selector is open
  // This makes it visually clear which badge is being edited
  // Uses index-based badge IDs: condition-{index}-{type}
  const getBadgeGlowState = (badgeId: string): boolean => {
    // Only show glow when in edit mode (preservedSearchMode exists)
    if (!isInEditMode) return false;

    // Column selector open
    if (searchMode.showColumnSelector) {
      if (isEditingCondition1Column && badgeId === 'condition-1-column')
        return true;
      if (!isEditingCondition1Column && badgeId === 'condition-0-column')
        return true;
    }

    // Operator selector open
    if (searchMode.showOperatorSelector) {
      if (isEditingCondition1Operator && badgeId === 'condition-1-operator')
        return true;
      if (!isEditingCondition1Operator && badgeId === 'condition-0-operator')
        return true;
    }

    // Join operator selector open
    if (searchMode.showJoinOperatorSelector && badgeId.startsWith('join-')) {
      return true;
    }

    return false;
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
          // Use pattern matching for index-based badge IDs
          let refToUse: React.RefObject<HTMLDivElement | null> | undefined =
            undefined;
          if (index === 0) {
            refToUse = badgeRef; // Column badge (condition-0-column)
          } else if (badge.id === 'condition-0-operator') {
            refToUse = operatorBadgeRef; // First operator badge
          } else if (badge.id.startsWith('join-')) {
            refToUse = joinBadgeRef; // Join badge (AND/OR) - join-0, join-1, etc.
          } else if (badge.id === 'condition-1-column') {
            refToUse = condition1ColumnBadgeRef; // Second column badge (multi-column)
          } else if (badge.id === 'condition-1-operator') {
            refToUse = condition1OperatorBadgeRef; // Second operator badge
          }

          // Add glow state based on selector being open
          const shouldGlow = getBadgeGlowState(badge.id);
          const badgeWithGlow = shouldGlow
            ? { ...badge, isSelected: true }
            : badge;

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
              <Badge config={badgeWithGlow} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SearchBadge;
