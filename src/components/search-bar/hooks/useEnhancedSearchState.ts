/**
 * Enhanced Search State Hook
 *
 * Extracted from EnhancedSearchBar.tsx to manage complex state declarations.
 * Centralizes editing state, badge selection, and preview state management.
 */

import { useCallback, useRef, useState } from 'react';
import type {
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from '../types';
import type { BadgeConfig } from '../types/badge';
import type { PreservedFilter } from '../utils/handlerHelpers';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents inline badge editing state.
 * Uses index-based structure for N-condition support.
 */
export interface EditingBadgeState {
  /** Condition index (0 = first, 1 = second, etc.) */
  conditionIndex: number;
  /** Which field is being edited */
  field: 'value' | 'valueTo';
  /** Current value being edited */
  value: string;
}

/**
 * Represents which selector is being edited.
 */
export interface EditingSelectorTarget {
  conditionIndex: number; // 0 = first, 1 = second, etc.
  target: 'column' | 'operator' | 'join';
}

/**
 * Represents interrupted selector state for restoration after inline edit.
 */
export interface InterruptedSelectorState {
  type: 'column' | 'operator' | 'join' | 'partial';
  originalPattern: string;
}

export interface UseEnhancedSearchStateReturn {
  // Preserved state for edit mode
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  preservedFilterRef: React.RefObject<PreservedFilter | null>;

  // Editing selector state
  editingSelectorTarget: EditingSelectorTarget | null;
  setEditingSelectorTarget: (target: EditingSelectorTarget | null) => void;

  // Editing state helpers
  isEditingColumnAt: (index: number) => boolean;
  isEditingOperatorAt: (index: number) => boolean;
  isEditingSecondOperator: boolean;
  isEditingSecondColumnState: boolean;
  setIsEditingSecondOperator: (editing: boolean) => void;
  isEditingJoinOperator: boolean;

  // Current join operator during edit
  currentJoinOperator: 'AND' | 'OR' | undefined;
  setCurrentJoinOperator: (op: 'AND' | 'OR' | undefined) => void;

  // Inline badge editing
  editingBadge: EditingBadgeState | null;
  setEditingBadge: (badge: EditingBadgeState | null) => void;

  // Badge selection for keyboard navigation
  selectedBadgeIndex: number | null;
  setSelectedBadgeIndex: React.Dispatch<React.SetStateAction<number | null>>;
  badgeCount: number;
  setBadgeCount: (count: number) => void;

  // Badge refs for keyboard actions
  badgesRef: React.RefObject<BadgeConfig[]>;

  // Interrupted selector state
  interruptedSelectorRef: React.RefObject<InterruptedSelectorState | null>;

  // Preview state for live selector updates
  previewColumn: SearchColumn | null;
  setPreviewColumn: (col: SearchColumn | null) => void;
  previewOperator: FilterOperator | null;
  setPreviewOperator: (op: FilterOperator | null) => void;

  // Clear all editing state
  handleClearPreservedState: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnhancedSearchState(): UseEnhancedSearchStateReturn {
  // ========== Preserved State for Edit Mode ==========
  // State to preserve searchMode during edit (to keep badges visible)
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);

  // Ref to store preserved filter when editing column/operator
  const preservedFilterRef = useRef<PreservedFilter | null>(null);

  // ========== Editing Selector State (N-Condition Support) ==========
  // Tracks which condition's column/operator is being edited
  const [editingSelectorTarget, setEditingSelectorTarget] =
    useState<EditingSelectorTarget | null>(null);

  // Derived helpers for N-condition editing
  const isEditingColumnAt = useCallback(
    (index: number) =>
      editingSelectorTarget?.conditionIndex === index &&
      editingSelectorTarget?.target === 'column',
    [editingSelectorTarget]
  );

  const isEditingOperatorAt = useCallback(
    (index: number) =>
      editingSelectorTarget?.conditionIndex === index &&
      editingSelectorTarget?.target === 'operator',
    [editingSelectorTarget]
  );

  // Convenient aliases for second condition (most common case)
  const isEditingSecondOperator = isEditingOperatorAt(1);
  const isEditingSecondColumnState = isEditingColumnAt(1);
  const isEditingJoinOperator = editingSelectorTarget?.target === 'join';

  // Setter wrapper for useSelectionHandlers
  const setIsEditingSecondOperator = useCallback(
    (editing: boolean) => {
      if (editing) {
        setEditingSelectorTarget({ conditionIndex: 1, target: 'operator' });
      } else if (isEditingSecondOperator) {
        setEditingSelectorTarget(null);
      }
    },
    [isEditingSecondOperator]
  );

  // ========== Current Join Operator During Edit ==========
  const [currentJoinOperator, setCurrentJoinOperator] = useState<
    'AND' | 'OR' | undefined
  >(undefined);

  // ========== Inline Badge Editing ==========
  const [editingBadge, setEditingBadge] = useState<EditingBadgeState | null>(
    null
  );

  // ========== Badge Selection for Keyboard Navigation ==========
  const [selectedBadgeIndex, setSelectedBadgeIndex] = useState<number | null>(
    null
  );
  const [badgeCount, setBadgeCount] = useState<number>(0);

  // Ref to store current badges for Ctrl+E edit action
  const badgesRef = useRef<BadgeConfig[]>([]);

  // ========== Interrupted Selector State ==========
  // Ref to store interrupted selector state for restoration after inline edit
  const interruptedSelectorRef = useRef<InterruptedSelectorState | null>(null);

  // ========== Preview State ==========
  const [previewColumn, setPreviewColumn] = useState<SearchColumn | null>(null);
  const [previewOperator, setPreviewOperator] = useState<FilterOperator | null>(
    null
  );

  // ========== Clear All Preserved State ==========
  const handleClearPreservedState = useCallback(() => {
    setPreservedSearchMode(null);
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null);
  }, []);

  return {
    // Preserved state
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,

    // Editing selector state
    editingSelectorTarget,
    setEditingSelectorTarget,
    isEditingColumnAt,
    isEditingOperatorAt,
    isEditingSecondOperator,
    isEditingSecondColumnState,
    setIsEditingSecondOperator,
    isEditingJoinOperator,

    // Current join operator
    currentJoinOperator,
    setCurrentJoinOperator,

    // Inline badge editing
    editingBadge,
    setEditingBadge,

    // Badge selection
    selectedBadgeIndex,
    setSelectedBadgeIndex,
    badgeCount,
    setBadgeCount,

    // Badge refs
    badgesRef,

    // Interrupted selector
    interruptedSelectorRef,

    // Preview state
    previewColumn,
    setPreviewColumn,
    previewOperator,
    setPreviewOperator,

    // Clear handler
    handleClearPreservedState,
  };
}
