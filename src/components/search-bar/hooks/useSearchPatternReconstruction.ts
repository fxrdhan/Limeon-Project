import { useCallback, type ChangeEvent, type MutableRefObject } from 'react';
import type { EnhancedSearchState } from '../types';
import type { PreservedFilter } from '../utils/handlerHelpers';

interface UseSearchPatternReconstructionParams {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  searchMode: EnhancedSearchState;
  preservedFilterRef: MutableRefObject<PreservedFilter | null>;
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  deleteConfirmationCarryRef: MutableRefObject<boolean>;
}

const withFallback = <T>(value: T | undefined, fallback: T): T =>
  value ?? fallback;

const patchInputValue = (
  e: ChangeEvent<HTMLInputElement>,
  value: string
): ChangeEvent<HTMLInputElement> => {
  const patchedTarget = {
    name: e.target.name,
    value,
  } as EventTarget & HTMLInputElement;

  return {
    ...e,
    target: patchedTarget,
    currentTarget: patchedTarget,
  } as ChangeEvent<HTMLInputElement>;
};

export const useSearchPatternReconstruction = ({
  onChange,
  searchMode,
  preservedFilterRef,
  setPreservedSearchMode,
  deleteConfirmationCarryRef,
}: UseSearchPatternReconstructionParams) => {
  return useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!(e.target instanceof HTMLInputElement)) {
        onChange(e);
        return;
      }

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
        !preservedFilterRef.current &&
        !isBuildingConditionN &&
        !hasPartialConditionsBeyondConfirmed
      ) {
        const columnName = searchMode.filterSearch.field;
        const firstCondition = searchMode.filterSearch.conditions[0];
        const secondCond = searchMode.filterSearch.conditions[1];
        const joinOp = withFallback(
          searchMode.filterSearch.joinOperator,
          'AND'
        );

        const modifiedSearchMode: EnhancedSearchState = {
          ...searchMode,
          filterSearch: {
            ...searchMode.filterSearch,
            conditions: [
              firstCondition,
              {
                ...secondCond,
                value: '',
              },
            ],
          },
        };

        setPreservedSearchMode(modifiedSearchMode);

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

        const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp.toLowerCase()} #${secondCond.operator} ${inputValue}`;
        onChange(patchInputValue(e, newValue));
        return;
      }

      if (
        inputValue.trim() === '' &&
        preservedFilterRef.current?.conditions?.[0]?.field &&
        preservedFilterRef.current?.joins?.[0] &&
        preservedFilterRef.current?.conditions?.[1]?.operator &&
        preservedFilterRef.current?.conditions?.[0]?.value &&
        preservedFilterRef.current?.conditions?.[0]?.value.trim() !== ''
      ) {
        const columnName = preservedFilterRef.current.conditions[0].field!;
        const operator = preservedFilterRef.current.conditions[0].operator;
        const firstValue = preservedFilterRef.current.conditions[0].value!;
        const joinOp = preservedFilterRef.current.joins[0].toLowerCase();
        const newValue = `#${columnName} #${operator} ${firstValue} #${joinOp} #`;

        onChange(patchInputValue(e, newValue));

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        return;
      }

      if (
        inputValue.endsWith('##') &&
        preservedFilterRef.current?.conditions?.[1]?.operator &&
        preservedFilterRef.current?.conditions?.[1]?.value
      ) {
        const baseValue = inputValue.slice(0, -2);
        const joinPattern = `#${preservedFilterRef.current.joins?.[0]?.toLowerCase()}`;
        const hasJoinInBase = baseValue.includes(joinPattern);

        if (hasJoinInBase) {
          onChange(e);
        } else {
          const cond1Col = preservedFilterRef.current.conditions?.[1]?.field;
          const isMultiColumn =
            preservedFilterRef.current.isMultiColumn && cond1Col;

          const cond1Op = preservedFilterRef.current.conditions![1].operator!;
          const cond1Val = preservedFilterRef.current.conditions![1].value!;
          const cond1ValTo =
            preservedFilterRef.current.conditions?.[1]?.valueTo;

          const secondCondPart =
            cond1Op === 'inRange' && cond1ValTo
              ? `#${cond1Op} ${cond1Val} #to ${cond1ValTo}`
              : `#${cond1Op} ${cond1Val}`;

          const fullPattern = isMultiColumn
            ? `${baseValue} ${joinPattern} #${cond1Col} ${secondCondPart}##`
            : `${baseValue} ${joinPattern} ${secondCondPart}##`;

          onChange(patchInputValue(e, fullPattern));
        }
      } else {
        onChange(e);
      }
    },
    [
      onChange,
      searchMode,
      preservedFilterRef,
      setPreservedSearchMode,
      deleteConfirmationCarryRef,
    ]
  );
};
