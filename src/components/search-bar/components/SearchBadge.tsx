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

// Scalable handler type for N-condition support
type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface SearchBadgeProps {
  searchMode: EnhancedSearchState;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;
  operatorBadgeRef: React.RefObject<HTMLDivElement | null>;
  joinBadgeRef: React.RefObject<HTMLDivElement | null>;
  secondColumnBadgeRef: React.RefObject<HTMLDivElement | null>;
  secondOperatorBadgeRef: React.RefObject<HTMLDivElement | null>;
  // ============ Dynamic Ref Map API (N-Condition Support) ============
  setBadgeRef?: (badgeId: string, element: HTMLDivElement | null) => void;
  getColumnRef?: (conditionIndex: number) => HTMLDivElement | null;
  getOperatorRef?: (conditionIndex: number) => HTMLDivElement | null;
  // ============ Scalable Handler API (N-Condition Support) ============
  clearConditionPart?: (conditionIndex: number, target: BadgeTarget) => void;
  clearJoin?: (joinIndex: number) => void;
  editConditionPart?: (conditionIndex: number, target: BadgeTarget) => void;
  editJoin?: (joinIndex: number) => void;
  editValueN?: (conditionIndex: number, target: 'value' | 'valueTo') => void;
  // ============ Legacy Handlers (Backward Compatibility) ============
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearValueTo?: () => void; // Clear "to" value in Between (first condition)
  onClearPartialJoin: () => void;
  onClearCondition1Column?: () => void; // Multi-column support
  onClearCondition1Operator: () => void;
  onClearCondition1Value: () => void;
  onClearCondition1ValueTo?: () => void; // Clear "to" value in Between (condition[1])
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditCondition1Column?: () => void; // Multi-column support
  onEditOperator: () => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditValueTo?: () => void; // Edit "to" value in Between operator (first condition)
  onEditCondition1Value?: () => void;
  onEditCondition1ValueTo?: () => void; // Edit "to" value in Between operator (condition[1])
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
  editingTarget?: 'column' | 'operator' | null;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  operatorBadgeRef,
  joinBadgeRef,
  secondColumnBadgeRef,
  secondOperatorBadgeRef,
  // ============ Dynamic Ref Map API ============
  setBadgeRef,
  // ============ Scalable Handler API (N-Condition Support) ============
  clearConditionPart,
  clearJoin,
  editConditionPart,
  editJoin,
  editValueN,
  // ============ Legacy Handlers ============
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
  editingConditionIndex,
  editingTarget,
}) => {
  // Use preserved search mode if available (during edit), otherwise use current
  const modeToRender = preservedSearchMode || searchMode;

  const rawBadges = useBadgeBuilder(
    modeToRender,
    {
      // Scalable handlers (N-condition support)
      clearConditionPart,
      clearJoin,
      clearAll: onClearAll,
      editConditionPart,
      editJoin,
      editValueN,
      // Legacy handlers (backward compatibility)
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
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5 max-w-[70%] scrollbar-hide overflow-visible"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        pointerEvents: badges.length === 0 ? 'none' : 'auto',
      }}
    >
      <AnimatePresence mode="popLayout">
        {badges.map((badge, index) => {
          // Determine which static ref to use for this badge
          // These refs are used by useSelectorPosition for positioning
          let staticRef: React.RefObject<HTMLDivElement | null> | undefined =
            undefined;
          if (index === 0) {
            staticRef = badgeRef; // Column badge (condition-0-column)
          } else if (badge.id === 'condition-0-operator') {
            staticRef = operatorBadgeRef; // First operator badge
          } else if (badge.id === 'join-0') {
            staticRef = joinBadgeRef; // First join badge only
          } else if (badge.id === 'condition-1-column') {
            staticRef = secondColumnBadgeRef; // Second column badge
          } else if (badge.id === 'condition-1-operator') {
            staticRef = secondOperatorBadgeRef; // Second operator badge
          }
          // All other badges (condition-N-column, condition-N-operator for N>1)
          // are stored in dynamic ref map via setBadgeRef only

          // Callback ref that updates both static ref and dynamic ref map
          const handleRef = (element: HTMLDivElement | null) => {
            // Update static ref if applicable (for useSelectorPosition)
            if (staticRef && 'current' in staticRef) {
              (
                staticRef as React.MutableRefObject<HTMLDivElement | null>
              ).current = element;
            }
            // Update dynamic ref map for N-condition support
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
