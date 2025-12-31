import {
  EnhancedSearchState,
  FilterCondition,
  FilterSearch,
  PartialCondition,
  SearchColumn,
} from '../../types';
import { findOperatorForColumn } from '../operatorUtils';
import { parseConditionSegment } from './conditionParser';
import {
  countJoins,
  findColumn,
  stripConfirmationMarker,
} from './parserHelpers';

/**
 * Parse N-condition partial pattern (while user is typing)
 * Handles patterns with 2+ joins dynamically.
 *
 * Returns null if pattern doesn't match or has fewer than 2 joins (let existing code handle it)
 */
export const parsePartialNConditions = (
  searchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState | null => {
  // Only handle patterns with 1+ joins (2+ conditions)
  const joinCount = countJoins(searchValue);
  if (joinCount < 1) return null;

  // Don't handle confirmed patterns (ending with ##)
  if (searchValue.endsWith('##')) return null;

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

  if (segments.length < 2) return null; // Need at least 2 segments for 1 join

  const partialConditions: PartialCondition[] = [];
  let firstColumn: SearchColumn | null = null;

  // Parse each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trimStart();
    const isLastSegment = i === segments.length - 1;

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
      const trimmed = isLastSegment ? segment : segment.trimEnd();

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
        // Partial: #col # (operator selector)
        const [, colName] = trimmed.match(/^#([^\s#]+)\s*#\s*$/)!;
        const col = findColumn(columns, colName);
        if (col) {
          partialConditions.push({
            field: col.field,
            column: col,
          });
        } else {
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
              } else {
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
      } else if (trimmed.match(/^#([^\s]+)\s*$/)) {
        // Combine check: Is it an operator OR a column?
        const name = trimmed.match(/^#([^\s#]+)/)?.[1] || '';
        if (!name && trimmed === '#') {
          partialConditions.push({});
          continue;
        }

        const col = firstColumn || columns[0];
        const opObj = col ? findOperatorForColumn(col, name) : null;

        if (opObj) {
          partialConditions.push({
            field: col!.field,
            column: col!,
            operator: opObj.value,
          });
        } else {
          const knownCol = findColumn(columns, name);
          if (knownCol) {
            partialConditions.push({
              field: knownCol.field,
              column: knownCol,
            });
          } else {
            partialConditions.push({});
          }
        }
      } else {
        partialConditions.push({});
      }
    }
  }

  if (partialConditions.length < 2) return null;

  const lastCondition = partialConditions[partialConditions.length - 1];
  let activeConditionIndex = partialConditions.length - 1;

  const lastConditionConfirmed = /##\s*$/.test(searchValue);

  const hasJoinOperatorEnd = /#(and|or)\s*#\s*$/i.test(searchValue);
  const isJoinSelectorTrigger =
    searchValue.trimEnd().endsWith(' #') &&
    !hasJoinOperatorEnd &&
    (!!lastCondition.value || !!lastCondition.valueTo);
  let showJoinOperatorSelector = false;
  let showColumnSelector = false;
  let showOperatorSelector = false;
  let selectedColumn = firstColumn || undefined;

  if (isJoinSelectorTrigger) {
    showJoinOperatorSelector = true;
    showColumnSelector = false;
    showOperatorSelector = false;

    if (lastCondition.value) {
      lastCondition.value = stripConfirmationMarker(lastCondition.value);
    }
    if (lastCondition.valueTo) {
      lastCondition.valueTo = stripConfirmationMarker(lastCondition.valueTo);
    }

    activeConditionIndex = partialConditions.length;
  } else if (lastConditionConfirmed && lastCondition.value) {
    activeConditionIndex = partialConditions.length;
  } else {
    if (!lastCondition.column) {
      showColumnSelector = true;
    } else if (!lastCondition.operator) {
      selectedColumn = lastCondition.column;
      if (searchValue.trimEnd().endsWith('#')) {
        showOperatorSelector = true;
      }
    } else {
      selectedColumn = lastCondition.column;
    }
  }

  const completeConditions = partialConditions.filter(
    c => c.operator && c.value !== undefined && c.value !== ''
  );

  const hasMultiColumn = completeConditions.some(
    (c, i) => i > 0 && c.field !== completeConditions[0]?.field
  );

  let filterSearch: FilterSearch | undefined;

  const lastConditionIdx = partialConditions.length - 1;
  const isTypingLastConditionValue =
    activeConditionIndex === lastConditionIdx &&
    !showColumnSelector &&
    !showOperatorSelector &&
    !showJoinOperatorSelector &&
    partialConditions[lastConditionIdx]?.value;

  const confirmedConditions = isTypingLastConditionValue
    ? completeConditions.slice(0, -1)
    : completeConditions;

  if (confirmedConditions.length >= 2) {
    const conditions: FilterCondition[] = confirmedConditions.map(c => ({
      field: c.field || firstColumn?.field || '',
      column: c.column || firstColumn!,
      operator: c.operator!,
      value: c.value!,
      valueTo: c.valueTo,
    }));

    filterSearch = {
      field: conditions[0].field || firstColumn?.field || '',
      value: conditions[0].value || '',
      valueTo: conditions[0].valueTo,
      column: conditions[0].column || firstColumn!,
      operator: conditions[0].operator!,
      isExplicitOperator: true,
      isConfirmed: true, // The existing conditions ARE confirmed
      isMultiCondition: true,
      isMultiColumn: hasMultiColumn,
      conditions,
      joins: joins.slice(0, confirmedConditions.length - 1),
      joinOperator: joins[0],
    };
  } else if (
    partialConditions[0].operator &&
    partialConditions[0].value !== undefined &&
    partialConditions[0].value !== ''
  ) {
    // [FIX] If we have a partial join (isJoinSelectorTrigger), we should treat first condition as confirmed
    const isConfirmed = isJoinSelectorTrigger || /##\s*$/.test(searchValue);

    filterSearch = {
      field: partialConditions[0].field || firstColumn?.field || '',
      value: partialConditions[0].value || '',
      valueTo: partialConditions[0].valueTo,
      column: partialConditions[0].column || firstColumn!,
      operator: partialConditions[0].operator,
      isExplicitOperator: true,
      isConfirmed,
      isMultiCondition: isJoinSelectorTrigger, // Treat as multi-condition if join selector is open
      conditions: isJoinSelectorTrigger
        ? [
            {
              field: partialConditions[0].field || firstColumn?.field || '',
              column: partialConditions[0].column || firstColumn!,
              operator: partialConditions[0].operator,
              value: partialConditions[0].value,
              valueTo: partialConditions[0].valueTo,
            },
          ]
        : undefined,
    };
  }

  const isInFilterMode =
    confirmedConditions.length >= 2 &&
    !showColumnSelector &&
    !showOperatorSelector;

  const result = {
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

  return result;
};

/**
 * Parse multi-condition filter pattern (N-condition scalable).
 * Supports unlimited N conditions with N-1 joins.
 */
export const parseMultiConditionFilter = (
  searchValue: string,
  column: SearchColumn,
  columns: SearchColumn[]
): FilterSearch | null => {
  const hasJoinOperator = /#(and|or)/i.test(searchValue);
  if (!hasJoinOperator) return null;

  const hasConfirmationMarker = searchValue.endsWith('##');
  if (!hasConfirmationMarker) {
    return null;
  }

  const cleanValue = searchValue.slice(0, -2);

  const joinSplitRegex = /\s+#(and|or)\s+/i;
  const segments = cleanValue.split(joinSplitRegex);

  const conditions: FilterCondition[] = [];
  const joins: ('AND' | 'OR')[] = [];
  let firstColumn: SearchColumn | null = null;
  let hasMultiColumn = false;

  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      const segment = segments[i];

      if (i === 0) {
        const firstColMatch = segment.match(/^#([^\s#]+)\s+(.+)$/);
        if (firstColMatch) {
          const [, colName, rest] = firstColMatch;
          const col = findColumn(columns, colName);
          if (col) {
            firstColumn = col;
            const condition = parseConditionSegment(rest, col, columns);
            if (condition) {
              conditions.push(condition);
            }
          }
        }
      } else {
        const condition = parseConditionSegment(
          segment,
          firstColumn || column,
          columns
        );
        if (condition) {
          conditions.push(condition);
          if (condition.field !== firstColumn?.field) {
            hasMultiColumn = true;
          }
        }
      }
    } else {
      const joinOp = segments[i].toUpperCase() as 'AND' | 'OR';
      joins.push(joinOp);
    }
  }

  if (conditions.length < 2) {
    return null;
  }

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
    joinOperator: joins[0],
    joins,
    isMultiCondition: true,
    isMultiColumn,
  };
};
