/**
 * Filter operator display names that match AG Grid default labels
 *
 * AG Grid does not expose a public API to retrieve default operator labels.
 * These constants ensure consistency between SearchBar and AG Grid filter panels
 * by using the same display text that AG Grid uses internally.
 *
 * Reference: AG Grid v34 default filter option labels
 */

// Text filter operators (matching AG Grid v34 defaults)
export const TEXT_OPERATOR_LABELS = {
  contains: 'Contains',
  notContains: 'Not contains',
  equals: 'Equals',
  notEqual: 'Does not equal',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
} as const;

// Number filter operators
export const NUMBER_OPERATOR_LABELS = {
  equals: 'Equals',
  notEqual: 'Does not equal',
  greaterThan: 'Greater than',
  greaterThanOrEqual: 'Greater than or equal to',
  lessThan: 'Less than',
  lessThanOrEqual: 'Less than or equal to',
  inRange: 'Between',
} as const;

// Join operators
export const JOIN_OPERATOR_LABELS = {
  and: 'AND',
  or: 'OR',
} as const;

// Type exports for type safety
export type TextOperatorKey = keyof typeof TEXT_OPERATOR_LABELS;
export type NumberOperatorKey = keyof typeof NUMBER_OPERATOR_LABELS;
export type JoinOperatorKey = keyof typeof JOIN_OPERATOR_LABELS;
