import { FilterCondition, SearchColumn } from '../../types';
import { findOperatorForColumn } from '../operatorUtils';
import { findColumn } from './parserHelpers';
import { parseInRangeValues } from './inRangeParser';

/**
 * Parse a single condition segment from pattern.
 * Handles: "#col #op value" or "#op value" (same-column)
 *
 * @param segment - The condition segment to parse
 * @param defaultColumn - Default column if not specified in segment
 * @param columns - Available columns for lookup
 * @returns Parsed condition or null
 */
export const parseConditionSegment = (
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
