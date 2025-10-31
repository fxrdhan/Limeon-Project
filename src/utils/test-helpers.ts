/**
 * Shared Test Utilities
 *
 * Reusable test helpers to reduce redundancy across test files
 */

import { describe, it, expect } from 'vitest';

/**
 * Test helper for validating empty/whitespace field validation
 * Reduces repetitive tests across validation functions
 */
export function testEmptyFieldValidation<T>(
  testCases: Array<{
    fieldName: string;
    validInput: T;
    expectedError: string;
    validatorFn: (input: T) => {
      isValid: boolean;
      errors: Record<string, unknown>;
    };
  }>
) {
  describe.each(testCases)(
    'validates $fieldName is not empty',
    ({ fieldName, validInput, expectedError, validatorFn }) => {
      it(`should fail when ${fieldName} is empty`, () => {
        const input = { ...validInput, [fieldName]: '' };
        const result = validatorFn(input);
        expect(result.isValid).toBe(false);
        expect(result.errors[fieldName] || result.errors).toContain(
          expectedError
        );
      });

      it(`should fail when ${fieldName} is only whitespace`, () => {
        const input = { ...validInput, [fieldName]: '   ' };
        const result = validatorFn(input);
        expect(result.isValid).toBe(false);
        expect(result.errors[fieldName] || result.errors).toContain(
          expectedError
        );
      });
    }
  );
}

/**
 * Test helper for negative number validation
 */
export function testNegativeNumberValidation<T>(
  testCases: Array<{
    fieldName: string;
    validInput: T;
    expectedError: string;
    validatorFn: (input: T) => {
      isValid: boolean;
      errors: Record<string, unknown>;
    };
  }>
) {
  it.each(testCases)(
    'should fail when $fieldName is negative',
    ({ fieldName, validInput, expectedError, validatorFn }) => {
      const input = { ...validInput, [fieldName]: -100 };
      const result = validatorFn(input);
      expect(result.isValid).toBe(false);
      expect(result.errors[fieldName] || result.errors).toContain(
        expectedError
      );
    }
  );
}

/**
 * Test helper for edge cases (zero, MAX_SAFE_INTEGER, decimals)
 */
export function testNumericEdgeCases(
  fn: (n: number) => unknown,
  expectations: {
    zero?: unknown;
    negative?: unknown;
    maxSafeInteger?: unknown;
    decimal?: unknown;
  }
): void {
  const tests: Array<{ value: number; expected: unknown; label: string }> = [];

  if (expectations.zero !== undefined) {
    tests.push({ value: 0, expected: expectations.zero, label: 'zero' });
  }
  if (expectations.negative !== undefined) {
    tests.push({
      value: -100,
      expected: expectations.negative,
      label: 'negative',
    });
  }
  if (expectations.maxSafeInteger !== undefined) {
    tests.push({
      value: Number.MAX_SAFE_INTEGER,
      expected: expectations.maxSafeInteger,
      label: 'MAX_SAFE_INTEGER',
    });
  }
  if (expectations.decimal !== undefined) {
    tests.push({
      value: 123.45,
      expected: expectations.decimal,
      label: 'decimal',
    });
  }

  it.each(tests)('should handle $label value', ({ value, expected }) => {
    const result = fn(value);
    if (typeof expected === 'function') {
      (expected as (result: unknown) => void)(result);
    } else {
      expect(result).toEqual(expected);
    }
  });
}

/**
 * Test helper for price calculation scenarios
 */
export function testPriceCalculationScenario(
  scenario: {
    name: string;
    basePrice: number;
    sellPrice?: number;
    margin?: number;
    expected: {
      sellPrice?: number;
      margin?: number;
      isValid?: boolean;
      warning?: string;
    };
  },
  calculateFn: (basePrice: number, input: number) => Record<string, unknown>
): void {
  it(`Scenario: ${scenario.name}`, () => {
    const input = scenario.margin ?? scenario.sellPrice!;
    const result = calculateFn(scenario.basePrice, input);

    Object.entries(scenario.expected).forEach(([key, value]) => {
      if (key === 'warning' && value) {
        expect(result.warning || result.warnings).toContain(value);
      } else {
        expect(result[key]).toBe(value);
      }
    });
  });
}
