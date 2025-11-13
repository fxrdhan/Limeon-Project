import { FilterModel } from 'ag-grid-community';

/**
 * AG Grid filter model types
 */
interface SimpleFilterModel {
  filterType: string;
  type: string; // operator
  filter: unknown; // value
}

interface CombinedFilterModel {
  filterType: string;
  operator: 'AND' | 'OR';
  conditions: SimpleFilterModel[];
}

interface MultiFilterModel {
  filterType: 'multi';
  filterModels: (SimpleFilterModel | CombinedFilterModel)[];
}

type ColumnFilterModel =
  | SimpleFilterModel
  | CombinedFilterModel
  | MultiFilterModel;

/**
 * Result of analyzing grid filter
 */
export interface GridFilterAnalysis {
  isSimple: boolean;
  badgePattern?: string; // e.g., "#code:contains dxm"
  complexInfo?: string; // e.g., "Filter aktif: 2 kolom"
}

/**
 * Check if a filter model is a simple single-condition filter
 */
function isSimpleFilterModel(
  model: ColumnFilterModel
): model is SimpleFilterModel {
  return (
    model.filterType !== 'multi' &&
    !('operator' in model) &&
    !('conditions' in model) &&
    'type' in model &&
    'filter' in model
  );
}

/**
 * Check if a multi-filter has only one simple condition
 */
function isSimpleMultiFilter(model: MultiFilterModel): boolean {
  return (
    model.filterModels.length === 1 &&
    isSimpleFilterModel(model.filterModels[0])
  );
}

/**
 * Convert simple filter to badge pattern
 * Generates format: #field #operator value
 * This matches the SearchBar parser format for explicit operators
 */
function convertToBadgePattern(
  field: string,
  model: SimpleFilterModel
): string | null {
  const operator = model.type;
  const value = model.filter;

  // Only convert text filters for now
  if (model.filterType !== 'text' || typeof value !== 'string') {
    return null;
  }

  // Format: #field #operator value (explicit operator with space pattern)
  return `#${field} #${operator} ${value}`;
}

/**
 * Analyze grid filter model to determine if it's simple or complex
 * Returns badge pattern for simple filters, or info for complex filters
 */
export function analyzeGridFilter(
  filterModel: FilterModel | null
): GridFilterAnalysis {
  // No filter
  if (!filterModel || Object.keys(filterModel).length === 0) {
    return { isSimple: true };
  }

  const fields = Object.keys(filterModel);

  // Multiple fields = complex
  if (fields.length > 1) {
    return {
      isSimple: false,
      complexInfo: `Filter aktif: ${fields.length} kolom`,
    };
  }

  // Single field - check if it's simple
  const field = fields[0];
  const model = filterModel[field] as ColumnFilterModel;

  // Check if it's a simple single-condition filter
  if (isSimpleFilterModel(model)) {
    const badgePattern = convertToBadgePattern(field, model);
    if (badgePattern) {
      return { isSimple: true, badgePattern };
    }
  }

  // Check if it's a multi-filter with single simple condition
  if (model.filterType === 'multi') {
    const multiModel = model as MultiFilterModel;
    if (isSimpleMultiFilter(multiModel)) {
      const simpleModel = multiModel.filterModels[0] as SimpleFilterModel;
      const badgePattern = convertToBadgePattern(field, simpleModel);
      if (badgePattern) {
        return { isSimple: true, badgePattern };
      }
    }
  }

  // Complex filter (combined conditions, etc.)
  return {
    isSimple: false,
    complexInfo: `Filter aktif: 1 kolom`,
  };
}

/**
 * Extract simple filter info from badge pattern
 * Reverse operation of convertToBadgePattern
 * Parses format: #field #operator value
 */
export function parseBadgePattern(badgePattern: string): {
  field: string;
  operator: string;
  value: string;
} | null {
  // Pattern: #field #operator value (explicit operator with space)
  const match = badgePattern.match(/^#([^\s]+)\s+#([^\s]+)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const [, field, operator, value] = match;
  return { field, operator, value };
}
