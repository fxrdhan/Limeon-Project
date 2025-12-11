import React, { useRef, useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { LuSearch } from 'react-icons/lu';
import fuzzysort from 'fuzzysort';
import {
  EnhancedSearchBarProps,
  SearchColumn,
  EnhancedSearchState,
} from './types';
import { SEARCH_CONSTANTS } from './constants';
import { JOIN_OPERATORS } from './operators';
import { buildColumnValue, findColumn } from './utils/searchUtils';
import { getOperatorsForColumn } from './utils/operatorUtils';
import { PatternBuilder } from './utils/PatternBuilder';
import {
  setFilterValue,
  extractMultiConditionPreservation,
  getFirstCondition,
  getJoinOperator,
  getSecondOperatorValue,
} from './utils/handlerHelpers';
import { restoreConfirmedPattern } from './utils/patternRestoration';
import { useSearchState } from './hooks/useSearchState';
import { useSelectorPosition } from './hooks/useSelectorPosition';
import { useSearchInput } from './hooks/useSearchInput';
import { useSearchKeyboard } from './hooks/useSearchKeyboard';
import { useBadgeHandlers } from './hooks/useBadgeHandlers';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';
import SearchBadge from './components/SearchBadge';
import SearchIcon from './components/SearchIcon';
import ColumnSelector from './components/selectors/ColumnSelector';
import OperatorSelector from './components/selectors/OperatorSelector';
import JoinOperatorSelector from './components/selectors/JoinOperatorSelector';

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
  const preservedFilterRef = useRef<{
    columnName?: string;
    operator: string;
    value: string;
    valueTo?: string; // For Between (inRange) operator
    // For multi-condition filters (AND/OR)
    join?: 'AND' | 'OR';
    secondOperator?: string;
    secondValue?: string;
    secondValueTo?: string; // For Between (inRange) operator in second condition
    secondColumnField?: string; // For multi-column filters - second column field name
    wasMultiColumn?: boolean; // Track if original structure had explicit second column badge
  } | null>(null);

  // State to preserve searchMode during edit (to keep badges visible)
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);

  // Track whether we're editing the second operator (after AND/OR join)
  const [isEditingCondition1Operator, setIsEditingCondition1Operator] =
    useState(false);

  // Track whether we're editing the second column (for live preview)
  const [isEditingCondition1ColumnState, setIsEditingSecondColumnState] =
    useState(false);

  // State to track current join operator value during edit mode
  const [currentJoinOperator, setCurrentJoinOperator] = useState<
    'AND' | 'OR' | undefined
  >(undefined);

  // State for inline badge editing
  const [editingBadge, setEditingBadge] = useState<{
    type: 'firstValue' | 'secondValue' | 'firstValueTo' | 'secondValueTo';
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
    badgeRef,
    badgesContainerRef,
    operatorBadgeRef,
    joinBadgeRef,
    condition1ColumnBadgeRef,
    condition1OperatorBadgeRef,
  } = useSearchInput({
    value,
    searchMode,
    onChange,
    inputRef,
  });

  // Column selector: position depends on context
  // - First column: appears at container left (no badge yet)
  // - Second column editing (preservedSearchMode + isSecondColumn): appears below second column badge
  // - Second column creating (isSecondColumn only): appears after all badges
  const isEditingCondition1Column =
    preservedSearchMode !== null && searchMode.isSecondColumn;
  const columnAnchorRef = searchMode.isSecondColumn
    ? isEditingCondition1Column
      ? condition1ColumnBadgeRef // Edit mode: position below the condition[1] column badge
      : badgesContainerRef // Create mode: position at end of badges
    : undefined;
  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
    anchorRef: columnAnchorRef,
    anchorAlign: searchMode.isSecondColumn
      ? isEditingCondition1Column
        ? 'left' // Edit mode: left-aligned below 2nd column badge
        : 'right' // Create mode: right edge of badges
      : 'left',
  });

  // Operator selector: position below the badges
  // - First operator: anchor to column badge (badgeRef), align right - appears after column
  // - Condition[N] operator editing: anchor to condition[N] operator badge, align left - appears below it
  // - Condition[N] operator creating (multi-column): anchor to condition[N] column badge, align right
  // - Condition[N] column edited, selecting NEW operator: anchor to condition[N] column badge, align right
  //
  // Use scalable checks: activeConditionIndex > 0 OR deprecated isSecondOperator/secondColumn
  const hasCondition1Column =
    searchMode.partialConditions?.[1]?.column || searchMode.secondColumn;
  const hasCondition1Operator =
    searchMode.partialConditions?.[1]?.operator || searchMode.secondOperator;
  const isBuildingConditionN =
    (searchMode.activeConditionIndex !== undefined &&
      searchMode.activeConditionIndex > 0) ||
    searchMode.isSecondOperator ||
    searchMode.isSecondColumn;

  const isEditingConditionNOp =
    isEditingCondition1Operator && searchMode.showOperatorSelector;
  const isCreatingConditionNOp = isBuildingConditionN && hasCondition1Column;
  // Check if we're selecting NEW operator for condition[N] column (after editing column)
  const isSelectingNewOperatorForConditionNColumn =
    isEditingCondition1Operator &&
    searchMode.showOperatorSelector &&
    hasCondition1Column &&
    !hasCondition1Operator; // No current condition[N] operator = selecting new one

  let operatorAnchorRef: React.RefObject<HTMLDivElement | null>;
  let operatorAnchorAlign: 'left' | 'right';

  if (isSelectingNewOperatorForConditionNColumn) {
    // Selecting NEW operator for condition[N] column: position after column badge
    operatorAnchorRef = condition1ColumnBadgeRef;
    operatorAnchorAlign = 'right';
  } else if (isEditingConditionNOp) {
    // Edit existing condition[N] operator: position below operator badge
    operatorAnchorRef = condition1OperatorBadgeRef;
    operatorAnchorAlign = 'left';
  } else if (isCreatingConditionNOp) {
    // Creating condition[N] operator in multi-column: position after column badge
    operatorAnchorRef = condition1ColumnBadgeRef;
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
  const isEditingJoinOperator =
    searchMode.partialJoin ||
    preservedSearchMode?.partialJoin ||
    preservedSearchMode?.filterSearch?.joinOperator ||
    preservedSearchMode?.filterSearch?.isMultiCondition;

  const joinAnchorRef = isEditingJoinOperator
    ? joinBadgeRef // EDIT: join badge exists (from preservedSearchMode), anchor to it
    : badgesContainerRef; // CREATE: no join badge yet, anchor to badges container

  const joinOperatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showJoinOperatorSelector,
    containerRef,
    anchorRef: joinAnchorRef,
    anchorAlign: isEditingJoinOperator ? 'left' : 'right', // left for edit, right for create
  });

  // Clear preserved state - used to reset edit mode and badge visibility
  const handleClearPreservedState = useCallback(() => {
    setPreservedSearchMode(null);
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setIsEditingCondition1Operator(false);
    setIsEditingSecondColumnState(false);
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
  const { legacy: badgeHandlers } = useBadgeHandlers({
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
  });

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
      isEditingCondition1Operator,
      setIsEditingCondition1Operator,
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

  // Clear second value - used by gray badge (second value in multi-condition)
  const handleClearSecondValue = useCallback(() => {
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
    const secondOp = getSecondOperatorValue(
      stateToUse.filterSearch,
      stateToUse,
      value
    );

    // Check for multi-column: get second column from conditions or secondColumn state
    const secondColumnField =
      stateToUse.filterSearch.conditions?.[1]?.field ||
      stateToUse.secondColumn?.field;

    if (joinOp && (joinOp === 'AND' || joinOp === 'OR') && secondOp) {
      // Always include second column in pattern (even if same as first)
      // This ensures the second column badge is shown consistently
      const col2 = secondColumnField || columnName;
      const newValue = PatternBuilder.multiColumnWithOperator(
        columnName,
        firstCondition.operator,
        firstCondition.value,
        joinOp,
        col2,
        secondOp,
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

  // Edit second column - show column selector for second column (multi-column)
  const handleEditCondition1Column = useCallback(() => {
    // Mark that we're editing SECOND column for preview
    setIsEditingSecondColumnState(true);

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

    // Extract and preserve filter data including second condition (operator, value)
    preservedFilterRef.current = extractMultiConditionPreservation(stateToUse);

    // Build pattern to trigger isSecondColumn: #col1 #op1 val1 [val1To] #join #
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
    // Mark that we're editing FIRST column (not second) for preview
    setIsEditingSecondColumnState(false);

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

      // Track if we're editing the second operator
      setIsEditingCondition1Operator(isSecond);

      // Extract and preserve filter data from original state
      preservedFilterRef.current =
        extractMultiConditionPreservation(stateToUse);

      // Build pattern for operator selector
      let newValue: string;

      if (
        isSecond &&
        preservedFilterRef.current?.operator &&
        preservedFilterRef.current?.value &&
        preservedFilterRef.current?.join
      ) {
        // For second operator edit, preserve first condition
        // Always include second column to trigger operator selector (not column selector)
        const secondColField =
          preservedFilterRef.current.secondColumnField ||
          stateToUse.secondColumn?.field ||
          columnName; // Fallback to first column if same column filter

        // Build pattern for operator selector, including valueTo if first condition is Between
        // Pattern: #col1 #op1 val1 [val1To] #join #col2 #
        const firstOp = preservedFilterRef.current.operator;
        const firstVal = preservedFilterRef.current.value;
        const firstValTo = preservedFilterRef.current.valueTo;
        const join = preservedFilterRef.current.join;

        if (firstOp === 'inRange' && firstValTo) {
          // First condition is Between - include valueTo
          // Use #to marker to ensure correct badge display
          newValue = `#${columnName} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${secondColField} #`;
        } else {
          newValue = PatternBuilder.multiColumnPartial(
            columnName,
            firstOp,
            firstVal,
            join,
            secondColField
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
    // This happens when user is typing value for second condition
    const hasPartialMultiColumn =
      searchMode.partialJoin ||
      searchMode.secondColumn ||
      searchMode.secondOperator;

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
      // This keeps all badges visible (including join badge and second column)
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
        type: 'firstValue',
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
      type: 'firstValue',
      value: currentValue,
    });
  }, [searchMode, preservedSearchMode, onChange, value]);

  // Edit second value in multi-condition filter - INLINE EDITING
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

    const secondCondition = stateToUse.filterSearch.conditions[1];

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

    // Enter inline editing mode for second value
    setEditingBadge({
      type: 'secondValue',
      value: secondCondition.value,
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
      type: 'firstValueTo',
      value: valueTo,
    });
  }, [searchMode, preservedSearchMode]);

  // Edit "to" value in Between operator (second condition) - INLINE EDITING
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

    const secondCondition = stateToUse.filterSearch.conditions[1];

    if (!secondCondition.valueTo) return;

    // IMPORTANT: Preserve current state BEFORE entering inline edit mode
    // This ensures handleInlineEditComplete has access to original state
    if (!preservedSearchMode) {
      setPreservedSearchMode(stateToUse);
    }

    // Enter inline editing mode for second condition's "to" value
    setEditingBadge({
      type: 'secondValueTo',
      value: secondCondition.valueTo,
    });
  }, [searchMode, preservedSearchMode]);

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

        // Clear based on which badge was being edited
        if (editingBadge.type === 'firstValue') {
          // Clearing first condition "from" value - clear entire filter
          handleClearValue();
        } else if (editingBadge.type === 'firstValueTo') {
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
                type: 'firstValue',
                value: fromValue,
              });
            }, 10);
            return;
          }
          // If no fromValue, fall through to handleClearValue
        } else if (editingBadge.type === 'secondValue') {
          // Clearing second condition "from" value - clear second condition only
          handleClearSecondValue();
        } else if (editingBadge.type === 'secondValueTo') {
          // Clearing second condition "to" value in Between - transition to edit second value
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
            const secondValue = cond2.value;

            if (secondValue) {
              // Build confirmed pattern with second condition's value only (no valueTo)
              // Use #to marker for first condition if it has valueTo
              let newPattern: string;
              const firstPart = cond1.valueTo
                ? `#${col1} #${cond1.operator} ${cond1.value} #to ${cond1.valueTo}`
                : `#${col1} #${cond1.operator} ${cond1.value}`;

              if (isMultiColumn) {
                newPattern = `${firstPart} #${join.toLowerCase()} #${col2} #${cond2.operator} ${secondValue}##`;
              } else {
                newPattern = `${firstPart} #${join.toLowerCase()} #${cond2.operator} ${secondValue}##`;
              }

              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);

              // Update preservedSearchMode to remove valueTo from second condition
              // This ensures the [to][700] badge is not rendered during secondValue edit
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

              // Transition to inline editing mode for second condition's value badge
              setTimeout(() => {
                setEditingBadge({
                  type: 'secondValue',
                  value: secondValue,
                });
              }, 10);
              return;
            }
          }
          handleClearSecondValue();
        }

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

          if (dashMatch && editingBadge.type === 'firstValue') {
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
            if (editingBadge.type === 'firstValue') {
              // Editing "from" value - preserve "to" value
              newPattern = `#${columnName} #${operator} ${valueToUse} #to ${stateToUse.filterSearch.valueTo}##`;
            } else if (editingBadge.type === 'firstValueTo') {
              // Editing "to" value - preserve "from" value
              newPattern = `#${columnName} #${operator} ${stateToUse.filterSearch.value} #to ${valueToUse}##`;
            } else {
              // Fallback
              newPattern = `#${columnName} #${operator} ${valueToUse}##`;
            }
          } else if (editingBadge.type === 'firstValue') {
            // Between operator without valueTo (cleared or never set)
            // When editing first value and pressing ENTER: create [value][to] badge, wait for second value
            // Pattern: #col #inRange value #to (no ##, ready for second value input)
            newPattern = `#${columnName} #${operator} ${valueToUse} #to `;
            onChange({
              target: { value: newPattern },
            } as React.ChangeEvent<HTMLInputElement>);
            setEditingBadge(null);
            // Focus input at end to wait for second value input
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

          // Parse original pattern to extract join operator and second column if present
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
            // Operator selector: could be for first operator or second operator (multi-column)
            // Pattern for second operator: "#col1 #op val #and #col2 #"
            const multiColMatch = interrupted.originalPattern.match(
              /#(and|or)\s+#([^\s#]+)\s*#\s*$/i
            );
            if (multiColMatch) {
              // Multi-column operator selector: restore with second column
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

      // CASE 2: Multi-condition filter
      const firstCondition = stateToUse.filterSearch.conditions![0];
      const secondCondition = stateToUse.filterSearch.conditions![1];
      const joinOp = stateToUse.filterSearch.joinOperator || 'AND';

      // Determine column fields - check if multi-column filter
      const col1 = firstCondition.field || columnName;
      const col2 = secondCondition.field || columnName;
      // Use isMultiColumn directly - it's set true for explicit multi-column patterns
      // even when col1 == col2 (preserves the explicit second column badge)
      const isMultiColumn = stateToUse.filterSearch.isMultiColumn;

      let newPattern: string;

      // Handle editing first condition
      if (editingBadge.type === 'firstValue') {
        // Editing first condition's "from" value
        let firstValue = valueToUse;
        let firstValueTo = firstCondition.valueTo; // Preserve "to" if exists

        // Check for dash pattern in Between operator (e.g., "500-600")
        if (firstCondition.operator === 'inRange') {
          const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
          if (dashMatch) {
            const [, fromVal, toVal] = dashMatch;
            const trimmedFrom = fromVal.trim();
            const trimmedTo = toVal.trim();
            if (trimmedFrom && trimmedTo) {
              firstValue = trimmedFrom;
              firstValueTo = trimmedTo;
            }
          }
        }

        if (isMultiColumn) {
          newPattern = PatternBuilder.buildMultiColumnWithValueTo(
            col1,
            firstCondition.operator,
            firstValue,
            firstValueTo,
            joinOp,
            col2,
            secondCondition.operator,
            secondCondition.value,
            secondCondition.valueTo
          );
        } else {
          newPattern = PatternBuilder.buildMultiConditionWithValueTo(
            columnName,
            firstCondition.operator,
            firstValue,
            firstValueTo,
            joinOp,
            secondCondition.operator,
            secondCondition.value,
            secondCondition.valueTo
          );
        }
      } else if (editingBadge.type === 'firstValueTo') {
        // Editing first condition's "to" value (Between operator)
        if (isMultiColumn) {
          newPattern = PatternBuilder.buildMultiColumnWithValueTo(
            col1,
            firstCondition.operator,
            firstCondition.value, // Preserve "from" value
            valueToUse, // Updated "to" value
            joinOp,
            col2,
            secondCondition.operator,
            secondCondition.value,
            secondCondition.valueTo
          );
        } else {
          newPattern = PatternBuilder.buildMultiConditionWithValueTo(
            columnName,
            firstCondition.operator,
            firstCondition.value, // Preserve "from" value
            valueToUse, // Updated "to" value
            joinOp,
            secondCondition.operator,
            secondCondition.value,
            secondCondition.valueTo
          );
        }
      } else if (editingBadge.type === 'secondValue') {
        // Editing second condition's "from" value
        let secondValue = valueToUse;
        let secondValueTo = secondCondition.valueTo; // Preserve "to" if exists

        // Check for dash pattern in Between operator (e.g., "500-600")
        if (secondCondition.operator === 'inRange') {
          const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
          if (dashMatch) {
            const [, fromVal, toVal] = dashMatch;
            const trimmedFrom = fromVal.trim();
            const trimmedTo = toVal.trim();
            if (trimmedFrom && trimmedTo) {
              secondValue = trimmedFrom;
              secondValueTo = trimmedTo;
            }
          }
        }

        if (isMultiColumn) {
          newPattern = PatternBuilder.buildMultiColumnWithValueTo(
            col1,
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo,
            joinOp,
            col2,
            secondCondition.operator,
            secondValue,
            secondValueTo
          );
        } else {
          newPattern = PatternBuilder.buildMultiConditionWithValueTo(
            columnName,
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo,
            joinOp,
            secondCondition.operator,
            secondValue,
            secondValueTo
          );
        }
      } else if (editingBadge.type === 'secondValueTo') {
        // Editing second condition's "to" value (Between operator)
        if (isMultiColumn) {
          newPattern = PatternBuilder.buildMultiColumnWithValueTo(
            col1,
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo,
            joinOp,
            col2,
            secondCondition.operator,
            secondCondition.value, // Preserve "from" value
            valueToUse // Updated "to" value
          );
        } else {
          newPattern = PatternBuilder.buildMultiConditionWithValueTo(
            columnName,
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo,
            joinOp,
            secondCondition.operator,
            secondCondition.value, // Preserve "from" value
            valueToUse // Updated "to" value
          );
        }
      } else {
        // Fallback - shouldn't reach here
        setEditingBadge(null);
        return;
      }

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
      handleClearSecondValue,
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

      // CASE 5: User types on confirmed multi-condition filter - enter edit mode for second value
      // Pattern: #field #op1 val1 #join #op2 val2## → user types → #field #op1 val1 #join #op2 newValue
      if (
        searchMode.isFilterMode &&
        searchMode.filterSearch?.isConfirmed &&
        searchMode.filterSearch?.isMultiCondition &&
        searchMode.filterSearch?.conditions &&
        searchMode.filterSearch.conditions.length >= 2 &&
        inputValue.trim() !== '' &&
        inputValue.trim() !== '#' &&
        !preservedFilterRef.current // Not already in edit mode
      ) {
        const columnName = searchMode.filterSearch.field;
        const firstCondition = searchMode.filterSearch.conditions[0];
        const secondCondition = searchMode.filterSearch.conditions[1];
        const joinOp = searchMode.filterSearch.joinOperator || 'AND';

        // Create modified searchMode with second value hidden (empty string)
        // This will hide the 2nd value badge during edit
        const modifiedSearchMode: EnhancedSearchState = {
          ...searchMode,
          filterSearch: {
            ...searchMode.filterSearch,
            conditions: [
              firstCondition,
              {
                ...secondCondition,
                value: '', // Empty value will hide the badge
              },
            ],
          },
        };

        setPreservedSearchMode(modifiedSearchMode);

        // Preserve first condition while editing second value
        preservedFilterRef.current = {
          columnName,
          operator: firstCondition.operator,
          value: firstCondition.value,
          join: joinOp,
          secondOperator: secondCondition.operator,
          secondValue: secondCondition.value,
        };

        // Build pattern for editing second value
        // Remove ## marker and replace second value with new input
        const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp.toLowerCase()} #${secondCondition.operator} ${inputValue}`;

        onChange({
          ...e,
          target: { ...e.target, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        return;
      }

      // Detect when input becomes empty while editing second value in partial multi-condition
      // Pattern: #field #op1 val1 #join #op2 val2 (val2 being edited in input)
      // When input is emptied → should become: #field #op1 val1 #join #
      if (
        inputValue.trim() === '' &&
        preservedFilterRef.current?.columnName &&
        preservedFilterRef.current?.join &&
        preservedFilterRef.current?.secondOperator &&
        preservedFilterRef.current?.value &&
        preservedFilterRef.current?.value.trim() !== ''
      ) {
        // Input is now empty while in partial multi-condition with second operator
        // Remove second operator and add trailing # to open operator selector
        const columnName = preservedFilterRef.current.columnName;
        const operator = preservedFilterRef.current.operator;
        const firstValue = preservedFilterRef.current.value;
        const joinOp = preservedFilterRef.current.join.toLowerCase();

        // Create pattern without second operator but with trailing # for operator selector
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
        preservedFilterRef.current?.secondOperator &&
        preservedFilterRef.current?.secondValue
      ) {
        // Remove ## marker
        const baseValue = inputValue.slice(0, -2);

        // Check if baseValue already contains the join operator
        // If yes → editing second value (full pattern present)
        // If no  → editing first value (only first condition present)
        const joinPattern = `#${preservedFilterRef.current.join?.toLowerCase()}`;
        const hasJoinInBase = baseValue.includes(joinPattern);

        if (hasJoinInBase) {
          // Editing second value - baseValue already contains the full pattern
          // Don't reconstruct, just pass through
          onChange(e);
        } else {
          // Editing first value - reconstruct full multi-condition pattern
          // Check for multi-column filter
          const secondCol = preservedFilterRef.current.secondColumnField;
          const isMultiColumn =
            preservedFilterRef.current.wasMultiColumn && secondCol;

          // Build second condition part, handling Between (inRange) with valueTo
          const secondOp = preservedFilterRef.current.secondOperator!;
          const secondVal = preservedFilterRef.current.secondValue!;
          const secondValTo = preservedFilterRef.current.secondValueTo;

          let secondConditionPart: string;
          if (secondOp === 'inRange' && secondValTo) {
            // Second condition is Between with valueTo
            secondConditionPart = `#${secondOp} ${secondVal} #to ${secondValTo}`;
          } else {
            secondConditionPart = `#${secondOp} ${secondVal}`;
          }

          let fullPattern: string;
          if (isMultiColumn) {
            // Multi-column: include second column field
            fullPattern = `${baseValue} ${joinPattern} #${secondCol} ${secondConditionPart}##`;
          } else {
            // Same-column: no second column field
            fullPattern = `${baseValue} ${joinPattern} ${secondConditionPart}##`;
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
    onEditCondition1Value: handleEditCondition1Value,
    onEditCondition1ValueTo: handleEditCondition1ValueTo,
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
    // For second column selection, extract search term after #and/or #
    if (searchMode.isSecondColumn) {
      // Pattern: #col1 #op val #and #searchTerm or #col1 #op val #and #
      const secondColMatch = value.match(/#(?:and|or)\s+#([^\s#]*)$/i);
      return secondColMatch ? secondColMatch[1] : '';
    }

    // Normal column selection
    if (value.startsWith('#')) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : '';
    }
    return '';
  }, [value, searchMode.isSecondColumn]);

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
    // If editing second operator in confirmed multi-condition, get from conditions array
    if (
      isEditingCondition1Operator &&
      preservedSearchMode?.filterSearch?.isMultiCondition &&
      preservedSearchMode?.filterSearch?.conditions &&
      preservedSearchMode.filterSearch.conditions.length >= 2
    ) {
      const currentOperator =
        preservedSearchMode.filterSearch.conditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    // If editing second operator in partial multi-condition, use secondOperator
    else if (
      isEditingCondition1Operator &&
      preservedSearchMode?.secondOperator
    ) {
      const currentOperator = preservedSearchMode.secondOperator;
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
  }, [preservedSearchMode, isEditingCondition1Operator, operators]);

  // Calculate default selected column index when in edit mode
  const defaultColumnIndex = useMemo(() => {
    // Check if editing second column - use second column field from conditions or secondColumn state
    if (isEditingCondition1Column) {
      // Try to get second column field from multi-condition filter
      const secondColFromConditions =
        preservedSearchMode?.filterSearch?.conditions?.[1]?.field;
      // Or from secondColumn state
      const secondColFromState = preservedSearchMode?.secondColumn?.field;
      const secondColumnField = secondColFromConditions || secondColFromState;

      if (secondColumnField) {
        const index = sortedColumns.findIndex(
          col => col.field === secondColumnField
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
  }, [preservedSearchMode, sortedColumns, isEditingCondition1Column]);

  // Calculate base padding (CSS variable will override when badges are present)
  // When left icon is visible (column selector, filter mode, etc.), use smaller padding
  // since the icon container already provides visual spacing
  const getBasePadding = () => {
    // Check if left icon is showing (same logic as SearchIcon's shouldShowLeftIcon)
    const hasExplicitOperator =
      searchMode.filterSearch?.isExplicitOperator ||
      searchMode.filterSearch?.isMultiCondition ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector ||
      searchMode.partialJoin ||
      searchMode.secondOperator;

    const isLeftIconVisible =
      (((displayValue && !displayValue.startsWith('#')) ||
        hasExplicitOperator) &&
        !searchMode.showColumnSelector) ||
      searchMode.showColumnSelector;

    // When left icon is visible, use smaller padding (icon provides spacing)
    if (isLeftIconVisible) {
      return '12px';
    }

    // Default padding when no left icon (search icon is absolute positioned inside input)
    return '40px';
  };

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

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-[border-color,box-shadow] duration-200 ease-in-out placeholder-gray-400 ${
                searchState === 'not-found'
                  ? 'border-danger focus:border-danger focus:ring-3 focus:ring-red-100'
                  : searchMode.isFilterMode &&
                      searchMode.filterSearch &&
                      searchMode.filterSearch.operator === 'contains' &&
                      !searchMode.filterSearch.isExplicitOperator
                    ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                    : searchMode.isFilterMode && searchMode.filterSearch
                      ? 'border-blue-300 ring-3 ring-blue-100 focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
                      : searchMode.showColumnSelector
                        ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                        : 'border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200'
              } focus:outline-none rounded-lg`}
              style={{
                // Use CSS variable set by ResizeObserver (dynamic), fallback to base padding
                paddingLeft: showTargetedIndicator
                  ? 'var(--badge-width, 60px)'
                  : getBasePadding(),
                // No transition on padding - prevents placeholder from animating
              }}
              value={displayValue}
              onChange={wrappedInputChangeHandler}
              onKeyDown={wrappedKeyDownHandler}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            <SearchBadge
              searchMode={searchMode}
              badgeRef={badgeRef}
              badgesContainerRef={badgesContainerRef}
              operatorBadgeRef={operatorBadgeRef}
              joinBadgeRef={joinBadgeRef}
              condition1ColumnBadgeRef={condition1ColumnBadgeRef}
              condition1OperatorBadgeRef={condition1OperatorBadgeRef}
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
              isEditingCondition1Column={isEditingCondition1ColumnState}
              isEditingCondition1Operator={isEditingCondition1Operator}
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
        operators={JOIN_OPERATORS}
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
