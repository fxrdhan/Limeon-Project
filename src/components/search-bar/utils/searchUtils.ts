/**
 * Search Utilities
 *
 * This file provides the main search parsing functionality for the Enhanced Search Bar.
 * Most parsing logic has been extracted to the `parser/` folder for better maintainability.
 *
 * This file re-exports the essential utilities and provides the main `parseSearchValue` function.
 */

import { EnhancedSearchState, SearchColumn } from '../types';

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
export { parseGroupedFilterPattern } from './parser/groupParser';
export { parseFilterPattern } from './parser/filterPatternParser';

// Import for internal use
import {
  parseMultiConditionFilter,
  parsePartialNConditions,
} from './parser/multiConditionParser';
import { findColumn } from './parser/parserHelpers';
import { parseGroupedFilterPattern } from './parser/groupParser';
import { parseFilterPattern } from './parser/filterPatternParser';

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
  /* c8 ignore next */
  const hasGroupTokens =
    searchValue.includes('#(') || searchValue.includes('#)');
  const normalizedValue = hasGroupTokens
    ? searchValue
        .replace(/#\(|#\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trimStart()
    : searchValue;
  const valueToParse =
    normalizedValue || (searchValue.startsWith('#') ? '#' : searchValue);

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
    // Grouped pattern (confirmed with ##) - parse nested groups first
    const groupedFilter = parseGroupedFilterPattern(searchValue, columns);
    if (groupedFilter) {
      return {
        globalSearch: undefined,
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: true,
        filterSearch: groupedFilter,
      };
    }

    // Try N-condition partial patterns first (handles 2+ conditions dynamically)
    const nConditionResult = parsePartialNConditions(valueToParse, columns);
    if (nConditionResult) return nConditionResult;

    // Handle colon syntax: #column:value
    if (valueToParse.includes(':')) {
      const colonMatch = valueToParse.match(/^#([^:]+):(.*)$/);
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
    const filterMatch = valueToParse.match(
      /^#([^\s:]+)(?:\s+#([^\s:]*)(?:\s+(.*))?)?$/
    );

    if (filterMatch) {
      const [, columnInput, operatorInput, filterValue] = filterMatch;
      const column = findColumn(columns, columnInput);

      if (column) {
        // Check for complete multi-condition pattern (ends with ##)
        const multiCondition = parseMultiConditionFilter(
          valueToParse,
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
          valueToParse,
          columns,
          column,
          operatorInput,
          filterValue
        );
      }
    }

    // Check for exact column match (e.g., #columnName without space)
    const exactColumnMatch = findColumn(columns, valueToParse.substring(1));
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
  return result;
};
