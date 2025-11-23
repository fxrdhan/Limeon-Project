/**
 * Pattern Builder Utility
 *
 * Provides type-safe pattern generation for search values.
 * Eliminates string template duplication across the codebase.
 *
 * All patterns follow the format:
 * - # = marker for special syntax
 * - #field = column selection
 * - #field #operator value = filter
 * - ## = confirmation marker (Enter pressed)
 * - #and / #or = join operators for multi-condition
 */

/**
 * Pattern Builder for search value construction
 */
export class PatternBuilder {
  /**
   * Basic column selection: #field
   *
   * @param field - Column field name
   * @returns Pattern string
   */
  static column(field: string): string {
    return `#${field}`;
  }

  /**
   * Column with operator selector open: #field #
   *
   * @param field - Column field name
   * @returns Pattern string with trailing hash for operator selector
   */
  static columnWithOperatorSelector(field: string): string {
    return `#${field} #`;
  }

  /**
   * Column + operator ready for value: #field #operator
   *
   * @param field - Column field name
   * @param operator - Operator value
   * @returns Pattern string ready for value input
   */
  static columnOperator(field: string, operator: string): string {
    return `#${field} #${operator} `;
  }

  /**
   * Confirmed single filter: #field #operator value##
   *
   * @param field - Column field name
   * @param operator - Operator value
   * @param value - Filter value
   * @returns Confirmed pattern with ## marker
   */
  static confirmed(field: string, operator: string, value: string): string {
    return `#${field} #${operator} ${value}##`;
  }

  /**
   * With join operator selector: #field #operator value #
   *
   * @param field - Column field name
   * @param operator - Operator value
   * @param value - Filter value
   * @returns Pattern with trailing hash for join operator selector
   */
  static withJoinSelector(
    field: string,
    operator: string,
    value: string
  ): string {
    return `#${field} #${operator} ${value} #`;
  }

  /**
   * Partial multi-condition: #field #op1 val1 #join #
   *
   * @param field - Column field name
   * @param operator - First operator value
   * @param value - First value
   * @param join - Join operator ('AND' or 'OR')
   * @returns Partial multi-condition pattern ready for second operator
   */
  static partialMulti(
    field: string,
    operator: string,
    value: string,
    join: 'AND' | 'OR'
  ): string {
    return `#${field} #${operator} ${value} #${join.toLowerCase()} #`;
  }

  /**
   * Partial multi with second operator: #field #op1 val1 #join #op2
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator value
   * @returns Partial multi-condition with second operator, ready for second value
   */
  static partialMultiWithOperator(
    field: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    op2: string
  ): string {
    return `#${field} #${op1} ${val1} #${join.toLowerCase()} #${op2} `;
  }

  /**
   * Complete multi-condition: #field #op1 val1 #join #op2 val2##
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator value
   * @param val2 - Second value
   * @returns Complete confirmed multi-condition pattern
   */
  static multiCondition(
    field: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    op2: string,
    val2: string
  ): string {
    return `#${field} #${op1} ${val1} #${join.toLowerCase()} #${op2} ${val2}##`;
  }

  /**
   * Build pattern for editing first value in multi-condition
   * (shows only first value without ##, hides second condition)
   *
   * @param field - Column field name
   * @param operator - First operator value
   * @param value - First value (for editing)
   * @returns Pattern for editing first value
   */
  static editFirstValue(
    field: string,
    operator: string,
    value: string
  ): string {
    return `#${field} #${operator} ${value}`;
  }

  /**
   * Build pattern for editing second value in multi-condition
   * (shows full pattern without ## for second value)
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator value
   * @param val2 - Second value (for editing)
   * @returns Pattern for editing second value
   */
  static editSecondValue(
    field: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    op2: string,
    val2: string
  ): string {
    return `#${field} #${op1} ${val1} #${join.toLowerCase()} #${op2} ${val2}`;
  }
}
