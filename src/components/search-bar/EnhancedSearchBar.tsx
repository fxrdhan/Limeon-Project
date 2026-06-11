import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TbSearch } from 'react-icons/tb';
import SearchBadge from './components/SearchBadge';
import SearchIcon from './components/SearchIcon';
import BaseSelector from './components/selectors/BaseSelector';
import { TooltipProvider } from '@/components/tooltip';
import {
  getSearchInputFrameClassName,
  getSearchPlaceholder,
  shouldShowSearchLeftIcon,
} from './searchBarVisualState';
import type { ActiveSelectorItem } from './selectorConfigs';
import { useActiveSearchSelector } from './hooks/useActiveSearchSelector';
import { useBadgeHandlers } from './hooks/useBadgeHandlers';
import { useBadgeKeyboardControls } from './hooks/useBadgeKeyboardControls';
import { useEnhancedSearchEditingState } from './hooks/useEnhancedSearchEditingState';
import { useEnhancedSearchScopeReset } from './hooks/useEnhancedSearchScopeReset';
import {
  type ConditionInsertTail,
  useConditionInsertFlow,
} from './hooks/useConditionInsertFlow';
import { useGroupSelectorEditing } from './hooks/useGroupSelectorEditing';
import { useGroupInlineEditing } from './hooks/useGroupInlineEditing';
import { useGroupedSelectionHandlers } from './hooks/useGroupedSelectionHandlers';
import { useInlineBadgeEditing } from './hooks/useInlineBadgeEditing';
import { useSearchInput } from './hooks/useSearchInput';
import { useSearchAutoTypeFocus } from './hooks/useSearchAutoTypeFocus';
import { useSearchDeleteStepBack } from './hooks/useSearchDeleteStepBack';
import { useSearchInputError } from './hooks/useSearchInputError';
import { useSearchInputKeyboardBridge } from './hooks/useSearchInputKeyboardBridge';
import { useSearchKeyboard } from './hooks/useSearchKeyboard';
import { useSearchPatternReconstruction } from './hooks/useSearchPatternReconstruction';
import { useSearchSelectorLifecycle } from './hooks/useSearchSelectorLifecycle';
import { useSearchSelectorOptions } from './hooks/useSearchSelectorOptions';
import { useSearchSelectorPopupState } from './hooks/useSearchSelectorPopupState';
import { useSearchSelectorPositions } from './hooks/useSearchSelectorPositions';
import { useSearchState } from './hooks/useSearchState';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';
import { EnhancedSearchBarProps, FilterGroup } from './types';
import {
  getGroupConditionBadgeId,
  getGroupJoinBadgeId,
} from './utils/groupBadgeIds';
import { getActiveGroupJoin } from './utils/groupEditingUtils';
import { PatternBuilder } from './utils/PatternBuilder';

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  stateScopeKey,
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
  autoFocusOnType = true,
  closeSelectorsSignal,
  onSelectorOpenChange,
  suppressSelectors = false,
  selectorOutsideIgnoreRefs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? internalInputRef;
  const memoizedColumns = useMemo(() => columns, [columns]);

  useSearchAutoTypeFocus(resolvedInputRef, autoFocusOnType);

  const {
    preservedFilterRef,
    preservedSearchMode,
    setPreservedSearchMode,
    groupEditDraftRef,
    groupEditingSelectorTarget,
    setGroupEditingSelectorTarget,
    editingSelectorTarget,
    setEditingSelectorTarget,
    isEditingSecondOperator,
    isEditingSecondColumnState,
    setIsEditingSecondOperator,
    currentJoinOperator,
    setCurrentJoinOperator,
    editingBadge,
    setEditingBadge,
    editingGroupBadge,
    setEditingGroupBadge,
    previewColumn,
    setPreviewColumn,
    previewOperator,
    setPreviewOperator,
    handleClearPreservedState,
  } = useEnhancedSearchEditingState();
  const { showInputError, triggerInputError, resetInputError } =
    useSearchInputError();
  const {
    deleteConfirmationCarryRef,
    resetDeleteConfirmationCarry,
    handleStepBackDelete,
  } = useSearchDeleteStepBack({
    value,
    onChange,
    onClearPreservedState: handleClearPreservedState,
    inputRef: resolvedInputRef,
  });

  const {
    selectedBadgeIndex,
    setSelectedBadgeIndex,
    badgeCount,
    badgesRef,
    handleBadgeCountChange,
    handleBadgesChange,
    handleBadgeSelect,
    handleBadgeEdit,
    handleBadgeDelete,
    handleBadgeNavigation,
    clearBadgeSelection,
    resetBadgeKeyboardState,
  } = useBadgeKeyboardControls({
    value,
    editingBadge,
    editingGroupBadge,
    inputRef: resolvedInputRef,
    scrollAreaRef,
  });

  // Ref to store interrupted selector state for restoration after inline edit
  // When user clicks a value badge while selector is open, we save the pattern
  // to restore the selector after inline edit completes
  // 'partial' type is used when there's partial multi-column state but no selector open
  const interruptedSelectorRef = useRef<{
    type: 'column' | 'operator' | 'join' | 'partial';
    originalPattern: string;
  } | null>(null);

  // ============ Insert-In-The-Middle (Value Badge Plus) ============
  // When user clicks the plus icon on a value badge, we temporarily truncate
  // the tail (join+conditions to the right), let user build a new condition,
  // then re-attach the tail after the new condition is confirmed.
  const insertTailRef = useRef<ConditionInsertTail | null>(null);
  const [isInsertFlowActive, setIsInsertFlowActive] = useState(false);

  const { searchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
    isEditMode: preservedSearchMode !== null, // In edit mode when preserving badges
    suspendFilterUpdates: isInsertFlowActive,
  });

  const hasGroupTokens = useMemo(
    () => value.includes('#(') || value.includes('#)'),
    [value]
  );
  const isGroupingActive = hasGroupTokens;
  const activeGroupState = useMemo(() => getActiveGroupJoin(value), [value]);

  // Badge refs are used for dynamic selector positioning.
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
    inputRef: resolvedInputRef,
  });

  const activeConditionIndex = searchMode.activeConditionIndex ?? 0;

  const {
    columnSelectorPosition,
    operatorSelectorPosition,
    joinOperatorSelectorPosition,
    isSelectingConditionNColumn,
    isEditingJoinOperator,
  } = useSearchSelectorPositions({
    searchMode,
    preservedSearchMode,
    editingSelectorTarget,
    groupEditingSelectorTarget,
    activeConditionIndex,
    containerRef,
    scrollAreaRef,
    inputRef: resolvedInputRef,
    getLazyColumnRef,
    getLazyOperatorRef,
    getLazyJoinRef,
    getLazyBadgeRef,
    getGroupConditionBadgeId,
    getGroupJoinBadgeId,
  });

  const {
    dismissedSelectorValue,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    handleInputFocus,
    handleInputClick,
  } = useSearchSelectorLifecycle({
    value,
    memoizedColumns,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    groupEditDraftRef,
    setGroupEditingSelectorTarget,
    setCurrentJoinOperator,
    setEditingSelectorTarget,
    onClearPreservedState: handleClearPreservedState,
    onChange,
    onClearSearch,
    onFocus,
    closeSelectorsSignal,
    suppressSelectors,
    editingSelectorTarget,
  });

  useEnhancedSearchScopeReset({
    stateScopeKey,
    onClearPreservedState: handleClearPreservedState,
    resetInputError,
    resetBadgeKeyboardState,
    setEditingBadge,
    setEditingGroupBadge,
    setPreviewColumn,
    setPreviewOperator,
    interruptedSelectorRef,
    insertTailRef,
    resetDeleteConfirmationCarry,
    setIsInsertFlowActive,
  });

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
    inputRef: resolvedInputRef,
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

  const { handleInsertConditionAfter } = useConditionInsertFlow({
    value,
    searchMode,
    preservedSearchMode,
    isInsertFlowActive,
    setIsInsertFlowActive,
    insertTailRef,
    interruptedSelectorRef,
    setEditingBadge,
    setSelectedBadgeIndex,
    onChange,
    inputRef: resolvedInputRef,
  });

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

  const {
    handleGroupEditStart,
    handleGroupInlineValueChange,
    handleGroupInlineEditComplete,
  } = useGroupInlineEditing({
    editingGroupBadge,
    setEditingGroupBadge,
    searchMode,
    preservedSearchMode,
    applyGroupedPattern,
  });

  // Use centralized selection handlers for column/operator/join selection
  const { handleColumnSelect, handleOperatorSelect, handleJoinOperatorSelect } =
    useSelectionHandlers({
      value,
      onChange,
      inputRef: resolvedInputRef,
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

  const {
    handleGroupEditColumn,
    handleGroupEditOperator,
    handleGroupEditJoin,
    handleGroupClearCondition,
    handleGroupClearGroup,
    handleGroupTokenClear,
    handleGroupEditColumnSelect,
    handleGroupEditOperatorSelect,
    handleGroupEditJoinSelect,
    handleGroupColumnSelect,
    handleGroupOperatorSelect,
    handleGroupJoinSelect,
  } = useGroupSelectorEditing({
    value,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    groupEditDraftRef,
    groupEditingSelectorTarget,
    setGroupEditingSelectorTarget,
    applyGroupedPattern,
    handleClearPreservedState,
    onChange,
    clearAll,
    inputRef: resolvedInputRef,
  });

  const {
    handleColumnSelectWithGroups,
    handleOperatorSelectWithGroups,
    handleJoinOperatorSelectWithGroups,
  } = useGroupedSelectionHandlers({
    isGroupingActive,
    handleColumnSelect,
    handleOperatorSelect,
    handleJoinOperatorSelect,
    handleGroupEditColumnSelect,
    handleGroupEditOperatorSelect,
    handleGroupEditJoinSelect,
    handleGroupColumnSelect,
    handleGroupOperatorSelect,
    handleGroupJoinSelect,
  });

  const { handleInlineValueChange, handleInlineEditComplete } =
    useInlineBadgeEditing({
      editingBadge,
      setEditingBadge,
      searchMode,
      preservedSearchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      interruptedSelectorRef,
      onChange,
      clearConditionPart,
      inputRef: resolvedInputRef,
      setSelectedBadgeIndex,
    });

  const handleOnChangeWithReconstruction = useSearchPatternReconstruction({
    onChange,
    searchMode,
    preservedFilterRef,
    setPreservedSearchMode,
    deleteConfirmationCarryRef,
  });

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
  });

  const {
    handleNavigateEdit,
    handleFocusInputFromBadge,
    wrappedKeyDownHandler,
    wrappedInputChangeHandler,
  } = useSearchInputKeyboardBridge({
    editingBadge,
    handleInlineEditComplete,
    selectedBadgeIndex,
    badgeCount,
    badgesRef,
    setSelectedBadgeIndex,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    searchMode,
    onChange,
    inputRef: resolvedInputRef,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    handleBadgeEdit,
    handleBadgeDelete,
    handleBadgeNavigation,
    handleInputKeyDown,
    clearBadgeSelection,
    handleInputChange,
  });

  const searchPlaceholder = getSearchPlaceholder(
    showTargetedIndicator,
    placeholder
  );

  const {
    searchTerm,
    sortedColumns,
    restrictedJoinOperators,
    operators,
    defaultOperatorIndex,
    defaultColumnIndex,
    defaultJoinOperatorIndex,
  } = useSearchSelectorOptions({
    value,
    columns,
    searchMode,
    preservedSearchMode,
    isSelectingConditionNColumn,
    activeGroupState,
    isEditingJoinOperator,
    groupEditingSelectorTarget,
    editingSelectorTarget,
    isEditingSecondOperator,
    isEditingSecondColumnState,
    currentJoinOperator,
  });

  const activeSelector = useActiveSearchSelector({
    searchMode,
    activeConditionIndex,
    editingSelectorTarget,
    groupEditingSelectorTarget,
    sortedColumns,
    operators,
    restrictedJoinOperators,
    handleColumnSelectWithGroups,
    handleOperatorSelectWithGroups,
    handleJoinOperatorSelectWithGroups,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    columnSelectorPosition,
    operatorSelectorPosition,
    joinOperatorSelectorPosition,
    searchTerm,
    operatorSearchTerm,
    defaultColumnIndex,
    defaultOperatorIndex,
    defaultJoinOperatorIndex,
    setPreviewColumn,
    setPreviewOperator,
  });

  const isOpeningInitialColumnSelector =
    searchMode.showColumnSelector &&
    !isSelectingConditionNColumn &&
    preservedSearchMode === null &&
    editingSelectorTarget?.target !== 'column' &&
    groupEditingSelectorTarget?.target !== 'column';
  const {
    selectorIgnoredOutsidePressRefs,
    isSelectorPopupVisible,
    isSelectorPopupVisuallyReady,
  } = useSearchSelectorPopupState({
    activeSelector,
    value,
    dismissedSelectorValue,
    suppressSelectors,
    isOpeningInitialColumnSelector,
    containerRef,
    scrollAreaRef,
    selectorOutsideIgnoreRefs,
    onSelectorOpenChange,
  });
  const visibleActiveSelector =
    isSelectorPopupVisible && activeSelector ? activeSelector : null;

  const shouldShowLeftIcon = shouldShowSearchLeftIcon(displayValue, searchMode);
  const searchInputFrameClassName = getSearchInputFrameClassName({
    shouldShowLeftIcon,
    showInputError,
    searchState,
    searchMode,
  });

  return (
    <TooltipProvider>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          <SearchIcon
            searchMode={searchMode}
            searchState={searchState}
            displayValue={displayValue}
            showError={showInputError}
          />

          <div ref={scrollAreaRef} className={searchInputFrameClassName}>
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
              onBadgeSelect={handleBadgeSelect}
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
              ref={resolvedInputRef}
              type="text"
              aria-label="Search"
              placeholder={searchPlaceholder}
              className="text-sm outline-none tracking-normal flex-[1_0_120px] min-w-[40px] bg-transparent border-none focus:ring-0 py-1 pr-1 pl-2 placeholder-slate-400"
              value={displayValue}
              onChange={wrappedInputChangeHandler}
              onKeyDown={wrappedKeyDownHandler}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
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

      {visibleActiveSelector && (
        <BaseSelector<ActiveSelectorItem>
          items={visibleActiveSelector.items}
          isOpen={true}
          onSelect={visibleActiveSelector.onSelect}
          onClose={visibleActiveSelector.onClose}
          position={visibleActiveSelector.position}
          searchTerm={visibleActiveSelector.searchTerm}
          config={visibleActiveSelector.config}
          defaultSelectedIndex={visibleActiveSelector.defaultSelectedIndex}
          onHighlightChange={visibleActiveSelector.onHighlightChange}
          contentKey={visibleActiveSelector.contentKey}
          outsideClickIgnoreRefs={selectorIgnoredOutsidePressRefs}
          isVisuallyReady={isSelectorPopupVisuallyReady}
        />
      )}
    </TooltipProvider>
  );
};

export default EnhancedSearchBar;
