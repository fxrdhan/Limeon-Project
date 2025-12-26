import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo } from 'react';
import { useBadgeBuilder } from '../hooks/useBadgeBuilder';
import { EnhancedSearchState } from '../types';
import { BadgeConfig } from '../types/badge';
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

// Scalable handler type for N-condition support
type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface SearchBadgeProps {
  searchMode: EnhancedSearchState;
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;
  // ============ Dynamic Ref Map API (N-Condition Support) ============
  setBadgeRef?: (badgeId: string, element: HTMLDivElement | null) => void;
  // ============ Scalable Handler API (N-Condition Support) ============
  clearConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  clearJoin: (joinIndex: number) => void;
  clearAll: () => void;
  editConditionPart: (conditionIndex: number, target: BadgeTarget) => void;
  editJoin: (joinIndex: number) => void;
  editValueN: (conditionIndex: number, target: 'value' | 'valueTo') => void;
  onHoverChange?: (isHovered: boolean) => void;
  preservedSearchMode?: EnhancedSearchState | null;
  // Inline editing props
  editingBadge?: {
    conditionIndex: number; // 0 = first condition, 1 = second, etc.
    field: 'value' | 'valueTo'; // Which field is being edited
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
  // Scalable editing state (which condition's column/operator is being edited)
  editingConditionIndex?: number | null;
  editingTarget?: 'column' | 'operator' | 'join' | null;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgesContainerRef,
  // ============ Dynamic Ref Map API ============
  setBadgeRef,
  // ============ Scalable Handler API (N-Condition Support) ============
  clearConditionPart,
  clearJoin,
  clearAll,
  editConditionPart,
  editJoin,
  editValueN,
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
  editingConditionIndex,
  editingTarget,
}) => {
  // Use preserved search mode if available (during edit), otherwise use current
  const modeToRender = preservedSearchMode || searchMode;

  const rawBadges = useBadgeBuilder(
    modeToRender,
    {
      clearConditionPart,
      clearJoin,
      clearAll,
      editConditionPart,
      editJoin,
      editValueN,
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
  // editingConditionIndex and editingTarget track which badge is being edited

  // Check if we're in edit mode (preservedSearchMode exists)
  // Preview should only apply when EDITING existing badges, not when CREATING new ones
  const isInEditMode = preservedSearchMode !== null;

  const badges = useMemo(() => {
    if (!previewColumn && !previewOperator) {
      return rawBadges;
    }

    return rawBadges.map(badge => {
      // Preview column - apply to the correct column badge based on editingConditionIndex
      // Only apply when in edit mode (not when creating new condition[N] column)
      if (
        previewColumn &&
        isInEditMode &&
        editingTarget === 'column' &&
        editingConditionIndex !== null
      ) {
        const expectedBadgeId = `condition-${editingConditionIndex}-column`;
        if (badge.id === expectedBadgeId) {
          return { ...badge, label: previewColumn.headerName };
        }
      }

      // Preview operator - apply to the correct operator badge based on editingConditionIndex
      // Only apply when in edit mode (not when creating new operator)
      if (
        previewOperator &&
        isInEditMode &&
        editingTarget === 'operator' &&
        editingConditionIndex !== null
      ) {
        const expectedBadgeId = `condition-${editingConditionIndex}-operator`;
        if (badge.id === expectedBadgeId) {
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
    editingConditionIndex,
    editingTarget,
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

    // Column selector open - glow the column being edited
    if (
      searchMode.showColumnSelector &&
      editingTarget === 'column' &&
      editingConditionIndex !== null
    ) {
      const expectedId = `condition-${editingConditionIndex}-column`;
      if (badgeId === expectedId) return true;
    }

    // Operator selector open - glow the operator being edited
    if (
      searchMode.showOperatorSelector &&
      editingTarget === 'operator' &&
      editingConditionIndex !== null
    ) {
      const expectedId = `condition-${editingConditionIndex}-operator`;
      if (badgeId === expectedId) return true;
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
      className="contents"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="popLayout">
        {badges.map(badge => {
          // Callback ref that updates the dynamic ref map for N-condition support
          const handleRef = (element: HTMLDivElement | null) => {
            setBadgeRef?.(badge.id, element);
          };

          // Add glow state based on selector being open
          const shouldGlow = getBadgeGlowState(badge.id);
          const badgeWithGlow = shouldGlow
            ? { ...badge, isSelected: true }
            : badge;

          return (
            <motion.div
              key={badge.id}
              ref={handleRef}
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
