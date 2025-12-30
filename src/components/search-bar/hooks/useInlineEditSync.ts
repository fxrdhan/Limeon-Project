import React, { useCallback, useState } from 'react';
import { EnhancedSearchState } from '../types';
import type { BadgeConfig } from '../types/badge';
import { PatternBuilder } from '../utils/PatternBuilder';
import { extractMultiConditionPreservation } from '../utils/handlerHelpers';
import { restoreConfirmedPattern } from '../utils/patternRestoration';

interface UseInlineEditSyncProps {
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  clearConditionPart: (
    conditionIndex: number,
    target: 'value' | 'valueTo'
  ) => void;
  setSelectedBadgeIndex: (index: number | null) => void;
  badgeCount: number;
  badgesRef: React.MutableRefObject<BadgeConfig[]>;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector: () => void;
}

export const useInlineEditSync = ({
  searchMode,
  preservedSearchMode,
  setPreservedSearchMode,
  onChange,
  inputRef,
  clearConditionPart,
  setSelectedBadgeIndex,
  badgeCount,
  badgesRef,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
}: UseInlineEditSyncProps) => {
  // State for inline badge editing
  const [editingBadge, setEditingBadge] = useState<{
    conditionIndex: number;
    field: 'value' | 'valueTo';
    value: string;
  } | null>(null);

  // Handle inline value change (user typing in inline input)
  const handleInlineValueChange = useCallback((newValue: string) => {
    setEditingBadge(prev => (prev ? { ...prev, value: newValue } : null));
  }, []);

  // Handle inline edit complete (Enter/Escape/Blur)
  const handleInlineEditComplete = useCallback(
    (finalValue?: string) => {
      const stateToUse = preservedSearchMode || searchMode;

      if (!editingBadge || !stateToUse.filterSearch) {
        setEditingBadge(null);
        return;
      }

      const valueToUse =
        finalValue !== undefined ? finalValue : editingBadge.value;

      // If value is empty, treat it as clear action
      if (!valueToUse || valueToUse.trim() === '') {
        setEditingBadge(null);

        const isFirstCondition = editingBadge.conditionIndex === 0;
        const isValueField = editingBadge.field === 'value';
        const isValueToField = editingBadge.field === 'valueTo';

        if (isFirstCondition && isValueField) {
          clearConditionPart(0, 'value');
          setSelectedBadgeIndex(null);
        } else if (isFirstCondition && isValueToField) {
          const fromValue = stateToUse.filterSearch.value;
          if (fromValue) {
            const columnName = stateToUse.filterSearch.field;
            const operator = stateToUse.filterSearch.operator;
            const newPattern = `#${columnName} #${operator} ${fromValue}##`;
            onChange({
              target: { value: newPattern },
            } as React.ChangeEvent<HTMLInputElement>);

            if (preservedSearchMode?.filterSearch) {
              const updatedFilter = {
                ...preservedSearchMode.filterSearch,
                valueTo: undefined,
              };
              if (updatedFilter.isMultiCondition && updatedFilter.conditions) {
                updatedFilter.conditions = [...updatedFilter.conditions];
                updatedFilter.conditions[0] = {
                  ...updatedFilter.conditions[0],
                  valueTo: undefined,
                };
              }
              setPreservedSearchMode({
                ...preservedSearchMode,
                filterSearch: updatedFilter,
              });
            }

            setTimeout(() => {
              setEditingBadge({
                conditionIndex: 0,
                field: 'value',
                value: fromValue,
              });
            }, 10);
            return;
          }
          clearConditionPart(0, 'valueTo');
        } else {
          clearConditionPart(editingBadge.conditionIndex, editingBadge.field);
        }

        setSelectedBadgeIndex(null);
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 50);
        return;
      }

      const columnName = stateToUse.filterSearch.field;
      const preservation = extractMultiConditionPreservation(stateToUse);
      const isActuallyMulti =
        (preservation?.conditions?.length ?? 0) > 1 ||
        stateToUse.filterSearch.isMultiCondition;

      if (!isActuallyMulti) {
        let newPattern: string;
        const operator = stateToUse.filterSearch.operator;

        if (operator === 'inRange') {
          const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
          const isEditingFirstValue =
            editingBadge.conditionIndex === 0 && editingBadge.field === 'value';

          if (dashMatch && isEditingFirstValue) {
            const [, fromVal, toVal] = dashMatch;
            if (fromVal.trim() && toVal.trim()) {
              newPattern = `#${columnName} #${operator} ${fromVal.trim()} #to ${toVal.trim()}##`;
              onChange({
                target: { value: newPattern },
              } as React.ChangeEvent<HTMLInputElement>);
              setEditingBadge(null);
              setPreservedSearchMode(null);
              setTimeout(() => inputRef?.current?.focus(), 50);
              return;
            }
          }

          if (stateToUse.filterSearch.valueTo) {
            if (isEditingFirstValue) {
              newPattern = `#${columnName} #${operator} ${valueToUse} #to ${stateToUse.filterSearch.valueTo}##`;
            } else {
              newPattern = `#${columnName} #${operator} ${stateToUse.filterSearch.value} #to ${valueToUse}##`;
            }
          } else if (isEditingFirstValue) {
            newPattern = `#${columnName} #${operator} ${valueToUse} #to `;
            onChange({
              target: { value: newPattern },
            } as React.ChangeEvent<HTMLInputElement>);
            setEditingBadge(null);
            setTimeout(() => {
              if (inputRef?.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(
                  newPattern.length,
                  newPattern.length
                );
              }
            }, 50);
            return;
          } else {
            newPattern = `#${columnName} #${operator} ${valueToUse}##`;
          }
        } else {
          newPattern = `#${columnName} #${operator} ${valueToUse}##`;
        }

        onChange({
          target: { value: newPattern },
        } as React.ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);
        setPreservedSearchMode(null);
        setTimeout(() => inputRef?.current?.focus(), 50);
      } else {
        const conditions = preservation?.conditions || [];
        const joins = preservation?.joins || [
          stateToUse.filterSearch.joinOperator || 'AND',
        ];
        const isMultiColumn =
          preservation?.isMultiColumn ||
          stateToUse.filterSearch.isMultiCondition;

        const updatedConditions = conditions.map((cond, idx) => {
          if (idx === editingBadge.conditionIndex) {
            let newValue =
              editingBadge.field === 'value' ? valueToUse : cond.value;
            let newValueTo =
              editingBadge.field === 'valueTo' ? valueToUse : cond.valueTo;

            if (cond.operator === 'inRange' && editingBadge.field === 'value') {
              const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);
              if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
                newValue = dashMatch[1].trim();
                newValueTo = dashMatch[2].trim();
              }
            }

            return { ...cond, value: newValue || '', valueTo: newValueTo };
          }
          return cond;
        });

        const editedCondition = updatedConditions[editingBadge.conditionIndex];
        if (
          editingBadge.field === 'value' &&
          editedCondition.operator === 'inRange' &&
          !editedCondition.valueTo
        ) {
          const basePattern = PatternBuilder.buildNConditions(
            updatedConditions,
            joins,
            isMultiColumn || false,
            columnName,
            { confirmed: false }
          );
          const newPattern = `${basePattern} #to `;
          onChange({
            target: { value: newPattern },
          } as React.ChangeEvent<HTMLInputElement>);
          setEditingBadge(null);
          setPreservedSearchMode(null);
          setTimeout(() => {
            if (inputRef?.current) {
              inputRef.current.focus();
              inputRef.current.setSelectionRange(
                newPattern.length,
                newPattern.length
              );
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
        setPreservedSearchMode(null);
        setTimeout(() => inputRef?.current?.focus(), 50);
      }
    },
    [
      editingBadge,
      searchMode,
      preservedSearchMode,
      onChange,
      clearConditionPart,
      inputRef,
      setPreservedSearchMode,
      setSelectedBadgeIndex,
    ]
  );

  // Handle Ctrl+E/Ctrl+Shift+E navigation during inline edit
  const handleNavigateEdit = useCallback(
    (direction: 'left' | 'right', selectedIdx: number | null) => {
      const currentValue = editingBadge?.value;
      if (editingBadge) {
        handleInlineEditComplete(currentValue);
      }

      setTimeout(() => {
        if (badgeCount === 0) return;

        let targetIndex: number;
        if (selectedIdx === null) {
          targetIndex = direction === 'left' ? badgeCount - 1 : 0;
        } else {
          if (direction === 'left') {
            targetIndex = selectedIdx - 1;
            if (targetIndex < 0) targetIndex = badgeCount - 1;
          } else {
            targetIndex = selectedIdx + 1;
            if (targetIndex >= badgeCount) targetIndex = 0;
          }
        }

        let attempts = 0;
        while (attempts < badgeCount) {
          const badge = badgesRef.current[targetIndex];
          if (badge?.canEdit && badge?.onEdit) {
            setSelectedBadgeIndex(targetIndex);
            badge.onEdit();
            return;
          }
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
    [
      editingBadge,
      handleInlineEditComplete,
      badgeCount,
      badgesRef,
      setSelectedBadgeIndex,
    ]
  );

  // Handle Ctrl+I from Badge component during inline edit
  const handleFocusInputFromBadge = useCallback(
    (selectedIdx: number | null) => {
      const currentValue = editingBadge?.value;
      if (editingBadge) {
        handleInlineEditComplete(currentValue);
      }

      if (selectedIdx !== null) {
        setSelectedBadgeIndex(null);
      }

      setTimeout(() => {
        if (preservedSearchMode?.filterSearch) {
          const filter = preservedSearchMode.filterSearch;
          const columnName = filter.field;
          let restoredPattern: string;

          if (filter.isConfirmed) {
            restoredPattern = restoreConfirmedPattern(filter);
          } else {
            if (filter.operator && filter.isExplicitOperator) {
              restoredPattern = `#${columnName} #${filter.operator} `;
            } else {
              restoredPattern = `#${columnName} `;
            }
          }

          onChange({
            target: { value: restoredPattern },
          } as React.ChangeEvent<HTMLInputElement>);
          setPreservedSearchMode(null);
        } else {
          if (searchMode.showColumnSelector) handleCloseColumnSelector();
          if (searchMode.showOperatorSelector) handleCloseOperatorSelector();
          if (searchMode.showJoinOperatorSelector)
            handleCloseJoinOperatorSelector();
        }

        inputRef?.current?.focus();
      }, 50);
    },
    [
      editingBadge,
      handleInlineEditComplete,
      setSelectedBadgeIndex,
      preservedSearchMode,
      onChange,
      searchMode,
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
      inputRef,
      setPreservedSearchMode,
    ]
  );

  return {
    editingBadge,
    setEditingBadge,
    handleInlineValueChange,
    handleInlineEditComplete,
    handleNavigateEdit,
    handleFocusInputFromBadge,
  };
};
