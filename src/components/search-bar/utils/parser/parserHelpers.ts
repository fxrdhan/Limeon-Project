import { FilterSearch, SearchColumn } from '../../types';

/**
 * Find a column in the list of available columns by field or header name.
 * Supports flexible matching (ignoring case, spaces, underscores, and dashes).
 */
export const findColumn = (
  columns: SearchColumn[],
  input: string
): SearchColumn | undefined => {
  if (!input) return undefined;
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
 * Count the number of join operators (#and/#or) in a pattern.
 */
export const countJoins = (pattern: string): number => {
  const matches = pattern.match(/#(and|or)/gi);
  return matches ? matches.length : 0;
};

/**
 * Helper to strip ## confirmation marker and trailing join selector trigger (#) from values.
 * This handles cases like "600## #" → "600" and "600##" → "600".
 */
export const stripConfirmationMarker = (val: string): string => {
  let result = val;
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

/**
 * Check if the search bar is in hashtag mode (starting with # but not using colon format).
 */
export const isHashtagMode = (searchValue: string): boolean => {
  return (
    searchValue === '#' ||
    (searchValue.startsWith('#') && !searchValue.includes(':'))
  );
};

/**
 * Get the current search term for the operator selector based on the pattern.
 */
export const getOperatorSearchTerm = (value: string): string => {
  const normalizedValue = value
    .replace(/#\(|#\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trimStart();

  if (normalizedValue.startsWith('#')) {
    // MULTI-COLUMN: Check for pattern #col1 #op1 val1 #and #col2 #searchTerm
    // Extract operator search term for condition[1] column
    const multiColOpMatch = normalizedValue.match(
      /#(?:and|or)\s+#[^\s#]+\s+#([^\s]*)$/i
    );
    if (multiColOpMatch) {
      return multiColOpMatch[1]; // Return search term after condition[1] column
    }

    // SAME-COLUMN: Check for condition[1] operator pattern: #field #op1 val1 #and #search_term
    // This ensures operator selector doesn't filter when selecting condition[1] operator
    const cond1OpMatch = normalizedValue.match(/#(and|or)\s+#([^\s]*)$/i);
    if (cond1OpMatch) {
      return cond1OpMatch[2]; // Return search term after join operator
    }

    // First operator pattern: #field #search_term
    const match = normalizedValue.match(/^#[^\s:]+\s+#([^\s]*)/);
    return match ? match[1] : '';
  }
  return '';
};

/**
 * Build a filter pattern string from a FilterSearch object and input value.
 */
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

/**
 * Build a column selection pattern string.
 */
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
