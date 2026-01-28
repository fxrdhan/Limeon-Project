import fuzzysort from 'fuzzysort';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TbSearch } from 'react-icons/tb';
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
import { JOIN_OPERATORS, JoinOperator } from './operators';
import {
  EnhancedSearchBarProps,
  EnhancedSearchState,
  FilterConditionNode,
  FilterExpression,
  FilterGroup,
  FilterOperator,
  SearchColumn,
} from './types';
import {
  PreservedFilter,
  PreservedCondition,
  extractMultiConditionPreservation,
  setFilterValue,
} from './utils/handlerHelpers';
import {
  normalizeGroupSearchTerm,
  removeGroupTokenAtIndex,
  replaceTrailingHash,
} from './utils/groupPatternUtils';
import {
  getOperatorsForColumn,
  isOperatorCompatibleWithColumn,
} from './utils/operatorUtils';
import { PatternBuilder } from './utils/PatternBuilder';
import { restoreConfirmedPattern } from './utils/patternRestoration';
import { isFilterSearchValid } from './utils/validationUtils';
import {
  buildColumnValue,
  findColumn,
  parseSearchValue,
} from './utils/searchUtils';

const updateGroupConditionValue = (
  group: FilterGroup,
  path: number[],
  field: 'value' | 'valueTo',
  nextValue: string,
  nextValueTo?: string
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      return {
        ...node,
        value: field === 'value' ? nextValue : node.value,
        valueTo:
          field === 'valueTo' ? nextValue : (nextValueTo ?? node.valueTo),
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionValue(node, rest, field, nextValue, nextValueTo);
  });
  return { ...group, nodes };
};

const updateGroupConditionColumn = (
  group: FilterGroup,
  path: number[],
  column: SearchColumn
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      return {
        ...node,
        field: column.field,
        column,
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionColumn(node, rest, column);
  });
  return { ...group, nodes };
};

const updateGroupConditionOperator = (
  group: FilterGroup,
  path: number[],
  operator: string
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (rest.length === 0) {
      if (node.kind !== 'condition') return node;
      const needsValueTo = operator === 'inRange' && !node.valueTo;
      return {
        ...node,
        operator,
        valueTo: needsValueTo ? node.value : node.valueTo,
      };
    }
    if (node.kind !== 'group') return node;
    return updateGroupConditionOperator(node, rest, operator);
  });
  return { ...group, nodes };
};

const updateGroupJoinAtPath = (
  group: FilterGroup,
  path: number[],
  join: 'AND' | 'OR'
): FilterGroup => {
  if (path.length === 0) {
    return { ...group, join };
  }
  const [index, ...rest] = path;
  const nodes = group.nodes.map((node, idx) => {
    if (idx !== index) return node;
    if (node.kind !== 'group') return node;
    return updateGroupJoinAtPath(node, rest, join);
  });
  return { ...group, nodes };
};

const removeGroupNodeAtPath = (
  group: FilterGroup,
  path: number[]
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.flatMap((node, idx) => {
    if (idx !== index) return [node];
    if (rest.length === 0) return [];
    if (node.kind !== 'group') return [node];
    const updatedChild = removeGroupNodeAtPath(node, rest);
    if (updatedChild.nodes.length === 0) return [];
    return [{ ...node, nodes: updatedChild.nodes }];
  });
  return { ...group, nodes };
};

const unwrapGroupAtPath = (group: FilterGroup, path: number[]): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.flatMap((node, idx) => {
    if (idx !== index) return [node];
    if (rest.length === 0) {
      if (node.kind !== 'group') return [node];
      return node.nodes;
    }
    if (node.kind !== 'group') return [node];
    const updatedChild = unwrapGroupAtPath(node, rest);
    return [{ ...node, nodes: updatedChild.nodes }];
  });
  return { ...group, nodes };
};

const findGroupNodeAtPath = (
  group: FilterGroup,
  path: number[]
): FilterExpression | undefined => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const node = group.nodes[index];
  if (!node) return undefined;
  if (rest.length === 0) return node;
  if (node.kind !== 'group') return undefined;
  return findGroupNodeAtPath(node, rest);
};

const findFirstConditionInGroup = (
  group: FilterGroup
): FilterConditionNode | undefined => {
  for (const node of group.nodes) {
    if (node.kind === 'condition') return node;
    const nested = findFirstConditionInGroup(node);
    if (nested) return nested;
  }
  return undefined;
};

const getActiveGroupJoin = (
  pattern: string
): { depth: number; join?: 'AND' | 'OR' } => {
  const tokenRegex = /#\(|#\)|#(?:and|or)\b/gi;
  let depth = 0;
  const joinByDepth: Record<number, 'AND' | 'OR'> = {};
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(pattern)) !== null) {
    const token = match[0].toLowerCase();
    if (token === '#(') {
      depth += 1;
      continue;
    }
    if (token === '#)') {
      depth = Math.max(depth - 1, 0);
      continue;
    }
    if (depth > 0 && !joinByDepth[depth]) {
      joinByDepth[depth] = token === '#and' ? 'AND' : 'OR';
    }
  }

  return {
    depth,
    join: depth > 0 ? joinByDepth[depth] : undefined,
  };
};

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const memoizedColumns = useMemo(() => columns, [columns]);
  // Keep a synchronous reference to the latest raw pattern value so rapid key presses
  // (before React/parent state re-renders) still step back one badge at a time.
  const latestValueRef = useRef(value);
  // Carry confirmation intent across consecutive Delete presses.
  // This lets users step back through a confirmed expression and end up with a
  // still-confirmed prefix once they finish deleting trailing badges.
  const deleteConfirmationCarryRef = useRef(false);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  // Ref to store preserved filter when editing column/operator
  // Uses PreservedFilter type which supports N conditions via conditions[] array
  const preservedFilterRef = useRef<PreservedFilter | null>(null);

  // State to preserve searchMode during edit (to keep badges visible)
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);
  const latestPreservedSearchModeRef = useRef<EnhancedSearchState | null>(null);
  useEffect(() => {
    latestPreservedSearchModeRef.current = preservedSearchMode;
  }, [preservedSearchMode]);
  const groupEditDraftRef = useRef<FilterGroup | null>(null);
  const [groupEditingSelectorTarget, setGroupEditingSelectorTarget] = useState<{
    path: number[];
    target: 'column' | 'operator' | 'join';
    joinIndex?: number;
  } | null>(null);

  // ============ Consolidated Editing State (N-Condition Support) ============
  // Tracks which condition's column/operator is being edited
  const [editingSelectorTarget, setEditingSelectorTarget] = useState<{
    conditionIndex: number; // 0 = first, 1 = second, etc.
    target: 'column' | 'operator' | 'join';
  } | null>(null);
  const latestEditingSelectorTargetRef = useRef<{
    conditionIndex: number;
    target: 'column' | 'operator' | 'join';
  } | null>(null);
  useEffect(() => {
    latestEditingSelectorTargetRef.current = editingSelectorTarget;
  }, [editingSelectorTarget]);

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

  const [editingGroupBadge, setEditingGroupBadge] = useState<{
    path: number[];
    field: 'value' | 'valueTo';
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
  const [showInputError, setShowInputError] = useState(false);

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
  const inputErrorTimeoutRef = useRef<number | null>(null);

  // ============ Insert-In-The-Middle (Value Badge Plus) ============
  // When user clicks the plus icon on a value badge, we temporarily truncate
  // the tail (join+conditions to the right), let user build a new condition,
  // then re-attach the tail after the new condition is confirmed.
  const insertTailRef = useRef<{
    afterConditionIndex: number;
    tailConditions: PreservedCondition[];
    tailJoins: ('AND' | 'OR')[];
    defaultField: string;
    isMultiColumn: boolean;
  } | null>(null);
  const [isInsertFlowActive, setIsInsertFlowActive] = useState(false);

  const { searchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
    isEditMode: preservedSearchMode !== null, // In edit mode when preserving badges
    suspendFilterUpdates: isInsertFlowActive,
  });

  const triggerInputError = useCallback(() => {
    if (inputErrorTimeoutRef.current !== null) {
      window.clearTimeout(inputErrorTimeoutRef.current);
    }
    setShowInputError(true);
    inputErrorTimeoutRef.current = window.setTimeout(() => {
      setShowInputError(false);
      inputErrorTimeoutRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (inputErrorTimeoutRef.current !== null) {
        window.clearTimeout(inputErrorTimeoutRef.current);
      }
    };
  }, []);

  const hasGroupTokens = useMemo(
    () => value.includes('#(') || value.includes('#)'),
    [value]
  );
  const isGroupingActive = hasGroupTokens;
  const activeGroupState = useMemo(() => getActiveGroupJoin(value), [value]);
  const getGroupPathKey = (path: number[]) =>
    path.length > 0 ? path.join('-') : 'root';
  const getGroupConditionBadgeId = (
    path: number[],
    type: 'column' | 'operator'
  ) => `condition-${getGroupPathKey(path)}-${type}`;
  const getGroupJoinBadgeId = (path: number[], joinIndex: number) =>
    `join-${getGroupPathKey(path)}-${joinIndex}`;

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
    // Container Ref
    badgesContainerRef,
    // Generalized Lazy Ref System
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
    getLazyBadgeRef,
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
    if (groupEditingSelectorTarget?.target === 'column') {
      return getLazyBadgeRef(
        getGroupConditionBadgeId(groupEditingSelectorTarget.path, 'column')
      );
    }
    if (!isSelectingConditionNColumn) return undefined; // First column: no anchor (or container left)
    if (!isEditingConditionNColumn)
      return inputRef as React.RefObject<HTMLElement | null>; // Create mode: position at input (end of badges)
    // Edit mode: position below the correct column badge
    // Note: activeConditionIndex >= 1 here (guaranteed by isSelectingConditionNColumn)
    if (activeConditionIndex === 1) return getLazyColumnRef(1);
    return getLazyColumnRef(activeConditionIndex); // N >= 2
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

  if (groupEditingSelectorTarget?.target === 'operator') {
    operatorAnchorRef = getLazyBadgeRef(
      getGroupConditionBadgeId(groupEditingSelectorTarget.path, 'operator')
    );
    operatorAnchorAlign = 'left';
  } else if (isEditingOperator) {
    // EDIT existing operator: position below the OPERATOR badge being edited
    // Use dynamic ref for N >= 2, static refs for 0 and 1
    if (activeConditionIndex === 0) {
      operatorAnchorRef = getLazyOperatorRef(0);
    } else if (activeConditionIndex === 1) {
      operatorAnchorRef = getLazyOperatorRef(1);
    } else {
      operatorAnchorRef = getLazyOperatorRef(activeConditionIndex);
    }
    operatorAnchorAlign = 'left';
  } else if (isCreatingConditionNOp) {
    // CREATE/select operator for condition[N]: position at input caret
    operatorAnchorRef = inputRef as React.RefObject<HTMLElement | null>;
    operatorAnchorAlign = 'left';
  } else {
    // First operator: position after column badge
    operatorAnchorRef = getLazyColumnRef(0);
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
  const isEditingJoinOperator =
    editingSelectorTarget?.target === 'join' && preservedSearchMode !== null;

  const getJoinAnchorRef = (): React.RefObject<HTMLElement | null> => {
    if (
      groupEditingSelectorTarget?.target === 'join' &&
      groupEditingSelectorTarget.joinIndex !== undefined
    ) {
      return getLazyBadgeRef(
        getGroupJoinBadgeId(
          groupEditingSelectorTarget.path,
          groupEditingSelectorTarget.joinIndex
        )
      );
    }
    // 1. EDIT existing join: use the specific join badge being edited
    if (
      isEditingJoinOperator &&
      editingSelectorTarget?.conditionIndex !== undefined
    ) {
      return getLazyJoinRef(editingSelectorTarget.conditionIndex);
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
    latestPreservedSearchModeRef.current = null;
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null); // Clear all editing states
    latestEditingSelectorTargetRef.current = null;
    setGroupEditingSelectorTarget(null);
    groupEditDraftRef.current = null;
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
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    }
    return false;
  }, [preservedSearchMode, onChange]);

  // Use centralized badge handlers for clear operations
  const {
    clearConditionPart,
    clearJoin,
    clearAll,
    editConditionPart,
    editJoin,
    editValueN,
  } = useBadgeHandlers({
    value,
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    onClearPreservedState: handleClearPreservedState,
    onClearSearch,
    setEditingSelectorTarget,
    setEditingBadge,
    setCurrentJoinOperator,
  });

  const handleInsertConditionAfter = useCallback(
    (conditionIndex: number) => {
      const stateToUse = preservedSearchMode || searchMode;
      const filter = stateToUse.filterSearch;

      if (!filter || !filter.isConfirmed) return;
      if (filter.filterGroup) return;

      const preservation = extractMultiConditionPreservation(stateToUse);
      if (!preservation) return;

      const conditions = preservation.conditions;
      const joins = preservation.joins;

      // Only meaningful if there is a tail to the right.
      if (conditionIndex < 0 || conditionIndex >= conditions.length - 1) {
        return;
      }

      const prefixConditions = conditions.slice(0, conditionIndex + 1);
      const prefixJoins = joins.slice(0, conditionIndex);
      const tailConditions = conditions.slice(conditionIndex + 1);
      const tailJoins = joins.slice(conditionIndex);

      const defaultField = prefixConditions[0]?.field || filter.field;

      // Store tail for later re-attach.
      insertTailRef.current = {
        afterConditionIndex: conditionIndex,
        tailConditions,
        tailJoins,
        defaultField,
        isMultiColumn: preservation.isMultiColumn || false,
      };

      // Keep grid filter unchanged while user is inserting.
      setIsInsertFlowActive(true);

      // Close inline edit + clear keyboard selection for predictable UX.
      setEditingBadge(null);
      setSelectedBadgeIndex(null);
      interruptedSelectorRef.current = null;

      const newValue = PatternBuilder.buildNConditions(
        prefixConditions.map(c => ({
          field: c.field,
          operator: c.operator || '',
          value: c.value || '',
          valueTo: c.valueTo,
        })),
        prefixJoins,
        preservation.isMultiColumn || false,
        defaultField,
        {
          confirmed: false,
          openSelector: true, // open join selector
        }
      );

      // Switch to join selector at the insertion point.
      setFilterValue(newValue, onChange, inputRef);
    },
    [
      preservedSearchMode,
      searchMode,
      inputRef,
      onChange,
      setEditingBadge,
      setSelectedBadgeIndex,
    ]
  );

  // When the inserted condition is confirmed (value ends with ## and is valid),
  // re-attach the previously hidden tail.
  useEffect(() => {
    if (!isInsertFlowActive) return;
    const tail = insertTailRef.current;
    if (!tail) return;

    // Cancellation: if user clears or leaves hashtag mode, drop the insert flow so
    // SearchState can resume normal grid sync.
    const trimmed = value.trim();
    if (!trimmed || !trimmed.startsWith('#')) {
      insertTailRef.current = null;
      requestAnimationFrame(() => setIsInsertFlowActive(false));
      return;
    }

    // Only finalize once the user has fully confirmed a filter (no selectors open).
    if (
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector
    ) {
      return;
    }

    if (!searchMode.isFilterMode || !searchMode.filterSearch?.isConfirmed) {
      return;
    }

    if (!isFilterSearchValid(searchMode.filterSearch)) {
      return;
    }

    const preservation = extractMultiConditionPreservation(searchMode);
    if (!preservation) return;

    const mergedConditions = [
      ...preservation.conditions,
      ...tail.tailConditions,
    ];
    // Join operator in this feature is intentionally uniform across all conditions.
    // Insertion flow can temporarily create a mixed join array (e.g. [OR, AND])
    // because we hide the tail and then re-attach it. That breaks UX because:
    // - badges show mixed joins, but
    // - Advanced Filter application uses a single join operator for the whole model.
    //
    // So when an insertion chooses a join operator, we normalize ALL joins to that value.
    const insertionJoin =
      preservation.joins[preservation.joins.length - 1] ||
      tail.tailJoins[0] ||
      'AND';

    const mergedJoins = Array(Math.max(mergedConditions.length - 1, 0)).fill(
      insertionJoin
    ) as ('AND' | 'OR')[];

    const firstField = mergedConditions[0]?.field || tail.defaultField;
    const mergedIsMultiColumn =
      tail.isMultiColumn ||
      mergedConditions.some((cond, idx) =>
        idx === 0
          ? false
          : cond.field !== undefined && cond.field !== firstField
      );

    const finalValue = PatternBuilder.buildNConditions(
      mergedConditions.map(c => ({
        field: c.field,
        operator: c.operator || '',
        value: c.value || '',
        valueTo: c.valueTo,
      })),
      mergedJoins,
      mergedIsMultiColumn,
      firstField,
      { confirmed: true }
    );

    insertTailRef.current = null;
    // Avoid triggering a cascading render synchronously inside the effect.
    requestAnimationFrame(() => setIsInsertFlowActive(false));

    setFilterValue(finalValue, onChange, inputRef);
  }, [isInsertFlowActive, value, searchMode, onChange, inputRef]);

  const applyGroupedPattern = useCallback(
    (group: FilterGroup) => {
      if (group.nodes.length === 0) {
        clearAll();
        return;
      }
      const newPattern = PatternBuilder.buildGroupedPattern(group, true);
      onChange({
        target: { value: newPattern },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [clearAll, onChange]
  );

  const getGroupEditBase = useCallback(() => {
    return (
      groupEditDraftRef.current ||
      preservedSearchMode?.filterSearch?.filterGroup ||
      searchMode.filterSearch?.filterGroup ||
      null
    );
  }, [preservedSearchMode, searchMode.filterSearch]);

  const handleGroupEditStart = useCallback(
    (path: number[], field: 'value' | 'valueTo', currentValue: string) => {
      setEditingGroupBadge({ path, field, value: currentValue });
    },
    []
  );

  const handleGroupEditColumn = useCallback(
    (path: number[]) => {
      const group = getGroupEditBase();
      if (!group) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'column' });

      onChange({
        target: { value: '#' },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
    ]
  );

  const handleGroupEditOperator = useCallback(
    (path: number[]) => {
      const group = getGroupEditBase();
      if (!group) return;

      const node = findGroupNodeAtPath(group, path);
      if (!node || node.kind !== 'condition') return;

      const columnField = node.field || node.column?.field;
      if (!columnField) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'operator' });

      onChange({
        target: {
          value: PatternBuilder.columnWithOperatorSelector(columnField),
        },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
    ]
  );

  const handleGroupEditJoin = useCallback(
    (path: number[], joinIndex: number) => {
      const group = getGroupEditBase();
      if (!group) return;

      const targetNode =
        path.length === 0 ? group : findGroupNodeAtPath(group, path);
      if (!targetNode || targetNode.kind !== 'group') return;

      const firstCondition = findFirstConditionInGroup(targetNode);
      if (!firstCondition) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'join', joinIndex });

      onChange({
        target: {
          value: PatternBuilder.withJoinSelector(
            firstCondition.field || '',
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo
          ),
        },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
    ]
  );

  const handleGroupInlineValueChange = useCallback((nextValue: string) => {
    setEditingGroupBadge(prev => (prev ? { ...prev, value: nextValue } : null));
  }, []);

  const handleGroupInlineEditComplete = useCallback(
    (finalValue?: string) => {
      if (!editingGroupBadge) return;

      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;

      if (!group) {
        setEditingGroupBadge(null);
        return;
      }

      const valueToUse =
        finalValue !== undefined ? finalValue : editingGroupBadge.value;

      if (!valueToUse || valueToUse.trim() === '') {
        const updated = removeGroupNodeAtPath(group, editingGroupBadge.path);
        applyGroupedPattern(updated);
        setEditingGroupBadge(null);
        return;
      }

      const node = findGroupNodeAtPath(group, editingGroupBadge.path);
      const isBetween =
        node?.kind === 'condition' && node.operator === 'inRange';

      if (isBetween && editingGroupBadge.field === 'value') {
        const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
        if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
          const updated = updateGroupConditionValue(
            group,
            editingGroupBadge.path,
            'value',
            dashMatch[1].trim(),
            dashMatch[2].trim()
          );
          applyGroupedPattern(updated);
          setEditingGroupBadge(null);
          return;
        }
      }

      const updated = updateGroupConditionValue(
        group,
        editingGroupBadge.path,
        editingGroupBadge.field,
        valueToUse
      );
      applyGroupedPattern(updated);
      setEditingGroupBadge(null);
    },
    [
      editingGroupBadge,
      searchMode.filterSearch,
      preservedSearchMode,
      applyGroupedPattern,
    ]
  );

  const handleGroupClearCondition = useCallback(
    (path: number[]) => {
      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;
      if (!group) return;
      const updated = removeGroupNodeAtPath(group, path);
      applyGroupedPattern(updated);
    },
    [searchMode.filterSearch, preservedSearchMode, applyGroupedPattern]
  );

  const handleGroupClearGroup = useCallback(
    (path: number[]) => {
      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;
      if (!group) return;
      if (path.length === 0) {
        clearAll();
        return;
      }
      const updated = unwrapGroupAtPath(group, path);
      applyGroupedPattern(updated);
    },
    [
      searchMode.filterSearch,
      preservedSearchMode,
      applyGroupedPattern,
      clearAll,
    ]
  );

  const handleGroupTokenClear = useCallback(
    (tokenType: 'groupOpen' | 'groupClose', occurrenceIndex: number) => {
      const nextValue = removeGroupTokenAtIndex(
        value,
        tokenType,
        occurrenceIndex
      );
      if (nextValue === value) return;
      setFilterValue(nextValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

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
      editingSelectorTarget,
      isEditingSecondOperator,
      setIsEditingSecondOperator,
      setEditingBadge,
    });

  const handleGroupEditColumnSelect = useCallback(
    (column: SearchColumn): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'column') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupConditionColumn(
        baseGroup,
        target.path,
        column
      );
      groupEditDraftRef.current = updatedGroup;

      const node = findGroupNodeAtPath(updatedGroup, target.path);
      if (!node || node.kind !== 'condition') {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        handleClearPreservedState();
        return true;
      }

      if (isOperatorCompatibleWithColumn(column, node.operator)) {
        applyGroupedPattern(updatedGroup);
        handleClearPreservedState();
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      setGroupEditingSelectorTarget({ path: target.path, target: 'operator' });
      onChange({
        target: {
          value: PatternBuilder.columnWithOperatorSelector(column.field),
        },
      } as React.ChangeEvent<HTMLInputElement>);
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      applyGroupedPattern,
      handleClearPreservedState,
      onChange,
    ]
  );

  const handleGroupEditOperatorSelect = useCallback(
    (operator: FilterOperator): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'operator') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupConditionOperator(
        baseGroup,
        target.path,
        operator.value
      );

      applyGroupedPattern(updatedGroup);
      handleClearPreservedState();
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      applyGroupedPattern,
      handleClearPreservedState,
    ]
  );

  const handleGroupEditJoinSelect = useCallback(
    (joinOp: JoinOperator): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'join') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupJoinAtPath(
        baseGroup,
        target.path,
        joinOp.value.toUpperCase() as 'AND' | 'OR'
      );

      applyGroupedPattern(updatedGroup);
      handleClearPreservedState();
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      applyGroupedPattern,
      handleClearPreservedState,
    ]
  );

  const handleGroupColumnSelect = useCallback(
    (column: SearchColumn) => {
      const newValue = replaceTrailingHash(value, `#${column.field} #`);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleGroupOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const newValue = replaceTrailingHash(value, `#${operator.value} `);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleGroupJoinSelect = useCallback(
    (joinOp: JoinOperator) => {
      const newValue = replaceTrailingHash(value, `#${joinOp.value} #`);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleColumnSelectWithGroups = useCallback(
    (column: SearchColumn) => {
      if (handleGroupEditColumnSelect(column)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupColumnSelect(column);
        return;
      }
      handleColumnSelect(column);
    },
    [
      isGroupingActive,
      handleGroupEditColumnSelect,
      handleGroupColumnSelect,
      handleColumnSelect,
    ]
  );

  const handleOperatorSelectWithGroups = useCallback(
    (operator: FilterOperator) => {
      if (handleGroupEditOperatorSelect(operator)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupOperatorSelect(operator);
        return;
      }
      handleOperatorSelect(operator);
    },
    [
      isGroupingActive,
      handleGroupEditOperatorSelect,
      handleGroupOperatorSelect,
      handleOperatorSelect,
    ]
  );

  const handleJoinOperatorSelectWithGroups = useCallback(
    (joinOp: JoinOperator) => {
      if (handleGroupEditJoinSelect(joinOp)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupJoinSelect(joinOp);
        return;
      }
      handleJoinOperatorSelect(joinOp);
    },
    [
      isGroupingActive,
      handleGroupEditJoinSelect,
      handleGroupJoinSelect,
      handleJoinOperatorSelect,
    ]
  );

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

  const scrollBadgesToEnd = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, []);

  useEffect(() => {
    if (selectedBadgeIndex !== null) return;
    if (editingBadge || editingGroupBadge) return;
    const inputEl = inputRef?.current;
    if (!inputEl) return;
    if (document.activeElement !== inputEl) return;
    requestAnimationFrame(scrollBadgesToEnd);
  }, [
    value,
    selectedBadgeIndex,
    editingBadge,
    editingGroupBadge,
    inputRef,
    scrollBadgesToEnd,
  ]);

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
        // Skip separator/group badges - they should not be selectable
        return (
          badge?.type !== 'separator' &&
          badge?.type !== 'groupOpen' &&
          badge?.type !== 'groupClose'
        );
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
    if (
      editingSelectorTarget?.target === 'operator' &&
      preservedSearchMode?.filterSearch &&
      !preservedSearchMode.filterSearch.isConfirmed
    ) {
      const preservation =
        extractMultiConditionPreservation(preservedSearchMode);
      if (preservation) {
        const newValue = PatternBuilder.buildNConditions(
          preservation.conditions,
          preservation.joins,
          preservation.isMultiColumn || false,
          preservedSearchMode.filterSearch.field,
          { confirmed: false, openSelector: false }
        );
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else {
        const columnName = preservedSearchMode.filterSearch.field;
        const newValue = buildColumnValue(columnName, 'plain');
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      }

      handleClearPreservedState();
      return;
    }

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
    editingSelectorTarget,
    preservedSearchMode,
    handleClearPreservedState,
  ]);

  const handleCloseJoinOperatorSelector = useCallback(() => {
    // If in edit mode, restore the original pattern instead of clearing
    if (tryRestorePreservedPattern()) {
      setCurrentJoinOperator(undefined);
      setEditingSelectorTarget(null);
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
    setCurrentJoinOperator(undefined);
    setEditingSelectorTarget(null);
  }, [
    value,
    onChange,
    tryRestorePreservedPattern,
    setCurrentJoinOperator,
    setEditingSelectorTarget,
  ]);

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
          clearConditionPart(0, 'value');
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
          // If no fromValue, fall through to clearConditionPart
          clearConditionPart(0, 'valueTo');
        } else if (editingBadge.conditionIndex === 1 && isValueField) {
          // Clearing condition[1] "from" value - clear condition[1] only
          clearConditionPart(1, 'value');
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
          clearConditionPart(1, 'valueTo');
        } else if (isValueToField && editingBadge.conditionIndex >= 2) {
          // [FIX] For N-condition (N >= 2) Between operator editing valueTo:
          // Transition to inline edit mode for value instead of just clearing
          const condIdx = editingBadge.conditionIndex;
          const conditions = stateToUse.filterSearch.conditions;
          const isMultiCondition = stateToUse.filterSearch.isMultiCondition;

          if (isMultiCondition && conditions && conditions[condIdx]) {
            const targetCond = conditions[condIdx];
            const targetValue = targetCond.value;

            if (targetCond.operator === 'inRange' && targetValue) {
              // Build pattern without valueTo for this condition
              const preservation =
                extractMultiConditionPreservation(stateToUse);
              if (preservation) {
                // Clear valueTo from the target condition
                preservation.conditions[condIdx].valueTo = undefined;

                // Build new pattern using PatternBuilder
                const newPattern = PatternBuilder.buildNConditions(
                  preservation.conditions,
                  preservation.joins,
                  preservation.isMultiColumn || false,
                  columnName,
                  { confirmed: true, openSelector: false }
                );

                onChange({
                  target: { value: newPattern },
                } as React.ChangeEvent<HTMLInputElement>);

                // Update preservedSearchMode to remove valueTo
                if (preservedSearchMode?.filterSearch?.conditions) {
                  const updatedConditions = [
                    ...preservedSearchMode.filterSearch.conditions,
                  ];
                  updatedConditions[condIdx] = {
                    ...updatedConditions[condIdx],
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

                // Transition to inline editing mode for value badge
                setTimeout(() => {
                  setEditingBadge({
                    conditionIndex: condIdx,
                    field: 'value',
                    value: targetValue,
                  });
                }, 10);
                setSelectedBadgeIndex(null);
                return;
              }
            }
          }
          // Fallback to generic clear if above conditions not met
          clearConditionPart(editingBadge.conditionIndex, editingBadge.field);
        } else {
          // For other cases, use generic clear
          clearConditionPart(editingBadge.conditionIndex, editingBadge.field);
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

      // Extract robust preservation data to determine if we're in multi-condition mode
      // This is more reliable than stateToUse.filterSearch.isMultiCondition which might be false for partial filters
      const preservation = extractMultiConditionPreservation(stateToUse);
      const isActuallyMulti =
        (preservation?.conditions?.length ?? 0) > 1 ||
        stateToUse.filterSearch.isMultiCondition;

      // CASE 1: Single-condition filter
      if (!isActuallyMulti) {
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
          preservedFilterRef.current = null;
        }

        onChange({
          target: { value: newPattern },
        } as React.ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);

        // Clear preserved state after inline edit completes (if not already cleared)
        setPreservedSearchMode(null);
        preservedFilterRef.current = null;

        // Ensure focus returns to search input after edit completes
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 50);
        return;
      }

      // CASE 2: Multi-condition filter (unified N-condition handling)
      // Use extracted preservation data for conditions and joins
      const conditions = preservation?.conditions || [];
      const joins = preservation?.joins || [
        stateToUse.filterSearch.joinOperator || 'AND',
      ];
      const isMultiColumn =
        preservation?.isMultiColumn || stateToUse.filterSearch.isMultiColumn;
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

      // [FIX] Special handling for Between operator editing value without valueTo
      // When user edits value (500) and presses Enter, should show [value][to] and wait for valueTo
      const editedCondition = updatedConditions[editingBadge.conditionIndex];
      const isBetweenValueWithoutValueTo =
        isEditingValue &&
        editedCondition.operator === 'inRange' &&
        !editedCondition.valueTo;

      if (isBetweenValueWithoutValueTo) {
        // Build pattern without confirmation, add #to suffix for valueTo input
        const basePattern = PatternBuilder.buildNConditions(
          updatedConditions,
          joins,
          isMultiColumn || false,
          columnName,
          { confirmed: false, openSelector: false }
        );
        const newPattern = `${basePattern} #to `;

        onChange({
          target: { value: newPattern },
        } as React.ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);
        setPreservedSearchMode(null);

        // Focus input at end to wait for valueTo input
        setTimeout(() => {
          if (inputRef?.current) {
            inputRef.current.focus();
            const len = newPattern.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 50);
        return;
      }

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
      preservedFilterRef.current = null;

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
      clearConditionPart,
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
      // Only apply reconstruction logic for real input-driven events coming
      // from the EnhancedSearchBar input element.
      //
      // Internal handlers (Delete key badge removal, selector picks, etc.) call
      // `onChange` with a lightweight `{ target: { value } }` object. Those
      // programmatic updates must pass through unchanged; otherwise this
      // reconstruction can corrupt multi-condition patterns.
      if (!(e.target instanceof HTMLInputElement)) {
        onChange(e);
        return;
      }

      // Any real typing/paste resets the "carry" from a delete session.
      deleteConfirmationCarryRef.current = false;

      const inputValue = e.target.value;
      if (
        inputValue.includes('#(') ||
        inputValue.includes('#)') ||
        searchMode.filterSearch?.filterGroup
      ) {
        onChange(e);
        return;
      }

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

  const handleStepBackDelete = useCallback((): boolean => {
    const liveValue = latestValueRef.current;
    const liveSearchMode = parseSearchValue(liveValue, memoizedColumns);
    const trimmedValue = liveValue.trimEnd();

    const setValue = (nextValue: string) => {
      latestValueRef.current = nextValue;
      onChange({
        target: { value: nextValue },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    if (!trimmedValue.startsWith('#')) {
      return false;
    }

    if (
      liveSearchMode.filterSearch?.filterGroup &&
      liveSearchMode.filterSearch.isConfirmed
    ) {
      // For grouped patterns we still support step-back delete (1 press = 1 badge).
      // useSearchState already prevents applying filters while parentheses are unbalanced.
    }

    const hasConfirmation =
      deleteConfirmationCarryRef.current || trimmedValue.endsWith('##');

    const stripConfirmation = (input: string): string => {
      const cleaned = input.trimEnd();
      return cleaned.endsWith('##') ? cleaned.slice(0, -2).trimEnd() : cleaned;
    };

    const collapseWhitespace = (input: string): string => {
      return input.replace(/\s{2,}/g, ' ').trimStart();
    };

    const ensureTrailingHash = (input: string): string => {
      const trimmed = input.trimEnd();
      if (!trimmed) return '#';
      return trimmed.endsWith('#') ? trimmed : `${trimmed} #`;
    };

    // Delete exactly 1 badge unit from the end. Group tokens (#( / #)) are
    // treated like normal badges (no auto-inserting #)).
    let working = stripConfirmation(trimmedValue).trimEnd();
    if (!working) return false;

    // Remove trailing selector marker first (invisible, not a badge).
    if (working.endsWith('#')) {
      working = working.replace(/\s*#\s*$/, '').trimEnd();
    }

    const finalize = (next: string): string => {
      const collapsed = collapseWhitespace(next);
      const trimmedEnd = collapsed.trimEnd();
      if (!trimmedEnd) return '';

      // Keep a whitespace after join tokens so they don't merge into values.
      if (/#(?:and|or)$/i.test(trimmedEnd)) {
        return `${trimmedEnd} `;
      }

      return trimmedEnd;
    };

    const maybeRestoreConfirmation = (next: string): string => {
      if (!hasConfirmation) return next;
      const trimmedNext = next.trimEnd();
      if (!trimmedNext) return '';

      if (trimmedNext.endsWith('#)')) {
        return trimmedNext.endsWith('##') ? trimmedNext : `${trimmedNext}##`;
      }

      // Only restore confirmation when the pattern ends with a value segment.
      // Never append after a hash token (e.g. "#contains") because it would break parsing.
      const endsWithHashToken = /(?:^|\s)#[^\s#]+$/.test(trimmedNext);
      if (endsWithHashToken) return trimmedNext;

      return trimmedNext.endsWith('##') ? trimmedNext : `${trimmedNext}##`;
    };

    // 1) Group tokens as explicit badges.
    if (working.endsWith('#)')) {
      const nextValue = maybeRestoreConfirmation(
        finalize(working.replace(/\s*#\)\s*$/, ''))
      );
      if (nextValue === liveValue) return false;
      handleClearPreservedState();
      setValue(nextValue);
      deleteConfirmationCarryRef.current = nextValue
        .trimStart()
        .startsWith('#');
      return true;
    }

    if (working.endsWith('#(')) {
      const nextValue = finalize(working.replace(/\s*#\(\s*$/, ''));
      if (nextValue === liveValue) return false;
      handleClearPreservedState();
      setValue(nextValue);
      deleteConfirmationCarryRef.current = nextValue
        .trimStart()
        .startsWith('#');
      return true;
    }

    // 2) Trailing hash token (column/operator/join/etc).
    const trailingTokenMatch = working.match(/(?:^|\s)#[^\s#]+$/);
    if (trailingTokenMatch) {
      const trailingToken = trailingTokenMatch[0].trim();
      const tokenLower = trailingToken.toLowerCase();
      const removed = working.replace(/(?:^|\s)#[^\s#]+$/, '').trimEnd();

      // Deleting a join badge should behave like removing that badge only,
      // not like opening a selector.
      if (tokenLower === '#and' || tokenLower === '#or') {
        const nextValue = maybeRestoreConfirmation(finalize(removed));
        if (nextValue === liveValue) return false;
        handleClearPreservedState();
        setValue(nextValue);
        deleteConfirmationCarryRef.current = nextValue
          .trimStart()
          .startsWith('#');
        return true;
      }

      // For #to we don't open a selector; it's just a delimiter.
      const shouldOpenSelector = tokenLower !== '#to';
      const nextValue = shouldOpenSelector
        ? ensureTrailingHash(finalize(removed))
        : finalize(removed);

      if (nextValue === liveValue) return false;
      handleClearPreservedState();
      setValue(nextValue);
      deleteConfirmationCarryRef.current = nextValue
        .trimStart()
        .startsWith('#');
      return true;
    }

    // 3) Trailing value segment (delete value only).
    const tokenRegex = /#\(|#\)|#[^\s#]+/g;
    let lastToken: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(working)) !== null) {
      lastToken = match;
    }
    if (!lastToken) return false;

    const cutIndex = lastToken.index + lastToken[0].length;
    const prefix = working.slice(0, cutIndex).trimEnd();

    // Ensure operators keep a trailing space so the next typed characters become the value.
    const finalizedPrefix = finalize(prefix);
    const nextValue = finalizedPrefix ? `${finalizedPrefix} ` : '';
    if (nextValue === liveValue) return false;
    handleClearPreservedState();
    setValue(nextValue);
    deleteConfirmationCarryRef.current = nextValue.trimStart().startsWith('#');
    return true;
  }, [handleClearPreservedState, memoizedColumns, onChange]);

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
    onStepBackDelete: handleStepBackDelete,
    onInvalidGroupOpen: triggerInputError,
    editConditionValue: editValueN,
    clearConditionPart,
    clearJoin,
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
      return normalizeGroupSearchTerm(cond1ColMatch ? cond1ColMatch[1] : '');
    }

    // Normal column selection
    if (value.startsWith('#')) {
      if (/#\(\s*$/.test(value) || /#(?:and|or)\s+#\(\s*$/i.test(value)) {
        return '';
      }
      const match = value.match(/^#([^:]*)/);
      return normalizeGroupSearchTerm(match ? match[1] : '');
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
    // When editing an existing join badge (confirmed pattern), we intentionally
    // allow both operators. The selected value will be applied to all joins.
    const isEditingJoinSelector =
      searchMode.showJoinOperatorSelector &&
      (isEditingJoinOperator || groupEditingSelectorTarget?.target === 'join');
    if (isEditingJoinSelector) {
      return JOIN_OPERATORS;
    }

    if (searchMode.showJoinOperatorSelector && activeGroupState.depth > 0) {
      if (activeGroupState.join) {
        return JOIN_OPERATORS.filter(
          op => op.value === activeGroupState.join!.toLowerCase()
        );
      }
      return JOIN_OPERATORS;
    }

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
  }, [
    searchMode.filterSearch,
    searchMode.partialJoin,
    searchMode.showJoinOperatorSelector,
    activeGroupState.depth,
    activeGroupState.join,
    isEditingJoinOperator,
    groupEditingSelectorTarget,
  ]);

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
    if (groupEditingSelectorTarget?.target === 'operator') {
      const baseGroup =
        preservedSearchMode?.filterSearch?.filterGroup ||
        searchMode.filterSearch?.filterGroup ||
        null;
      const node = baseGroup
        ? findGroupNodeAtPath(baseGroup, groupEditingSelectorTarget.path)
        : undefined;
      if (node?.kind === 'condition') {
        const index = operators.findIndex(op => op.value === node.operator);
        return index >= 0 ? index : undefined;
      }
    }

    // N-condition support: Check if editing condition N's operator (N >= 2)
    // In edit mode we often preserve the Nth condition in `partialConditions`
    // (because it may not be part of `filterSearch.conditions` yet).
    const editingIdx =
      editingSelectorTarget?.target === 'operator'
        ? editingSelectorTarget.conditionIndex
        : searchMode.activeConditionIndex;
    if (editingIdx !== undefined && editingIdx >= 2) {
      const condNOperator =
        preservedSearchMode?.filterSearch?.conditions?.[editingIdx]?.operator ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.operator;
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
    groupEditingSelectorTarget,
    preservedSearchMode,
    isEditingSecondOperator,
    operators,
    editingSelectorTarget,
    searchMode.activeConditionIndex,
    searchMode.filterSearch,
  ]);

  // Calculate default selected column index when in edit mode
  const defaultColumnIndex = useMemo(() => {
    if (groupEditingSelectorTarget?.target === 'column') {
      const baseGroup =
        preservedSearchMode?.filterSearch?.filterGroup ||
        searchMode.filterSearch?.filterGroup ||
        null;
      const node = baseGroup
        ? findGroupNodeAtPath(baseGroup, groupEditingSelectorTarget.path)
        : undefined;
      if (node?.kind === 'condition') {
        const columnField = node.field || node.column?.field;
        if (columnField) {
          const index = sortedColumns.findIndex(
            col => col.field === columnField
          );
          return index >= 0 ? index : undefined;
        }
      }
    }

    // N-condition support: Check if editing condition N's column (N >= 2)
    // In edit mode we often preserve the Nth condition in `partialConditions`
    // (because it may not be part of `filterSearch.conditions` yet).
    const editingIdx =
      editingSelectorTarget?.target === 'column'
        ? editingSelectorTarget.conditionIndex
        : searchMode.activeConditionIndex;
    if (editingIdx !== undefined && editingIdx >= 2) {
      const condNColumnField =
        preservedSearchMode?.filterSearch?.conditions?.[editingIdx]?.field ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.column?.field ??
        preservedSearchMode?.partialConditions?.[editingIdx]?.field;
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
    groupEditingSelectorTarget,
    preservedSearchMode,
    sortedColumns,
    isEditingSecondColumnState,
    editingSelectorTarget,
    searchMode.activeConditionIndex,
    searchMode.filterSearch,
  ]);

  // Determine if icon should be on the left (active state) // Show active animated mode when typing or focused filters exist
  const hasExplicitOperator =
    searchMode.isFilterMode ||
    searchMode.filterSearch?.isExplicitOperator ||
    searchMode.filterSearch?.isMultiCondition ||
    searchMode.showOperatorSelector ||
    searchMode.showJoinOperatorSelector ||
    searchMode.partialJoin ||
    searchMode.partialConditions?.[1]?.operator;

  const shouldShowLeftIcon =
    (((displayValue && !displayValue.startsWith('#')) || hasExplicitOperator) &&
      !searchMode.showColumnSelector) ||
    searchMode.showColumnSelector;

  return (
    <>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          <SearchIcon
            searchMode={searchMode}
            searchState={searchState}
            displayValue={displayValue}
            showError={showInputError}
          />

          <div
            ref={scrollAreaRef}
            className={`relative flex-1 min-w-0 flex flex-nowrap items-center gap-1.5 p-1.5 min-h-[46px] border transition-[border-color,box-shadow,padding] duration-200 ease-in-out rounded-lg overflow-x-auto overflow-y-hidden scrollbar-hide ${
              shouldShowLeftIcon ? 'pl-1.5' : 'pl-9'
            } ${
              showInputError || searchState === 'not-found'
                ? 'border-danger focus-within:border-danger focus-within:ring-3 focus-within:ring-red-100'
                : searchMode.showColumnSelector
                  ? 'border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100'
                  : searchMode.showJoinOperatorSelector
                    ? 'border-orange-300 ring-3 ring-orange-100 focus-within:border-orange-500 focus-within:ring-3 focus-within:ring-orange-100'
                    : searchMode.isFilterMode &&
                        searchMode.filterSearch &&
                        searchMode.filterSearch.operator === 'contains' &&
                        !searchMode.filterSearch.isExplicitOperator
                      ? 'border-purple-300 ring-3 ring-purple-100 focus-within:border-purple-500 focus-within:ring-3 focus-within:ring-purple-100'
                      : searchMode.isFilterMode && searchMode.filterSearch
                        ? 'border-blue-300 ring-3 ring-blue-100 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100'
                        : searchMode.showOperatorSelector ||
                            !!searchMode.partialJoin
                          ? 'border-blue-300 ring-3 ring-blue-100 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100'
                          : 'border-slate-300 focus-within:border-primary focus-within:ring-3 focus-within:ring-emerald-200'
            }`}
          >
            <SearchBadge
              value={value}
              searchMode={searchMode}
              badgesContainerRef={badgesContainerRef}
              setBadgeRef={setBadgeRef}
              clearConditionPart={clearConditionPart}
              clearJoin={clearJoin}
              clearAll={clearAll}
              editConditionPart={editConditionPart}
              editJoin={editJoin}
              editValueN={editValueN}
              insertConditionAfter={handleInsertConditionAfter}
              onHoverChange={handleHoverChange}
              onInvalidValue={triggerInputError}
              preservedSearchMode={preservedSearchMode}
              preserveBadgesOnJoinSelector={
                groupEditingSelectorTarget?.target === 'join' ||
                editingSelectorTarget?.target === 'join'
              }
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
              groupEditingBadge={editingGroupBadge}
              onGroupInlineValueChange={handleGroupInlineValueChange}
              onGroupInlineEditComplete={handleGroupInlineEditComplete}
              onGroupEditStart={handleGroupEditStart}
              onGroupEditColumn={handleGroupEditColumn}
              onGroupEditOperator={handleGroupEditOperator}
              onGroupEditJoin={handleGroupEditJoin}
              onGroupClearCondition={handleGroupClearCondition}
              onGroupClearGroup={handleGroupClearGroup}
              onGroupTokenClear={handleGroupTokenClear}
              editingConditionIndex={
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
              className="text-sm outline-none tracking-normal flex-grow min-w-[40px] bg-transparent border-none focus:ring-0 p-1 placeholder-slate-400"
              value={displayValue}
              onChange={wrappedInputChangeHandler}
              onKeyDown={wrappedKeyDownHandler}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        {resultsCount !== undefined && searchState === 'found' && (
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <TbSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      <ColumnSelector
        columns={sortedColumns}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelectWithGroups}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={searchTerm}
        defaultSelectedIndex={defaultColumnIndex}
        onHighlightChange={setPreviewColumn}
      />

      <OperatorSelector
        operators={operators}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelectWithGroups}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
        searchTerm={operatorSearchTerm}
        defaultSelectedIndex={defaultOperatorIndex}
        onHighlightChange={setPreviewOperator}
      />

      <JoinOperatorSelector
        operators={restrictedJoinOperators}
        isOpen={searchMode.showJoinOperatorSelector}
        onSelect={handleJoinOperatorSelectWithGroups}
        onClose={handleCloseJoinOperatorSelector}
        position={joinOperatorSelectorPosition}
        currentValue={
          activeGroupState.depth > 0
            ? activeGroupState.join
            : currentJoinOperator ||
              searchMode.partialJoin ||
              searchMode.filterSearch?.joinOperator
        }
      />
    </>
  );
};

export default EnhancedSearchBar;
