import { useCallback, type RefObject } from 'react';
import type { JoinOperator } from '../../operators';
import type { EnhancedSearchState } from '../../types';
import {
  extractMultiConditionPreservation,
  setFilterValue,
  type PreservedFilter,
} from '../../utils/handlerHelpers';
import { PatternBuilder } from '../../utils/PatternBuilder';

interface EditingSelectorTarget {
  conditionIndex: number;
  target: 'column' | 'operator' | 'join';
}

interface UseJoinOperatorSelectionParams {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  searchMode: EnhancedSearchState;
  preservedFilterRef: RefObject<PreservedFilter | null>;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  editingSelectorTarget: EditingSelectorTarget | null;
}

export const useJoinOperatorSelection = ({
  onChange,
  inputRef,
  searchMode,
  preservedFilterRef,
  setPreservedSearchMode,
  editingSelectorTarget,
}: UseJoinOperatorSelectionParams) => {
  const handleJoinOperatorSelect = useCallback(
    (joinOp: JoinOperator) => {
      const preserved = preservedFilterRef.current;
      const joinOperator = joinOp.value.toUpperCase() as 'AND' | 'OR';
      const isEditingJoin = editingSelectorTarget?.target === 'join';

      let newValue: string;

      const filterHasValueTo =
        searchMode.filterSearch?.valueTo ||
        searchMode.filterSearch?.conditions?.[0]?.valueTo;
      const preservedHasValueTo = preserved?.conditions?.[0]?.valueTo;
      const shouldUseFilterInstead =
        filterHasValueTo &&
        !preservedHasValueTo &&
        searchMode.filterSearch?.isConfirmed;

      if (
        preserved &&
        preserved.conditions &&
        preserved.conditions.length > 0 &&
        !shouldUseFilterInstead
      ) {
        const conditions = preserved.conditions;
        const defaultField = conditions[0]?.field || '';
        const isMultiColumn = preserved.isMultiColumn || false;

        const joinCount = Math.max(conditions.length - 1, 0);
        const newJoins: ('AND' | 'OR')[] = isEditingJoin
          ? Array(joinCount).fill(joinOperator)
          : [...(preserved.joins || [])];

        if (!isEditingJoin) {
          const targetJoinIndex = joinCount > 0 ? joinCount - 1 : 0;
          while (newJoins.length <= targetJoinIndex) {
            newJoins.push('AND');
          }
          newJoins[targetJoinIndex] = joinOperator;
        }

        const allConditionsComplete = conditions.every(
          condition => condition.value && condition.value.trim() !== ''
        );

        newValue = PatternBuilder.buildNConditions(
          conditions.map(condition => ({
            field: condition.field,
            operator: condition.operator || '',
            value: condition.value || '',
            valueTo: condition.valueTo,
          })),
          newJoins,
          isMultiColumn,
          defaultField,
          { confirmed: allConditionsComplete }
        );

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      } else if (searchMode.filterSearch?.isConfirmed) {
        const filter = searchMode.filterSearch;

        const extraction = extractMultiConditionPreservation(searchMode);
        preservedFilterRef.current = extraction;

        if (
          filter.isMultiCondition &&
          filter.conditions &&
          filter.conditions.length > 0
        ) {
          const conditions = filter.conditions;
          const existingJoins = filter.joins || [filter.joinOperator || 'AND'];
          const isMultiColumn = filter.isMultiColumn || false;
          const defaultField = conditions[0]?.field || filter.field;

          const basePattern = PatternBuilder.buildNConditions(
            conditions.map(condition => ({
              field: condition.field,
              operator: condition.operator,
              value: condition.value,
              valueTo: condition.valueTo,
            })),
            existingJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );

          newValue = `${basePattern} #${joinOperator.toLowerCase()} #`;
        } else if (filter.valueTo) {
          newValue = `#${filter.field} #${filter.operator} ${filter.value} #to ${filter.valueTo} #${joinOperator.toLowerCase()} #`;
        } else {
          newValue = PatternBuilder.partialMulti(
            filter.field,
            filter.operator,
            filter.value,
            joinOperator
          );
        }
      } else {
        return;
      }

      setFilterValue(newValue, onChange, inputRef);
    },
    [
      editingSelectorTarget,
      inputRef,
      onChange,
      preservedFilterRef,
      searchMode,
      setPreservedSearchMode,
    ]
  );

  return { handleJoinOperatorSelect };
};
