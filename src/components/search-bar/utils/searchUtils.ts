import {
  SearchColumn,
  EnhancedSearchState,
  FilterSearch,
  FilterCondition,
} from '../types';
import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  JOIN_OPERATORS,
} from '../operators';

/**
 * Parse multi-condition filter pattern:
 * #field #op1 val1 #and #op2 val2
 * Returns null if not a complete multi-condition pattern
 */
const parseMultiConditionFilter = (
  searchValue: string,
  column: SearchColumn
): FilterSearch | null => {
  // Pattern to detect join operators (#and or #or)
  const hasJoinOperator = /#(and|or)/i.test(searchValue);
  if (!hasJoinOperator) return null;

  // IMPORTANT: Only treat as complete multi-condition if BOTH values are confirmed
  // Check if pattern ends with "##" (Enter confirmation) to ensure user finished typing
  // Otherwise, user might still be typing the second value
  const hasConfirmationMarker = searchValue.endsWith('##');
  if (!hasConfirmationMarker) {
    // User is still typing - don't treat as complete multi-condition yet
    return null;
  }

  // Use the full search value for parsing
  const cleanValue = searchValue;

  // Extract conditions and join operators
  // Split pattern: #field #op1 val1 #join #op2 val2
  const fieldMatch = cleanValue.match(/^#([^\s#]+)\s+(.+)$/);
  if (!fieldMatch) return null;

  const [, , remainingPart] = fieldMatch;

  // Split by join operators while capturing them
  const parts = remainingPart.split(/#(and|or)\s+/i);

  const conditions: FilterCondition[] = [];
  let joinOperator: 'AND' | 'OR' | undefined;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Condition part: "#operator value"
      const condMatch = parts[i].trim().match(/^#([^\s]+)\s+(.*)$/);
      if (condMatch) {
        const [, op, val] = condMatch;

        // Validate operator
        const availableOperators =
          column.type === 'number'
            ? NUMBER_FILTER_OPERATORS
            : DEFAULT_FILTER_OPERATORS;

        const operatorObj = availableOperators.find(
          o => o.value.toLowerCase() === op.toLowerCase()
        );

        // Only add condition if operator is valid AND value is not empty
        // Remove ## confirmation marker from value
        const cleanVal = val.trim().replace(/##$/, '');
        if (operatorObj && cleanVal) {
          conditions.push({
            operator: operatorObj.value,
            value: cleanVal,
          });
        }
      }
    } else {
      // Join operator part: "and" or "or"
      const currentJoin = parts[i].toUpperCase() as 'AND' | 'OR';

      // All join operators must be the same (AG Grid limitation)
      if (!joinOperator) {
        joinOperator = currentJoin;
      } else if (joinOperator !== currentJoin) {
        // Mixed operators - use the first one
        console.warn(
          'Mixed AND/OR operators detected, using first operator:',
          joinOperator
        );
      }
    }
  }

  // Must have at least 2 conditions to be valid multi-condition
  if (conditions.length < 2) return null;

  return {
    field: column.field,
    value: conditions[0].value, // Backward compat
    operator: conditions[0].operator, // Backward compat
    column,
    isExplicitOperator: true,
    conditions,
    joinOperator,
    isMultiCondition: true,
  };
};

export const parseSearchValue = (
  searchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState => {
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

    const filterMatch = searchValue.match(
      /^#([^\s:]+)(?:\s+#([^\s:]*)(?:\s+(.*))?)?$/
    );

    if (filterMatch) {
      const [, columnInput, operatorInput, filterValue] = filterMatch;
      const column = findColumn(columns, columnInput);

      if (column) {
        // Check for multi-condition pattern first
        const multiCondition = parseMultiConditionFilter(searchValue, column);
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

        // IMPORTANT: Check partial join operator BEFORE joinSelector
        // to avoid false positive matches
        // Pattern 1: #field #operator value #and # (with trailing #)
        // Pattern 2: #field #operator value #and (without trailing #)
        const partialJoinWithHash = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#\s*$/i
        );
        const partialJoinNoHash = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s*$/i
        );
        const partialJoinMatch = partialJoinWithHash || partialJoinNoHash;

        if (partialJoinMatch) {
          const [, , op, val, join] = partialJoinMatch;
          const availableOperators =
            column.type === 'number'
              ? NUMBER_FILTER_OPERATORS
              : DEFAULT_FILTER_OPERATORS;
          const operatorObj = availableOperators.find(
            o => o.value.toLowerCase() === op.toLowerCase()
          );

          if (operatorObj) {
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: true,
              showJoinOperatorSelector: false,
              isFilterMode: false,
              selectedColumn: column,
              isSecondOperator: true,
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              filterSearch: {
                field: column.field,
                value: val.trim(),
                column,
                operator: operatorObj.value,
                isExplicitOperator: true,
              },
            };
          }
        }

        // NEW: Check for incomplete multi-condition (second operator selected but no value yet)
        // Pattern: #field #op1 val1 #and #op2 (with optional trailing space)
        const incompleteMultiCondition = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s*$/i
        );
        if (incompleteMultiCondition) {
          const [, , op1, val1, join, op2] = incompleteMultiCondition;
          const availableOperators =
            column.type === 'number'
              ? NUMBER_FILTER_OPERATORS
              : DEFAULT_FILTER_OPERATORS;

          const operator1Obj = availableOperators.find(
            o => o.value.toLowerCase() === op1.toLowerCase()
          );
          const operator2Obj = availableOperators.find(
            o => o.value.toLowerCase() === op2.toLowerCase()
          );

          if (operator1Obj && operator2Obj) {
            // Second operator selected, waiting for value input
            // Don't trigger filter yet, keep in input mode
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: false,
              isFilterMode: false, // ← NOT filter mode yet!
              selectedColumn: column,
              isSecondOperator: false, // Reset this to allow normal input
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              secondOperator: operator2Obj.value, // Store second operator for badge display
              filterSearch: {
                field: column.field,
                value: val1.trim(),
                column,
                operator: operator1Obj.value,
                isExplicitOperator: true,
              },
            };
          }
        }

        // Check for join operator selection state
        // Pattern: #field #operator value # (MUST have space before final #)
        // User must explicitly type space + # to open join selector
        const joinSelectorMatch = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#\s*$/
        );
        if (joinSelectorMatch) {
          const [, , op, val] = joinSelectorMatch;
          const availableOperators =
            column.type === 'number'
              ? NUMBER_FILTER_OPERATORS
              : DEFAULT_FILTER_OPERATORS;
          const operatorObj = availableOperators.find(
            o => o.value.toLowerCase() === op.toLowerCase()
          );

          if (operatorObj) {
            // Remove ALL trailing # from value (from ## confirmation marker)
            const cleanValue = val.trim().replace(/#+$/, '');

            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: true,
              isFilterMode: false,
              selectedColumn: column,
              filterSearch: {
                field: column.field,
                value: cleanValue,
                column,
                operator: operatorObj.value,
                isExplicitOperator: true,
                isConfirmed: true, // Value was confirmed with ## (Enter key)
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

          // Check if operatorInput is actually a join operator
          const joinOp = JOIN_OPERATORS.find(
            j => j.value.toLowerCase() === operatorInput.toLowerCase()
          );
          if (joinOp && filterValue !== undefined) {
            // User typed #and or #or, now expects another #operator
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: false,
              isFilterMode: false,
              selectedColumn: column,
              isSecondOperator: true,
              partialJoin: joinOp.value.toUpperCase() as 'AND' | 'OR',
            };
          }

          // IMPORTANT: Don't treat as single condition if filterValue contains incomplete multi-condition pattern
          // Pattern: value contains "#and #operator" or "#or #operator" (waiting for second value OR typing second value)
          const incompleteMultiMatch = filterValue?.match(
            /#(and|or)\s+#([^\s]+)(?:\s+(.*))?$/i
          );
          if (incompleteMultiMatch) {
            const [, join, op2Text] = incompleteMultiMatch;

            // Extract first operator and value from before join
            const beforeJoin = filterValue!
              .substring(0, filterValue!.indexOf(`#${join}`))
              .trim();

            // Validate second operator
            const availableOperators =
              column.type === 'number'
                ? NUMBER_FILTER_OPERATORS
                : DEFAULT_FILTER_OPERATORS;

            const operator2Obj = availableOperators.find(
              o => o.value.toLowerCase() === op2Text.toLowerCase()
            );

            if (operator2Obj) {
              // This is incomplete multi-condition - waiting for second value input OR typing second value
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                secondOperator: operator2Obj.value, // Store second operator for badge display
                filterSearch: {
                  field: column.field,
                  value: beforeJoin,
                  column,
                  operator: operatorInput, // First operator
                  isExplicitOperator: true,
                },
              };
            }
          }

          // Search in appropriate operators based on column type
          const availableOperators =
            column.type === 'number'
              ? NUMBER_FILTER_OPERATORS
              : DEFAULT_FILTER_OPERATORS;

          const operator = availableOperators.find(
            op => op.value.toLowerCase() === operatorInput.toLowerCase()
          );

          if (operator) {
            // Check if value has ## confirmation marker
            const rawValue = filterValue || '';
            const hasConfirmation = rawValue.endsWith('##');
            const cleanValue = hasConfirmation
              ? rawValue.slice(0, -2)
              : rawValue;

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
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: true,
            showJoinOperatorSelector: false,
            isFilterMode: false,
            selectedColumn: column,
          };
        } else {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
            showJoinOperatorSelector: false,
            isFilterMode: false,
            selectedColumn: column,
          };
        }
      }
    }

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

    return {
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    };
  }

  return {
    globalSearch: searchValue,
    showColumnSelector: false,
    showOperatorSelector: false,
    showJoinOperatorSelector: false,
    isFilterMode: false,
  };
};

export const findColumn = (
  columns: SearchColumn[],
  input: string
): SearchColumn | undefined => {
  return columns.find(
    col =>
      col.field.toLowerCase() === input.toLowerCase() ||
      col.headerName.toLowerCase() === input.toLowerCase()
  );
};

export const getOperatorSearchTerm = (value: string): string => {
  if (value.startsWith('#')) {
    // Check for second operator pattern: #field #op1 val1 #and #search_term
    // This ensures operator selector doesn't filter when selecting second operator
    const secondOpMatch = value.match(/#(and|or)\s+#([^\s]*)$/i);
    if (secondOpMatch) {
      return secondOpMatch[2]; // Return search term after join operator
    }

    // First operator pattern: #field #search_term
    const match = value.match(/^#[^\s:]+\s+#([^\s]*)/);
    return match ? match[1] : '';
  }
  return '';
};

export const isHashtagMode = (searchValue: string): boolean => {
  return (
    searchValue === '#' ||
    (searchValue.startsWith('#') && !searchValue.includes(':'))
  );
};

export const buildFilterValue = (
  filterSearch: FilterSearch,
  inputValue: string
): string => {
  if (
    filterSearch.operator === 'contains' &&
    !filterSearch.isExplicitOperator
  ) {
    return `#${filterSearch.field}:${inputValue}`;
  } else {
    return `#${filterSearch.field} #${filterSearch.operator} ${inputValue}`;
  }
};

export const buildColumnValue = (
  columnName: string,
  mode: 'colon' | 'space' | 'plain'
): string => {
  switch (mode) {
    case 'colon':
      return `#${columnName}:`;
    case 'space':
      return `#${columnName} `;
    case 'plain':
    default:
      return `#${columnName}`;
  }
};
