/**
 * Pattern Constants for Search Value Parsing
 *
 * This file contains all regex patterns and special markers used in search value parsing.
 * Centralizing patterns makes them easier to maintain and test.
 */

/**
 * Regex patterns for search value parsing
 *
 * Pattern naming convention:
 * - ALL_CAPS for constants
 * - Descriptive names explaining what pattern matches
 * - Comments showing example matches
 */
export const PATTERN_REGEXES = {
  /**
   * Complete multi-condition filter
   * Example: #base_price #greaterThan 50000 #and #lessThan 100000##
   */
  MULTI_CONDITION:
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s+(.+)##$/i,

  /**
   * Partial join with trailing hash (operator selector open)
   * Example: #base_price #greaterThan 50000 #and #
   */
  PARTIAL_JOIN_WITH_HASH:
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#\s*$/i,

  /**
   * Partial join without trailing hash
   * Example: #base_price #greaterThan 50000 #and
   */
  PARTIAL_JOIN_NO_HASH: /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s*$/i,

  /**
   * Incomplete multi-condition with second value being typed (no ##)
   * Example: #base_price #greaterThan 50000 #and #lessThan 100000
   */
  INCOMPLETE_MULTI_WITH_VALUE:
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s+(.+)$/i,

  /**
   * Incomplete multi-condition (second operator selected, no value)
   * Example: #base_price #greaterThan 50000 #and #lessThan
   */
  INCOMPLETE_MULTI_CONDITION:
    /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#(and|or)\s+#([^\s]+)\s*$/i,

  /**
   * Join operator selector pattern (with trailing hash after value)
   * Example: #base_price #greaterThan 50000 #
   */
  JOIN_SELECTOR: /^#([^\s#]+)\s+#([^\s]+)\s+(.+?)\s+#\s*$/,

  /**
   * Field + operator + value pattern (main filter pattern)
   * Example: #base_price #greaterThan 50000
   */
  FILTER_PATTERN: /^#([^\s:]+)(?:\s+#([^\s:]*)(?:\s+(.*))?)?$/,

  /**
   * Colon syntax for contains operator
   * Example: #name:paracetamol
   */
  COLON_SYNTAX: /^#([^:]+):(.*)$/,

  /**
   * Second operator search term extraction
   * Example: #base_price #greaterThan 50000 #and #les
   */
  SECOND_OPERATOR_SEARCH: /#(and|or)\s+#([^\s]*)$/i,

  /**
   * First operator search term extraction
   * Example: #base_price #gre
   */
  FIRST_OPERATOR_SEARCH: /^#[^\s:]+\s+#([^\s]*)/,

  /**
   * Extract confirmation marker
   */
  CONFIRMATION_MARKER: /##$/,

  /**
   * Extract trailing hash
   */
  TRAILING_HASH: /#+$/,

  /**
   * Join operator in value detection
   * Example: value part contains "#and #lessThan"
   */
  JOIN_IN_VALUE: /#(and|or)\s+#([^\s]+)(?:\s+(.*))?$/i,

  /**
   * Partial join pattern (in multi-condition context)
   * Example: #field #operator value #joinOp #secondOperator
   */
  PARTIAL_JOIN_PATTERN: /\s+#(?:and|or)\s+#(\w+)\s*$/i,
} as const;

/**
 * Special marker strings used in patterns
 */
export const PATTERN_MARKERS = {
  CONFIRMATION: '##',
  HASH: '#',
  SPACE_HASH: ' #',
  SPACE_HASH_SPACE: ' # ',
  COLON: ':',
} as const;

/**
 * Join operator values
 */
export const JOIN_VALUES = {
  AND: 'and',
  OR: 'or',
  AND_UPPER: 'AND',
  OR_UPPER: 'OR',
} as const;
