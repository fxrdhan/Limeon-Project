import { FilterExpression, FilterGroup, SearchColumn } from '../types';

/**
 * Validates a filter value based on the column type.
 *
 * @param value - The raw string value to validate
 * @param columnType - The type of column (currency, number, date, text)
 * @returns true if valid, false otherwise
 */
export const validateFilterValue = (
  value: string | undefined,
  columnType?: SearchColumn['type']
): boolean => {
  if (value === undefined) return false;

  const trimmedValue = value.trim();

  // Empty value is invalid for a confirmed filter
  if (trimmedValue === '') {
    return false;
  }

  // For numeric columns (number, currency), validate numeric content
  if (columnType === 'number' || columnType === 'currency') {
    // Must contain at least one digit
    if (!/\d/.test(trimmedValue)) {
      return false;
    }

    // Remove known currency symbols/prefixes for validation
    const withoutCurrency = trimmedValue
      .replace(/^(Rp\.?\s*|\$\s*|€\s*|¥\s*|£\s*|IDR\s*|USD\s*|EUR\s*)/i, '')
      .trim();

    // After removing currency, should only contain: digits, +, -, ., , (no spaces)
    const hasInvalidChars = /[^\d+\-.,]/.test(withoutCurrency);
    if (hasInvalidChars) {
      return false;
    }

    return true;
  }

  // Text and date columns allow any value for now (date could be further validated)
  return true;
};

/**
 * Validates an entire FilterSearch object, including all its conditions.
 *
 * @param filterSearch - The filter search object to validate
 * @returns true if all conditions are valid, false otherwise
 */
export const isFilterSearchValid = (
  filterSearch: import('../types').FilterSearch | undefined | null
): boolean => {
  if (!filterSearch) return false;

  if (filterSearch.filterGroup) {
    return validateFilterGroup(filterSearch.filterGroup);
  }

  // For multi-condition filters, validate every condition
  if (filterSearch.isMultiCondition && filterSearch.conditions) {
    return filterSearch.conditions.every(cond => {
      const colType = cond.column?.type || filterSearch.column.type;

      // Validate primary value
      if (!validateFilterValue(cond.value, colType)) return false;

      // Validate valueTo for Between operator
      if (
        cond.operator === 'inRange' &&
        !validateFilterValue(cond.valueTo, colType)
      ) {
        return false;
      }

      return true;
    });
  }

  // For single condition filters
  const colType = filterSearch.column.type;

  // Validate primary value
  if (!validateFilterValue(filterSearch.value, colType)) return false;

  // Validate valueTo for Between operator
  if (
    filterSearch.operator === 'inRange' &&
    !validateFilterValue(filterSearch.valueTo, colType)
  ) {
    return false;
  }

  return true;
};

const validateFilterGroup = (group: FilterGroup): boolean => {
  const validateExpression = (node: FilterExpression): boolean => {
    if (node.kind === 'group') {
      return node.nodes.every(child => validateExpression(child));
    }

    const colType = node.column?.type;
    if (!validateFilterValue(node.value, colType)) return false;
    if (
      node.operator === 'inRange' &&
      !validateFilterValue(node.valueTo, colType)
    ) {
      return false;
    }
    return true;
  };

  return validateExpression(group);
};
