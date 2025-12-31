/**
 * Search Utilities
 *
 * This file provides the main search parsing functionality for the Enhanced Search Bar.
 * Most parsing logic has been extracted to the `parser/` folder for better maintainability.
 *
 * This file re-exports the essential utilities and provides the main `parseSearchValue` function.
 */

import { JOIN_OPERATORS } from '../operators';
import { EnhancedSearchState, SearchColumn } from '../types';
import { findOperatorForColumn } from './operatorUtils';

// Re-export from parser modules for backward compatibility
export {
  buildColumnValue,
  buildFilterValue,
  countJoins,
  findColumn,
  getOperatorSearchTerm,
  isHashtagMode,
  stripConfirmationMarker,
} from './parser/parserHelpers';

export { parseConditionSegment } from './parser/conditionParser';
export { parseInRangeValues } from './parser/inRangeParser';
export {
  parseMultiConditionFilter,
  parsePartialNConditions,
} from './parser/multiConditionParser';

// Import for internal use
import { parseInRangeValues } from './parser/inRangeParser';
import {
  parseMultiConditionFilter,
  parsePartialNConditions,
} from './parser/multiConditionParser';
import { findColumn } from './parser/parserHelpers';

/**
 * Main search value parser
 *
 * Parses user input and returns the appropriate search state.
 * This function handles:
 * - Single # trigger for column selector
 * - Column:value patterns (e.g., #column:search)
 * - Column + operator patterns (e.g., #column #operator value)
 * - Multi-condition patterns with AND/OR joins
 * - N-condition patterns (3+ conditions)
 * - Between operator with #to marker
 *
 * @param rawSearchValue - The raw input value from the search bar
 * @param columns - Available columns for filtering
 * @returns EnhancedSearchState describing the current search state
 */
export const parseSearchValue = (
  rawSearchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState => {
  // Remove newlines (from paste) and trim only leading whitespace
  const searchValue = rawSearchValue.replace(/[\r\n]+/g, '').trimStart();
  console.log('[DEBUG] parseSearchValue start - searchValue:', searchValue);

  // Single # = column selector
  if (searchValue === '#') {
    return {
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    };
  }

  if (searchValue.startsWith('#')) {
    // Try N-condition partial patterns first (handles 2+ conditions dynamically)
    const nConditionResult = parsePartialNConditions(searchValue, columns);
    if (nConditionResult) return nConditionResult;

    // Handle colon syntax: #column:value
    if (searchValue.includes(':')) {
      const colonMatch = searchValue.match(/^#([^:]+):(.*)$/);
      if (colonMatch) {
        const [, columnInput, searchTerm] = colonMatch;
        const column = findColumn(columns, columnInput);

        if (column) {
          if (searchTerm === '#') {
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
            isFilterMode: true,
            filterSearch: {
              field: column.field,
              value: searchTerm,
              column,
              operator: 'contains',
              isExplicitOperator: false,
            },
          };
        }
      }
    }

    // Parse filter pattern: #column #operator value
    const filterMatch = searchValue.match(
      /^#([^\s:]+)(?:\s+#([^\s:]*)(?:\s+(.*))?)?$/
    );

    if (filterMatch) {
      const [, columnInput, operatorInput, filterValue] = filterMatch;
      const column = findColumn(columns, columnInput);

      if (column) {
        // Check for complete multi-condition pattern (ends with ##)
        const multiCondition = parseMultiConditionFilter(
          searchValue,
          column,
          columns
        );
        if (multiCondition) {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
            showJoinOperatorSelector: false,
            isFilterMode: true,
            filterSearch: multiCondition,
          };
        }

        // Handle partial patterns and operator selection
        return parseFilterPattern(
          searchValue,
          columns,
          column,
          operatorInput,
          filterValue
        );
      }
    }

    // Check for exact column match (e.g., #columnName without space)
    const exactColumnMatch = findColumn(columns, searchValue.substring(1));
    if (exactColumnMatch) {
      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: false,
        selectedColumn: exactColumnMatch,
      };
    }

    // Default: show column selector
    return {
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    };
  }

  // Global search (no # prefix)
  const result = {
    globalSearch: searchValue,
    showColumnSelector: false,
    showOperatorSelector: false,
    showJoinOperatorSelector: false,
    isFilterMode: false,
  };
  console.log('[DEBUG] parseSearchValue end (global) - result:', result);
  return result;
};

/**
 * Parse filter pattern after column is identified
 * Handles operator selection, value input, and multi-condition partial patterns
 */
function parseFilterPattern(
  searchValue: string,
  _columns: SearchColumn[],
  column: SearchColumn,
  operatorInput: string | undefined,
  filterValue: string | undefined
): EnhancedSearchState {
  // Check for partial join patterns: #field #op value #and/#or #
  const partialJoinWithHash = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#\s*$/i
  );
  const partialJoinNoHash = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s*$/i
  );
  const partialJoinMatch = partialJoinWithHash || partialJoinNoHash;

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

      console.log(
        '[DEBUG] parseFilterPattern - partialJoinMatch:',
        !!partialJoinMatch
      );
      // Show column selector for next condition
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
          isMultiCondition: true, // [FIX]
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

  // Check for join selector trigger for Between (inRange) operator: #field #inRange val1 #to val2 #
  // This MUST come before the generic joinSelectorMatch because the generic regex can't handle #to marker
  const inRangeJoinSelectorMatch = searchValue.match(
    /^#([^\s#]+)\s+#(inRange|between)\s+([^\s#]+)\s+#to\s+([^\s#]+)\s+#\s*$/i
  );
  console.log(
    '[DEBUG] parseFilterPattern - inRangeJoinSelectorMatch:',
    !!inRangeJoinSelectorMatch
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

  // Check for join selector trigger: #field #op value #
  const joinSelectorMatch = searchValue.match(
    /^#([^\s#]+)\s+#([^\s]+)\s+([^#]+?)\s+#\s*$/
  );
  console.log(
    '[DEBUG] parseFilterPattern - joinSelectorMatch:',
    !!joinSelectorMatch
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
          localFilterValue = inRangeValues.value;
          localFilterValueTo = inRangeValues.valueTo;
        } else {
          // Incomplete Between - need both values
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
          isMultiCondition: true, // [FIX] Treat as multi-condition to ensure badge rendering
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

  // Handle operator input
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

    // Check if it's a join operator (AND/OR)
    const joinOp = JOIN_OPERATORS.find(
      j => j.value.toLowerCase() === operatorInput.toLowerCase()
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

    // Find matching operator
    const operator = findOperatorForColumn(column, operatorInput);

    if (operator) {
      const rawValue = filterValue || '';
      const hasConfirmation = rawValue.endsWith('##');
      const cleanValue = hasConfirmation ? rawValue.slice(0, -2) : rawValue;

      // Handle Between operator
      if (operator.value === 'inRange' && cleanValue) {
        // Check for #to marker pattern
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
          } else {
            // Waiting for second value
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

        // Single value for Between
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

      // Regular operator with value
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
    } else {
      // Invalid operator - show selector
      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: true,
        showJoinOperatorSelector: false,
        isFilterMode: false,
        selectedColumn: column,
      };
    }
  } else if (searchValue.includes(' #')) {
    // Has " #" - show operator selector
    return {
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: column,
    };
  }

  // Just column selected
  return {
    globalSearch: undefined,
    showColumnSelector: false,
    showOperatorSelector: false,
    showJoinOperatorSelector: false,
    isFilterMode: false,
    selectedColumn: column,
  };
}
