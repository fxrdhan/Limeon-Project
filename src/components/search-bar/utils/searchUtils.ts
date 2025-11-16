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
 * #field #op1 val1 #and #op2 val2## (with ## confirmation marker)
 * Returns null if not a confirmed multi-condition pattern
 */
const parseMultiConditionFilter = (
  searchValue: string,
  column: SearchColumn
): FilterSearch | null => {
  // Pattern to detect join operators (#and or #or)
  const hasJoinOperator = /#(and|or)/i.test(searchValue);
  if (!hasJoinOperator) return null;

  // IMPORTANT: Only parse as verbose multi-condition if confirmed with ## marker
  // Without marker, let incomplete pattern handlers manage it
  const hasConfirmationMarker = searchValue.endsWith('##');
  if (!hasConfirmationMarker) return null;

  // Strip confirmation marker for parsing
  const cleanValue = searchValue.slice(0, -2);

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
        if (operatorObj && val.trim()) {
          conditions.push({
            operator: operatorObj.value,
            value: val.trim(),
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

          // Check if value has confirmed marker (##)
          const hasConfirmedMarker = searchTerm.endsWith('##');
          const cleanValue = hasConfirmedMarker
            ? searchTerm.slice(0, -2).trim()
            : searchTerm;

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
              operator: 'contains',
              isExplicitOperator: false,
              isConfirmed: hasConfirmedMarker,
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
        // PRIORITY CHECK: Strip ## marker first to avoid false join operator detection
        // When value is "anti##", we don't want to match join selector pattern
        // const hasTrailingConfirmedMarker = filterValue?.endsWith('##');
        // const cleanFilterValue = hasTrailingConfirmedMarker
        //   ? filterValue!.slice(0, -2)
        //   : filterValue;

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

        // SPECIAL: Confirmed filter + trailing # for join selector
        // Pattern: #field #operator value## # (user wants to add second condition)
        const confirmedPlusHashMatch = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)##\s+#\s*$/
        );
        if (confirmedPlusHashMatch) {
          const [, , op, val] = confirmedPlusHashMatch;
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
              showOperatorSelector: false,
              showJoinOperatorSelector: true,
              isFilterMode: false,
              selectedColumn: column,
              filterSearch: {
                field: column.field,
                value: val.trim(),
                column,
                operator: operatorObj.value,
                isExplicitOperator: true,
                isConfirmed: true, // Preserve confirmed state
              },
            };
          }
        }

        // Check for join operator selection state
        // Pattern: #field #operator value# OR #field #operator value #
        // User can type # directly after value or with space
        // BUT: Exclude confirmed marker pattern (value##)
        const joinSelectorMatch = !hasTrailingConfirmedMarker
          ? searchValue.match(/^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s*#\s*$/)
          : null;
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
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: true,
              isFilterMode: false,
              selectedColumn: column,
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
            // Check if value has confirmed marker (##)
            const hasConfirmedMarker = filterValue?.endsWith('##');
            const cleanValue = hasConfirmedMarker
              ? filterValue!.slice(0, -2).trim()
              : filterValue || '';

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
                isConfirmed: hasConfirmedMarker,
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
