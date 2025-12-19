import fuzzysort from 'fuzzysort';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { LuSearch } from 'react-icons/lu';
import SearchBadge from './components/SearchBadge';
import SearchIcon from './components/SearchIcon';
import ColumnSelector from './components/selectors/ColumnSelector';
import JoinOperatorSelector from './components/selectors/JoinOperatorSelector';
import OperatorSelector from './components/selectors/OperatorSelector';
import { SEARCH_CONSTANTS } from './constants';
import { useBadgeHandlers } from './hooks/useBadgeHandlers';
import { useSearchInput } from './hooks/useSearchInput';
import { useSearchKeyboard } from './hooks/useSearchKeyboard';
import { useSearchState } from './hooks/useSearchState';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';
import { useSelectorPosition } from './hooks/useSelectorPosition';
import { JOIN_OPERATORS } from './operators';
import {
  EnhancedSearchBarProps,
  EnhancedSearchState,
  SearchColumn,
} from './types';
import {
  extractMultiConditionPreservation,
  getConditionOperatorAt,
  getFirstCondition,
  getJoinOperator,
  PreservedFilter,
  setFilterValue,
} from './utils/handlerHelpers';
import { getOperatorsForColumn } from './utils/operatorUtils';
import { PatternBuilder } from './utils/PatternBuilder';
import { restoreConfirmedPattern } from './utils/patternRestoration';
import { buildColumnValue, findColumn } from './utils/searchUtils';

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = 'Cari...',
  className = '',
  inputRef,
  searchState = 'idle',
  resultsCount,
  columns,
  onGlobalSearch,
  onClearSearch,
  onFilterSearch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Ref to store preserved filter when editing column/operator
  // Uses PreservedFilter type which supports N conditions via conditions[] array
  const preservedFilterRef = useRef<PreservedFilter | null>(null);

  // State to preserve searchMode during edit (to keep badges visible)
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);

  // ============ Consolidated Editing State (N-Condition Support) ============
  // Tracks which condition's column/operator is being edited
  const [editingSelectorTarget, setEditingSelectorTarget] = useState<{
    conditionIndex: number; // 0 = first, 1 = second, etc.
    target: 'column' | 'operator' | 'join';
  } | null>(null);

  // ============ Derived Helpers for N-Condition Editing ============
  // Check if editing column/operator at specific index
  const isEditingColumnAt = (index: number) =>
    editingSelectorTarget?.conditionIndex === index &&
    editingSelectorTarget?.target === 'column';
  const isEditingOperatorAt = (index: number) =>
    editingSelectorTarget?.conditionIndex === index &&
    editingSelectorTarget?.target === 'operator';

  // Convenient aliases for second condition (most common case)
  const isEditingSecondOperator = isEditingOperatorAt(1);
  const isEditingSecondColumnState = isEditingColumnAt(1);

  // Setter wrapper for useSelectionHandlers
  const setIsEditingSecondOperator = (editing: boolean) => {
    if (editing) {
      setEditingSelectorTarget({ conditionIndex: 1, target: 'operator' });
    } else if (isEditingSecondOperator) {
      setEditingSelectorTarget(null);
    }
  };

  // State to track current join operator value during edit mode
  const [currentJoinOperator, setCurrentJoinOperator] = useState<
    'AND' | 'OR' | undefined
  >(undefined);

  // State for inline badge editing - uses index-based structure for N conditions
  const [editingBadge, setEditingBadge] = useState<{
    /** Condition index (0 = first, 1 = second, etc.) */
    conditionIndex: number;
    /** Which field is being edited */
    field: 'value' | 'valueTo';
    /** Current value being edited */
    value: string;
  } | null>(null);

  // State for keyboard-based badge selection (Ctrl+Arrow navigation)
  const [selectedBadgeIndex, setSelectedBadgeIndex] = useState<number | null>(
    null
  );

  // Badge count for keyboard navigation bounds (use state for reliable updates)
  const [badgeCount, setBadgeCount] = useState<number>(0);

  // Preview state for live badge updates when hovering/navigating selectors
  const [previewColumn, setPreviewColumn] = useState<SearchColumn | null>(null);
  const [previewOperator, setPreviewOperator] = useState<
    import('./types').FilterOperator | null
  >(null);

  // Ref to store current badges for Ctrl+E edit action
  const badgesRef = useRef<import('./types/badge').BadgeConfig[]>([]);

  // Ref to store interrupted selector state for restoration after inline edit
  // When user clicks a value badge while selector is open, we save the pattern
  // to restore the selector after inline edit completes
  // 'partial' type is used when there's partial multi-column state but no selector open
  const interruptedSelectorRef = useRef<{
    type: 'column' | 'operator' | 'join' | 'partial';
    originalPattern: string;
  } | null>(null);

  const { searchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
    isEditMode: preservedSearchMode !== null, // In edit mode when preserving badges
  });

  // Badge refs are used for dynamic selector positioning
  // We need to access them before calling useSelectorPosition
  const {
    displayValue,
    showTargetedIndicator,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    // Dynamic Ref Map API (N-Condition Support)
    setBadgeRef,
    // Static Refs for Selector Positioning
    badgeRef,
    badgesContainerRef,
    operatorBadgeRef,
    joinBadgeRef,
    secondColumnBadgeRef,
    secondOperatorBadgeRef,
    // Dynamic Lazy Ref for N-Condition Selector Positioning
    getConditionNColumnRef,
    getConditionNOperatorRef,
    getConditionNJoinRef,
  } = useSearchInput({
    value,
    searchMode,
    onChange,
    inputRef,
  });

  const activeConditionIndex = searchMode.activeConditionIndex ?? 0;

  // Column selector: position depends on context
  // - First column (index 0): appears at container left (no anchor)
  // - Condition N editing (preservedSearchMode + activeConditionIndex > 0): appears below Nth column badge
  // - Condition N creating (activeConditionIndex > 0 only): appears after all badges
  const isSelectingConditionNColumn =
    (searchMode.activeConditionIndex ?? 0) > 0;
  const isEditingConditionNColumn =
    preservedSearchMode !== null && isSelectingConditionNColumn;
  // For N-condition support, use dynamic ref for condition 2+
  const getColumnAnchorRef = ():
    | React.RefObject<HTMLElement | null>
    | undefined => {
    if (!isSelectingConditionNColumn) return undefined; // First column: no anchor (or container left)
    if (!isEditingConditionNColumn)
      return inputRef as React.RefObject<HTMLElement | null>; // Create mode: position at input (end of badges)
    // Edit mode: position below the correct column badge
    // Note: activeConditionIndex >= 1 here (guaranteed by isSelectingConditionNColumn)
    if (activeConditionIndex === 1) return secondColumnBadgeRef;
    return getConditionNColumnRef(activeConditionIndex); // N >= 2
  };
  const columnAnchorRef = getColumnAnchorRef();
  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
    anchorRef: columnAnchorRef,
    anchorAlign: isSelectingConditionNColumn
      ? 'left' // Always left-aligned: below badge (Edit) or at start of input (Create)
      : 'left',
  });

  // Operator selector: position below the badges
  // - First operator (index 0): anchor to column badge (badgeRef), align right
  // - Condition[1] operator: anchor to secondColumnBadgeRef
  // - Condition[N >= 2] operator: anchor to activeConditionColumnRef (dynamic)
  //
  // Use scalable checks based on activeConditionIndex
  const isBuildingConditionN = activeConditionIndex > 0;
  const hasActiveConditionColumn =
    searchMode.partialConditions?.[activeConditionIndex]?.column;

  // Determine which anchor ref to use based on activeConditionIndex
  const getConditionColumnAnchorRef =
    (): React.RefObject<HTMLElement | null> => {
      if (activeConditionIndex === 0) {
        return badgeRef; // First condition column
      } else if (activeConditionIndex === 1) {
        return secondColumnBadgeRef; // Second condition column (static ref)
      } else {
        // N >= 2: use lazy ref that looks up element dynamically from badge map
        return getConditionNColumnRef(activeConditionIndex);
      }
    };

  // N-condition support: detect editing operator for any condition index
  // Check preservedSearchMode (edit mode) + showOperatorSelector
  // IMPORTANT: This must be checked BEFORE isCreatingConditionNOp because both can be true,
  // but edit mode takes precedence
  const isEditingOperator =
    preservedSearchMode !== null && searchMode.showOperatorSelector;

  // Creating operator - only when NOT in edit mode
  const isCreatingConditionNOp =
    !isEditingOperator && // NOT editing
    isBuildingConditionN &&
    hasActiveConditionColumn &&
    searchMode.showOperatorSelector;

  let operatorAnchorRef: React.RefObject<HTMLElement | null>;
  let operatorAnchorAlign: 'left' | 'right';

  if (isEditingOperator) {
    // EDIT existing operator: position below the OPERATOR badge being edited
    // Use dynamic ref for N >= 2, static refs for 0 and 1
    if (activeConditionIndex === 0) {
      operatorAnchorRef = operatorBadgeRef;
    } else if (activeConditionIndex === 1) {
      operatorAnchorRef = secondOperatorBadgeRef;
    } else {
      operatorAnchorRef = getConditionNOperatorRef(activeConditionIndex);
    }
    operatorAnchorAlign = 'left';
  } else if (isCreatingConditionNOp) {
    // CREATE/select operator for condition[N]: position after column badge
    operatorAnchorRef = getConditionColumnAnchorRef();
    operatorAnchorAlign = 'right';
  } else {
    // First operator: position after column badge
    operatorAnchorRef = badgeRef;
    operatorAnchorAlign = 'right';
  }

  const operatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showOperatorSelector,
    containerRef,
    anchorRef: operatorAnchorRef,
    anchorAlign: operatorAnchorAlign,
  });

  // Join operator selector: position depends on context
  // - CREATE mode (no join badge yet): Position after all badges (right edge)
  // - EDIT mode (join badge exists): Position below the join badge itself
  //
  // IMPORTANT: Detect edit mode via multiple signals:
  // 1. searchMode.partialJoin - exists when typing partial join pattern
  // 2. preservedSearchMode?.partialJoin - exists when editing from partial multi-column
  // 3. preservedSearchMode?.filterSearch?.joinOperator - exists when editing complete multi-condition
  // 4. preservedSearchMode?.filterSearch?.isMultiCondition - alternative signal for edit mode
  // Detect if specifically editing an existing join badge
  const isEditingJoinOperator = editingSelectorTarget?.target === 'join';

  const getJoinAnchorRef = (): React.RefObject<HTMLElement | null> => {
    // 1. EDIT existing join: use the specific join badge being edited
    if (
      isEditingJoinOperator &&
      editingSelectorTarget?.conditionIndex !== undefined
    ) {
      return getConditionNJoinRef(editingSelectorTarget.conditionIndex);
    }

    // 2. CREATE new join: position at the input (after last confirmed badge)
    return inputRef as React.RefObject<HTMLElement | null>;
  };

  const joinAnchorRef = getJoinAnchorRef();

  const joinOperatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showJoinOperatorSelector,
    containerRef,
    anchorRef: joinAnchorRef,
    anchorAlign: 'left', // Always left: below badge (Edit) or at start of input (Create)
  });

  // Clear preserved state - used to reset edit mode and badge visibility
  const handleClearPreservedState = useCallback(() => {
    setPreservedSearchMode(null);
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null); // Clear all editing states
  }, []);

  // Try to restore confirmed pattern from preservedSearchMode
  // Returns true if restored (caller should return), false otherwise
  const tryRestorePreservedPattern = useCallback((): boolean => {
    if (preservedSearchMode && preservedSearchMode.filterSearch?.isConfirmed) {
      const filter = preservedSearchMode.filterSearch;
      const restoredPattern = restoreConfirmedPattern(filter);

      onChange({
        target: { value: restoredPattern },
      } as React.ChangeEvent<HTMLInputElement>);

      preservedFilterRef.current = null;
      setPreservedSearchMode(null);
      return true;
    }
    return false;
  }, [preservedSearchMode, onChange]);

  // Use centralized badge handlers for clear operations
  // Get both scalable handlers and legacy handlers
  const {
    clearConditionPart,
    clearJoin,
    // clearAll is available as badgeHandlers.onClearAll for backward compatibility
    editConditionPart,
    editJoin,
    legacy: badgeHandlers,
  } = useBadgeHandlers({
    value,
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    onClearPreservedState: handleClearPreservedState,
    onFilterSearch,
    onClearSearch,
    columns: memoizedColumns,
    setEditingSelectorTarget,
  });

  // Note: Scalable handlers (clearConditionPart, clearJoin, etc.) are passed directly
  // to SearchBadge, which forwards them to useBadgeBuilder. The clearAll handler is
  // available as both clearAll and badgeHandlers.onClearAll for backward compatibility.

  // Use centralized selection handlers for column/operator/join selection
  const { handleColumnSelect, handleOperatorSelect, handleJoinOperatorSelect } =
    useSelectionHandlers({
      value,
      onChange,
      inputRef,
      searchMode,
      preservedSearchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      memoizedColumns,
      isEditingSecondOperator,
      setIsEditingSecondOperator,
      setEditingBadge,
    });

  // Handler for badge count changes from SearchBadge
  const handleBadgeCountChange = useCallback(
    (count: number) => {
      setBadgeCount(count);
      // Reset selection if it's out of bounds
      if (selectedBadgeIndex !== null && selectedBadgeIndex >= count) {
        setSelectedBadgeIndex(count > 0 ? count - 1 : null);
      }
    },
    [selectedBadgeIndex]
  );

  // Handler for badges array changes from SearchBadge
  const handleBadgesChange = useCallback(
    (badges: import('./types/badge').BadgeConfig[]) => {
      badgesRef.current = badges;
    },
    []
  );

  // Handler for Ctrl+E (left) and Ctrl+Shift+E (right) to edit badge
  const handleBadgeEdit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+E (with or without Shift)
      if (!e.ctrlKey || e.key.toLowerCase() !== 'e') {
        return false;
      }

      // Prevent browser's default Ctrl+E behavior (address bar focus)
      e.preventDefault();
      e.stopPropagation();

      // No badges available
      if (badgeCount === 0) return true;

      // Direction: Shift = right, no Shift = left
      const direction = e.shiftKey ? 'right' : 'left';

      // Determine which badge to edit
      let targetIndex: number;

      if (selectedBadgeIndex === null) {
        // No badge selected - start from edge based on direction
        targetIndex = direction === 'left' ? badgeCount - 1 : 0;
      } else {
        // Badge already selected - move in direction
        if (direction === 'left') {
          targetIndex = selectedBadgeIndex - 1;
          if (targetIndex < 0) targetIndex = badgeCount - 1; // Wrap to rightmost
        } else {
          targetIndex = selectedBadgeIndex + 1;
          if (targetIndex >= badgeCount) targetIndex = 0; // Wrap to leftmost
        }
      }

      // Find an editable badge starting from targetIndex going in direction
      let attempts = 0;
      while (attempts < badgeCount) {
        const badge = badgesRef.current[targetIndex];
        if (badge?.canEdit && badge?.onEdit) {
          // Found editable badge - select and edit it
          setSelectedBadgeIndex(targetIndex);
          badge.onEdit();
          return true;
        }
        // Not editable, try next badge in direction
        if (direction === 'left') {
          targetIndex--;
          if (targetIndex < 0) targetIndex = badgeCount - 1;
        } else {
          targetIndex++;
          if (targetIndex >= badgeCount) targetIndex = 0;
        }
        attempts++;
      }

      // No editable badge found
      return true;
    },
    [selectedBadgeIndex, badgeCount]
  );

  // Handler for Ctrl+D to delete selected badge
  const handleBadgeDelete = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+D
      if (!e.ctrlKey || e.key.toLowerCase() !== 'd') {
        return false;
      }

      // Prevent browser's default Ctrl+D behavior (bookmark page)
      e.preventDefault();
      e.stopPropagation();

      // Must have a selected badge
      if (selectedBadgeIndex === null) return true;

      // Get the badge at selected index
      const badge = badgesRef.current[selectedBadgeIndex];
      if (!badge || !badge.canClear || !badge.onClear) return true;

      // Clear selection and trigger delete
      setSelectedBadgeIndex(null);
      badge.onClear();

      return true;
    },
    [selectedBadgeIndex]
  );

  // Global Ctrl+D handler to override browser bookmark shortcut reliability
  // Uses capture phase to ensure we intercept it when a badge is selected
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        selectedBadgeIndex !== null &&
        e.ctrlKey &&
        e.key.toLowerCase() === 'd'
      ) {
        // Always prevent default to block browser bookmarking
        e.preventDefault();

        // Special case: If focused on a badge input, let the badge's own bubbling
        // handler handle it. This is because Badge.tsx sets isClearing=true
        // which prevents its onBlur handler from reverting the deletion.
        if (
          e.target instanceof HTMLInputElement &&
          e.target.classList.contains('badge-edit-input')
        ) {
          return;
        }

        e.stopPropagation();

        const badge = badgesRef.current[selectedBadgeIndex];
        if (badge && badge.canClear && badge.onClear) {
          setSelectedBadgeIndex(null);
          badge.onClear();
        }
      }
    };

    if (selectedBadgeIndex !== null) {
      document.addEventListener('keydown', handleGlobalKeyDown, {
        capture: true,
      });
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, {
        capture: true,
      });
    };
  }, [selectedBadgeIndex]);

  // Handler for Ctrl+Arrow keyboard navigation
  const handleBadgeNavigation = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+Arrow Left/Right
      if (!e.ctrlKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) {
        return false;
      }

      if (badgeCount === 0) return false;

      e.preventDefault();
      e.stopPropagation();

      // Helper to check if a badge is selectable (not a separator)
      const isSelectable = (index: number): boolean => {
        const badge = badgesRef.current[index];
        // Skip separator badges - they should not be selectable
        return badge?.type !== 'separator';
      };

      // Helper to find next selectable badge in direction
      const findNextSelectable = (
        startIndex: number | null,
        direction: 'left' | 'right'
      ): number | null => {
        if (startIndex === null) {
          // Start from edge based on direction
          const edgeIndex = direction === 'left' ? badgeCount - 1 : 0;
          if (isSelectable(edgeIndex)) return edgeIndex;
          // Edge not selectable, find next
          startIndex = edgeIndex;
        }

        let currentIndex = startIndex;
        let attempts = 0;

        while (attempts < badgeCount) {
          // Move in direction
          if (direction === 'left') {
            currentIndex--;
            if (currentIndex < 0) return null; // Reached start, deselect
          } else {
            currentIndex++;
            if (currentIndex >= badgeCount) return null; // Reached end, deselect
          }

          if (isSelectable(currentIndex)) {
            return currentIndex;
          }
          attempts++;
        }

        return null; // No selectable badge found
      };

      if (e.key === 'ArrowLeft') {
        // Navigate left (to previous selectable badge)
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'left'));
      } else if (e.key === 'ArrowRight') {
        // Navigate right (to next selectable badge)
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'right'));
      }

      return true;
    },
    [badgeCount]
  );

  // Clear badge selection when user types or performs other actions
  const clearBadgeSelection = useCallback(() => {
    if (selectedBadgeIndex !== null) {
      setSelectedBadgeIndex(null);
    }
  }, [selectedBadgeIndex]);
  const handleCloseColumnSelector = useCallback(() => {
    // CASE 1: Edit mode with confirmed filter - restore the original pattern
    if (tryRestorePreservedPattern()) return;

    // CASE 2: Edit mode with column selected but no filter yet (was editing from operator selector)
    // Restore back to operator selector state
    if (
      preservedSearchMode &&
      !preservedSearchMode.filterSearch &&
      preservedSearchMode.selectedColumn
    ) {
      const columnName = preservedSearchMode.selectedColumn.field;
      const restoredPattern =
        PatternBuilder.columnWithOperatorSelector(columnName);

      onChange({
        target: { value: restoredPattern },
      } as React.ChangeEvent<HTMLInputElement>);

      setPreservedSearchMode(null);
      return;
    }

    // CASE 3: Normal close (not in edit mode)
    // searchMode is derived, so we close by clearing the value
    if (value.startsWith('#') && !searchMode.selectedColumn) {
      const searchTerm = value.substring(1);
      const exactMatch = findColumn(memoizedColumns, searchTerm);

      if (!exactMatch) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    }
  }, [
    value,
    searchMode.selectedColumn,
    memoizedColumns,
    onClearSearch,
    onChange,
    preservedSearchMode,
    tryRestorePreservedPattern,
  ]);

  const handleCloseOperatorSelector = useCallback(() => {
    // If in edit mode, restore the original pattern instead of clearing
    if (tryRestorePreservedPattern()) return;

    // GUARD: Don't interfere if value is already confirmed (has ##) or in partial join state
    // This prevents this handler from clearing value when other handlers set it correctly
    if (value.includes('##') || searchMode.partialJoin) {
      return;
    }

    // searchMode is derived, so we close by modifying the value
    if (searchMode.selectedColumn) {
      const newValue = buildColumnValue(
        searchMode.selectedColumn.field,
        'plain'
      );
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [
    searchMode.selectedColumn,
    searchMode.partialJoin,
    value,
    onChange,
    onClearSearch,
    tryRestorePreservedPattern,
  ]);

  const handleCloseJoinOperatorSelector = useCallback(() => {
    // If in edit mode, restore the original pattern instead of clearing
    if (tryRestorePreservedPattern()) {
      setCurrentJoinOperator(undefined);
      return;
    }

    // Remove trailing "#" and restore ## marker to confirm the filter
    // Pattern: #field #operator value # → #field #operator value##
    const trimmedValue = value.replace(/\s+#\s*$/, '');

    // Check if this looks like a complete single-condition filter (has field, operator, and value)
    // If so, add ## to confirm it
    const singleConditionMatch = trimmedValue.match(/^#\w+\s+#\w+\s+.+$/);
    if (singleConditionMatch && !trimmedValue.includes('##')) {
      onChange({
        target: { value: trimmedValue + '##' },
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      onChange({
        target: { value: trimmedValue },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [value, onChange, tryRestorePreservedPattern]);

  // Clear all - used by purple badge (column)
  const handleClearAll = useCallback(() => {
    // Clear preserved state to ensure badges disappear
    handleClearPreservedState();

    if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClearSearch, onChange, handleClearPreservedState]);

  // Clear value only - used by gray badge (value)
  // For Between operator, this clears BOTH values (value and valueTo)
  const handleClearValue = useCallback(() => {
    // Get state BEFORE clearing preserved state (closure captures current value)
    const stateToUse = preservedSearchMode || searchMode;

    if (stateToUse.filterSearch) {
      // Get operator from correct location (multi-condition uses conditions array)
      const operator = stateToUse.filterSearch.isMultiCondition
        ? stateToUse.filterSearch.conditions?.[0]?.operator
        : stateToUse.filterSearch.operator;

      // Clear preserved state to ensure badges update correctly
      handleClearPreservedState();

      // Explicitly clear filter since value might not change
      // (when clearing value, there's nothing to filter on yet)
      onFilterSearch?.(null);

      // Keep column and operator, clear value (and valueTo for Between)
      const columnName = stateToUse.filterSearch.field;
      const newValue = PatternBuilder.columnOperator(
        columnName,
        operator || ''
      );
      setFilterValue(newValue, onChange, inputRef, {
        focus: true,
        cursorAtEnd: true,
      });
    } else {
      handleClearPreservedState();
      onFilterSearch?.(null);
      handleClearAll();
    }
  }, [
    searchMode,
    preservedSearchMode,
    onChange,
    inputRef,
    handleClearAll,
    handleClearPreservedState,
    onFilterSearch,
  ]);

  // Clear condition[1] value - used by gray badge (condition[1] value in multi-condition)
  const handleClearCondition1Value = useCallback(() => {
    // Use preserved state if available, otherwise current searchMode
    const stateToUse = preservedSearchMode || searchMode;

    // Clear preserved state to ensure badges update correctly
    handleClearPreservedState();

    if (!stateToUse.filterSearch) {
      handleClearValue();
      return;
    }

    const columnName = stateToUse.filterSearch.field;
    const firstCondition = getFirstCondition(stateToUse.filterSearch);
    const joinOp = getJoinOperator(stateToUse.filterSearch, stateToUse);
    const cond1Op = getConditionOperatorAt(
      stateToUse.filterSearch,
      stateToUse,
      1,
      value
    );

    // Check for multi-column: get condition[1] column from conditions or partialConditions state
    const cond1ColumnField =
      stateToUse.filterSearch.conditions?.[1]?.field ||
      stateToUse.partialConditions?.[1]?.column?.field;

    if (joinOp && (joinOp === 'AND' || joinOp === 'OR') && cond1Op) {
      // Always include condition[1] column in pattern (even if same as first)
      // This ensures the condition[1] column badge is shown consistently
      const col2 = cond1ColumnField || columnName;
      const newValue = PatternBuilder.multiColumnWithOperator(
        columnName,
        firstCondition.operator,
        firstCondition.value,
        joinOp,
        col2,
        cond1Op,
        firstCondition.valueTo // Pass valueTo for Between operator
      );

      setFilterValue(newValue, onChange, inputRef);
    } else {
      // Fallback if missing data
      handleClearValue();
    }
  }, [
    searchMode,
    preservedSearchMode,
    value,
    onChange,
    inputRef,
    handleClearValue,
    handleClearPreservedState,
  ]);

  // Edit condition[1] column - show column selector for condition[1] column (multi-column)
  const handleEditCondition1Column = useCallback(() => {
    // Mark that we're editing condition[1] column for preview
    setEditingSelectorTarget({ conditionIndex: 1, target: 'column' });

    // Use preserved state if already in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (!stateToUse.filterSearch) {
      return;
    }

    const columnName = stateToUse.filterSearch.field;
    const firstCondition = getFirstCondition(stateToUse.filterSearch);
    const joinOp = getJoinOperator(stateToUse.filterSearch, stateToUse);

    if (!joinOp || (joinOp !== 'AND' && joinOp !== 'OR')) {
      return;
    }

    // Use flushSync to ensure preservedSearchMode is set BEFORE value changes
    flushSync(() => {
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }
    });

    // Extract and preserve filter data including condition[1] (operator, value)
    preservedFilterRef.current = extractMultiConditionPreservation(stateToUse);

    // Build pattern to trigger condition[1] column selector: #col1 #op1 val1 [val1To] #join #
    // Use partialMultiColumnWithValueTo to handle Between operators with valueTo
    const newValue = PatternBuilder.partialMultiColumnWithValueTo(
      columnName,
      firstCondition.operator,
      firstCondition.value,
      firstCondition.valueTo,
      joinOp
    );

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode, preservedSearchMode, onChange, inputRef]);

  // ==================== EDIT HANDLERS ====================

  // Edit column - show column selector with all columns
  // Preserve operator and value to restore after column selection
  const handleEditColumn = useCallback(() => {
    // Mark that we're editing condition[0] column for preview
    setEditingSelectorTarget({ conditionIndex: 0, target: 'column' });

    // Use preserved state if already in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    // CASE 1: Column selected but no filter yet (operator selector is open)
    // Preserve the column badge and switch to column selector
    if (!stateToUse.filterSearch && stateToUse.selectedColumn) {
      // Use flushSync to ensure preservedSearchMode is set BEFORE value changes
      flushSync(() => {
        if (!preservedSearchMode) {
          setPreservedSearchMode(searchMode);
        }
      });

      // No filter data to preserve, just open column selector
      const newValue = PatternBuilder.column('');
      setFilterValue(newValue, onChange, inputRef);
      return;
    }

    // CASE 2: No filter and no column - nothing to edit
    if (!stateToUse.filterSearch) {
      return;
    }

    // CASE 3: Has filter data - preserve it for restoration after column selection
    // Use flushSync to ensure preservedSearchMode is set BEFORE value changes
    // This prevents race condition where useSearchState sees isEditMode: false
    flushSync(() => {
      // Save state only if not already preserved (prevent overwriting original state)
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }
    });

    // Extract and preserve filter data from original state
    preservedFilterRef.current = extractMultiConditionPreservation(stateToUse);

    // Set to just # to show all columns in selector
    const newValue = PatternBuilder.column('');

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode, preservedSearchMode, onChange, inputRef]);

  // Edit operator - show operator selector
  const handleEditOperator = useCallback(
    (isSecond: boolean = false) => {
      // Use preserved state if already in edit mode, otherwise use current state
      const stateToUse = preservedSearchMode || searchMode;

      if (!stateToUse.filterSearch) {
        return;
      }

      const columnName = stateToUse.filterSearch.field;

      // Use flushSync to ensure preservedSearchMode is set BEFORE value changes
      // This prevents race condition where useSearchState sees isEditMode: false
      flushSync(() => {
        // Save state only if not already preserved (prevent overwriting original state)
        if (!preservedSearchMode) {
          setPreservedSearchMode(searchMode);
        }
      });

      // Track which condition's operator we're editing (0 or 1)
      setEditingSelectorTarget({
        conditionIndex: isSecond ? 1 : 0,
        target: 'operator',
      });

      // Extract and preserve filter data from original state
      preservedFilterRef.current =
        extractMultiConditionPreservation(stateToUse);

      // Build pattern for operator selector
      let newValue: string;

      // Access from scalable structure
      const firstCond = preservedFilterRef.current?.conditions?.[0];
      const joinOp = preservedFilterRef.current?.joins?.[0];

      if (isSecond && firstCond?.operator && firstCond?.value && joinOp) {
        // For condition[1] operator edit, preserve first condition
        // Always include condition[1] column to trigger operator selector (not column selector)
        const cond1ColField =
          preservedFilterRef.current?.conditions?.[1]?.field ||
          stateToUse.partialConditions?.[1]?.column?.field ||
          columnName; // Fallback to first column if same column filter

        // Build pattern for operator selector, including valueTo if first condition is Between
        // Pattern: #col1 #op1 val1 [val1To] #join #col2 #
        const firstOp = firstCond.operator;
        const firstVal = firstCond.value;
        const firstValTo = firstCond.valueTo;

        if (firstOp === 'inRange' && firstValTo) {
          // First condition is Between - include valueTo
          // Use #to marker to ensure correct badge display
          newValue = `#${columnName} #${firstOp} ${firstVal} #to ${firstValTo} #${joinOp.toLowerCase()} #${cond1ColField} #`;
        } else {
          newValue = PatternBuilder.multiColumnPartial(
            columnName,
            firstOp,
            firstVal,
            joinOp,
            cond1ColField
          );
        }
      } else {
        // For first operator edit, just: #column #
        newValue = PatternBuilder.columnWithOperatorSelector(columnName);
      }

      setFilterValue(newValue, onChange, inputRef);
    },
    [searchMode, preservedSearchMode, onChange, inputRef]
  );

  // Edit join operator - show join operator selector
  const handleEditJoin = useCallback(() => {
    // Use preserved state if already in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (!stateToUse.filterSearch) {
      return;
    }

    const columnName = stateToUse.filterSearch.field;
    const firstCondition = getFirstCondition(stateToUse.filterSearch);
    const joinOp = getJoinOperator(stateToUse.filterSearch, stateToUse);

    // Use flushSync to ensure preservedSearchMode is set BEFORE value changes
    // This prevents race condition where useSearchState sees isEditMode: false
    flushSync(() => {
      // Save state only if not already preserved (prevent overwriting original state)
      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }
    });

    // Extract and preserve filter data from original state
    preservedFilterRef.current = extractMultiConditionPreservation(stateToUse);

    // Set current join operator state for selector highlighting
    if (joinOp && (joinOp === 'AND' || joinOp === 'OR')) {
      setCurrentJoinOperator(joinOp);
    }

    // Set to #col #op value # to trigger join selector
    const newValue = PatternBuilder.withJoinSelector(
      columnName,
      firstCondition.operator,
      firstCondition.value,
      firstCondition.valueTo // Pass valueTo for Between operators
    );

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode, preservedSearchMode, onChange, inputRef]);

  // Edit value - INLINE EDITING: Badge itself becomes editable
  const handleEditValue = useCallback(() => {
    // Use preserved state if in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (!stateToUse.filterSearch) {
      return;
    }

    const currentValue = stateToUse.filterSearch.value;

    // NEW: Check if any selector is currently open OR if there's partial multi-column state
    // When user clicks value badge while selector is open or during multi-column input, we need to:
    // 1. Save the current pattern (to restore state after edit)
    // 2. Close the selector / preserve partial state by changing to confirmed pattern
    // 3. Enter inline edit mode
    const isSelectorOpen =
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector;

    // Also check for partial multi-column state (no selector open but has partial data)
    // This happens when user is typing value for condition[1]
    const hasPartialMultiColumn =
      searchMode.partialJoin ||
      searchMode.partialConditions?.[1]?.column ||
      searchMode.partialConditions?.[1]?.operator;

    if ((isSelectorOpen || hasPartialMultiColumn) && !preservedSearchMode) {
      // Determine which selector is open or if it's partial state for restoration later
      const selectorType: 'column' | 'operator' | 'join' | 'partial' =
        searchMode.showColumnSelector
          ? 'column'
          : searchMode.showOperatorSelector
            ? 'operator'
            : searchMode.showJoinOperatorSelector
              ? 'join'
              : 'partial'; // No selector open but has partial multi-column state

      // Save current pattern for restoration after inline edit completes
      interruptedSelectorRef.current = {
        type: selectorType,
        originalPattern: value,
      };

      // IMPORTANT: Preserve current searchMode BEFORE changing pattern
      // This keeps all badges visible (including join badge and condition[1] column)
      // while the selector is closed and inline edit is active
      setPreservedSearchMode(searchMode);

      // Build confirmed pattern to close the selector
      const filter = stateToUse.filterSearch;
      const columnName = filter.field;
      let confirmedPattern: string;

      if (filter.valueTo) {
        // Between operator
        // Use #to marker to ensure correct badge display
        confirmedPattern = `#${columnName} #${filter.operator} ${filter.value} #to ${filter.valueTo}##`;
      } else {
        confirmedPattern = `#${columnName} #${filter.operator} ${filter.value}##`;
      }

      // Close selector by setting confirmed pattern
      // Note: Badges are rendered from preservedSearchMode, so they stay visible
      onChange({
        target: { value: confirmedPattern },
      } as React.ChangeEvent<HTMLInputElement>);

      // Enter inline editing mode
      setEditingBadge({
        conditionIndex: 0,
        field: 'value',
        value: currentValue,
      });
      return;
    }

    // If we're in edit mode (modal open), restore the original pattern first
    if (preservedSearchMode && preservedSearchMode.filterSearch?.isConfirmed) {
      // Rebuild the confirmed pattern to close any open modal
      const filter = preservedSearchMode.filterSearch;
      const restoredPattern = restoreConfirmedPattern(filter);

      onChange({
        target: { value: restoredPattern },
      } as React.ChangeEvent<HTMLInputElement>);

      setPreservedSearchMode(null);
    }

    // Enter inline editing mode
    setEditingBadge({
      conditionIndex: 0,
      field: 'value',
      value: currentValue,
    });
  }, [searchMode, preservedSearchMode, onChange, value]);

  // Edit condition[1] value in multi-condition filter - INLINE EDITING
  const handleEditCondition1Value = useCallback(() => {
    // Use preserved state if in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (
      !stateToUse.filterSearch ||
      !stateToUse.filterSearch.isMultiCondition ||
      !stateToUse.filterSearch.conditions ||
      stateToUse.filterSearch.conditions.length < 2
    ) {
      return;
    }

    const secondCond = stateToUse.filterSearch.conditions[1];

    // If we're in edit mode (modal open), restore the original pattern first
    if (preservedSearchMode && preservedSearchMode.filterSearch?.isConfirmed) {
      // Rebuild the confirmed pattern to close any open modal
      const filter = preservedSearchMode.filterSearch;
      const restoredPattern = restoreConfirmedPattern(filter);

      onChange({
        target: { value: restoredPattern },
      } as React.ChangeEvent<HTMLInputElement>);

      setPreservedSearchMode(null);
    }

    // Enter inline editing mode for condition[1] value
    setEditingBadge({
      conditionIndex: 1,
      field: 'value',
      value: secondCond.value,
    });
  }, [searchMode, preservedSearchMode, onChange]);

  // Edit "to" value in Between operator (first condition) - INLINE EDITING
  const handleEditValueTo = useCallback(() => {
    // Use preserved state if in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (!stateToUse.filterSearch) {
      return;
    }

    // For multi-condition, get valueTo from first condition
    // For single-condition, get valueTo directly from filterSearch
    const valueTo = stateToUse.filterSearch.isMultiCondition
      ? stateToUse.filterSearch.conditions?.[0]?.valueTo
      : stateToUse.filterSearch.valueTo;

    if (!valueTo) return;

    // IMPORTANT: Preserve current state BEFORE entering inline edit mode
    // This ensures handleInlineEditComplete has access to original state
    if (!preservedSearchMode) {
      setPreservedSearchMode(stateToUse);
    }

    // Enter inline editing mode for "to" value
    setEditingBadge({
      conditionIndex: 0,
      field: 'valueTo',
      value: valueTo,
    });
  }, [searchMode, preservedSearchMode]);

  // Edit "to" value in Between operator (condition[1]) - INLINE EDITING
  const handleEditCondition1ValueTo = useCallback(() => {
    // Use preserved state if in edit mode, otherwise use current state
    const stateToUse = preservedSearchMode || searchMode;

    if (
      !stateToUse.filterSearch ||
      !stateToUse.filterSearch.isMultiCondition ||
      !stateToUse.filterSearch.conditions ||
      stateToUse.filterSearch.conditions.length < 2
    ) {
      return;
    }

    const secondCond = stateToUse.filterSearch.conditions[1];

    if (!secondCond.valueTo) return;

    // IMPORTANT: Preserve current state BEFORE entering inline edit mode
    // This ensures handleInlineEditComplete has access to original state
    if (!preservedSearchMode) {
      setPreservedSearchMode(stateToUse);
    }

    // Enter inline editing mode for condition[1]'s "to" value
    setEditingBadge({
      conditionIndex: 1,
      field: 'valueTo',
      value: secondCond.valueTo,
    });
  }, [searchMode, preservedSearchMode]);

  // Scalable handler for editing value badges at any condition index
  // This enables inline editing for N-condition support (condition 2, 3, 4, etc.)
  const handleEditValueN = useCallback(
    (conditionIndex: number, target: 'value' | 'valueTo') => {
      // Delegate to existing handlers for condition 0 and 1
      if (conditionIndex === 0) {
        if (target === 'value') {
          handleEditValue();
        } else {
          handleEditValueTo();
        }
        return;
      }
      if (conditionIndex === 1) {
        if (target === 'value') {
          handleEditCondition1Value();
        } else {
          handleEditCondition1ValueTo();
        }
        return;
      }

      // For condition N (N >= 2): similar logic to handleEditCondition1Value
      const stateToUse = preservedSearchMode || searchMode;

      if (
        !stateToUse.filterSearch ||
        !stateToUse.filterSearch.isMultiCondition ||
        !stateToUse.filterSearch.conditions ||
        stateToUse.filterSearch.conditions.length <= conditionIndex
      ) {
        return;
      }

      const conditionN = stateToUse.filterSearch.conditions[conditionIndex];
      const valueToEdit =
        target === 'value' ? conditionN.value : conditionN.valueTo;

      if (!valueToEdit) return;

      // Preserve current state for inline edit completion
      if (!preservedSearchMode) {
        setPreservedSearchMode(stateToUse);
      }

      // If we're in edit mode (modal open), restore the confirmed pattern first
      if (
        preservedSearchMode &&
        preservedSearchMode.filterSearch?.isConfirmed
      ) {
        const filter = preservedSearchMode.filterSearch;
        const restoredPattern = restoreConfirmedPattern(filter);

        onChange({
          target: { value: restoredPattern },
        } as React.ChangeEvent<HTMLInputElement>);

        setPreservedSearchMode(null);
      }

      // Enter inline editing mode for condition[N]
      setEditingBadge({
        conditionIndex,
        field: target,
        value: valueToEdit,
      });
    },
    [
      searchMode,
      preservedSearchMode,
      handleEditValue,
      handleEditValueTo,
      handleEditCondition1Value,
      handleEditCondition1ValueTo,
      onChange,
    ]
  );

  // Handle inline value change (user typing in inline input)
  const handleInlineValueChange = useCallback((newValue: string) => {
    setEditingBadge(prev => (prev ? { ...prev, value: newValue } : null));
  }, []);

  // Handle inline edit complete (Enter/Escape/Blur)
  // finalValue is passed directly from Badge to avoid race condition with state
  const handleInlineEditComplete = useCallback(
    (finalValue?: string) => {
      // Use preservedSearchMode for reliable state during inline editing
      // During inline edit, searchMode may change as user types, but preservedSearchMode keeps original state
      const stateToUse = preservedSearchMode || searchMode;

      if (!editingBadge || !stateToUse.filterSearch) {
        setEditingBadge(null);
        return;
      }

      // Use finalValue if provided, otherwise fallback to state value
      const valueToUse =
        finalValue !== undefined ? finalValue : editingBadge.value;

      // If value is empty, treat it as clear action
      if (!valueToUse || valueToUse.trim() === '') {
        setEditingBadge(null);
        // Clear interrupted selector ref since we're clearing the value
        interruptedSelectorRef.current = null;

        const columnName = stateToUse.filterSearch.field;
        const operator = stateToUse.filterSearch.operator;

        // Clear based on which badge was being edited (using conditionIndex and field)
        const isFirstCondition = editingBadge.conditionIndex === 0;
        const isValueField = editingBadge.field === 'value';
        const isValueToField = editingBadge.field === 'valueTo';

        if (isFirstCondition && isValueField) {
          // Clearing first condition "from" value - clear entire filter
          handleClearValue();
          setSelectedBadgeIndex(null); // Clear selection
        } else if (isFirstCondition && isValueToField) {
          // Clearing "to" value in Between - transition to inline editing mode for first value badge
          // User expectation: DELETE on valueTo badge -> edit first value badge [col][Between][value|]
          const fromValue = stateToUse.filterSearch.value;
          if (fromValue) {
            // Build confirmed pattern with just the first value (no valueTo)
            // This will show [col][Between][value] badge
            const newPattern = `#${columnName} #${operator} ${fromValue}##`;
            onChange({
              target: { value: newPattern },
            } as React.ChangeEvent<HTMLInputElement>);

            // Update preservedSearchMode to remove valueTo
            // This ensures the [to][xxx] badge is not rendered during firstValue edit
            if (preservedSearchMode?.filterSearch) {
              if (
                preservedSearchMode.filterSearch.isMultiCondition &&
                preservedSearchMode.filterSearch.conditions
              ) {
                // Multi-condition: update first condition's valueTo
                const updatedConditions = [
                  ...preservedSearchMode.filterSearch.conditions,
                ];
                updatedConditions[0] = {
                  ...updatedConditions[0],
                  valueTo: undefined,
                };
                setPreservedSearchMode({
                  ...preservedSearchMode,
                  filterSearch: {
                    ...preservedSearchMode.filterSearch,
                    valueTo: undefined,
                    conditions: updatedConditions,
                  },
                });
              } else {
                // Single-condition: update valueTo directly
                setPreservedSearchMode({
                  ...preservedSearchMode,
                  filterSearch: {
                    ...preservedSearchMode.filterSearch,
                    valueTo: undefined,
                  },
                });
              }
            }

            // Transition to inline editing mode for first value badge
            // Use setTimeout to ensure pattern is applied before setting edit mode
            setTimeout(() => {
              setEditingBadge({
                conditionIndex: 0,
                field: 'value',
                value: fromValue,
              });
            }, 10);
            return;
          }
          // If no fromValue, fall through to handleClearValue
        } else if (editingBadge.conditionIndex === 1 && isValueField) {
          // Clearing condition[1] "from" value - clear condition[1] only
          handleClearCondition1Value();
          setSelectedBadgeIndex(null); // Clear selection
        } else if (editingBadge.conditionIndex === 1 && isValueToField) {
          // Clearing condition[1] "to" value in Between - transition to edit condition[1] value
          // Similar to firstValueTo handling: DELETE on valueTo → edit value badge
          if (
            stateToUse.filterSearch.isMultiCondition &&
            stateToUse.filterSearch.conditions?.length === 2
          ) {
            const cond1 = stateToUse.filterSearch.conditions[0];
            const cond2 = stateToUse.filterSearch.conditions[1];
            const join = stateToUse.filterSearch.joinOperator || 'AND';
            const col1 = cond1.field || columnName;
            const col2 = cond2.field || columnName;
            const isMultiColumn = stateToUse.filterSearch.isMultiColumn;
            const cond1Value = cond2.value;

            if (cond1Value) {
              // Build confirmed pattern with condition[1]'s value only (no valueTo)
              // Use #to marker for first condition if it has valueTo
              let newPattern: string;
              const firstPart = cond1.valueTo
                ? `#${col1} #${cond1.operator} ${cond1.value} #to ${cond1.valueTo}`
                : `#${col1} #${cond1.operator} ${cond1.value}`;

              if (isMultiColumn) {
                newPattern = `${firstPart} #${join.toLowerCase()} #${col2} #${cond2.operator} ${cond1Value}##`;
              } else {
                newPattern = `${firstPart} #${join.toLowerCase()} #${cond2.operator} ${cond1Value}##`;
              }

              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);

              // Update preservedSearchMode to remove valueTo from condition[1]
              // This ensures the [to][700] badge is not rendered during condition[1] value edit
              if (preservedSearchMode?.filterSearch?.conditions) {
                const updatedConditions = [
                  ...preservedSearchMode.filterSearch.conditions,
                ];
                updatedConditions[1] = {
                  ...updatedConditions[1],
                  valueTo: undefined,
                };
                setPreservedSearchMode({
                  ...preservedSearchMode,
                  filterSearch: {
                    ...preservedSearchMode.filterSearch,
                    conditions: updatedConditions,
                  },
                });
              }

              // Transition to inline editing mode for condition[1]'s value badge
              setTimeout(() => {
                setEditingBadge({
                  conditionIndex: 1,
                  field: 'value',
                  value: cond1Value,
                });
              }, 10);
              setSelectedBadgeIndex(null); // Clear selection to prevent auto-selecting previous badge
              return;
            }
          }
          handleClearCondition1Value();
        }

        setSelectedBadgeIndex(null); // Clear selection to prevent auto-selecting previous badge
        // Ensure focus returns to search input after clearing
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 50);
        return;
      }

      const columnName = stateToUse.filterSearch.field;
      const operator = stateToUse.filterSearch.operator;

      // CASE 1: Single-condition filter
      if (!stateToUse.filterSearch.isMultiCondition) {
        let newPattern: string;

        // Check if this is a Between operator
        if (operator === 'inRange') {
          // Check if valueToUse contains a dash pattern like "500-600"
          // This allows user to type both values in one badge
          const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);

          // Use index-based check: conditionIndex === 0 && field === 'value'
          const isEditingFirstValue =
            editingBadge.conditionIndex === 0 && editingBadge.field === 'value';
          const isEditingFirstValueTo =
            editingBadge.conditionIndex === 0 &&
            editingBadge.field === 'valueTo';

          if (dashMatch && isEditingFirstValue) {
            // User typed "500-600" format - split into fromVal and toVal
            const [, fromVal, toVal] = dashMatch;
            const trimmedFrom = fromVal.trim();
            const trimmedTo = toVal.trim();

            if (trimmedFrom && trimmedTo) {
              // Both values provided - confirm the filter
              newPattern = `#${columnName} #${operator} ${trimmedFrom} #to ${trimmedTo}##`;
              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);
              setEditingBadge(null);
              setPreservedSearchMode(null);
              setTimeout(() => {
                inputRef?.current?.focus();
              }, 50);
              return;
            }
          }

          if (stateToUse.filterSearch.valueTo) {
            // Editing Between operator that has both values
            if (isEditingFirstValue) {
              // Editing "from" value - preserve "to" value
              newPattern = `#${columnName} #${operator} ${valueToUse} #to ${stateToUse.filterSearch.valueTo}##`;
            } else if (isEditingFirstValueTo) {
              // Editing "to" value - preserve "from" value
              newPattern = `#${columnName} #${operator} ${stateToUse.filterSearch.value} #to ${valueToUse}##`;
            } else {
              // Fallback
              newPattern = `#${columnName} #${operator} ${valueToUse}##`;
            }
          } else if (isEditingFirstValue) {
            // Between operator without valueTo (cleared or never set)
            // When editing first value and pressing ENTER: create [value][to] badge, wait for valueTo
            // Pattern: #col #inRange value #to (no ##, ready for valueTo input)
            newPattern = `#${columnName} #${operator} ${valueToUse} #to `;
            onChange({
              target: { value: newPattern },
            } as React.ChangeEvent<HTMLInputElement>);
            setEditingBadge(null);
            // Focus input at end to wait for valueTo input
            setTimeout(() => {
              if (inputRef?.current) {
                inputRef.current.focus();
                const len = newPattern.length;
                inputRef.current.setSelectionRange(len, len);
              }
            }, 50);
            return;
          } else {
            // Fallback for Between without valueTo
            newPattern = `#${columnName} #${operator} ${valueToUse}##`;
          }
        } else {
          // Normal operator with single value
          newPattern = `#${columnName} #${operator} ${valueToUse}##`;
        }

        // Check if we need to restore a selector that was interrupted
        if (interruptedSelectorRef.current) {
          const interrupted = interruptedSelectorRef.current;
          // Use #to marker for Between operator to ensure correct badge display
          const valuePart =
            operator === 'inRange' && stateToUse.filterSearch.valueTo
              ? `${valueToUse} #to ${stateToUse.filterSearch.valueTo}`
              : valueToUse;

          // Parse original pattern to extract join operator and condition[1] column if present
          // Pattern formats:
          // - "#col #op val #and #" (column selector after join)
          // - "#col #op val #" (join selector)
          // - "#col1 #op val #and #col2 #" (operator selector for col2)

          if (interrupted.type === 'column') {
            // Column selector: pattern ends with "#join #"
            const joinMatch =
              interrupted.originalPattern.match(/#(and|or)\s*#\s*$/i);
            if (joinMatch) {
              const joinOp = joinMatch[1].toLowerCase();
              newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #`;
            }
          } else if (interrupted.type === 'join') {
            // Join selector: pattern ends with "#" (single trailing hash)
            newPattern = `#${columnName} #${operator} ${valuePart} #`;
          } else if (interrupted.type === 'operator') {
            // Operator selector: could be for condition[0] or condition[1] operator (multi-column)
            // Pattern for condition[1] operator: "#col1 #op val #and #col2 #"
            const multiColMatch = interrupted.originalPattern.match(
              /#(and|or)\s+#([^\s#]+)\s*#\s*$/i
            );
            if (multiColMatch) {
              // Multi-column operator selector: restore with condition[1] column
              const joinOp = multiColMatch[1].toLowerCase();
              const col2 = multiColMatch[2];
              newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #${col2} #`;
            }
            // For first operator selector, just use confirmed pattern (already set)
          } else if (interrupted.type === 'partial') {
            // Partial multi-column state: no selector open but has partial data
            // Pattern format: "#col1 #op1 val1 #join #col2 #op2 val2?"
            // Match the partial state parts from original pattern
            const partialMatch = interrupted.originalPattern.match(
              /#(and|or)\s+#([^\s#]+)\s+#([^\s#]+)\s*(.*)$/i
            );
            if (partialMatch) {
              const joinOp = partialMatch[1].toLowerCase();
              const col2 = partialMatch[2];
              const op2 = partialMatch[3];
              const val2Part = partialMatch[4]?.trim() || '';
              newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #${col2} #${op2} ${val2Part}`;
            }
          }

          interruptedSelectorRef.current = null;
          // Clear preserved state since we're restoring the selector pattern
          setPreservedSearchMode(null);
        }

        onChange({
          target: { value: newPattern },
        } as React.ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);

        // Clear preserved state after inline edit completes (if not already cleared)
        setPreservedSearchMode(null);

        // Ensure focus returns to search input after edit completes
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 50);
        return;
      }

      // CASE 2: Multi-condition filter (unified N-condition handling)
      const conditions = stateToUse.filterSearch.conditions!;
      const joins = stateToUse.filterSearch.joins || [
        stateToUse.filterSearch.joinOperator || 'AND',
      ];
      const isMultiColumn = stateToUse.filterSearch.isMultiColumn;
      const isEditingValue = editingBadge.field === 'value';
      const isEditingValueTo = editingBadge.field === 'valueTo';

      // UNIFIED N-CONDITION HANDLING: Use buildNConditions for ALL multi-condition edits
      // Build updated conditions array with new value at edited index
      const updatedConditions = conditions.map((cond, idx) => {
        if (idx === editingBadge.conditionIndex) {
          let newValue = isEditingValue ? valueToUse : cond.value;
          let newValueTo = isEditingValueTo ? valueToUse : cond.valueTo;

          // Handle dash pattern for Between operator
          if (cond.operator === 'inRange' && isEditingValue) {
            const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
            if (dashMatch) {
              const [, fromVal, toVal] = dashMatch;
              if (fromVal.trim() && toVal.trim()) {
                newValue = fromVal.trim();
                newValueTo = toVal.trim();
              }
            }
          }

          return {
            field: cond.field || '',
            operator: cond.operator || '',
            value: newValue || '',
            valueTo: newValueTo,
          };
        }
        return {
          field: cond.field || '',
          operator: cond.operator || '',
          value: cond.value || '',
          valueTo: cond.valueTo,
        };
      });

      const newPattern = PatternBuilder.buildNConditions(
        updatedConditions,
        joins,
        isMultiColumn || false,
        columnName,
        { confirmed: true }
      );

      onChange({
        target: { value: newPattern },
      } as React.ChangeEvent<HTMLInputElement>);
      setEditingBadge(null);

      // Clear preserved state after inline edit completes successfully
      setPreservedSearchMode(null);

      // Ensure focus returns to search input after edit completes
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 50);
    },
    [
      editingBadge,
      searchMode,
      preservedSearchMode,
      onChange,
      handleClearValue,
      handleClearCondition1Value,
      inputRef,
    ]
  );

  // Handle Ctrl+E/Ctrl+Shift+E navigation during inline edit - save current value and move to next badge
  // direction: 'left' for Ctrl+E, 'right' for Ctrl+Shift+E
  const handleNavigateEdit = useCallback(
    (direction: 'left' | 'right') => {
      // Get current value from editingBadge state
      const currentValue = editingBadge?.value;

      // Complete the current inline edit first
      if (editingBadge) {
        handleInlineEditComplete(currentValue);
      }

      // After a short delay to let state settle, trigger next badge edit
      setTimeout(() => {
        if (badgeCount === 0) return;

        let targetIndex: number;

        if (selectedBadgeIndex === null) {
          // No badge selected - start from edge based on direction
          targetIndex = direction === 'left' ? badgeCount - 1 : 0;
        } else {
          // Badge already selected - move in specified direction
          if (direction === 'left') {
            targetIndex = selectedBadgeIndex - 1;
            if (targetIndex < 0) targetIndex = badgeCount - 1; // Wrap to rightmost
          } else {
            targetIndex = selectedBadgeIndex + 1;
            if (targetIndex >= badgeCount) targetIndex = 0; // Wrap to leftmost
          }
        }

        // Find an editable badge starting from targetIndex going in direction
        let attempts = 0;
        while (attempts < badgeCount) {
          const badge = badgesRef.current[targetIndex];
          if (badge?.canEdit && badge?.onEdit) {
            // Found editable badge - select and edit it
            setSelectedBadgeIndex(targetIndex);
            badge.onEdit();
            return;
          }
          // Not editable, try next badge in direction
          if (direction === 'left') {
            targetIndex--;
            if (targetIndex < 0) targetIndex = badgeCount - 1;
          } else {
            targetIndex++;
            if (targetIndex >= badgeCount) targetIndex = 0;
          }
          attempts++;
        }
      }, 50);
    },
    [editingBadge, handleInlineEditComplete, selectedBadgeIndex, badgeCount]
  );

  // Handle Ctrl+I from Badge component during inline edit - exit edit and focus main input
  const handleFocusInputFromBadge = useCallback(() => {
    // Get current value from editingBadge state and complete the edit
    const currentValue = editingBadge?.value;
    if (editingBadge) {
      handleInlineEditComplete(currentValue);
    }

    // Clear badge selection
    if (selectedBadgeIndex !== null) {
      setSelectedBadgeIndex(null);
    }

    // After a short delay to let state settle, restore pattern and focus input
    setTimeout(() => {
      // If in edit mode (preservedSearchMode exists), restore the original pattern
      if (preservedSearchMode?.filterSearch) {
        const filter = preservedSearchMode.filterSearch;
        const columnName = filter.field;

        let restoredPattern: string;

        if (filter.isConfirmed) {
          // Confirmed filter (has value) - restore full pattern with ##
          restoredPattern = restoreConfirmedPattern(filter);
        } else {
          // Unconfirmed filter (no value yet) - restore pattern without ##
          if (filter.operator && filter.isExplicitOperator) {
            restoredPattern = `#${columnName} #${filter.operator} `;
          } else if (filter.operator) {
            restoredPattern = `#${columnName} #${filter.operator} `;
          } else {
            restoredPattern = `#${columnName} `;
          }
        }

        onChange({
          target: { value: restoredPattern },
        } as React.ChangeEvent<HTMLInputElement>);

        setPreservedSearchMode(null);
        preservedFilterRef.current = null;
      } else {
        // No preserved mode - just close selectors normally
        if (searchMode.showColumnSelector) {
          handleCloseColumnSelector();
        }
        if (searchMode.showOperatorSelector) {
          handleCloseOperatorSelector();
        }
        if (searchMode.showJoinOperatorSelector) {
          handleCloseJoinOperatorSelector();
        }
      }

      // Focus input
      inputRef?.current?.focus();
    }, 50);
  }, [
    editingBadge,
    handleInlineEditComplete,
    selectedBadgeIndex,
    preservedSearchMode,
    onChange,
    searchMode.showColumnSelector,
    searchMode.showOperatorSelector,
    searchMode.showJoinOperatorSelector,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    inputRef,
  ]);

  // Wrap onChange to reconstruct multi-condition pattern when confirming first value edit
  const handleOnChangeWithReconstruction = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Pattern: #field #op1 val1 #join #op2 val2## → user types → #field #op1 val1 #join #op2 newValue
      // NOTE: Skip this when building condition 2+ (activeConditionIndex >= 2) to avoid losing partial condition
      const isBuildingConditionN =
        searchMode.activeConditionIndex !== undefined &&
        searchMode.activeConditionIndex >= 2;
      const hasPartialConditionsBeyondConfirmed =
        searchMode.partialConditions &&
        searchMode.partialConditions.length >
          (searchMode.filterSearch?.conditions?.length ?? 0);

      if (
        searchMode.isFilterMode &&
        searchMode.filterSearch?.isConfirmed &&
        searchMode.filterSearch?.isMultiCondition &&
        searchMode.filterSearch?.conditions &&
        searchMode.filterSearch.conditions.length >= 2 &&
        inputValue.trim() !== '' &&
        inputValue.trim() !== '#' &&
        !preservedFilterRef.current && // Not already in edit mode
        !isBuildingConditionN && // Not building condition 2+
        !hasPartialConditionsBeyondConfirmed // No partial conditions beyond confirmed
      ) {
        const columnName = searchMode.filterSearch.field;
        const firstCondition = searchMode.filterSearch.conditions[0];
        const secondCond = searchMode.filterSearch.conditions[1];
        const joinOp = searchMode.filterSearch.joinOperator || 'AND';

        // Create modified searchMode with condition[1] value hidden (empty string)
        // This will hide the condition[1] value badge during edit
        const modifiedSearchMode: EnhancedSearchState = {
          ...searchMode,
          filterSearch: {
            ...searchMode.filterSearch,
            conditions: [
              firstCondition,
              {
                ...secondCond,
                value: '', // Empty value will hide the badge
              },
            ],
          },
        };

        setPreservedSearchMode(modifiedSearchMode);

        // Preserve first condition while editing condition[1] value
        preservedFilterRef.current = {
          conditions: [
            {
              field: columnName,
              operator: firstCondition.operator,
              value: firstCondition.value,
            },
            { operator: secondCond.operator, value: secondCond.value },
          ],
          joins: [joinOp],
        };

        // Build pattern for editing condition[1] value
        // Remove ## marker and replace condition[1] value with new input
        const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp.toLowerCase()} #${secondCond.operator} ${inputValue}`;

        onChange({
          ...e,
          target: { ...e.target, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        return;
      }

      // Detect when input becomes empty while editing condition[1] value in partial multi-condition
      // Pattern: #field #op1 val1 #join #op2 val2 (val2 being edited in input)
      // When input is emptied → should become: #field #op1 val1 #join #
      if (
        inputValue.trim() === '' &&
        preservedFilterRef.current?.conditions?.[0]?.field &&
        preservedFilterRef.current?.joins?.[0] &&
        preservedFilterRef.current?.conditions?.[1]?.operator &&
        preservedFilterRef.current?.conditions?.[0]?.value &&
        preservedFilterRef.current?.conditions?.[0]?.value.trim() !== ''
      ) {
        // Input is now empty while in partial multi-condition with condition[1] operator
        // Remove condition[1] operator and add trailing # to open operator selector
        const columnName = preservedFilterRef.current.conditions[0].field!;
        const operator = preservedFilterRef.current.conditions[0].operator;
        const firstValue = preservedFilterRef.current.conditions[0].value!;
        const joinOp = preservedFilterRef.current.joins[0].toLowerCase();

        // Create pattern without condition[1] operator but with trailing # for operator selector
        const newValue = `#${columnName} #${operator} ${firstValue} #${joinOp} #`;

        onChange({
          ...e,
          target: { ...e.target, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        // Clear preserved filter after cleanup
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        return;
      }

      // Detect confirmation of value edit (## marker added)
      if (
        inputValue.endsWith('##') &&
        preservedFilterRef.current?.conditions?.[1]?.operator &&
        preservedFilterRef.current?.conditions?.[1]?.value
      ) {
        // Remove ## marker
        const baseValue = inputValue.slice(0, -2);

        // Check if baseValue already contains the join operator
        // If yes → editing condition[1] value (full pattern present)
        // If no  → editing first value (only first condition present)
        const joinPattern = `#${preservedFilterRef.current.joins?.[0]?.toLowerCase()}`;
        const hasJoinInBase = baseValue.includes(joinPattern);

        if (hasJoinInBase) {
          // Editing condition[1] value - baseValue already contains the full pattern
          // Don't reconstruct, just pass through
          onChange(e);
        } else {
          // Editing first value - reconstruct full multi-condition pattern
          // Check for multi-column filter
          const cond1Col = preservedFilterRef.current.conditions?.[1]?.field;
          const isMultiColumn =
            preservedFilterRef.current.isMultiColumn && cond1Col;

          // Build condition[1] part, handling Between (inRange) with valueTo
          const cond1Op = preservedFilterRef.current.conditions![1].operator!;
          const cond1Val = preservedFilterRef.current.conditions![1].value!;
          const cond1ValTo =
            preservedFilterRef.current.conditions?.[1]?.valueTo;

          let secondCondPart: string;
          if (cond1Op === 'inRange' && cond1ValTo) {
            // Condition[1] is Between with valueTo
            secondCondPart = `#${cond1Op} ${cond1Val} #to ${cond1ValTo}`;
          } else {
            secondCondPart = `#${cond1Op} ${cond1Val}`;
          }

          let fullPattern: string;
          if (isMultiColumn) {
            // Multi-column: include condition[1] column field
            fullPattern = `${baseValue} ${joinPattern} #${cond1Col} ${secondCondPart}##`;
          } else {
            // Same-column: no condition[1] column field
            fullPattern = `${baseValue} ${joinPattern} ${secondCondPart}##`;
          }

          // Call parent onChange with reconstructed pattern
          onChange({
            ...e,
            target: { ...e.target, value: fullPattern },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // Normal onChange - pass through
        onChange(e);
      }
    },
    [onChange, searchMode, setPreservedSearchMode]
  );

  const { handleInputKeyDown } = useSearchKeyboard({
    value,
    searchMode,
    onChange: handleOnChangeWithReconstruction, // Use wrapped onChange
    onKeyDown,
    onClearSearch,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    onClearPreservedState: handleClearPreservedState,
    onEditValue: handleEditValue,
    onEditValueTo: handleEditValueTo,
    // Scalable handler for N-condition support
    editConditionValue: (
      conditionIndex: number,
      target: 'value' | 'valueTo'
    ) => {
      if (conditionIndex === 1) {
        if (target === 'value') {
          handleEditCondition1Value();
        } else {
          handleEditCondition1ValueTo();
        }
      }
    },
  });

  // Handler for Ctrl+I to focus input, clear badge selection, and close selectors
  const handleFocusInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== 'i') {
        return false;
      }

      e.preventDefault();
      e.stopPropagation();

      // Clear badge selection
      if (selectedBadgeIndex !== null) {
        setSelectedBadgeIndex(null);
      }

      // If in edit mode (preservedSearchMode exists), restore the original pattern
      if (preservedSearchMode?.filterSearch) {
        const filter = preservedSearchMode.filterSearch;
        const columnName = filter.field;

        let restoredPattern: string;

        if (filter.isConfirmed) {
          // Confirmed filter (has value) - restore full pattern with ##
          restoredPattern = restoreConfirmedPattern(filter);
        } else {
          // Unconfirmed filter (no value yet) - restore pattern without ##
          // This handles the case: [Column] [Operator] with no value
          if (filter.operator && filter.isExplicitOperator) {
            restoredPattern = `#${columnName} #${filter.operator} `;
          } else if (filter.operator) {
            restoredPattern = `#${columnName} #${filter.operator} `;
          } else {
            restoredPattern = `#${columnName} `;
          }
        }

        onChange({
          target: { value: restoredPattern },
        } as React.ChangeEvent<HTMLInputElement>);

        setPreservedSearchMode(null);
        preservedFilterRef.current = null;
      } else {
        // No preserved mode - just close selectors normally
        // Only call close handlers if there's an open selector (to avoid state changes)
        if (searchMode.showColumnSelector) {
          handleCloseColumnSelector();
        }
        if (searchMode.showOperatorSelector) {
          handleCloseOperatorSelector();
        }
        if (searchMode.showJoinOperatorSelector) {
          handleCloseJoinOperatorSelector();
        }
      }

      // Focus input
      inputRef?.current?.focus();

      return true;
    },
    [
      selectedBadgeIndex,
      inputRef,
      preservedSearchMode,
      searchMode.showColumnSelector,
      searchMode.showOperatorSelector,
      searchMode.showJoinOperatorSelector,
      onChange,
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
    ]
  );

  // Wrap keyboard handler to include badge navigation
  const wrappedKeyDownHandler = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Check for focus input (Ctrl+I)
      if (handleFocusInput(e)) {
        return;
      }
      // Check for badge edit (Ctrl+E)
      if (handleBadgeEdit(e)) {
        return;
      }
      // Check for badge delete (Ctrl+D)
      if (handleBadgeDelete(e)) {
        return;
      }
      // Check for badge navigation (Ctrl+Arrow)
      if (handleBadgeNavigation(e)) {
        return;
      }
      // Otherwise, delegate to normal keyboard handler
      handleInputKeyDown(e);
    },
    [
      handleFocusInput,
      handleBadgeEdit,
      handleBadgeDelete,
      handleBadgeNavigation,
      handleInputKeyDown,
    ]
  );

  // Wrap input change handler to clear badge selection when user types
  const wrappedInputChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear badge selection when user starts typing
      clearBadgeSelection();
      // Delegate to original handler
      handleInputChange(e);
    },
    [clearBadgeSelection, handleInputChange]
  );

  const searchTerm = useMemo(() => {
    // For condition[1] column selection, extract search term after #and/or #
    if (isSelectingConditionNColumn) {
      // Pattern: #col1 #op val #and #searchTerm or #col1 #op val #and #
      const cond1ColMatch = value.match(/#(?:and|or)\s+#([^\s#]*)$/i);
      return cond1ColMatch ? cond1ColMatch[1] : '';
    }

    // Normal column selection
    if (value.startsWith('#')) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : '';
    }
    return '';
  }, [value, isSelectingConditionNColumn]);

  const searchableColumns = useMemo(() => {
    return columns.filter(col => col.searchable);
  }, [columns]);

  const sortedColumns = useMemo(() => {
    if (!searchTerm) return searchableColumns;

    const searchTargets = searchableColumns.map(col => ({
      column: col,
      headerName: col.headerName,
      field: col.field,
    }));

    const headerResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'headerName',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'field',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const combinedResults = new Map();

    headerResults.forEach(result => {
      combinedResults.set(result.obj.column.field, {
        column: result.obj.column,
        score: result.score + 1000,
      });
    });

    fieldResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 500,
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.column);
  }, [searchableColumns, searchTerm]);

  // Restricted join operators to ensure consistency (all AND or all OR)
  const restrictedJoinOperators = useMemo(() => {
    // Determine the primary/locked join operator
    // Case 1: Confirmed multi-condition joins array
    let lockedJoin = searchMode.filterSearch?.joins?.[0];

    // Case 2: Backward compatibility with single joinOperator field
    if (!lockedJoin) {
      lockedJoin = searchMode.filterSearch?.joinOperator;
    }

    // Case 3: Partial join being built (if no confirmed joins yet)
    if (!lockedJoin) {
      lockedJoin = searchMode.partialJoin;
    }

    if (lockedJoin) {
      const lowerLocked = lockedJoin.toLowerCase();
      // Only show the matching operator
      return JOIN_OPERATORS.filter(op => op.value === lowerLocked);
    }

    // If no join exists yet, show both AND and OR
    return JOIN_OPERATORS;
  }, [searchMode.filterSearch, searchMode.partialJoin]);

  const getPlaceholder = () => {
    if (showTargetedIndicator) {
      return 'Cari...';
    }
    return placeholder;
  };

  // Determine operators based on column type
  const operators = useMemo(() => {
    if (searchMode.selectedColumn) {
      return getOperatorsForColumn(searchMode.selectedColumn);
    }
    return [];
  }, [searchMode.selectedColumn]);

  // Calculate default selected operator index when in edit mode
  const defaultOperatorIndex = useMemo(() => {
    // N-condition support: Check if editing condition N's operator (N >= 2)
    const editingIdx = searchMode.activeConditionIndex;
    if (
      editingIdx !== undefined &&
      editingIdx >= 2 &&
      preservedSearchMode?.filterSearch?.conditions?.[editingIdx]
    ) {
      const condNOperator =
        preservedSearchMode.filterSearch.conditions[editingIdx].operator;
      if (condNOperator) {
        const index = operators.findIndex(op => op.value === condNOperator);
        return index >= 0 ? index : undefined;
      }
    }

    // If editing condition[1] operator in confirmed multi-condition, get from conditions array
    if (
      isEditingSecondOperator &&
      preservedSearchMode?.filterSearch?.isMultiCondition &&
      preservedSearchMode?.filterSearch?.conditions &&
      preservedSearchMode.filterSearch.conditions.length >= 2
    ) {
      const currentOperator =
        preservedSearchMode.filterSearch.conditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    // If editing condition[1] operator in partial multi-condition, use partialConditions[1].operator
    else if (
      isEditingSecondOperator &&
      preservedSearchMode?.partialConditions?.[1]?.operator
    ) {
      const currentOperator = preservedSearchMode.partialConditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    // Otherwise use first operator from filterSearch
    else if (preservedSearchMode?.filterSearch?.operator) {
      const currentOperator = preservedSearchMode.filterSearch.operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [
    preservedSearchMode,
    isEditingSecondOperator,
    operators,
    searchMode.activeConditionIndex,
  ]);

  // Calculate default selected column index when in edit mode
  const defaultColumnIndex = useMemo(() => {
    // N-condition support: Check if editing condition N's column (N >= 2)
    const editingIdx = searchMode.activeConditionIndex;
    if (
      editingIdx !== undefined &&
      editingIdx >= 2 &&
      preservedSearchMode?.filterSearch?.conditions?.[editingIdx]
    ) {
      const condNColumnField =
        preservedSearchMode.filterSearch.conditions[editingIdx].field;
      if (condNColumnField) {
        const index = sortedColumns.findIndex(
          col => col.field === condNColumnField
        );
        return index >= 0 ? index : undefined;
      }
    }

    // Check if editing condition[1] column - use condition[1] column field from conditions or partialConditions state
    if (isEditingSecondColumnState) {
      // Try to get condition[1] column field from multi-condition filter
      const cond1ColFromConditions =
        preservedSearchMode?.filterSearch?.conditions?.[1]?.field;
      // Or from partialConditions state
      const cond1ColFromState =
        preservedSearchMode?.partialConditions?.[1]?.column?.field;
      const cond1ColumnField = cond1ColFromConditions || cond1ColFromState;

      if (cond1ColumnField) {
        const index = sortedColumns.findIndex(
          col => col.field === cond1ColumnField
        );
        return index >= 0 ? index : undefined;
      }
    }
    // Check filterSearch.field first (confirmed filter case)
    if (preservedSearchMode?.filterSearch?.field) {
      const currentColumnField = preservedSearchMode.filterSearch.field;
      const index = sortedColumns.findIndex(
        col => col.field === currentColumnField
      );
      return index >= 0 ? index : undefined;
    }
    // Check selectedColumn (no filter yet, editing from operator selector)
    if (preservedSearchMode?.selectedColumn?.field) {
      const currentColumnField = preservedSearchMode.selectedColumn.field;
      const index = sortedColumns.findIndex(
        col => col.field === currentColumnField
      );
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [
    preservedSearchMode,
    sortedColumns,
    isEditingSecondColumnState,
    searchMode.activeConditionIndex,
  ]);

  return (
    <>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          <SearchIcon
            searchMode={searchMode}
            searchState={searchState}
            displayValue={displayValue}
            showTargetedIndicator={showTargetedIndicator}
          />

          <div
            className={`relative flex-1 flex flex-wrap items-center gap-1.5 p-1.5 min-h-[42px] border transition-[border-color,box-shadow] duration-200 ease-in-out rounded-lg ${
              searchState === 'not-found'
                ? 'border-danger focus-within:border-danger focus-within:ring-3 focus-within:ring-red-100'
                : searchMode.isFilterMode &&
                    searchMode.filterSearch &&
                    searchMode.filterSearch.operator === 'contains' &&
                    !searchMode.filterSearch.isExplicitOperator
                  ? 'border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100'
                  : searchMode.isFilterMode && searchMode.filterSearch
                    ? 'border-blue-300 ring-3 ring-blue-100 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100'
                    : searchMode.showColumnSelector
                      ? 'border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100'
                      : 'border-gray-300 focus-within:border-primary focus-within:ring-3 focus-within:ring-emerald-200'
            }`}
          >
            <SearchBadge
              searchMode={searchMode}
              badgeRef={badgeRef}
              badgesContainerRef={badgesContainerRef}
              operatorBadgeRef={operatorBadgeRef}
              joinBadgeRef={joinBadgeRef}
              secondColumnBadgeRef={secondColumnBadgeRef}
              secondOperatorBadgeRef={secondOperatorBadgeRef}
              setBadgeRef={setBadgeRef}
              // Scalable handlers for N-condition support
              clearConditionPart={clearConditionPart}
              clearJoin={clearJoin}
              editConditionPart={editConditionPart}
              editJoin={editJoin}
              editValueN={handleEditValueN}
              // Legacy handlers
              onClearColumn={badgeHandlers.onClearColumn}
              onClearOperator={badgeHandlers.onClearOperator}
              onClearValue={badgeHandlers.onClearValue}
              onClearValueTo={badgeHandlers.onClearValueTo}
              onClearPartialJoin={badgeHandlers.onClearPartialJoin}
              onClearCondition1Column={badgeHandlers.onClearCondition1Column}
              onClearCondition1Operator={
                badgeHandlers.onClearCondition1Operator
              }
              onClearCondition1Value={badgeHandlers.onClearCondition1Value}
              onClearCondition1ValueTo={badgeHandlers.onClearCondition1ValueTo}
              onClearAll={badgeHandlers.onClearAll}
              onEditColumn={handleEditColumn}
              onEditCondition1Column={handleEditCondition1Column}
              onEditOperator={handleEditOperator}
              onEditJoin={handleEditJoin}
              onEditValue={handleEditValue}
              onEditValueTo={handleEditValueTo}
              onEditCondition1Value={handleEditCondition1Value}
              onEditCondition1ValueTo={handleEditCondition1ValueTo}
              onHoverChange={handleHoverChange}
              preservedSearchMode={preservedSearchMode}
              editingBadge={editingBadge}
              onInlineValueChange={handleInlineValueChange}
              onInlineEditComplete={handleInlineEditComplete}
              onNavigateEdit={handleNavigateEdit}
              onFocusInput={handleFocusInputFromBadge}
              selectedBadgeIndex={selectedBadgeIndex}
              onBadgeCountChange={handleBadgeCountChange}
              onBadgesChange={handleBadgesChange}
              previewColumn={previewColumn}
              previewOperator={previewOperator}
              editingConditionIndex={
                // Use scalable editingSelectorTarget for N-condition support
                // Fallback to activeConditionIndex when column/operator selector is open with preserved state
                editingSelectorTarget?.conditionIndex ??
                (preservedSearchMode &&
                (searchMode.showColumnSelector ||
                  searchMode.showOperatorSelector) &&
                searchMode.activeConditionIndex !== undefined &&
                searchMode.activeConditionIndex >= 1
                  ? searchMode.activeConditionIndex
                  : null)
              }
              editingTarget={
                editingSelectorTarget?.target ??
                (preservedSearchMode && searchMode.showColumnSelector
                  ? 'column'
                  : preservedSearchMode && searchMode.showOperatorSelector
                    ? 'operator'
                    : null)
              }
            />
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className="text-sm outline-none tracking-normal flex-grow min-w-[100px] bg-transparent border-none focus:ring-0 p-1 placeholder-gray-400"
              value={displayValue}
              onChange={wrappedInputChangeHandler}
              onKeyDown={wrappedKeyDownHandler}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        {resultsCount !== undefined && searchState === 'found' && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <LuSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      <ColumnSelector
        columns={sortedColumns}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelect}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={searchTerm}
        defaultSelectedIndex={defaultColumnIndex}
        onHighlightChange={setPreviewColumn}
      />

      <OperatorSelector
        operators={operators}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelect}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
        searchTerm={operatorSearchTerm}
        defaultSelectedIndex={defaultOperatorIndex}
        onHighlightChange={setPreviewOperator}
      />

      <JoinOperatorSelector
        operators={restrictedJoinOperators}
        isOpen={searchMode.showJoinOperatorSelector}
        onSelect={handleJoinOperatorSelect}
        onClose={handleCloseJoinOperatorSelector}
        position={joinOperatorSelectorPosition}
        currentValue={
          currentJoinOperator ||
          searchMode.partialJoin ||
          searchMode.filterSearch?.joinOperator
        }
      />
    </>
  );
};

export default EnhancedSearchBar;
