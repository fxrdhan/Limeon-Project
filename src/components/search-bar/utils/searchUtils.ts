import {
  SearchColumn,
  EnhancedSearchState,
  FilterSearch,
  FilterCondition,
  MAX_FILTER_CONDITIONS,
} from '../types';
import { JOIN_OPERATORS } from '../operators';
import { findOperatorForColumn } from './operatorUtils';

/**
 * Find column by field name or header name
 * Supports flexible matching (case-insensitive, separator-agnostic)
 */
export const findColumn = (
  columns: SearchColumn[],
  input: string
): SearchColumn | undefined => {
  const normalizedInput = input.toLowerCase().trim();

  // Exact match first (field or headerName)
  const exactMatch = columns.find(
    col =>
      col.field.toLowerCase() === normalizedInput ||
      col.headerName.toLowerCase() === normalizedInput
  );
  if (exactMatch) return exactMatch;

  // Flexible match: normalize by removing/replacing separators
  // "harga_pokok" matches "Harga Pokok", "hargaPokok", "harga-pokok"
  const normalize = (str: string) => str.toLowerCase().replace(/[\s_-]/g, '');

  const normalizedInputClean = normalize(normalizedInput);

  return columns.find(
    col =>
      normalize(col.field) === normalizedInputClean ||
      normalize(col.headerName) === normalizedInputClean
  );
};

/**
 * Result of splitting input by join operators
 */
interface SplitByJoinResult {
  parts: string[];
  joinOperators: ('AND' | 'OR')[];
}

/**
 * Split input string by join operators (#and, #or)
 * Returns condition parts and join operators array
 *
 * Example:
 *   Input: "val1 #and #op2 val2 #or #op3 val3"
 *   Output: { parts: ["val1", "#op2 val2", "#op3 val3"], joinOperators: ["AND", "OR"] }
 */
const splitByJoinOperators = (input: string): SplitByJoinResult => {
  const parts: string[] = [];
  const joinOperators: ('AND' | 'OR')[] = [];

  // Split by #and or #or (case insensitive)
  // Pattern captures: (content)(#and|#or)(rest...)
  let remaining = input;
  const joinPattern = /\s+#(and|or)\s+/i;

  while (remaining) {
    const match = remaining.match(joinPattern);
    if (match && match.index !== undefined) {
      // Get content before join operator
      const beforeJoin = remaining.substring(0, match.index).trim();
      if (beforeJoin) {
        parts.push(beforeJoin);
      }

      // Store join operator
      joinOperators.push(match[1].toUpperCase() as 'AND' | 'OR');

      // Continue with rest
      remaining = remaining.substring(match.index + match[0].length);
    } else {
      // No more join operators - rest is the last part
      if (remaining.trim()) {
        parts.push(remaining.trim());
      }
      break;
    }
  }

  return { parts, joinOperators };
};

/**
 * Parse a single condition part (column + operator + value)
 *
 * Formats supported:
 * - "#col #op value" (explicit column)
 * - "#op value" (inherits column from context)
 *
 * @param part - The condition string to parse
 * @param columns - Available columns for lookup
 * @param defaultColumn - Column to use if not specified in part
 * @returns Parsed condition or null if invalid
 */
const parseConditionPart = (
  part: string,
  columns: SearchColumn[],
  defaultColumn: SearchColumn
): FilterCondition | null => {
  const trimmed = part.trim().replace(/##$/, ''); // Remove trailing confirmation marker

  // Try explicit column pattern: #col #op value
  const explicitColMatch = trimmed.match(/^#([^\s#]+)\s+#([^\s]+)\s+(.+)$/);
  if (explicitColMatch) {
    const [, colName, opName, value] = explicitColMatch;
    const column = findColumn(columns, colName);
    if (column) {
      const operator = findOperatorForColumn(column, opName);
      if (operator) {
        // Handle inRange (Between) operator
        if (operator.value === 'inRange') {
          const inRangeValues = parseInRangeValues(value, true);
          if (inRangeValues) {
            return {
              operator: operator.value,
              value: inRangeValues.value,
              valueTo: inRangeValues.valueTo,
              field: column.field,
              column,
            };
          }
        }
        return {
          operator: operator.value,
          value: value.trim(),
          field: column.field,
          column,
        };
      }
    }
  }

  // Try same-column pattern: #op value
  const sameColMatch = trimmed.match(/^#([^\s]+)\s+(.+)$/);
  if (sameColMatch) {
    const [, opName, value] = sameColMatch;
    const operator = findOperatorForColumn(defaultColumn, opName);
    if (operator) {
      // Handle inRange (Between) operator
      if (operator.value === 'inRange') {
        const inRangeValues = parseInRangeValues(value, true);
        if (inRangeValues) {
          return {
            operator: operator.value,
            value: inRangeValues.value,
            valueTo: inRangeValues.valueTo,
            field: defaultColumn.field,
            column: defaultColumn,
          };
        }
      }
      return {
        operator: operator.value,
        value: value.trim(),
        field: defaultColumn.field,
        column: defaultColumn,
      };
    }
  }

  return null;
};

/**
 * Validate conditions array
 * Ensures all conditions are valid and within MAX_FILTER_CONDITIONS limit
 */
const validateConditions = (conditions: FilterCondition[]): boolean => {
  if (conditions.length < 2) return false;
  if (conditions.length > MAX_FILTER_CONDITIONS) return false;
  return conditions.every(
    c => c.operator && c.value !== undefined && c.field && c.column
  );
};

/**
 * Parse inRange (Between) operator values
 * Supports two formats:
 * - #to marker: "500 #to 700"
 * - Dash separated: "500-700" (only for confirmed values)
 *
 * Note: Space-separated format ("500 700") is NOT supported to allow
 * spaces in filter values (e.g., "para 129" for Contains operator)
 *
 * @param valueString - String containing one or two values
 * @param isConfirmed - Whether this is a confirmed value (has ## or #to marker)
 * @returns Object with value and valueTo, or null if parsing fails
 */
const parseInRangeValues = (
  valueString: string,
  isConfirmed: boolean = false
): { value: string; valueTo: string } | null => {
  const trimmed = valueString.trim();

  // Check for #to marker pattern: "500 #to 700"
  // This is used when Between operator transitions from typing to confirmed state
  const toMarkerMatch = trimmed.match(/^(.+?)\s+#to\s+(.+)$/i);
  if (toMarkerMatch) {
    const [, firstVal, secondVal] = toMarkerMatch;
    if (firstVal.trim() && secondVal.trim()) {
      return {
        value: firstVal.trim(),
        valueTo: secondVal.trim(),
      };
    }
  }

  // Dash separator (e.g., "500-700")
  // IMPORTANT: Only parse dash format for confirmed values to prevent premature badge creation
  // When user types "500-6", we should NOT create badges until they press Enter
  if (isConfirmed) {
    const dashMatch = trimmed.match(/^(.+?)-(.+)$/);
    if (dashMatch) {
      const [, firstVal, secondVal] = dashMatch;
      // Ensure both parts are non-empty after trim
      if (firstVal.trim() && secondVal.trim()) {
        return {
          value: firstVal.trim(),
          valueTo: secondVal.trim(),
        };
      }
    }
  }

  // Only one value provided - incomplete Between
  return null;
};

/**
 * Parse multi-condition filter pattern (supports N conditions up to MAX_FILTER_CONDITIONS):
 *
 * Same column:  #field #op1 val1 #and #op2 val2 #or #op3 val3##
 * Multi column: #col1 #op1 val1 #and #col2 #op2 val2 #or #col3 #op3 val3##
 * Mixed:        #col1 #op1 val1 #and #op2 val2 #or #col3 #op3 val3##
 *
 * Returns null if not a complete multi-condition pattern
 */
const parseMultiConditionFilter = (
  searchValue: string,
  _column: SearchColumn, // Kept for API compatibility, but we extract column from searchValue
  columns: SearchColumn[]
): FilterSearch | null => {
  // Pattern to detect join operators (#and or #or)
  const hasJoinOperator = /#(and|or)/i.test(searchValue);
  if (!hasJoinOperator) return null;

  // IMPORTANT: Only treat as complete multi-condition if ALL values are confirmed
  // Check if pattern ends with "##" (Enter confirmation) to ensure user finished typing
  const hasConfirmationMarker = searchValue.endsWith('##');
  if (!hasConfirmationMarker) {
    return null;
  }

  // Extract field/column prefix: #colName
  const fieldMatch = searchValue.match(/^#([^\s#]+)\s+(.+)$/);
  if (!fieldMatch) return null;

  const [, firstColumnName, restAfterFirstCol] = fieldMatch;
  const firstColumn = findColumn(columns, firstColumnName);
  if (!firstColumn) return null;

  // Split the rest by join operators
  const { parts, joinOperators } = splitByJoinOperators(restAfterFirstCol);

  // Validate we have at least 2 parts (conditions) and correct number of joins
  if (parts.length < 2 || joinOperators.length !== parts.length - 1) {
    return null;
  }

  // Check MAX_FILTER_CONDITIONS limit
  if (parts.length > MAX_FILTER_CONDITIONS) {
    return null;
  }

  // Parse each condition part
  const conditions: FilterCondition[] = [];
  let isMultiColumn = false;
  let lastColumn = firstColumn;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const defaultColumn = lastColumn; // Inherit from previous condition

    // Parts from splitByJoinOperators already have # prefix
    // Just ensure # is present if missing (shouldn't happen normally)
    const condition = parseConditionPart(
      part.startsWith('#') ? part : `#${part}`,
      columns,
      defaultColumn
    );

    if (!condition) {
      return null; // Invalid condition
    }

    // Track if any condition uses a different column
    if (condition.column.field !== firstColumn.field) {
      isMultiColumn = true;
    }

    // Update last column for next condition's default
    lastColumn = condition.column;

    conditions.push(condition);
  }

  // Validate all conditions
  if (!validateConditions(conditions)) {
    return null;
  }

  return {
    field: firstColumn.field,
    value: conditions[0].value,
    valueTo: conditions[0].valueTo,
    operator: conditions[0].operator,
    column: firstColumn,
    isExplicitOperator: true,
    isConfirmed: true,
    conditions,
    // Support both new joinOperators array and legacy joinOperator
    joinOperators,
    joinOperator: joinOperators[0], // Backward compatibility
    isMultiCondition: true,
    isMultiColumn,
  };
};

export const parseSearchValue = (
  rawSearchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState => {
  // Remove newlines (from paste) and trim only leading whitespace
  // Preserve trailing spaces so user can type "para 129" with space in value
  const searchValue = rawSearchValue.replace(/[\r\n]+/g, '').trimStart();

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
          const operatorObj = findOperatorForColumn(column, op);

          if (operatorObj) {
            // For inRange (Between) operator, parse val into value and valueTo
            let filterValue = val.trim();
            let filterValueTo: string | undefined;

            if (operatorObj.value === 'inRange') {
              const inRangeValues = parseInRangeValues(val);
              if (inRangeValues) {
                filterValue = inRangeValues.value;
                filterValueTo = inRangeValues.valueTo;
              }
            }

            // CHANGED: After join operator, show COLUMN selector (not operator)
            // This enables multi-column filtering: user can select same or different column
            return {
              globalSearch: undefined,
              showColumnSelector: true, // CHANGED: show column selector
              showOperatorSelector: false, // CHANGED: not operator selector
              showJoinOperatorSelector: false,
              isFilterMode: false,
              selectedColumn: column,
              isSecondColumn: true, // NEW: flag for second column selection
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              filterSearch: {
                field: column.field,
                value: filterValue,
                valueTo: filterValueTo,
                column,
                operator: operatorObj.value,
                isExplicitOperator: true,
              },
            };
          }
        }

        // ============ MULTI-COLUMN PATTERNS ============
        // These patterns handle when second column is DIFFERENT from first column
        // Pattern: #col1 #op1 val1 #and #col2 ...

        // Pattern: #col1 #op val #and #col2 #op2 val2 (typing second value, multi-column)
        const multiColTypingValue = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s#]+)\s+#([^\s]+)\s+(.+)$/i
        );
        if (multiColTypingValue) {
          const [, col1, op1, val1, join, col2, op2, val2] =
            multiColTypingValue;

          // Make sure val2 doesn't end with ## (complete multi-column handled by parseMultiConditionFilter)
          if (!val2.trim().endsWith('##')) {
            const column1 = findColumn(columns, col1);
            const column2 = findColumn(columns, col2);

            if (column1 && column2) {
              const operator1Obj = findOperatorForColumn(column1, op1);
              const operator2Obj = findOperatorForColumn(column2, op2);

              if (operator1Obj && operator2Obj) {
                let filterValue = val1.trim();
                let filterValueTo: string | undefined;

                if (operator1Obj.value === 'inRange') {
                  const inRangeValues = parseInRangeValues(val1);
                  if (inRangeValues) {
                    filterValue = inRangeValues.value;
                    filterValueTo = inRangeValues.valueTo;
                  }
                }

                // Parse second value - check for Between operator with #to marker
                let secondValue: string | undefined;
                let secondValueTo: string | undefined;
                let waitingForSecondValueTo = false;

                if (operator2Obj.value === 'inRange') {
                  // Check for #to marker: "700 #to" or "700 #to 800"
                  const toMarkerMatch = val2.match(
                    /^(.+?)\s+#to(?:\s+(.*))?$/i
                  );
                  if (toMarkerMatch) {
                    secondValue = toMarkerMatch[1].trim();
                    const afterTo = toMarkerMatch[2]?.trim();
                    if (afterTo) {
                      secondValueTo = afterTo;
                    } else {
                      // Has #to but no value after - waiting for valueTo
                      waitingForSecondValueTo = true;
                    }
                  } else {
                    // No #to marker yet - just the first value
                    secondValue = val2.trim();
                  }
                } else {
                  // Not a Between operator - just store the value
                  secondValue = val2.trim();
                }

                // User is typing second value in multi-column filter
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: false,
                  showJoinOperatorSelector: false,
                  isFilterMode: false,
                  selectedColumn: column1,
                  secondColumn: column2, // Track second column
                  partialJoin: join.toUpperCase() as 'AND' | 'OR',
                  secondOperator: operator2Obj.value,
                  secondValue,
                  secondValueTo,
                  waitingForSecondValueTo,
                  filterSearch: {
                    field: column1.field,
                    value: filterValue,
                    valueTo: filterValueTo,
                    column: column1,
                    operator: operator1Obj.value,
                    isExplicitOperator: true,
                  },
                };
              }
            }
          }
        }

        // Pattern: #col1 #op val #and #col2 #op2 (second operator selected, no value yet)
        const multiColOperatorSelected = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s#]+)\s+#([^\s]+)\s*$/i
        );
        if (multiColOperatorSelected) {
          const [, col1, op1, val1, join, col2, op2] = multiColOperatorSelected;
          const column1 = findColumn(columns, col1);
          const column2 = findColumn(columns, col2);

          if (column1 && column2) {
            const operator1Obj = findOperatorForColumn(column1, op1);
            const operator2Obj = findOperatorForColumn(column2, op2);

            if (operator1Obj && operator2Obj) {
              let filterValue = val1.trim();
              let filterValueTo: string | undefined;

              if (operator1Obj.value === 'inRange') {
                const inRangeValues = parseInRangeValues(val1);
                if (inRangeValues) {
                  filterValue = inRangeValues.value;
                  filterValueTo = inRangeValues.valueTo;
                }
              }

              // Second operator selected in multi-column, waiting for value
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column1,
                secondColumn: column2,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                secondOperator: operator2Obj.value,
                filterSearch: {
                  field: column1.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column: column1,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                },
              };
            }
          }
        }

        // Pattern: #col1 #op val #and #col2 # (show operator selector for col2)
        const multiColOperatorSelector = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s#]+)\s+#\s*$/i
        );
        if (multiColOperatorSelector) {
          const [, col1, op1, val1, join, col2] = multiColOperatorSelector;
          const column1 = findColumn(columns, col1);
          const column2 = findColumn(columns, col2);

          if (column1 && column2) {
            const operator1Obj = findOperatorForColumn(column1, op1);

            if (operator1Obj) {
              let filterValue = val1.trim();
              let filterValueTo: string | undefined;

              if (operator1Obj.value === 'inRange') {
                const inRangeValues = parseInRangeValues(val1);
                if (inRangeValues) {
                  filterValue = inRangeValues.value;
                  filterValueTo = inRangeValues.valueTo;
                }
              }

              // Show operator selector for second column
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: true, // Show operator selector
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column2, // Use col2 for operator selection
                secondColumn: column2,
                isSecondOperator: true,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                filterSearch: {
                  field: column1.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column: column1,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                },
              };
            }
          }
        }

        // Pattern: #col1 #op val #and #col2 (second column selected, waiting for operator)
        const multiColColumnSelected = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s#]+)\s*$/i
        );
        if (multiColColumnSelected) {
          const [, col1, op1, val1, join, col2] = multiColColumnSelected;
          const column1 = findColumn(columns, col1);
          const column2 = findColumn(columns, col2);

          // Only match if col2 is a valid column AND col2 is NOT an operator
          // This prevents matching "#col1 #op val #and #op2" as multi-column
          if (column1 && column2) {
            const operator1Obj = findOperatorForColumn(column1, op1);
            // Check if col2 is actually an operator (not a column)
            const col2AsOperator = findOperatorForColumn(column1, col2);

            // If col2 is NOT a valid operator for col1, treat it as a column name
            if (operator1Obj && !col2AsOperator) {
              let filterValue = val1.trim();
              let filterValueTo: string | undefined;

              if (operator1Obj.value === 'inRange') {
                const inRangeValues = parseInRangeValues(val1);
                if (inRangeValues) {
                  filterValue = inRangeValues.value;
                  filterValueTo = inRangeValues.valueTo;
                }
              }

              // Second column selected, waiting for user to add # for operator selector
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column1,
                secondColumn: column2,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                filterSearch: {
                  field: column1.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column: column1,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                },
              };
            }
          }
          // NEW: Handle partial second column name being typed/deleted (multi-column)
          // col2 is NOT a valid column (user is typing/deleting column name)
          else if (column1 && !column2) {
            const operator1Obj = findOperatorForColumn(column1, op1);
            // Ensure col2 is also not a valid operator (to avoid collision with same-column patterns)
            const col2AsOperator = findOperatorForColumn(column1, col2);

            if (operator1Obj && !col2AsOperator) {
              let filterValue = val1.trim();
              let filterValueTo: string | undefined;

              if (operator1Obj.value === 'inRange') {
                const inRangeValues = parseInRangeValues(val1);
                if (inRangeValues) {
                  filterValue = inRangeValues.value;
                  filterValueTo = inRangeValues.valueTo;
                }
              }

              // Show column selector with first condition preserved
              return {
                globalSearch: undefined,
                showColumnSelector: true,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column1,
                isSecondColumn: true,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                filterSearch: {
                  field: column1.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column: column1,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                },
              };
            }
          }
        }

        // ============ SAME-COLUMN PATTERNS (existing) ============
        // These patterns handle when second condition uses the SAME column
        // Pattern: #col #op1 val1 #and #op2 ...

        // Check for incomplete multi-condition with second value being typed (SAME COLUMN)
        // Pattern: #field #op1 val1 #and #op2 val2 (without ## confirmation)
        const incompleteMultiWithValue = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s+(.+)$/i
        );
        if (incompleteMultiWithValue) {
          const [, , op1, val1, join, op2, val2] = incompleteMultiWithValue;

          // Make sure val2 doesn't end with ## (that would be a complete multi-condition)
          if (!val2.trim().endsWith('##')) {
            const operator1Obj = findOperatorForColumn(column, op1);
            const operator2Obj = findOperatorForColumn(column, op2);

            if (operator1Obj && operator2Obj) {
              // For inRange (Between) operator on first condition, parse val1 into value and valueTo
              let filterValue = val1.trim();
              let filterValueTo: string | undefined;

              if (operator1Obj.value === 'inRange') {
                const inRangeValues = parseInRangeValues(val1);
                if (inRangeValues) {
                  filterValue = inRangeValues.value;
                  filterValueTo = inRangeValues.valueTo;
                }
              }

              // Parse second value - check for Between operator with #to marker
              let secondValue: string | undefined;
              let secondValueTo: string | undefined;
              let waitingForSecondValueTo = false;

              if (operator2Obj.value === 'inRange') {
                // Check for #to marker: "700 #to" or "700 #to 800"
                const toMarkerMatch = val2.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
                if (toMarkerMatch) {
                  secondValue = toMarkerMatch[1].trim();
                  const afterTo = toMarkerMatch[2]?.trim();
                  if (afterTo) {
                    secondValueTo = afterTo;
                  } else {
                    // Has #to but no value after - waiting for valueTo
                    waitingForSecondValueTo = true;
                  }
                } else {
                  // No #to marker yet - just the first value
                  secondValue = val2.trim();
                }
              } else {
                // Not a Between operator - just store the value
                secondValue = val2.trim();
              }

              // User is typing second value - keep in input mode for Enter key to work
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false, // ← NOT filter mode - allows Enter key to add ##
                selectedColumn: column,
                isSecondOperator: false,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                secondOperator: operator2Obj.value, // Store second operator for badge display
                secondValue,
                secondValueTo,
                waitingForSecondValueTo,
                filterSearch: {
                  field: column.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                },
              };
            }
          }
        }

        // Check for incomplete multi-condition - second operator selected but no value yet (SAME COLUMN)
        // Pattern: #field #op1 val1 #and #op2 (with optional trailing space)
        const incompleteMultiCondition = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s*$/i
        );
        if (incompleteMultiCondition) {
          const [, , op1, val1, join, op2] = incompleteMultiCondition;
          const operator1Obj = findOperatorForColumn(column, op1);
          const operator2Obj = findOperatorForColumn(column, op2);

          if (operator1Obj && operator2Obj) {
            // For inRange (Between) operator, parse val1 into value and valueTo
            let filterValue = val1.trim();
            let filterValueTo: string | undefined;

            if (operator1Obj.value === 'inRange') {
              const inRangeValues = parseInRangeValues(val1);
              if (inRangeValues) {
                filterValue = inRangeValues.value;
                filterValueTo = inRangeValues.valueTo;
              }
            }

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
                value: filterValue,
                valueTo: filterValueTo,
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
          const operatorObj = findOperatorForColumn(column, op);

          if (operatorObj) {
            // Remove ALL trailing # from value (from ## confirmation marker)
            const cleanValue = val.trim().replace(/#+$/, '');

            // For inRange (Between) operator, parse cleanValue into value and valueTo
            let filterValue = cleanValue;
            let filterValueTo: string | undefined;

            if (operatorObj.value === 'inRange') {
              const inRangeValues = parseInRangeValues(cleanValue, true); // Confirmed with ##
              if (inRangeValues) {
                filterValue = inRangeValues.value;
                filterValueTo = inRangeValues.valueTo;
              } else {
                // Between operator requires 2 values - don't show join selector
                // Keep in filter mode to let user complete the second value
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: false,
                  showJoinOperatorSelector: false,
                  isFilterMode: true,
                  filterSearch: {
                    field: column.field,
                    value: cleanValue, // Still only first value
                    column,
                    operator: operatorObj.value,
                    isExplicitOperator: true,
                    isConfirmed: false, // Not confirmed - incomplete Between
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
                value: filterValue,
                valueTo: filterValueTo,
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
            const operator2Obj = findOperatorForColumn(column, op2Text);

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

            // NEW: Handle partial second column name being typed/deleted (multi-column)
            // When op2Text is NOT a valid operator, check if it could be a partial column name
            // Pattern: #col1 #op1 val1 #and #partialColName
            const partialColumn = findColumn(columns, op2Text);
            if (!operator2Obj && !partialColumn) {
              // op2Text is neither a valid operator nor a valid column
              // User is typing/deleting second column name - show column selector
              return {
                globalSearch: undefined,
                showColumnSelector: true,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column,
                isSecondColumn: true, // Flag for second column selection
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                filterSearch: {
                  field: column.field,
                  value: beforeJoin,
                  column,
                  operator: operatorInput,
                  isExplicitOperator: true,
                },
              };
            }
          }

          // NEW: Handle partial join with incomplete second part: #col1 #op val #and # or #col1 #op val #and
          // This catches the case where join operator is present but nothing/just # after it
          const partialJoinInValue = filterValue?.match(/#(and|or)\s*#?\s*$/i);
          if (partialJoinInValue) {
            const [, join] = partialJoinInValue;
            const beforeJoin = filterValue!
              .substring(0, filterValue!.indexOf(`#${join}`))
              .trim();

            return {
              globalSearch: undefined,
              showColumnSelector: true,
              showOperatorSelector: false,
              showJoinOperatorSelector: false,
              isFilterMode: false,
              selectedColumn: column,
              isSecondColumn: true,
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              filterSearch: {
                field: column.field,
                value: beforeJoin,
                column,
                operator: operatorInput,
                isExplicitOperator: true,
              },
            };
          }

          // Search in appropriate operators based on column type
          const operator = findOperatorForColumn(column, operatorInput);

          if (operator) {
            // Check if value has ## confirmation marker
            const rawValue = filterValue || '';
            const hasConfirmation = rawValue.endsWith('##');
            const cleanValue = hasConfirmation
              ? rawValue.slice(0, -2)
              : rawValue;

            // Check if this is inRange (Between) operator - needs 2 values
            if (operator.value === 'inRange' && cleanValue) {
              // Check for #to marker pattern: "500 #to" or "500 #to 700"
              const toMarkerMatch = cleanValue.match(
                /^(.+?)\s+#to(?:\s+(.*))?$/i
              );
              if (toMarkerMatch) {
                const [, firstValue, secondValue] = toMarkerMatch;
                // Clean second value: remove trailing ## (confirmation) and trailing # (join selector)
                // Pattern "500 #to 600## #" should extract "600" not "600## #"
                const cleanedSecond = secondValue
                  ?.trim()
                  .replace(/#+\s*#?\s*$/, '') // Remove trailing ## or ## # patterns
                  .trim();

                if (cleanedSecond) {
                  // Has both values: "500 #to 700"
                  // Check if original had ## confirmation marker (before join selector #)
                  const hasValueConfirmation =
                    hasConfirmation || /##\s*#?\s*$/.test(secondValue || '');
                  return {
                    globalSearch: undefined,
                    showColumnSelector: false,
                    showOperatorSelector: false,
                    showJoinOperatorSelector: false,
                    isFilterMode: true,
                    filterSearch: {
                      field: column.field,
                      value: firstValue.trim(),
                      valueTo: cleanedSecond,
                      column,
                      operator: operator.value,
                      isExplicitOperator: true,
                      isConfirmed: hasValueConfirmation,
                      waitingForValueTo: false,
                    },
                  };
                } else {
                  // Waiting for second value: "500 #to" or "500 #to "
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

              const inRangeValues = parseInRangeValues(
                cleanValue,
                hasConfirmation
              );
              if (inRangeValues) {
                // Valid Between with both values (space-separated or dash-separated)
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
              // Incomplete Between - only one value provided
              // User is still typing first value or hasn't pressed Enter yet
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

export const getOperatorSearchTerm = (value: string): string => {
  if (value.startsWith('#')) {
    // MULTI-COLUMN: Check for pattern #col1 #op1 val1 #and #col2 #searchTerm
    // Extract operator search term for second column
    const multiColOpMatch = value.match(/#(?:and|or)\s+#[^\s#]+\s+#([^\s]*)$/i);
    if (multiColOpMatch) {
      return multiColOpMatch[1]; // Return search term after second column
    }

    // SAME-COLUMN: Check for second operator pattern: #field #op1 val1 #and #search_term
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
