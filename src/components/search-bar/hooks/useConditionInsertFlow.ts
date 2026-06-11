import {
  useCallback,
  useEffect,
  type ChangeEvent,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { EnhancedSearchState } from '../types';
import {
  extractMultiConditionPreservation,
  setFilterValue,
  type PreservedCondition,
} from '../utils/handlerHelpers';
import { PatternBuilder } from '../utils/PatternBuilder';
import { isFilterSearchValid } from '../utils/validationUtils';
import type { InlineEditingBadgeState } from './useInlineBadgeEditing';

export interface ConditionInsertTail {
  afterConditionIndex: number;
  tailConditions: PreservedCondition[];
  tailJoins: ('AND' | 'OR')[];
  defaultField: string;
  isMultiColumn: boolean;
}

interface InterruptedSelectorState {
  type: 'column' | 'operator' | 'join' | 'partial';
  originalPattern: string;
}

interface UseConditionInsertFlowParams {
  value: string;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  isInsertFlowActive: boolean;
  setIsInsertFlowActive: Dispatch<SetStateAction<boolean>>;
  insertTailRef: MutableRefObject<ConditionInsertTail | null>;
  interruptedSelectorRef: MutableRefObject<InterruptedSelectorState | null>;
  setEditingBadge: Dispatch<SetStateAction<InlineEditingBadgeState | null>>;
  setSelectedBadgeIndex: Dispatch<SetStateAction<number | null>>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const withFallback = <T>(target: T | undefined, fallback: T): T =>
  target ?? fallback;

const withEmptyString = (target: string | undefined): string =>
  withFallback(target, '');

export const useConditionInsertFlow = ({
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
  inputRef,
}: UseConditionInsertFlowParams) => {
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

      if (conditionIndex < 0 || conditionIndex >= conditions.length - 1) {
        return;
      }

      const prefixConditions = conditions.slice(0, conditionIndex + 1);
      const prefixJoins = joins.slice(0, conditionIndex);
      const tailConditions = conditions.slice(conditionIndex + 1);
      const tailJoins = joins.slice(conditionIndex);

      const defaultField = withFallback(
        prefixConditions[0]?.field,
        filter.field
      );

      insertTailRef.current = {
        afterConditionIndex: conditionIndex,
        tailConditions,
        tailJoins,
        defaultField,
        isMultiColumn: withFallback(preservation.isMultiColumn, false),
      };

      setIsInsertFlowActive(true);
      setEditingBadge(null);
      setSelectedBadgeIndex(null);
      interruptedSelectorRef.current = null;

      const newValue = PatternBuilder.buildNConditions(
        prefixConditions.map(condition => ({
          field: condition.field,
          operator: withEmptyString(condition.operator),
          value: withEmptyString(condition.value),
          valueTo: condition.valueTo,
        })),
        prefixJoins,
        withFallback(preservation.isMultiColumn, false),
        defaultField,
        {
          confirmed: false,
          openSelector: true,
        }
      );

      setFilterValue(newValue, onChange, inputRef);
    },
    [
      inputRef,
      insertTailRef,
      interruptedSelectorRef,
      onChange,
      preservedSearchMode,
      searchMode,
      setEditingBadge,
      setIsInsertFlowActive,
      setSelectedBadgeIndex,
    ]
  );

  useEffect(() => {
    if (!isInsertFlowActive) return;
    const tail = insertTailRef.current;
    if (!tail) return;
    let resetInsertFlowFrame: number | null = null;
    const scheduleInsertFlowReset = () => {
      resetInsertFlowFrame = requestAnimationFrame(() => {
        resetInsertFlowFrame = null;
        setIsInsertFlowActive(false);
      });
    };
    const cleanupInsertFlowReset = () => {
      if (resetInsertFlowFrame !== null) {
        cancelAnimationFrame(resetInsertFlowFrame);
      }
    };

    const trimmed = value.trim();
    if (!trimmed || !trimmed.startsWith('#')) {
      insertTailRef.current = null;
      scheduleInsertFlowReset();
      return cleanupInsertFlowReset;
    }

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
    const insertionJoin = withFallback(
      preservation.joins[preservation.joins.length - 1],
      withFallback(tail.tailJoins[0], 'AND')
    );

    const mergedJoins = Array(Math.max(mergedConditions.length - 1, 0)).fill(
      insertionJoin
    ) as ('AND' | 'OR')[];

    const firstField = withFallback(
      mergedConditions[0]?.field,
      tail.defaultField
    );
    const mergedIsMultiColumn =
      tail.isMultiColumn ||
      mergedConditions.some((condition, index) =>
        index === 0
          ? false
          : condition.field !== undefined && condition.field !== firstField
      );

    const finalValue = PatternBuilder.buildNConditions(
      mergedConditions.map(condition => ({
        field: condition.field,
        operator: withEmptyString(condition.operator),
        value: withEmptyString(condition.value),
        valueTo: condition.valueTo,
      })),
      mergedJoins,
      mergedIsMultiColumn,
      firstField,
      { confirmed: true }
    );

    insertTailRef.current = null;
    scheduleInsertFlowReset();

    setFilterValue(finalValue, onChange, inputRef);
    return cleanupInsertFlowReset;
  }, [
    inputRef,
    insertTailRef,
    isInsertFlowActive,
    onChange,
    searchMode,
    setIsInsertFlowActive,
    value,
  ]);

  return { handleInsertConditionAfter };
};
