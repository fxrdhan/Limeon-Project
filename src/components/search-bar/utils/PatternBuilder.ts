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
   * @param valueTo - Optional second value for Between (inRange) operator
   * @returns Pattern with trailing hash for join operator selector
   */
  static withJoinSelector(
    field: string,
    operator: string,
    value: string,
    valueTo?: string
  ): string {
    // For Between (inRange) operator with both values
    // Use #to marker to ensure correct badge display
    if (operator === 'inRange' && valueTo) {
      return `#${field} #${operator} ${value} #to ${valueTo} #`;
    }
    // For normal operators or Between with only first value
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
   * Partial multi-column with valueTo support: #field #op val valTo #join #
   * For Between operator, includes both values.
   *
   * @param field - Column field name
   * @param operator - First operator value
   * @param value - First value
   * @param valueTo - Second value for Between operator (optional)
   * @param join - Join operator ('AND' or 'OR')
   * @returns Partial multi-column pattern ready for second column selection
   */
  static partialMultiColumnWithValueTo(
    field: string,
    operator: string,
    value: string,
    valueTo: string | undefined,
    join: 'AND' | 'OR'
  ): string {
    const isBetween = operator === 'inRange' && valueTo;
    const firstPart = isBetween
      ? `#${field} #${operator} ${value} #to ${valueTo}`
      : `#${field} #${operator} ${value}`;
    return `${firstPart} #${join.toLowerCase()} #`;
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

  // ========================================
  // Between (inRange) Operator Patterns
  // ========================================

  /**
   * Between with first value only: #field #inRange value1
   *
   * @param field - Column field name
   * @param value1 - First value (from)
   * @returns Pattern ready for second value input
   */
  static betweenFirstValue(field: string, value1: string): string {
    return `#${field} #inRange ${value1} `;
  }

  /**
   * Between with both values (unconfirmed): #field #inRange value1 value2
   *
   * @param field - Column field name
   * @param value1 - First value (from)
   * @param value2 - Second value (to)
   * @returns Unconfirmed Between pattern
   */
  static betweenBothValues(
    field: string,
    value1: string,
    value2: string
  ): string {
    return `#${field} #inRange ${value1} ${value2}`;
  }

  /**
   * Between confirmed: #field #inRange value1 value2##
   *
   * @param field - Column field name
   * @param value1 - First value (from)
   * @param value2 - Second value (to)
   * @returns Confirmed Between pattern
   */
  static betweenConfirmed(
    field: string,
    value1: string,
    value2: string
  ): string {
    return `#${field} #inRange ${value1} ${value2}##`;
  }

  /**
   * Between with join selector: #field #inRange value1 value2 #
   *
   * @param field - Column field name
   * @param value1 - First value (from)
   * @param value2 - Second value (to)
   * @returns Pattern with trailing hash for join operator selector
   */
  static betweenWithJoinSelector(
    field: string,
    value1: string,
    value2: string
  ): string {
    return `#${field} #inRange ${value1} #to ${value2} #`;
  }

  /**
   * Between multi-condition partial: #field #inRange val1 val2 #join #
   *
   * @param field - Column field name
   * @param value1 - First value (from)
   * @param value2 - Second value (to)
   * @param join - Join operator ('AND' or 'OR')
   * @returns Partial multi-condition pattern ready for second operator
   */
  static betweenMultiPartial(
    field: string,
    value1: string,
    value2: string,
    join: 'AND' | 'OR'
  ): string {
    return `#${field} #inRange ${value1} #to ${value2} #${join.toLowerCase()} #`;
  }

  /**
   * Between AND Between: #field #inRange v1 v2 #join #inRange v3 v4##
   *
   * @param field - Column field name
   * @param val1 - First Between first value
   * @param val2 - First Between second value
   * @param join - Join operator ('AND' or 'OR')
   * @param val3 - Second Between first value
   * @param val4 - Second Between second value
   * @returns Complete Between AND/OR Between pattern
   */
  static betweenAndBetween(
    field: string,
    val1: string,
    val2: string,
    join: 'AND' | 'OR',
    val3: string,
    val4: string
  ): string {
    return `#${field} #inRange ${val1} #to ${val2} #${join.toLowerCase()} #inRange ${val3} #to ${val4}##`;
  }

  /**
   * Between AND Normal operator: #field #inRange v1 v2 #join #op2 v3##
   *
   * @param field - Column field name
   * @param val1 - Between first value
   * @param val2 - Between second value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator
   * @param val3 - Second operator value
   * @returns Complete Between AND/OR Normal pattern
   */
  static betweenAndNormal(
    field: string,
    val1: string,
    val2: string,
    join: 'AND' | 'OR',
    op2: string,
    val3: string
  ): string {
    return `#${field} #inRange ${val1} #to ${val2} #${join.toLowerCase()} #${op2} ${val3}##`;
  }

  /**
   * Normal AND Between: #field #op1 v1 #join #inRange v2 v3##
   *
   * @param field - Column field name
   * @param op1 - First operator
   * @param val1 - First operator value
   * @param join - Join operator ('AND' or 'OR')
   * @param val2 - Between first value
   * @param val3 - Between second value
   * @returns Complete Normal AND/OR Between pattern
   */
  static normalAndBetween(
    field: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    val2: string,
    val3: string
  ): string {
    return `#${field} #${op1} ${val1} #${join.toLowerCase()} #inRange ${val2} #to ${val3}##`;
  }

  /**
   * Edit first value of Between: #field #inRange value1
   *
   * @param field - Column field name
   * @param value1 - First value for editing
   * @returns Pattern for editing first value
   */
  static editBetweenFirstValue(field: string, value1: string): string {
    return `#${field} #inRange ${value1}`;
  }

  /**
   * Edit second value of Between: #field #inRange value1 value2
   *
   * @param field - Column field name
   * @param value1 - First value (preserved)
   * @param value2 - Second value for editing
   * @returns Pattern for editing second value
   */
  static editBetweenSecondValue(
    field: string,
    value1: string,
    value2: string
  ): string {
    return `#${field} #inRange ${value1} ${value2}`;
  }

  // ========================================
  // Multi-Column Patterns
  // ========================================

  /**
   * Multi-column partial with second column: #col1 #op1 val1 #join #col2 #
   *
   * @param col1 - First column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param col2 - Second column field name
   * @returns Partial multi-column pattern ready for second operator
   */
  static multiColumnPartial(
    col1: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    col2: string
  ): string {
    return `#${col1} #${op1} ${val1} #${join.toLowerCase()} #${col2} #`;
  }

  /**
   * Multi-column partial with operator: #col1 #op1 val1 [val1To] #join #col2 #op2
   *
   * @param col1 - First column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param col2 - Second column field name
   * @param op2 - Second operator value
   * @param val1To - Optional second value for Between (inRange) operator
   * @returns Partial multi-column with operator, ready for second value
   */
  static multiColumnWithOperator(
    col1: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    col2: string,
    op2: string,
    val1To?: string
  ): string {
    // For Between (inRange) operator with both values
    const firstPart =
      op1 === 'inRange' && val1To
        ? `#${col1} #${op1} ${val1} #to ${val1To}`
        : `#${col1} #${op1} ${val1}`;
    return `${firstPart} #${join.toLowerCase()} #${col2} #${op2} `;
  }

  /**
   * Complete multi-column: #col1 #op1 val1 #join #col2 #op2 val2##
   *
   * @param col1 - First column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param col2 - Second column field name
   * @param op2 - Second operator value
   * @param val2 - Second value
   * @returns Complete confirmed multi-column pattern
   */
  static multiColumnComplete(
    col1: string,
    op1: string,
    val1: string,
    join: 'AND' | 'OR',
    col2: string,
    op2: string,
    val2: string
  ): string {
    return `#${col1} #${op1} ${val1} #${join.toLowerCase()} #${col2} #${op2} ${val2}##`;
  }

  /**
   * Build multi-condition pattern with optional valueTo for Between operators
   * Handles all combinations: Normal+Normal, Between+Normal, Normal+Between, Between+Between
   * NOTE: This is for SAME-COLUMN filters only. For multi-column, use buildMultiColumnWithValueTo.
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param val1To - First valueTo (for Between operator)
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator value
   * @param val2 - Second value
   * @param val2To - Second valueTo (for Between operator)
   * @returns Complete multi-condition pattern
   */
  static buildMultiConditionWithValueTo(
    field: string,
    op1: string,
    val1: string,
    val1To: string | undefined,
    join: 'AND' | 'OR',
    op2: string,
    val2: string,
    val2To: string | undefined
  ): string {
    const firstIsBetween = op1 === 'inRange' && val1To;
    const secondIsBetween = op2 === 'inRange' && val2To;

    // Case 1: Between + Between
    if (firstIsBetween && secondIsBetween) {
      return this.betweenAndBetween(field, val1, val1To, join, val2, val2To);
    }

    // Case 2: Between + Normal
    if (firstIsBetween && !secondIsBetween) {
      return this.betweenAndNormal(field, val1, val1To, join, op2, val2);
    }

    // Case 3: Normal + Between
    if (!firstIsBetween && secondIsBetween) {
      return this.normalAndBetween(field, op1, val1, join, val2, val2To);
    }

    // Case 4: Normal + Normal (default)
    return this.multiCondition(field, op1, val1, join, op2, val2);
  }

  /**
   * Build multi-column pattern with optional valueTo for Between operators
   * Handles all combinations with different columns for each condition
   *
   * @param col1 - First column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param val1To - First valueTo (for Between operator)
   * @param join - Join operator ('AND' or 'OR')
   * @param col2 - Second column field name
   * @param op2 - Second operator value
   * @param val2 - Second value
   * @param val2To - Second valueTo (for Between operator)
   * @returns Complete multi-column pattern
   */
  static buildMultiColumnWithValueTo(
    col1: string,
    op1: string,
    val1: string,
    val1To: string | undefined,
    join: 'AND' | 'OR',
    col2: string,
    op2: string,
    val2: string,
    val2To: string | undefined
  ): string {
    const firstIsBetween = op1 === 'inRange' && val1To;
    const secondIsBetween = op2 === 'inRange' && val2To;

    // Build first condition part
    // Use #to marker for Between operators to ensure correct badge display
    const firstPart = firstIsBetween
      ? `#${col1} #${op1} ${val1} #to ${val1To}`
      : `#${col1} #${op1} ${val1}`;

    // Build second condition part
    // Use #to marker for Between operators to ensure correct badge display
    const secondPart = secondIsBetween
      ? `#${col2} #${op2} ${val2} #to ${val2To}`
      : `#${col2} #${op2} ${val2}`;

    return `${firstPart} #${join.toLowerCase()} ${secondPart}##`;
  }

  // ========================================
  // N-Condition Patterns (Unlimited Support)
  // ========================================

  /**
   * Build pattern for N conditions with mixed join operators
   * Supports up to MAX_FILTER_CONDITIONS (5)
   *
   * @param conditions - Array of condition definitions
   * @param joinOperators - Array of join operators (length = conditions.length - 1)
   * @returns Complete confirmed N-condition pattern
   *
   * @example
   * // 3 conditions with mixed operators:
   * PatternBuilder.buildNConditions(
   *   [
   *     { column: 'name', operator: 'contains', value: 'test' },
   *     { column: 'price', operator: 'greaterThan', value: '100' },
   *     { column: 'stock', operator: 'lessThan', value: '50' },
   *   ],
   *   ['AND', 'OR']
   * )
   * // Returns: "#name #contains test #and #price #greaterThan 100 #or #stock #lessThan 50##"
   */
  static buildNConditions(
    conditions: {
      column: string;
      operator: string;
      value: string;
      valueTo?: string;
    }[],
    joinOperators: ('AND' | 'OR')[]
  ): string {
    if (conditions.length === 0) return '';
    if (conditions.length === 1) {
      const c = conditions[0];
      return this.confirmed(c.column, c.operator, c.value);
    }

    // Build each condition part
    const parts = conditions.map(c => {
      const isBetween = c.operator === 'inRange' && c.valueTo;
      const valuePart = isBetween ? `${c.value} #to ${c.valueTo}` : c.value;

      // Include column for each condition (multi-column support)
      return `#${c.column} #${c.operator} ${valuePart}`;
    });

    // Join with operators
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const join = joinOperators[i - 1] || 'AND';
      result += ` #${join.toLowerCase()} ${parts[i]}`;
    }

    return result + '##';
  }

  /**
   * Build partial N-condition pattern (for adding new condition)
   * Pattern ends with `#join #` ready for next condition
   *
   * @param conditions - Array of existing confirmed conditions
   * @param joinOperators - Array of join operators
   * @param nextJoin - Next join operator to add
   * @returns Partial pattern ready for next condition
   */
  static buildNConditionsPartial(
    conditions: {
      column: string;
      operator: string;
      value: string;
      valueTo?: string;
    }[],
    joinOperators: ('AND' | 'OR')[],
    nextJoin: 'AND' | 'OR'
  ): string {
    if (conditions.length === 0) return '';

    // Build confirmed conditions without ##
    const parts = conditions.map(c => {
      const isBetween = c.operator === 'inRange' && c.valueTo;
      const valuePart = isBetween ? `${c.value} #to ${c.valueTo}` : c.value;
      return `#${c.column} #${c.operator} ${valuePart}`;
    });

    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const join = joinOperators[i - 1] || 'AND';
      result += ` #${join.toLowerCase()} ${parts[i]}`;
    }

    // Add next join operator ready for input
    return result + ` #${nextJoin.toLowerCase()} #`;
  }
}
