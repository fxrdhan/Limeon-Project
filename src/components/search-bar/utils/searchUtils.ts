import { SearchColumn, EnhancedSearchState, FilterSearch } from '../types';
import { DEFAULT_FILTER_OPERATORS } from '../operators';

export const parseSearchValue = (
  searchValue: string,
  columns: SearchColumn[]
): EnhancedSearchState => {
  if (searchValue === '#') {
    return {
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
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
              isFilterMode: false,
              selectedColumn: column,
            };
          }

          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
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
        if (operatorInput !== undefined) {
          if (operatorInput === '') {
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: true,
              isFilterMode: false,
              selectedColumn: column,
            };
          }

          const operator = DEFAULT_FILTER_OPERATORS.find(
            op => op.value.toLowerCase() === operatorInput.toLowerCase()
          );

          if (operator) {
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: false,
              isFilterMode: true,
              filterSearch: {
                field: column.field,
                value: filterValue || '',
                column,
                operator: operator.value,
                isExplicitOperator: true,
              },
            };
          } else {
            return {
              globalSearch: undefined,
              showColumnSelector: false,
              showOperatorSelector: true,
              isFilterMode: false,
              selectedColumn: column,
            };
          }
        } else if (searchValue.includes(' #')) {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: true,
            isFilterMode: false,
            selectedColumn: column,
          };
        } else {
          return {
            globalSearch: undefined,
            showColumnSelector: false,
            showOperatorSelector: false,
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
        isFilterMode: false,
        selectedColumn: exactColumnMatch,
      };
    }

    return {
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      isFilterMode: false,
    };
  }

  return {
    globalSearch: searchValue,
    showColumnSelector: false,
    showOperatorSelector: false,
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
  if (filterSearch.operator === 'contains' && !filterSearch.isExplicitOperator) {
    return `#${filterSearch.field}:${inputValue}`;
  } else {
    return `#${filterSearch.field} #${filterSearch.operator} ${inputValue}`;
  }
};

export const buildColumnValue = (columnName: string, mode: 'colon' | 'space' | 'plain'): string => {
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