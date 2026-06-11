import { JOIN_OPERATORS } from '../../operators';
import type { EnhancedSearchState, SearchColumn } from '../../types';
import { findOperatorForColumn } from '../operatorUtils';
import { parseInRangeValues } from './inRangeParser';

export function parseFilterPattern(
  searchValue: string,
  _columns: SearchColumn[],
  column: SearchColumn,
  operatorInput: string | undefined,
  filterValue: string | undefined
): EnhancedSearchState {
  const partialJoinWithHash = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#\s*$/i
  );
  const partialJoinNoHash = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s*$/i
  );
  const partialJoinMatch = partialJoinWithHash || partialJoinNoHash;

  /* c8 ignore start */
  if (partialJoinMatch) {
    const [, , op, val, join] = partialJoinMatch;
    const operatorObj = findOperatorForColumn(column, op);

    if (operatorObj) {
      let localFilterValue = val.trim();
      let localFilterValueTo: string | undefined;

      if (operatorObj.value === 'inRange') {
        const inRangeValues = parseInRangeValues(val);
        if (inRangeValues) {
          localFilterValue = inRangeValues.value;
          localFilterValueTo = inRangeValues.valueTo;
        }
      }

      return {
        globalSearch: undefined,
        showColumnSelector: true,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: false,
        selectedColumn: column,
        partialJoin: join.toUpperCase() as 'AND' | 'OR',
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: column.field,
            column,
            operator: operatorObj.value,
            value: localFilterValue,
            valueTo: localFilterValueTo,
          },
          {},
        ],
        joins: [join.toUpperCase() as 'AND' | 'OR'],
        filterSearch: {
          field: column.field,
          value: localFilterValue,
          valueTo: localFilterValueTo,
          column,
          operator: operatorObj.value,
          isExplicitOperator: true,
          isMultiCondition: true,
          conditions: [
            {
              field: column.field,
              column,
              operator: operatorObj.value,
              value: localFilterValue,
              valueTo: localFilterValueTo,
            },
          ],
        },
      };
    }
  }
  /* c8 ignore end */

  const inRangeJoinSelectorMatch = searchValue.match(
    /^#([^\s#]+)\s+#(inRange|between)\s+([^\s#]+)\s+#to\s+([^\s#]+)\s+#\s*$/i
  );
  if (inRangeJoinSelectorMatch) {
    const [, , , val1, val2] = inRangeJoinSelectorMatch;
    return {
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: true,
      isFilterMode: false,
      selectedColumn: column,
      filterSearch: {
        field: column.field,
        value: val1.trim(),
        valueTo: val2.trim(),
        column,
        operator: 'inRange',
        isExplicitOperator: true,
        isConfirmed: true,
        isMultiCondition: true,
        conditions: [
          {
            field: column.field,
            column,
            operator: 'inRange',
            value: val1.trim(),
            valueTo: val2.trim(),
          },
        ],
      },
    };
  }

  const joinSelectorMatch = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+([^#]+?)\s+#\s*$/
  );
  if (joinSelectorMatch) {
    const [, , op, val] = joinSelectorMatch;
    const operatorObj = findOperatorForColumn(column, op);

    if (operatorObj) {
      const cleanValue = val.trim().replace(/#+$/, '');
      let localFilterValue = cleanValue;
      let localFilterValueTo: string | undefined;

      if (operatorObj.value === 'inRange') {
        const inRangeValues = parseInRangeValues(cleanValue, true);
        if (inRangeValues) {
          /* c8 ignore next 2 */
          localFilterValue = inRangeValues.value;
          localFilterValueTo = inRangeValues.valueTo;
        } else {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
            showJoinOperatorSelector: false,
            isFilterMode: true,
            filterSearch: {
              field: column.field,
              value: cleanValue,
              column,
              operator: operatorObj.value,
              isExplicitOperator: true,
              isConfirmed: false,
            },
          };
        }
      }

      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: true,
        isFilterMode: false,
        selectedColumn: column,
        filterSearch: {
          field: column.field,
          value: localFilterValue,
          valueTo: localFilterValueTo,
          column,
          operator: operatorObj.value,
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          conditions: [
            {
              field: column.field,
              column,
              operator: operatorObj.value,
              value: localFilterValue,
              valueTo: localFilterValueTo,
            },
          ],
        },
      };
    }
  }

  if (operatorInput !== undefined) {
    if (operatorInput === '') {
      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: true,
        showJoinOperatorSelector: false,
        isFilterMode: false,
        selectedColumn: column,
      };
    }

    const joinOp = JOIN_OPERATORS.find(
      join => join.value.toLowerCase() === operatorInput.toLowerCase()
    );
    if (joinOp && filterValue !== undefined) {
      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: false,
        selectedColumn: column,
        partialJoin: joinOp.value.toUpperCase() as 'AND' | 'OR',
        activeConditionIndex: 1,
        partialConditions: [{ field: column.field, column }, {}],
        joins: [joinOp.value.toUpperCase() as 'AND' | 'OR'],
      };
    }

    const operator = findOperatorForColumn(column, operatorInput);

    if (operator) {
      const rawValue = filterValue || '';
      const hasConfirmation = rawValue.endsWith('##');
      const cleanValue = hasConfirmation ? rawValue.slice(0, -2) : rawValue;

      if (operator.value === 'inRange' && cleanValue) {
        const toMarkerMatch = cleanValue.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
        if (toMarkerMatch) {
          const [, firstValue, toValue] = toMarkerMatch;
          const cleanedToValue = toValue
            ?.trim()
            .replace(/#+\s*#?\s*$/, '')
            .trim();

          if (cleanedToValue) {
            const hasValueConfirmation =
              hasConfirmation || /##\s*#?\s*$/.test(toValue || '');
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: false,
              isFilterMode: true,
              filterSearch: {
                field: column.field,
                value: firstValue.trim(),
                valueTo: cleanedToValue,
                column,
                operator: operator.value,
                isExplicitOperator: true,
                isConfirmed: hasValueConfirmation,
                waitingForValueTo: false,
              },
            };
          }

          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
            showJoinOperatorSelector: false,
            isFilterMode: true,
            filterSearch: {
              field: column.field,
              value: firstValue.trim(),
              column,
              operator: operator.value,
              isExplicitOperator: true,
              isConfirmed: false,
              waitingForValueTo: true,
            },
          };
        }

        const inRangeValues = parseInRangeValues(cleanValue, hasConfirmation);
        if (inRangeValues) {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
            showJoinOperatorSelector: false,
            isFilterMode: true,
            filterSearch: {
              field: column.field,
              value: inRangeValues.value,
              valueTo: inRangeValues.valueTo,
              column,
              operator: operator.value,
              isExplicitOperator: true,
              isConfirmed: hasConfirmation,
            },
          };
        }

        return {
          globalSearch: undefined,
          showColumnSelector: false,
          showOperatorSelector: false,
          showJoinOperatorSelector: false,
          isFilterMode: true,
          filterSearch: {
            field: column.field,
            value: cleanValue,
            column,
            operator: operator.value,
            isExplicitOperator: true,
            isConfirmed: hasConfirmation,
          },
        };
      }

      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: true,
        filterSearch: {
          field: column.field,
          value: cleanValue,
          column,
          operator: operator.value,
          isExplicitOperator: true,
          isConfirmed: hasConfirmation,
        },
      };
    }

    return {
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: column,
    };
  }

  if (searchValue.includes(' #')) {
    /* c8 ignore next */
    return {
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: column,
    };
  }

  return {
    globalSearch: undefined,
    showColumnSelector: false,
    showOperatorSelector: false,
    showJoinOperatorSelector: false,
    isFilterMode: false,
    selectedColumn: column,
  };
}
