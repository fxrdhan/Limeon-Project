import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { EnhancedSearchState } from '../types';
import {
  extractMultiConditionPreservation,
  type PreservedFilter,
} from '../utils/handlerHelpers';
import { PatternBuilder } from '../utils/PatternBuilder';

export interface InlineEditingBadgeState {
  conditionIndex: number;
  field: 'value' | 'valueTo';
  value: string;
}

type ConditionPartTarget = 'column' | 'operator' | 'value' | 'valueTo';

interface InterruptedSelectorState {
  type: 'column' | 'operator' | 'join' | 'partial';
  originalPattern: string;
}

interface UseInlineBadgeEditingParams {
  editingBadge: InlineEditingBadgeState | null;
  setEditingBadge: Dispatch<SetStateAction<InlineEditingBadgeState | null>>;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  preservedFilterRef: MutableRefObject<PreservedFilter | null>;
  interruptedSelectorRef: MutableRefObject<InterruptedSelectorState | null>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearConditionPart: (
    conditionIndex: number,
    target: ConditionPartTarget
  ) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  setSelectedBadgeIndex: Dispatch<SetStateAction<number | null>>;
}

const withFallback = <T>(value: T | undefined, fallback: T): T =>
  value ?? fallback;

const withEmptyString = (value: string | undefined): string =>
  withFallback(value, '');

export const useInlineBadgeEditing = ({
  editingBadge,
  setEditingBadge,
  searchMode,
  preservedSearchMode,
  setPreservedSearchMode,
  preservedFilterRef,
  interruptedSelectorRef,
  onChange,
  clearConditionPart,
  inputRef,
  setSelectedBadgeIndex,
}: UseInlineBadgeEditingParams) => {
  const handleInlineValueChange = useCallback(
    (newValue: string) => {
      setEditingBadge(prev => (prev ? { ...prev, value: newValue } : null));
    },
    [setEditingBadge]
  );

  const handleInlineEditComplete = useCallback(
    (finalValue?: string) => {
      const stateToUse = preservedSearchMode || searchMode;

      if (!editingBadge || !stateToUse.filterSearch) {
        setEditingBadge(null);
        return;
      }

      const valueToUse =
        finalValue !== undefined ? finalValue : editingBadge.value;

      if (!valueToUse || valueToUse.trim() === '') {
        setEditingBadge(null);
        interruptedSelectorRef.current = null;

        const columnName = stateToUse.filterSearch.field;
        const operator = stateToUse.filterSearch.operator;

        const isFirstCondition = editingBadge.conditionIndex === 0;
        const isValueField = editingBadge.field === 'value';
        const isValueToField = editingBadge.field === 'valueTo';

        if (isFirstCondition && isValueField) {
          clearConditionPart(0, 'value');
          setSelectedBadgeIndex(null);
        } else if (isFirstCondition && isValueToField) {
          const fromValue = stateToUse.filterSearch.value;
          if (fromValue) {
            const newPattern = `#${columnName} #${operator} ${fromValue}##`;
            onChange({
              target: { value: newPattern },
            } as ChangeEvent<HTMLInputElement>);

            if (preservedSearchMode?.filterSearch) {
              if (
                preservedSearchMode.filterSearch.isMultiCondition &&
                preservedSearchMode.filterSearch.conditions
              ) {
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
                setPreservedSearchMode({
                  ...preservedSearchMode,
                  filterSearch: {
                    ...preservedSearchMode.filterSearch,
                    valueTo: undefined,
                  },
                });
              }
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
        } else if (editingBadge.conditionIndex === 1 && isValueField) {
          clearConditionPart(1, 'value');
          setSelectedBadgeIndex(null);
        } else if (editingBadge.conditionIndex === 1 && isValueToField) {
          if (
            stateToUse.filterSearch.isMultiCondition &&
            stateToUse.filterSearch.conditions?.length === 2
          ) {
            const cond1 = stateToUse.filterSearch.conditions[0];
            const cond2 = stateToUse.filterSearch.conditions[1];
            const join = withFallback(
              stateToUse.filterSearch.joinOperator,
              'AND'
            );
            const col1 = withFallback(cond1.field, columnName);
            const col2 = withFallback(cond2.field, columnName);
            const isMultiColumn = stateToUse.filterSearch.isMultiColumn;
            const cond1Value = cond2.value;

            if (cond1Value) {
              const firstPart = cond1.valueTo
                ? `#${col1} #${cond1.operator} ${cond1.value} #to ${cond1.valueTo}`
                : `#${col1} #${cond1.operator} ${cond1.value}`;
              const newPattern = isMultiColumn
                ? `${firstPart} #${join.toLowerCase()} #${col2} #${cond2.operator} ${cond1Value}##`
                : `${firstPart} #${join.toLowerCase()} #${cond2.operator} ${cond1Value}##`;

              onChange({
                target: { value: newPattern },
              } as ChangeEvent<HTMLInputElement>);

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

              setTimeout(() => {
                setEditingBadge({
                  conditionIndex: 1,
                  field: 'value',
                  value: cond1Value,
                });
              }, 10);
              setSelectedBadgeIndex(null);
              return;
            }
          }

          clearConditionPart(1, 'valueTo');
        } else if (isValueToField && editingBadge.conditionIndex >= 2) {
          const condIdx = editingBadge.conditionIndex;
          const conditions = stateToUse.filterSearch.conditions;
          const isMultiCondition = stateToUse.filterSearch.isMultiCondition;

          if (isMultiCondition && conditions && conditions[condIdx]) {
            const targetCond = conditions[condIdx];
            const targetValue = targetCond.value;

            if (targetCond.operator === 'inRange' && targetValue) {
              const preservation =
                extractMultiConditionPreservation(stateToUse);
              if (!preservation) return;

              preservation.conditions[condIdx].valueTo = undefined;

              const newPattern = PatternBuilder.buildNConditions(
                preservation.conditions,
                preservation.joins,
                withFallback(preservation.isMultiColumn, false),
                columnName,
                { confirmed: true, openSelector: false }
              );

              onChange({
                target: { value: newPattern },
              } as ChangeEvent<HTMLInputElement>);

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

          clearConditionPart(editingBadge.conditionIndex, editingBadge.field);
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
      const operator = stateToUse.filterSearch.operator;
      const preservation = extractMultiConditionPreservation(stateToUse);
      const isActuallyMulti =
        (preservation?.conditions?.length ?? 0) > 1 ||
        stateToUse.filterSearch.isMultiCondition;

      if (!isActuallyMulti) {
        let newPattern: string;

        if (operator === 'inRange') {
          const dashMatch = valueToUse.match(/^(.+?)-(.+)$/);

          const isEditingFirstValue =
            editingBadge.conditionIndex === 0 && editingBadge.field === 'value';
          const isEditingFirstValueTo =
            editingBadge.conditionIndex === 0 &&
            editingBadge.field === 'valueTo';

          if (dashMatch && isEditingFirstValue) {
            const [, fromVal, toVal] = dashMatch;
            const trimmedFrom = fromVal.trim();
            const trimmedTo = toVal.trim();

            if (trimmedFrom && trimmedTo) {
              newPattern = `#${columnName} #${operator} ${trimmedFrom} #to ${trimmedTo}##`;
              if (interruptedSelectorRef.current) {
                const interrupted = interruptedSelectorRef.current;
                const valuePart = `${trimmedFrom} #to ${trimmedTo}`;

                if (interrupted.type === 'column') {
                  const joinMatch =
                    interrupted.originalPattern.match(/#(and|or)\s*#\s*$/i);
                  if (joinMatch) {
                    const joinOp = joinMatch[1].toLowerCase();
                    newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #`;
                  }
                } else if (interrupted.type === 'join') {
                  newPattern = `#${columnName} #${operator} ${valuePart} #`;
                } else if (interrupted.type === 'operator') {
                  const multiColMatch = interrupted.originalPattern.match(
                    /#(and|or)\s+#([^\s#]+)\s*#\s*$/i
                  );
                  if (multiColMatch) {
                    const joinOp = multiColMatch[1].toLowerCase();
                    const col2 = multiColMatch[2];
                    newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #${col2} #`;
                  }
                } else if (interrupted.type === 'partial') {
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
                preservedFilterRef.current = null;
              }
              onChange({
                target: { value: newPattern },
              } as ChangeEvent<HTMLInputElement>);
              setEditingBadge(null);
              setPreservedSearchMode(null);
              setTimeout(() => {
                inputRef?.current?.focus();
              }, 50);
              return;
            }
          }

          if (stateToUse.filterSearch.valueTo) {
            if (isEditingFirstValue) {
              newPattern = `#${columnName} #${operator} ${valueToUse} #to ${stateToUse.filterSearch.valueTo}##`;
            } else if (isEditingFirstValueTo) {
              newPattern = `#${columnName} #${operator} ${stateToUse.filterSearch.value} #to ${valueToUse}##`;
            } else {
              newPattern = `#${columnName} #${operator} ${valueToUse}##`;
            }
          } else if (isEditingFirstValue) {
            newPattern = `#${columnName} #${operator} ${valueToUse} #to `;
            onChange({
              target: { value: newPattern },
            } as ChangeEvent<HTMLInputElement>);
            setEditingBadge(null);
            setTimeout(() => {
              if (inputRef?.current) {
                inputRef.current.focus();
                const len = newPattern.length;
                inputRef.current.setSelectionRange(len, len);
              }
            }, 50);
            return;
          } else {
            newPattern = `#${columnName} #${operator} ${valueToUse}##`;
          }
        } else {
          newPattern = `#${columnName} #${operator} ${valueToUse}##`;
        }

        if (interruptedSelectorRef.current) {
          const interrupted = interruptedSelectorRef.current;
          const valuePart =
            operator === 'inRange' && stateToUse.filterSearch.valueTo
              ? `${valueToUse} #to ${stateToUse.filterSearch.valueTo}`
              : valueToUse;

          if (interrupted.type === 'column') {
            const joinMatch =
              interrupted.originalPattern.match(/#(and|or)\s*#\s*$/i);
            if (joinMatch) {
              const joinOp = joinMatch[1].toLowerCase();
              newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #`;
            }
          } else if (interrupted.type === 'join') {
            newPattern = `#${columnName} #${operator} ${valuePart} #`;
          } else if (interrupted.type === 'operator') {
            const multiColMatch = interrupted.originalPattern.match(
              /#(and|or)\s+#([^\s#]+)\s*#\s*$/i
            );
            if (multiColMatch) {
              const joinOp = multiColMatch[1].toLowerCase();
              const col2 = multiColMatch[2];
              newPattern = `#${columnName} #${operator} ${valuePart} #${joinOp} #${col2} #`;
            }
          } else if (interrupted.type === 'partial') {
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
          setPreservedSearchMode(null);
          preservedFilterRef.current = null;
        }

        onChange({
          target: { value: newPattern },
        } as ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);

        setPreservedSearchMode(null);
        preservedFilterRef.current = null;

        setTimeout(() => {
          inputRef?.current?.focus();
        }, 50);
        return;
      }

      if (!preservation) return;
      const conditions = preservation.conditions;
      const joins = preservation.joins;
      const isMultiColumn = preservation.isMultiColumn === true;
      const isEditingValue = editingBadge.field === 'value';
      const isEditingValueTo = editingBadge.field === 'valueTo';

      const updatedConditions = conditions.map((cond, idx) => {
        if (idx === editingBadge.conditionIndex) {
          let newValue = isEditingValue ? valueToUse : cond.value;
          let newValueTo = isEditingValueTo ? valueToUse : cond.valueTo;

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
            field: withEmptyString(cond.field),
            operator: withEmptyString(cond.operator),
            value: withEmptyString(newValue),
            valueTo: newValueTo,
          };
        }
        return {
          field: withEmptyString(cond.field),
          operator: withEmptyString(cond.operator),
          value: withEmptyString(cond.value),
          valueTo: cond.valueTo,
        };
      });

      const editedCondition = updatedConditions[editingBadge.conditionIndex];
      const isBetweenValueWithoutValueTo =
        isEditingValue &&
        editedCondition.operator === 'inRange' &&
        !editedCondition.valueTo;

      if (isBetweenValueWithoutValueTo) {
        const basePattern = PatternBuilder.buildNConditions(
          updatedConditions,
          joins,
          isMultiColumn,
          columnName,
          { confirmed: false, openSelector: false }
        );
        const newPattern = `${basePattern} #to `;

        onChange({
          target: { value: newPattern },
        } as ChangeEvent<HTMLInputElement>);
        setEditingBadge(null);
        setPreservedSearchMode(null);

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
        isMultiColumn,
        columnName,
        { confirmed: true }
      );

      onChange({
        target: { value: newPattern },
      } as ChangeEvent<HTMLInputElement>);
      setEditingBadge(null);

      setPreservedSearchMode(null);
      preservedFilterRef.current = null;

      setTimeout(() => {
        inputRef?.current?.focus();
      }, 50);
    },
    [
      editingBadge,
      searchMode,
      preservedSearchMode,
      setEditingBadge,
      setPreservedSearchMode,
      preservedFilterRef,
      interruptedSelectorRef,
      onChange,
      clearConditionPart,
      inputRef,
      setSelectedBadgeIndex,
    ]
  );

  return {
    handleInlineValueChange,
    handleInlineEditComplete,
  };
};
