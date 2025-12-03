/**
 * Operator Utilities
 *
 * Helper functions for working with filter operators.
 * Eliminates code duplication across the codebase.
 */

import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
} from '../operators';
import { FilterOperator, SearchColumn } from '../types';

/**
 * Get available operators for column type
 *
 * @param columnType - Type of column ('number' or other)
 * @returns Array of available operators for the column type
 */
export function getAvailableOperators(
  columnType: string
): readonly FilterOperator[] {
  return columnType === 'number'
    ? NUMBER_FILTER_OPERATORS
    : DEFAULT_FILTER_OPERATORS;
}

/**
 * Get available operators for a specific column
 *
 * @param column - The search column
 * @returns Array of available operators for the column
 */
export function getOperatorsForColumn(
  column: SearchColumn
): readonly FilterOperator[] {
  return getAvailableOperators(column.type ?? 'string');
}

/**
 * Find operator by value or label (case-insensitive)
 *
 * Matches against both internal value (e.g., "inRange") and
 * display label (e.g., "Between") for user-friendly patterns.
 * Label matching ignores spaces for flexibility (e.g., "greaterthan" matches "Greater than").
 *
 * @param columnType - Type of column
 * @param operatorInput - The operator value or label to find
 * @returns The operator object if found, undefined otherwise
 */
export function findOperator(
  columnType: string,
  operatorInput: string
): FilterOperator | undefined {
  const normalizedInput = operatorInput.toLowerCase().replace(/\s+/g, '');

  return getAvailableOperators(columnType).find(
    op =>
      op.value.toLowerCase() === normalizedInput ||
      op.label.toLowerCase().replace(/\s+/g, '') === normalizedInput
  );
}

/**
 * Find operator for specific column
 *
 * @param column - The search column
 * @param operatorValue - The operator value to find
 * @returns The operator object if found, undefined otherwise
 */
export function findOperatorForColumn(
  column: SearchColumn,
  operatorValue: string
): FilterOperator | undefined {
  return findOperator(column.type ?? 'string', operatorValue);
}

/**
 * Check if operator is compatible with column type
 *
 * @param columnType - Type of column
 * @param operatorValue - The operator value to check
 * @returns True if operator is compatible, false otherwise
 */
export function isOperatorCompatible(
  columnType: string,
  operatorValue: string
): boolean {
  return findOperator(columnType, operatorValue) !== undefined;
}

/**
 * Check if operator is compatible with specific column
 *
 * @param column - The search column
 * @param operatorValue - The operator value to check
 * @returns True if operator is compatible, false otherwise
 */
export function isOperatorCompatibleWithColumn(
  column: SearchColumn,
  operatorValue: string
): boolean {
  return isOperatorCompatible(column.type ?? 'string', operatorValue);
}

/**
 * Get operator label for display
 *
 * @param columnType - Type of column
 * @param operatorValue - The operator value
 * @returns The operator label, or the value itself if not found
 */
export function getOperatorLabel(
  columnType: string,
  operatorValue: string
): string {
  return findOperator(columnType, operatorValue)?.label || operatorValue;
}

/**
 * Get operator label for specific column
 *
 * @param column - The search column
 * @param operatorValue - The operator value
 * @returns The operator label, or the value itself if not found
 */
export function getOperatorLabelForColumn(
  column: SearchColumn,
  operatorValue: string
): string {
  return getOperatorLabel(column.type ?? 'string', operatorValue);
}
