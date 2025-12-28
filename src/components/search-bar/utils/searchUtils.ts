import { JOIN_OPERATORS } from '../operators';
import {
  EnhancedSearchState,
  FilterCondition,
  FilterSearch,
  PartialCondition,
  SearchColumn,
} from '../types';
import { findOperatorForColumn } from './operatorUtils';

// ============================================================================
// N-CONDITION PARTIAL PARSER (Scalable)
// ============================================================================

/**
 * Count the number of join operators (#and/#or) in a pattern
 */
const countJoins = (pattern: string): number => {
  const matches = pattern.match(/#(and|or)/gi);
  return matches ? matches.length : 0;
};

/**
 * Parse N-condition partial pattern (while user is typing)
 * Handles patterns with 2+ joins dynamically.
 *
 * Returns null if pattern doesn't match or has fewer than 2 joins (let existing code handle it)
 */
const parsePartialNConditions = (
  searchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState | null => {
  // Only handle patterns with 2+ joins (3+ conditions)
  const joinCount = countJoins(searchValue);
  if (joinCount < 2) return null;

  // Don't handle confirmed patterns (ending with ##)
  if (searchValue.endsWith('##')) return null;

  // Helper to strip ## confirmation marker and trailing whitespace from values
  // This handles cases like "600## #" → "600" and "600##" → "600"
  const stripConfirmationMarker = (val: string): string => {
    let result = val.trim();
    // First remove trailing " #" (join selector trigger)
    if (result.endsWith(' #')) {
      result = result.slice(0, -2).trim();
    }
    // Then remove "##" (confirmation marker)
    if (result.endsWith('##')) {
      result = result.slice(0, -2).trim();
    }
    return result;
  };

  // Split by join operators, preserving them
  const joinSplitRegex = /\s+#(and|or)\s+/gi;
  const segments: string[] = [];
  const joins: ('AND' | 'OR')[] = [];

  let lastIndex = 0;
  let match;
  const regex = new RegExp(joinSplitRegex.source, 'gi');

  while ((match = regex.exec(searchValue)) !== null) {
    segments.push(searchValue.slice(lastIndex, match.index));
    joins.push(match[1].toUpperCase() as 'AND' | 'OR');
    lastIndex = match.index + match[0].length;
  }
  // Add remaining part
  segments.push(searchValue.slice(lastIndex));

  if (segments.length < 3) return null; // Need at least 3 segments for 2 joins

  const partialConditions: PartialCondition[] = [];
  let firstColumn: SearchColumn | null = null;

  // Parse each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim();

    if (i === 0) {
      // First segment: #col1 #op1 val1
      const firstMatch = segment.match(/^#([^\s#]+)\s+#([^\s]+)\s+(.+)$/);
      if (firstMatch) {
        const [, colName, opName, value] = firstMatch;
        const col = findColumn(columns, colName);
        if (col) {
          firstColumn = col;
          const opObj = findOperatorForColumn(col, opName);
          if (opObj) {
            let filterValue = stripConfirmationMarker(value);
            let filterValueTo: string | undefined;

            if (opObj.value === 'inRange') {
              // Try #to marker format first: "500 #to 600"
              const toMatch = filterValue.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
              if (toMatch) {
                filterValue = stripConfirmationMarker(toMatch[1]);
                if (toMatch[2]?.trim()) {
                  filterValueTo = stripConfirmationMarker(toMatch[2]);
                } else {
                  // [FIX] Set waitingForValueTo for first condition too
                  const waitingForValueTo = true;
                  partialConditions.push({
                    field: col.field,
                    column: col,
                    operator: opObj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                    waitingForValueTo,
                  });
                  continue; // Skip the generic push below
                }
              } else {
                // Try dash format: "500-600" (only for confirmed values)
                const wasConfirmed =
                  value.includes('##') || searchValue.trimEnd().endsWith(' #');
                if (wasConfirmed) {
                  const dashMatch = filterValue.match(/^(.+?)-(.+)$/);
                  if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
                    filterValue = dashMatch[1].trim();
                    filterValueTo = dashMatch[2].trim();
                  }
                }
              }
            }

            partialConditions.push({
              field: col.field,
              column: col,
              operator: opObj.value,
              value: filterValue,
              valueTo: filterValueTo,
            });
          }
        }
      }
    } else {
      // Subsequent segments
      const trimmed = segment.trim();

      if (!trimmed || trimmed === '#') {
        // Empty or just # - show column selector
        partialConditions.push({});
      } else if (trimmed.match(/^#([^\s#]+)\s+#([^\s]+)\s+(.+)$/)) {
        // Full: #col #op value
        const [, colName, opName, value] = trimmed.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+(.+)$/
        )!;
        const col = findColumn(columns, colName);
        if (col) {
          const opObj = findOperatorForColumn(col, opName);
          if (opObj) {
            let filterValue = stripConfirmationMarker(value);
            let filterValueTo: string | undefined;
            let waitingForValueTo = false;

            if (opObj.value === 'inRange') {
              // Try #to marker format first: "500 #to 600"
              const toMatch = filterValue.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
              if (toMatch) {
                filterValue = stripConfirmationMarker(toMatch[1]);
                if (toMatch[2]?.trim()) {
                  filterValueTo = stripConfirmationMarker(toMatch[2]);
                } else {
                  waitingForValueTo = true;
                }
              } else {
                // Try dash format: "500-600" (only for confirmed values)
                // Check if original value had ## marker or is in join selector trigger state
                const wasConfirmed =
                  value.includes('##') || searchValue.trimEnd().endsWith(' #');
                if (wasConfirmed) {
                  const dashMatch = filterValue.match(/^(.+?)-(.+)$/);
                  if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
                    filterValue = dashMatch[1].trim();
                    filterValueTo = dashMatch[2].trim();
                  }
                }
              }
            }

            partialConditions.push({
              field: col.field,
              column: col,
              operator: opObj.value,
              value: filterValue,
              valueTo: filterValueTo,
              waitingForValueTo,
            });
          }
        }
      } else if (trimmed.match(/^#([^\s#]+)\s+#([^\s]+)\s*$/)) {
        // Partial: #col #op (no value yet)
        const [, colName, opName] = trimmed.match(
          /^#([^\s#]+)\s+#([^\s]+)\s*$/
        )!;
        const col = findColumn(columns, colName);
        if (col) {
          const opObj = findOperatorForColumn(col, opName);
          if (opObj) {
            partialConditions.push({
              field: col.field,
              column: col,
              operator: opObj.value,
            });
          }
        }
      } else if (trimmed.match(/^#([^\s#]+)\s*#\s*$/)) {
        // Partial: #col # (operator selector) - handle both "#col #" and "#col#"
        const [, colName] = trimmed.match(/^#([^\s#]+)\s*#\s*$/)!;
        const col = findColumn(columns, colName);
        if (col) {
          partialConditions.push({
            field: col.field,
            column: col,
          });
        } else {
          // Column not found - push empty to maintain array length
          partialConditions.push({});
        }
      } else if (trimmed.match(/^#([^\s]+)\s+(.+)$/)) {
        // Same-column: #op value
        const [, opName, value] = trimmed.match(/^#([^\s]+)\s+(.+)$/)!;
        const col = firstColumn || columns[0];
        if (col) {
          const opObj = findOperatorForColumn(col, opName);
          if (opObj) {
            let filterValue = stripConfirmationMarker(value);
            let filterValueTo: string | undefined;
            let waitingForValueTo = false;

            if (opObj.value === 'inRange') {
              const toMatch = filterValue.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
              if (toMatch) {
                filterValue = stripConfirmationMarker(toMatch[1]);
                if (toMatch[2]?.trim()) {
                  filterValueTo = stripConfirmationMarker(toMatch[2]);
                } else {
                  waitingForValueTo = true;
                }
              }
            }

            partialConditions.push({
              field: col.field,
              column: col,
              operator: opObj.value,
              value: filterValue,
              valueTo: filterValueTo,
              waitingForValueTo,
            });
          }
        }
      } else if (trimmed.match(/^#([^\s]+)\s*$/)) {
        // Combine check: Is it an operator OR a column?
        // Handle both "#op" and "#col" and even "#col#" gracefully
        const name = trimmed.match(/^#([^\s#]+)/)?.[1] || '';
        if (!name && trimmed === '#') {
          partialConditions.push({});
          continue;
        }

        const col = firstColumn || columns[0];
        const opObj = col ? findOperatorForColumn(col, name) : null;

        if (opObj) {
          // It's a valid operator for the current column
          partialConditions.push({
            field: col!.field,
            column: col!,
            operator: opObj.value,
          });
        } else {
          // Not an operator, check if it's a known column
          const knownCol = findColumn(columns, name);
          if (knownCol) {
            partialConditions.push({
              field: knownCol.field,
              column: knownCol,
            });
          } else {
            // Column being typed (unknown yet)
            partialConditions.push({});
          }
        }
      } else {
        // Unknown segment - empty slot
        partialConditions.push({});
      }
    }
  }

  if (partialConditions.length < 3) return null;

  // Determine UI state based on last condition
  const lastCondition = partialConditions[partialConditions.length - 1];
  let activeConditionIndex = partialConditions.length - 1;

  // [FIX] Check if last condition's value is confirmed with ## marker
  // If confirmed, activeConditionIndex should point to NEXT condition (not current)
  // This prevents useBadgeBuilder from treating confirmed values as "being typed"
  // Pattern: "...value##" or "...value## " (trailing space before adding new condition)
  const lastConditionConfirmed = /##\s*$/.test(searchValue);

  // NEW: Detect join selector trigger (trailing #)
  // This allows triggering join selector after 3rd, 4th... condition
  // [FIX] Exclude join operators (#and/#or) followed by # to avoid multi-selector anomaly
  const hasJoinOperatorEnd = /#(and|or)\s*#\s*$/i.test(searchValue);
  const isJoinSelectorTrigger =
    searchValue.trimEnd().endsWith(' #') &&
    !hasJoinOperatorEnd &&
    // [FIX] Ensure the previous condition is strictly COMPLETE before triggering join selector.
    // Must have a value (or valueTo for inRange).
    // If we only have a column (but no value), the # means "Operator Selector", not "Join Selector".
    (!!lastCondition.value || !!lastCondition.valueTo);
  let showJoinOperatorSelector = false;
  let showColumnSelector = false;
  let showOperatorSelector = false;
  let selectedColumn = firstColumn || undefined;

  if (isJoinSelectorTrigger) {
    showJoinOperatorSelector = true;
    showColumnSelector = false; // Force other selectors off
    showOperatorSelector = false;

    // [SAFETY] Apply stripConfirmationMarker to lastCondition as a safety net
    // This handles any edge cases where the parsing didn't fully clean the values
    // Pattern: "500 #to 600## #" → "500 #to 600"
    if (lastCondition.value) {
      lastCondition.value = stripConfirmationMarker(lastCondition.value);
    }
    if (lastCondition.valueTo) {
      lastCondition.valueTo = stripConfirmationMarker(lastCondition.valueTo);
    }

    // [FIX] When join selector is open, point to NEXT condition
    // The current condition[N] is complete, user is about to add condition[N+1]
    activeConditionIndex = partialConditions.length;
  } else if (lastConditionConfirmed && lastCondition.value) {
    // [FIX] Last condition is confirmed with ## but join selector not yet triggered
    // Point activeConditionIndex to NEXT condition to prevent hiding current badges
    // This handles the "...value## " state (Space pressed, about to type #)
    activeConditionIndex = partialConditions.length;
  } else {
    // Only check for other selectors if NOT a join trigger
    if (!lastCondition.column) {
      // No column yet - show column selector
      showColumnSelector = true;
    } else if (!lastCondition.operator) {
      // Has column but no operator - check if pattern ends with #
      selectedColumn = lastCondition.column;
      if (searchValue.trimEnd().endsWith('#')) {
        showOperatorSelector = true;
      }
    } else {
      // Has operator - might be typing value
      selectedColumn = lastCondition.column;
    }
  }

  // Build filterSearch with multi-condition support
  const firstCond = partialConditions[0];

  // Check how many complete conditions we have (conditions with values)
  const completeConditions = partialConditions.filter(
    c => c.operator && c.value !== undefined && c.value !== ''
  );

  // Determine if this is multi-column
  const hasMultiColumn = completeConditions.some(
    (c, i) => i > 0 && c.field !== completeConditions[0]?.field
  );

  let filterSearch: FilterSearch | undefined;

  // Check if the last condition is being actively typed (not yet confirmed)
  // If so, exclude it from the confirmed filter - only include previously confirmed conditions
  const lastConditionIdx = partialConditions.length - 1;
  const isTypingLastConditionValue =
    activeConditionIndex === lastConditionIdx &&
    !showColumnSelector &&
    !showOperatorSelector &&
    !showJoinOperatorSelector && // Join selector trigger confirms the value
    partialConditions[lastConditionIdx]?.value; // Has a value being typed

  // Only include conditions that were confirmed BEFORE user started typing the new one
  // The last condition with value is being typed, so exclude it from confirmed filter
  const confirmedConditions = isTypingLastConditionValue
    ? completeConditions.slice(0, -1) // Exclude last condition being typed
    : completeConditions;

  if (confirmedConditions.length >= 2) {
    // Multi-condition with at least 2 confirmed conditions
    // Build conditions array for grid filter (excludes condition being typed)
    const conditions: FilterCondition[] = confirmedConditions.map(c => ({
      field: c.field || firstColumn?.field || '',
      column: c.column || firstColumn!,
      operator: c.operator!,
      value: c.value!,
      valueTo: c.valueTo,
    }));

    filterSearch = {
      field: firstCond.field || firstColumn?.field || '',
      value: firstCond.value || '',
      valueTo: firstCond.valueTo,
      column: firstCond.column || firstColumn!,
      operator: firstCond.operator!,
      isExplicitOperator: true,
      isConfirmed: true, // The existing conditions ARE confirmed
      isMultiCondition: true,
      isMultiColumn: hasMultiColumn,
      conditions,
      joins: joins.slice(0, confirmedConditions.length - 1),
      joinOperator: joins[0],
    };
  } else if (firstCond.operator && firstCond.value !== undefined) {
    // Single complete condition
    filterSearch = {
      field: firstCond.field || firstColumn?.field || '',
      value: firstCond.value || '',
      valueTo: firstCond.valueTo,
      column: firstCond.column || firstColumn!,
      operator: firstCond.operator,
      isExplicitOperator: true,
    };
  }

  // Only set isFilterMode when we have confirmed multi-condition AND not showing selectors
  // When showing selectors, we're in partial state - use N-condition loop in useBadgeBuilder
  // Use confirmedConditions (excludes condition being typed) to avoid premature filter application
  const isInFilterMode =
    confirmedConditions.length >= 2 &&
    !showColumnSelector &&
    !showOperatorSelector;

  return {
    globalSearch: undefined,
    showColumnSelector,
    showOperatorSelector,
    showJoinOperatorSelector,
    isFilterMode: isInFilterMode,
    selectedColumn,
    partialJoin: joins[joins.length - 1],
    activeConditionIndex,
    partialConditions,
    joins,
    filterSearch,
  };
};

// ============================================================================
// END N-CONDITION PARTIAL PARSER
// ============================================================================

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
    const [, fromVal, toVal] = toMarkerMatch;
    if (fromVal.trim() && toVal.trim()) {
      return {
        value: fromVal.trim(),
        valueTo: toVal.trim(),
      };
    }
  }

  // Dash separator (e.g., "500-700")
  // IMPORTANT: Only parse dash format for confirmed values to prevent premature badge creation
  // When user types "500-6", we should NOT create badges until they press Enter
  if (isConfirmed) {
    const dashMatch = trimmed.match(/^(.+?)-(.+)$/);
    if (dashMatch) {
      const [, fromVal, toVal] = dashMatch;
      // Ensure both parts are non-empty after trim
      if (fromVal.trim() && toVal.trim()) {
        return {
          value: fromVal.trim(),
          valueTo: toVal.trim(),
        };
      }
    }
  }

  // Only one value provided - incomplete Between
  return null;
};

/**
 * Parse a single condition segment from pattern
 * Handles: "#col #op value" or "#op value" (same-column)
 *
 * @param segment - The condition segment to parse
 * @param defaultColumn - Default column if not specified in segment
 * @param columns - Available columns for lookup
 * @returns Parsed condition or null
 */
const parseConditionSegment = (
  segment: string,
  defaultColumn: SearchColumn,
  columns: SearchColumn[]
): FilterCondition | null => {
  const trimmed = segment.trim().replace(/##$/, '');
  if (!trimmed) return null;

  // Try multi-column format: #col #op value
  const multiColMatch = trimmed.match(/^#([^\s#]+)\s+#([^\s]+)\s+(.+)$/);
  if (multiColMatch) {
    const [, colName, opName, value] = multiColMatch;
    const col = findColumn(columns, colName);
    if (col) {
      const opObj = findOperatorForColumn(col, opName);
      if (opObj) {
        if (opObj.value === 'inRange') {
          const inRangeValues = parseInRangeValues(value.trim(), true);
          if (inRangeValues) {
            return {
              operator: opObj.value,
              value: inRangeValues.value,
              valueTo: inRangeValues.valueTo,
              field: col.field,
              column: col,
            };
          }
        }
        return {
          operator: opObj.value,
          value: value.trim(),
          field: col.field,
          column: col,
        };
      }
    }
  }

  // Try same-column format: #op value
  const sameColMatch = trimmed.match(/^#([^\s]+)\s+(.+)$/);
  if (sameColMatch) {
    const [, opName, value] = sameColMatch;
    const opObj = findOperatorForColumn(defaultColumn, opName);
    if (opObj) {
      if (opObj.value === 'inRange') {
        const inRangeValues = parseInRangeValues(value.trim(), true);
        if (inRangeValues) {
          return {
            operator: opObj.value,
            value: inRangeValues.value,
            valueTo: inRangeValues.valueTo,
            field: defaultColumn.field,
            column: defaultColumn,
          };
        }
      }
      return {
        operator: opObj.value,
        value: value.trim(),
        field: defaultColumn.field,
        column: defaultColumn,
      };
    }
  }

  return null;
};

/**
 * Parse multi-condition filter pattern (N-condition scalable):
 * Same column:  #field #op1 val1 #and #op2 val2 #or #op3 val3##
 * Multi column: #col1 #op1 val1 #and #col2 #op2 val2 #or #col3 #op3 val3##
 * Mixed:        #col1 #op1 val1 #and #op2 val2 #or #col3 #op3 val3##
 *
 * Supports unlimited N conditions with N-1 joins.
 * Returns null if not a complete multi-condition pattern.
 */
const parseMultiConditionFilter = (
  searchValue: string,
  column: SearchColumn,
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

  // Remove the ## marker for parsing
  const cleanValue = searchValue.slice(0, -2);

  // Split by join operators while preserving them
  // Pattern: split on " #and " or " #or " (with spaces)
  const joinSplitRegex = /\s+#(and|or)\s+/i;
  const segments = cleanValue.split(joinSplitRegex);

  // segments array alternates: [condition1, join1, condition2, join2, condition3, ...]
  // Even indices (0, 2, 4, ...) are conditions
  // Odd indices (1, 3, 5, ...) are join operators

  const conditions: FilterCondition[] = [];
  const joins: ('AND' | 'OR')[] = [];
  let firstColumn: SearchColumn | null = null;
  let hasMultiColumn = false;

  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      // This is a condition segment
      const segment = segments[i];

      // For first segment, extract the column from the beginning
      if (i === 0) {
        // First condition: #col1 #op1 val1 OR just #op1 val1 (if defaultColumn)
        const firstColMatch = segment.match(/^#([^\s#]+)\s+(.+)$/);
        if (firstColMatch) {
          const [, colName, rest] = firstColMatch;
          const col = findColumn(columns, colName);
          if (col) {
            firstColumn = col;
            // rest already includes "#" (e.g., "#contains para")
            const condition = parseConditionSegment(rest, col, columns);
            if (condition) {
              conditions.push(condition);
            }
          }
        }
      } else {
        // Subsequent conditions: may or may not have explicit column
        const condition = parseConditionSegment(
          segment,
          firstColumn || column,
          columns
        );
        if (condition) {
          conditions.push(condition);
          // Check if this condition uses a different column
          if (condition.field !== firstColumn?.field) {
            hasMultiColumn = true;
          }
        }
      }
    } else {
      // This is a join operator
      const joinOp = segments[i].toUpperCase() as 'AND' | 'OR';
      joins.push(joinOp);
    }
  }

  if (conditions.length < 2) {
    return null;
  }

  // Determine isMultiColumn: true if any condition has different column
  // OR if explicit column syntax was used (e.g., #col2 #op2 val2)
  const isMultiColumn =
    hasMultiColumn ||
    conditions.some((c, i) => i > 0 && c.field !== conditions[0].field);

  const primaryColumn = conditions[0].column || firstColumn || column;

  return {
    field: conditions[0].field || primaryColumn.field,
    value: conditions[0].value,
    valueTo: conditions[0].valueTo,
    operator: conditions[0].operator,
    column: primaryColumn,
    isExplicitOperator: true,
    isConfirmed: true,
    conditions,
    joinOperator: joins[0], // Primary join (for backward compat)
    joins, // Full joins array for N-condition support
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
    // ============ N-CONDITION PARTIAL PATTERNS (3+ conditions) ============
    // Handle patterns with 2+ joins dynamically before falling through to legacy patterns
    const nConditionResult = parsePartialNConditions(searchValue, columns);
    if (nConditionResult) return nConditionResult;
    // ============ END N-CONDITION CHECK ============

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
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              // ============ SCALABLE: N-condition support ============
              activeConditionIndex: 1, // Building condition[1] (index 1)
              partialConditions: [
                {
                  field: column.field,
                  column,
                  operator: operatorObj.value,
                  value: filterValue,
                  valueTo: filterValueTo,
                },
                // Condition[1] slot - empty, waiting for column selection
                {},
              ],
              joins: [join.toUpperCase() as 'AND' | 'OR'],
              // ============ END SCALABLE ============
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
        // These patterns handle when condition[1] column is DIFFERENT from first column
        // Pattern: #col1 #op1 val1 #and #col2 ...

        // Pattern: #col1 #op1 val1 #and #col2 #op2 val2 # (trailing # for adding condition N+1)
        // Shows join selector to add third condition
        // [FIX] Changed val2 capture from [^#]+? to .+? to allow ## in values
        const multiColJoinSelector = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+([^#]+?)\s+#(and|or)\s+#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#\s*$/i
        );
        if (multiColJoinSelector) {
          const [, col1, op1, val1, join, col2, op2, val2] =
            multiColJoinSelector;
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

              // [FIX] Parse condition2 value - handle inRange with dash format
              let cond2Value = val2.trim().replace(/##$/, '');
              let cond2ValueTo: string | undefined;

              if (operator2Obj.value === 'inRange') {
                // Try #to marker format first
                const toMatch = cond2Value.match(/^(.+?)\s+#to\s+(.+)$/i);
                if (toMatch) {
                  cond2Value = toMatch[1].trim();
                  cond2ValueTo = toMatch[2].trim();
                } else {
                  // Try dash format: "500-600"
                  const dashMatch = cond2Value.match(/^(.+?)-(.+)$/);
                  if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
                    cond2Value = dashMatch[1].trim();
                    cond2ValueTo = dashMatch[2].trim();
                  }
                }
              }

              // Show join selector for adding condition[2]
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: true, // Show join selector!
                isFilterMode: false,
                selectedColumn: column1,
                filterSearch: {
                  field: column1.field,
                  value: filterValue,
                  valueTo: filterValueTo,
                  column: column1,
                  operator: operator1Obj.value,
                  isExplicitOperator: true,
                  isConfirmed: true,
                  isMultiCondition: true,
                  isMultiColumn: true,
                  joinOperator: join.toUpperCase() as 'AND' | 'OR',
                  joins: [join.toUpperCase() as 'AND' | 'OR'],
                  conditions: [
                    {
                      field: column1.field,
                      column: column1,
                      operator: operator1Obj.value,
                      value: filterValue,
                      valueTo: filterValueTo,
                    },
                    {
                      field: column2.field,
                      column: column2,
                      operator: operator2Obj.value,
                      value: cond2Value,
                      valueTo: cond2ValueTo,
                    },
                  ],
                },
                // N-condition support
                activeConditionIndex: 2, // Ready for condition[2]
                partialConditions: [
                  {
                    field: column1.field,
                    column: column1,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column2.field,
                    column: column2,
                    operator: operator2Obj.value,
                    value: cond2Value,
                    valueTo: cond2ValueTo,
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
              };
            }
          }
        }

        // Pattern: #col1 #op val #and #col2 #op2 val2 (typing condition[1] value, multi-column)
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

                // Parse condition[1] value - check for Between operator with #to marker
                let cond1Value: string | undefined;
                let cond1ValueTo: string | undefined;
                let waitingForCond1ValueTo = false;

                if (operator2Obj.value === 'inRange') {
                  // Check for #to marker: "700 #to" or "700 #to 800"
                  const toMarkerMatch = val2.match(
                    /^(.+?)\s+#to(?:\s+(.*))?$/i
                  );
                  if (toMarkerMatch) {
                    cond1Value = toMarkerMatch[1].trim();
                    const afterTo = toMarkerMatch[2]?.trim();
                    if (afterTo) {
                      cond1ValueTo = afterTo;
                    } else {
                      // Has #to but no value after - waiting for valueTo
                      waitingForCond1ValueTo = true;
                    }
                  } else {
                    // No #to marker yet - just the first value
                    cond1Value = val2.trim();
                  }
                } else {
                  // Not a Between operator - just store the value
                  cond1Value = val2.trim();
                }

                // User is typing condition[1] value in multi-column filter
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: false,
                  showJoinOperatorSelector: false,
                  isFilterMode: false,
                  selectedColumn: column1,
                  partialJoin: join.toUpperCase() as 'AND' | 'OR',
                  // ============ SCALABLE: N-condition support ============
                  activeConditionIndex: 1, // Building condition[1] (index 1)
                  partialConditions: [
                    {
                      field: column1.field,
                      column: column1,
                      operator: operator1Obj.value,
                      value: filterValue,
                      valueTo: filterValueTo,
                    },
                    {
                      field: column2.field,
                      column: column2,
                      operator: operator2Obj.value,
                      value: cond1Value,
                      valueTo: cond1ValueTo,
                      waitingForValueTo: waitingForCond1ValueTo,
                    },
                  ],
                  joins: [join.toUpperCase() as 'AND' | 'OR'],
                  // ============ END SCALABLE ============
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

        // Pattern: #col1 #op val #and #col2 #op2 (condition[1] operator selected, no value yet)
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
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building second condition (index 1)
                partialConditions: [
                  {
                    field: column1.field,
                    column: column1,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column2.field,
                    column: column2,
                    operator: operator2Obj.value,
                    // No value yet - waiting for input
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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

              // Show operator selector for condition[1] column
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: true, // Show operator selector
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column2, // Use column[1] for operator selection
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building condition[1] (index 1)
                partialConditions: [
                  {
                    field: column1.field,
                    column: column1,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column2.field,
                    column: column2,
                    // Operator not yet selected - showing selector
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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

        // Pattern: #col1 #op val #and #col2 (condition[1] column selected, waiting for operator)
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
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building second condition (index 1)
                partialConditions: [
                  {
                    field: column1.field,
                    column: column1,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column2.field,
                    column: column2,
                    // Waiting for user to type # for operator selector
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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
          // NEW: Handle partial condition[1] column name being typed/deleted (multi-column)
          // col2 is NOT a valid column (user is typing/deleting column[1] name)
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
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building second condition (index 1)
                partialConditions: [
                  {
                    field: column1.field,
                    column: column1,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  // Second condition slot - column being typed
                  {},
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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
        // These patterns handle when condition[1] uses the SAME column
        // Pattern: #col #op1 val1 #and #op2 ...

        // Pattern: #col #op1 val1 #and #op2 val2 # (trailing # for adding condition N+1, same-column)
        // Shows join selector to add third condition
        // [FIX] Changed val2 capture from [^#]+? to .+? to allow ## in values
        const sameColJoinSelector = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+([^#]+?)\s+#(and|or)\s+#([^\s]+)\s+(.+?)\s+#\s*$/i
        );
        if (sameColJoinSelector) {
          const [, , op1, val1, join, op2, val2] = sameColJoinSelector;
          const operator1Obj = findOperatorForColumn(column, op1);
          const operator2Obj = findOperatorForColumn(column, op2);

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

            // [FIX] Parse condition2 value - handle inRange with dash format
            let cond2Value = val2.trim().replace(/##$/, '');
            let cond2ValueTo: string | undefined;

            if (operator2Obj.value === 'inRange') {
              // Try #to marker format first
              const toMatch = cond2Value.match(/^(.+?)\s+#to\s+(.+)$/i);
              if (toMatch) {
                cond2Value = toMatch[1].trim();
                cond2ValueTo = toMatch[2].trim();
              } else {
                // Try dash format: "500-600"
                const dashMatch = cond2Value.match(/^(.+?)-(.+)$/);
                if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
                  cond2Value = dashMatch[1].trim();
                  cond2ValueTo = dashMatch[2].trim();
                }
              }
            }

            // Show join selector for adding condition[2]
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              showJoinOperatorSelector: true, // Show join selector!
              isFilterMode: false,
              selectedColumn: column,
              filterSearch: {
                field: column.field,
                value: filterValue,
                valueTo: filterValueTo,
                column,
                operator: operator1Obj.value,
                isExplicitOperator: true,
                isConfirmed: true,
                isMultiCondition: true,
                isMultiColumn: false,
                joinOperator: join.toUpperCase() as 'AND' | 'OR',
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                conditions: [
                  {
                    field: column.field,
                    column,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column.field,
                    column,
                    operator: operator2Obj.value,
                    value: cond2Value,
                    valueTo: cond2ValueTo,
                  },
                ],
              },
              // N-condition support
              activeConditionIndex: 2, // Ready for condition[2]
              partialConditions: [
                {
                  field: column.field,
                  column,
                  operator: operator1Obj.value,
                  value: filterValue,
                  valueTo: filterValueTo,
                },
                {
                  field: column.field,
                  column,
                  operator: operator2Obj.value,
                  value: cond2Value,
                  valueTo: cond2ValueTo,
                },
              ],
              joins: [join.toUpperCase() as 'AND' | 'OR'],
            };
          }
        }

        // Check for incomplete multi-condition with condition[1] value being typed (SAME COLUMN)
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

              // Parse condition[1] value - check for Between operator with #to marker
              let cond1Value: string | undefined;
              let cond1ValueTo: string | undefined;
              let waitingForCond1ValueTo = false;

              if (operator2Obj.value === 'inRange') {
                // Check for #to marker: "700 #to" or "700 #to 800"
                const toMarkerMatch = val2.match(/^(.+?)\s+#to(?:\s+(.*))?$/i);
                if (toMarkerMatch) {
                  cond1Value = toMarkerMatch[1].trim();
                  const afterTo = toMarkerMatch[2]?.trim();
                  if (afterTo) {
                    cond1ValueTo = afterTo;
                  } else {
                    // Has #to but no value after - waiting for valueTo
                    waitingForCond1ValueTo = true;
                  }
                } else {
                  // No #to marker yet - just the first value
                  cond1Value = val2.trim();
                }
              } else {
                // Not a Between operator - just store the value
                cond1Value = val2.trim();
              }

              // User is typing condition[1] value - keep in input mode for Enter key to work
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false, // ← NOT filter mode - allows Enter key to add ##
                selectedColumn: column,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building condition[1] (index 1)
                partialConditions: [
                  {
                    field: column.field,
                    column,
                    operator: operator1Obj.value,
                    value: filterValue,
                    valueTo: filterValueTo,
                  },
                  {
                    field: column.field, // Same column for same-column filter
                    column,
                    operator: operator2Obj.value,
                    value: cond1Value,
                    valueTo: cond1ValueTo,
                    waitingForValueTo: waitingForCond1ValueTo,
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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

        // Check for incomplete multi-condition - condition[1] operator selected but no value yet (SAME COLUMN)
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
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              // ============ SCALABLE: N-condition support ============
              activeConditionIndex: 1, // Building second condition (index 1)
              partialConditions: [
                {
                  field: column.field,
                  column,
                  operator: operator1Obj.value,
                  value: filterValue,
                  valueTo: filterValueTo,
                },
                {
                  field: column.field, // Same column
                  column,
                  operator: operator2Obj.value,
                  // No value yet - waiting for input
                },
              ],
              joins: [join.toUpperCase() as 'AND' | 'OR'],
              // ============ END SCALABLE ============
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
        // [FIX] Use more specific regex to avoid matching join operators like "#and #"

        // NEW: Handle Between operator join selector: #col #inRange val1 #to val2## #
        // This MUST come before joinSelectorMatch because that pattern uses [^#]+ which can't match #to
        const betweenJoinSelectorMatch = searchValue.match(
          /^#([^\s#]+)\s+#(inRange|between)\s+(.+?)\s+#to\s+(.+?)\s+#\s*$/i
        );
        if (betweenJoinSelectorMatch) {
          const [, , op, val1, val2Raw] = betweenJoinSelectorMatch;
          const operatorObj = findOperatorForColumn(column, op);

          if (operatorObj) {
            // Clean val2Raw: remove trailing ## confirmation marker
            const val2Clean = val2Raw.trim().replace(/#+$/, '').trim();

            if (val1.trim() && val2Clean) {
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: true, // Show join selector!
                isFilterMode: false,
                selectedColumn: column,
                filterSearch: {
                  field: column.field,
                  value: val1.trim(),
                  valueTo: val2Clean,
                  column,
                  operator: operatorObj.value,
                  isExplicitOperator: true,
                  isConfirmed: true, // Value was confirmed with ## (Enter key)
                },
              };
            }
          }
        }

        const joinSelectorMatch = searchValue.match(
          /^#([^\s#]+)\s+#([^\s]+)\s+([^#]+?)\s+#\s*$/
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
                // Keep in filter mode to let user complete condition[1] value
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
              partialJoin: joinOp.value.toUpperCase() as 'AND' | 'OR',
              // ============ SCALABLE: N-condition support ============
              activeConditionIndex: 1, // About to build condition[1]
              partialConditions: [
                {
                  field: column.field,
                  column,
                  // Note: filterValue here is the raw value, operator was the join op
                  // This state is transitional - waiting for condition[1] operator
                },
                // Condition[1] slot - empty
                {},
              ],
              joins: [joinOp.value.toUpperCase() as 'AND' | 'OR'],
              // ============ END SCALABLE ============
            };
          }

          // IMPORTANT: Don't treat as single condition if filterValue contains incomplete multi-condition pattern
          // Pattern: value contains "#and #operator" or "#or #operator" (waiting for condition[1] value OR typing condition[1] value)
          const incompleteMultiMatch = filterValue?.match(
            /#(and|or)\s+#([^\s]+)(?:\s+(.*))?$/i
          );
          if (incompleteMultiMatch) {
            const [, join, op2Text] = incompleteMultiMatch;

            // Extract first operator and value from before join
            const beforeJoin = filterValue!
              .substring(0, filterValue!.indexOf(`#${join}`))
              .trim();

            // Validate condition[1] operator
            const operator2Obj = findOperatorForColumn(column, op2Text);

            if (operator2Obj) {
              // This is incomplete multi-condition - waiting for condition[1] value input OR typing condition[1] value
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building condition[1]
                partialConditions: [
                  {
                    field: column.field,
                    column,
                    operator: operatorInput,
                    value: beforeJoin,
                  },
                  {
                    field: column.field, // Same column
                    column,
                    operator: operator2Obj.value,
                    // Waiting for value input
                  },
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
                filterSearch: {
                  field: column.field,
                  value: beforeJoin,
                  column,
                  operator: operatorInput, // First operator
                  isExplicitOperator: true,
                },
              };
            }

            // NEW: Handle partial condition[1] column name being typed/deleted (multi-column)
            // When op2Text is NOT a valid operator, check if it could be a partial column name
            // Pattern: #col1 #op1 val1 #and #partialColName
            const partialColumn = findColumn(columns, op2Text);
            if (!operator2Obj && !partialColumn) {
              // op2Text is neither a valid operator nor a valid column
              // User is typing/deleting condition[1] column name - show column selector
              return {
                globalSearch: undefined,
                showColumnSelector: true,
                showOperatorSelector: false,
                showJoinOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column,
                partialJoin: join.toUpperCase() as 'AND' | 'OR',
                // ============ SCALABLE: N-condition support ============
                activeConditionIndex: 1, // Building condition[1]
                partialConditions: [
                  {
                    field: column.field,
                    column,
                    operator: operatorInput,
                    value: beforeJoin,
                  },
                  // Condition[1] slot - typing column name
                  {},
                ],
                joins: [join.toUpperCase() as 'AND' | 'OR'],
                // ============ END SCALABLE ============
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

          // NEW: Handle partial join with incomplete condition[1] part: #col1 #op val #and # or #col1 #op val #and
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
              partialJoin: join.toUpperCase() as 'AND' | 'OR',
              // ============ SCALABLE: N-condition support ============
              activeConditionIndex: 1, // Building condition[1]
              partialConditions: [
                {
                  field: column.field,
                  column,
                  operator: operatorInput,
                  value: beforeJoin,
                },
                // Condition[1] slot - waiting
                {},
              ],
              joins: [join.toUpperCase() as 'AND' | 'OR'],
              // ============ END SCALABLE ============
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
                const [, firstValue, toValue] = toMarkerMatch;
                // Clean toValue: remove trailing ## (confirmation) and trailing # (join selector)
                // Pattern "500 #to 600## #" should extract "600" not "600## #"
                const cleanedToValue = toValue
                  ?.trim()
                  .replace(/#+\s*#?\s*$/, '') // Remove trailing ## or ## # patterns
                  .trim();

                if (cleanedToValue) {
                  // Has both values: "500 #to 700"
                  // Check if original had ## confirmation marker (before join selector #)
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
                  // Waiting for valueTo: "500 #to" or "500 #to "
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

export const getOperatorSearchTerm = (value: string): string => {
  if (value.startsWith('#')) {
    // MULTI-COLUMN: Check for pattern #col1 #op1 val1 #and #col2 #searchTerm
    // Extract operator search term for condition[1] column
    const multiColOpMatch = value.match(/#(?:and|or)\s+#[^\s#]+\s+#([^\s]*)$/i);
    if (multiColOpMatch) {
      return multiColOpMatch[1]; // Return search term after condition[1] column
    }

    // SAME-COLUMN: Check for condition[1] operator pattern: #field #op1 val1 #and #search_term
    // This ensures operator selector doesn't filter when selecting condition[1] operator
    const cond1OpMatch = value.match(/#(and|or)\s+#([^\s]*)$/i);
    if (cond1OpMatch) {
      return cond1OpMatch[2]; // Return search term after join operator
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
