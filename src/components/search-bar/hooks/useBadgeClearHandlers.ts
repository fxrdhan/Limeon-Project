import { useCallback, type RefObject } from 'react';
import type { EnhancedSearchState } from '../types';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  extractMultiConditionPreservation,
  setFilterValue,
} from '../utils/handlerHelpers';
import { getBadgeJoinParts } from './badgeHandlerState';

type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface UseBadgeClearHandlersParams {
  getEffectiveState: () => EnhancedSearchState;
  onClearPreservedState: () => void;
  onClearSearch?: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null> | null | undefined;
  setCurrentJoinOperator?: (operator: 'AND' | 'OR' | undefined) => void;
}

export const useBadgeClearHandlers = ({
  getEffectiveState,
  onClearPreservedState,
  onClearSearch,
  onChange,
  inputRef,
  setCurrentJoinOperator,
}: UseBadgeClearHandlersParams) => {
  const clearAll = useCallback(() => {
    onClearPreservedState();
    if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClearPreservedState, onClearSearch, onChange]);

  const clearConditionPart = useCallback(
    (conditionIndex: number, target: BadgeTarget) => {
      const state = getEffectiveState();

      onClearPreservedState();

      const preservation = extractMultiConditionPreservation(state);
      if (!preservation) {
        clearAll();
        return;
      }

      const { conditions, joins } = preservation;
      const defaultField = state.filterSearch?.field || '';

      switch (target) {
        case 'column': {
          if (conditionIndex === 0) {
            clearAll();
          } else {
            conditions.splice(conditionIndex);

            const basePattern = PatternBuilder.buildNConditions(
              conditions,
              joins.slice(0, conditionIndex - 1),
              true,
              defaultField,
              { confirmed: false, openSelector: false }
            );

            const preservedJoin = joins[conditionIndex - 1] || 'AND';
            const newValue = `${basePattern} #${preservedJoin.toLowerCase()} #`;

            setFilterValue(newValue, onChange, inputRef);
          }
          break;
        }

        case 'operator': {
          if (conditionIndex >= conditions.length) {
            const partialConds = state.partialConditions || [];
            const partialCond = partialConds[conditionIndex];
            const partialField =
              partialCond?.field ||
              partialCond?.column?.field ||
              state.selectedColumn?.field;

            const joinsToKeep = joins.slice(0, conditionIndex - 1);
            const conditionsToKeep = conditions.slice(0, conditionIndex);

            if (conditionsToKeep.length === 0 && !partialField) {
              clearAll();
              return;
            }

            const basePattern = PatternBuilder.buildNConditions(
              conditionsToKeep,
              joinsToKeep,
              true,
              defaultField,
              { confirmed: false, openSelector: false }
            );

            const preservedJoin = joins[conditionIndex - 1] || 'AND';
            const newValuePartial = partialField
              ? `${basePattern} #${preservedJoin.toLowerCase()} #${partialField} #`
              : `${basePattern} #${preservedJoin.toLowerCase()} #`;

            setFilterValue(newValuePartial, onChange, inputRef);
            return;
          }

          conditions[conditionIndex].operator = undefined;
          conditions[conditionIndex].value = undefined;
          conditions[conditionIndex].valueTo = undefined;

          if (conditions.length > conditionIndex + 1) {
            conditions.splice(conditionIndex + 1);
          }
          if (joins.length > conditionIndex) {
            joins.splice(conditionIndex);
          }

          const newValueOp = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true,
            defaultField,
            { confirmed: false, openSelector: true }
          );
          setFilterValue(newValueOp, onChange, inputRef);
          break;
        }

        case 'value': {
          if (
            conditionIndex >= conditions.length ||
            !conditions[conditionIndex]
          ) {
            return;
          }

          conditions[conditionIndex].value = undefined;
          conditions[conditionIndex].valueTo = undefined;

          const newValueVal = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true,
            defaultField,
            { confirmed: false, openSelector: false }
          );
          setFilterValue(newValueVal, onChange, inputRef, {
            focus: true,
            cursorAtEnd: true,
          });
          break;
        }

        case 'valueTo': {
          if (
            conditionIndex >= conditions.length ||
            !conditions[conditionIndex]
          ) {
            return;
          }

          conditions[conditionIndex].valueTo = undefined;

          const newValueValTo = PatternBuilder.buildNConditions(
            conditions,
            joins,
            true,
            defaultField,
            { confirmed: false, openSelector: false }
          );

          const finalPattern =
            conditions[conditionIndex].operator === 'inRange'
              ? `${newValueValTo} #to `
              : newValueValTo;

          setFilterValue(finalPattern, onChange, inputRef, {
            focus: true,
            cursorAtEnd: true,
          });
          break;
        }
      }
    },
    [getEffectiveState, clearAll, onClearPreservedState, onChange, inputRef]
  );

  const clearJoin = useCallback(
    (joinIndex: number) => {
      const state = getEffectiveState();
      onClearPreservedState();

      if (!state.filterSearch) {
        clearAll();
        return;
      }

      const filter = state.filterSearch;
      const joinParts = getBadgeJoinParts(state);
      if (!joinParts) {
        clearAll();
        return;
      }

      const { columnName, conditions, joins, isMultiColumn } = joinParts;
      const activeJoin = joins[joinIndex] || filter.joinOperator || 'AND';
      setCurrentJoinOperator?.(activeJoin);

      const newValue = PatternBuilder.buildNConditions(
        conditions.slice(0, joinIndex + 1),
        joins.slice(0, joinIndex),
        !!isMultiColumn,
        columnName,
        { confirmed: false, openSelector: true }
      );

      setFilterValue(newValue, onChange, inputRef);
    },
    [
      getEffectiveState,
      onClearPreservedState,
      clearAll,
      onChange,
      inputRef,
      setCurrentJoinOperator,
    ]
  );

  return {
    clearAll,
    clearConditionPart,
    clearJoin,
  };
};
