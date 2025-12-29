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
   * @returns Partial multi-condition pattern ready for condition[1] operator
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
   * @returns Partial multi-column pattern ready for condition[1] column selection
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
   * Partial multi with condition[1] operator: #field #op1 val1 #join #op2
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Second operator value
   * @returns Partial multi-condition with condition[1] operator, ready for condition[1] value
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
   * (shows only first value without ##, hides condition[1])
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
   * Build pattern for editing condition[1] value in multi-condition
   * (shows full pattern without ## for condition[1] value)
   *
   * @param field - Column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param op2 - Condition[1] operator value
   * @param val2 - Condition[1] value (for editing)
   * @returns Pattern for editing condition[1] value
   */
  static editCondition1Value(
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
   * @returns Pattern ready for condition[1] value input
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
   * @returns Partial multi-condition pattern ready for condition[1] operator
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
   * Edit valueTo of Between: #field #inRange value valueTo
   *
   * @param field - Column field name
   * @param value1 - First value (preserved)
   * @param value2 - ValueTo for editing
   * @returns Pattern for editing valueTo
   */
  static editBetweenValueTo(
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
   * Multi-column partial with condition[1] column: #col1 #op1 val1 #join #col2 #
   *
   * @param col1 - First column field name
   * @param op1 - First operator value
   * @param val1 - First value
   * @param join - Join operator ('AND' or 'OR')
   * @param col2 - Second column field name
   * @returns Partial multi-column pattern ready for condition[1] operator
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
   * @returns Partial multi-column with operator, ready for condition[1] value
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

  // ========================================
  // Scalable N-Condition Methods
  // ========================================

  /**
   * Build a single condition part (helper for iterative building)
   *
   * @param field - Column field name
   * @param operator - Operator value (optional)
   * @param value - Primary value (optional)
   * @param valueTo - Secondary value for Between operator (optional)
   * @param includeField - Whether to include #field prefix
   * @returns Condition pattern part
   */
  static buildConditionPart(
    field: string,
    operator?: string,
    value?: string,
    valueTo?: string,
    includeField: boolean = true
  ): string {
    const fieldPart = includeField ? `#${field}` : '';

    if (!operator) {
      // Just column name, add hash for operator selector if it's the end
      return fieldPart;
    }

    const opPart = ` #${operator}`;

    if (value === undefined) {
      // Column + Operator, add hash for value if it's the end
      return `${fieldPart}${opPart} `;
    }

    if (operator === 'inRange' && valueTo !== undefined) {
      return `${fieldPart}${opPart} ${value} #to ${valueTo}`;
    }

    return `${fieldPart}${opPart} ${value}`;
  }

  /**
   * Build condition part WITHOUT field prefix (for same-column multi-conditions)
   * Output format: #operator value or #inRange value #to valueTo
   *
   * Used in patternRestoration.ts for building same-column multi-condition patterns
   * where the field is already specified once at the beginning.
   *
   * @param operator - Operator value
   * @param value - Primary value
   * @param valueTo - Secondary value for Between (inRange) operator
   * @returns Condition part string without field prefix
   */
  static conditionPartNoField(
    operator: string,
    value: string,
    valueTo?: string
  ): string {
    if (operator === 'inRange' && valueTo) {
      return `#${operator} ${value} #to ${valueTo}`;
    }
    return `#${operator} ${value}`;
  }

  /**
   * Build pattern for N conditions (scalable, iterative)
   *
   * This method replaces the hardcoded 2-condition methods and can handle
   * any number of conditions with any combination of operators.
   *
   * @param conditions - Array of condition objects
   * @param joins - Array of join operators (length = conditions.length - 1)
   * @param isMultiColumn - Whether to include field for each condition
   * @param defaultField - Default field for same-column filters
   * @param options - Additional options
   * @returns Built pattern string
   */
  static buildNConditions(
    conditions: Array<{
      field?: string;
      operator?: string;
      value?: string;
      valueTo?: string;
    }>,
    joins: ('AND' | 'OR')[],
    isMultiColumn: boolean,
    defaultField: string,
    options?: {
      /** Add ## confirmation marker */
      confirmed?: boolean;
      /** Add trailing # for selector */
      openSelector?: boolean;
      /** Stop after this condition index (for partial patterns) */
      stopAfterIndex?: number;
    }
  ): string {
    const {
      confirmed = true,
      openSelector = false,
      stopAfterIndex,
    } = options || {};

    if (conditions.length === 0) {
      return openSelector ? '#' : '';
    }

    const maxIndex = stopAfterIndex ?? conditions.length - 1;
    let pattern = '';

    for (let i = 0; i <= maxIndex && i < conditions.length; i++) {
      const cond = conditions[i];
      const condField = cond.field || defaultField;

      if (i > 0) {
        // Add join operator
        const joinOp = joins[i - 1] || 'AND';
        pattern += ` #${joinOp.toLowerCase()} `;
      }

      // Build condition part
      // For same-column filters: always include field for the last condition
      // when it has no operator (user needs to see which column they're editing)
      const isLastConditionWithoutOperator =
        i === maxIndex && !cond.operator && openSelector;
      const includeField =
        i === 0 || isMultiColumn || isLastConditionWithoutOperator;
      const part = this.buildConditionPart(
        condField,
        cond.operator,
        cond.value,
        cond.valueTo,
        includeField
      );

      pattern += part;

      // Handle trailing # for selectors based on what's missing in the last condition
      if (i === maxIndex && openSelector) {
        if (!cond.operator) {
          pattern += ' #'; // Open operator selector (added space for parser reliability)
        } else if (cond.value !== undefined) {
          // Last condition is complete, open join selector
          pattern += ' #';
        }
      }
    }

    if (confirmed && !openSelector) {
      // Only confirm if every condition is "complete" (has operator and value)
      // or at least handle it gracefully.
      const lastCond = conditions[maxIndex];
      if (lastCond && lastCond.operator && lastCond.value !== undefined) {
        pattern += '##';
      }
    }

    return pattern;
  }

  /**
   * Build partial pattern for editing (without confirmation marker)
   *
   * @param conditions - Array of condition objects
   * @param joins - Array of join operators
   * @param isMultiColumn - Whether multi-column filter
   * @param defaultField - Default column field
   * @param editingIndex - Index of condition being edited (-1 for none)
   * @returns Partial pattern for editing
   */
  static buildPartialForEdit(
    conditions: Array<{
      field?: string;
      operator: string;
      value: string;
      valueTo?: string;
    }>,
    joins: ('AND' | 'OR')[],
    isMultiColumn: boolean,
    defaultField: string,
    editingIndex: number = -1
  ): string {
    // If editing a specific condition, build up to that point
    if (editingIndex >= 0 && editingIndex < conditions.length) {
      return this.buildNConditions(
        conditions,
        joins,
        isMultiColumn,
        defaultField,
        {
          confirmed: false,
          stopAfterIndex: editingIndex,
        }
      );
    }

    // Otherwise build full pattern without confirmation
    return this.buildNConditions(
      conditions,
      joins,
      isMultiColumn,
      defaultField,
      {
        confirmed: false,
      }
    );
  }

  /**
   * Build pattern with selector open at specific position
   *
   * @param conditions - Existing conditions
   * @param joins - Existing joins
   * @param isMultiColumn - Whether multi-column filter
   * @param defaultField - Default column field
   * @param selectorType - Type of selector to open
   * @param atIndex - Index where selector should open (for condition selectors)
   * @returns Pattern with trailing # for selector
   */
  static buildWithSelectorOpen(
    conditions: Array<{
      field?: string;
      operator: string;
      value: string;
      valueTo?: string;
    }>,
    joins: ('AND' | 'OR')[],
    isMultiColumn: boolean,
    defaultField: string,
    selectorType: 'column' | 'operator' | 'join',
    atIndex?: number
  ): string {
    if (selectorType === 'column' && conditions.length === 0) {
      return '#';
    }

    if (selectorType === 'operator' && conditions.length > 0) {
      const idx = atIndex ?? 0;
      if (idx < conditions.length) {
        // Build pattern up to the condition before, then add column + #
        const cond = conditions[idx];
        const condField = cond.field || defaultField;

        if (idx === 0) {
          return `#${condField} #`;
        }

        // Build previous conditions, then add join + column + #
        const prevPattern = this.buildNConditions(
          conditions.slice(0, idx),
          joins.slice(0, idx - 1),
          isMultiColumn,
          defaultField,
          { confirmed: false }
        );
        const joinOp = joins[idx - 1] || 'AND';
        return `${prevPattern} #${joinOp.toLowerCase()} #${condField} #`;
      }
    }

    if (selectorType === 'join') {
      return this.buildNConditions(
        conditions,
        joins,
        isMultiColumn,
        defaultField,
        {
          confirmed: false,
          openSelector: true,
        }
      );
    }

    return this.buildNConditions(
      conditions,
      joins,
      isMultiColumn,
      defaultField,
      {
        confirmed: false,
        openSelector: true,
      }
    );
  }

  /**
   * Build pattern with join selector open at specific index
   * For N-condition editing: opens join selector after condition[joinIndex]
   *
   * @param conditions - Array of condition objects
   * @param joins - Array of existing join operators
   * @param isMultiColumn - Whether multi-column filter
   * @param defaultField - Default column field
   * @param joinIndex - Index of join to edit (0 = after condition 0, 1 = after condition 1, etc.)
   * @returns Pattern with join selector open at specified position
   */
  static withJoinSelectorAtIndex(
    conditions: Array<{
      field?: string;
      operator: string;
      value: string;
      valueTo?: string;
    }>,
    joins: ('AND' | 'OR')[],
    isMultiColumn: boolean,
    defaultField: string,
    joinIndex: number
  ): string {
    // Build pattern up to and including condition[joinIndex]
    // Then add trailing # to open join selector
    const conditionsUpToJoin = conditions.slice(0, joinIndex + 1);
    const joinsUpToJoin = joins.slice(0, joinIndex);

    return this.buildNConditions(
      conditionsUpToJoin,
      joinsUpToJoin,
      isMultiColumn,
      defaultField,
      {
        confirmed: false,
        openSelector: true,
      }
    );
  }

  /**
   * Build confirmed pattern for N conditions up to specific index
   * Used when clearing a join - confirms conditions up to that point
   *
   * @param conditions - Array of condition objects
   * @param joins - Array of join operators
   * @param isMultiColumn - Whether multi-column filter
   * @param defaultField - Default column field
   * @param upToIndex - Include conditions up to and including this index
   * @returns Confirmed pattern with conditions up to specified index
   */
  static confirmedUpToIndex(
    conditions: Array<{
      field?: string;
      operator: string;
      value: string;
      valueTo?: string;
    }>,
    joins: ('AND' | 'OR')[],
    isMultiColumn: boolean,
    defaultField: string,
    upToIndex: number
  ): string {
    const conditionsToInclude = conditions.slice(0, upToIndex + 1);
    const joinsToInclude = joins.slice(0, upToIndex);

    return this.buildNConditions(
      conditionsToInclude,
      joinsToInclude,
      isMultiColumn,
      defaultField,
      {
        confirmed: true,
      }
    );
  }
}
