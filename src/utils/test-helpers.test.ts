import { describe, expect, it } from 'vitest';
import {
  testEmptyFieldValidation,
  testNegativeNumberValidation,
  testNumericEdgeCases,
  testPriceCalculationScenario,
} from './test-helpers';

type FormInput = {
  name: string;
  quantity: number;
};

const validatorFn = (input: FormInput) => {
  const errors: Record<string, string[]> = {};

  if (!input.name || input.name.trim() === '') {
    errors.name = ['Name wajib diisi'];
  }

  if (input.quantity < 0) {
    errors.quantity = ['Quantity tidak boleh negatif'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

describe('shared test helpers', () => {
  testEmptyFieldValidation<FormInput>([
    {
      fieldName: 'name',
      validInput: { name: 'Paracetamol', quantity: 10 },
      expectedError: 'Name wajib diisi',
      validatorFn,
    },
  ]);

  testNegativeNumberValidation<FormInput>([
    {
      fieldName: 'quantity',
      validInput: { name: 'Paracetamol', quantity: 10 },
      expectedError: 'Quantity tidak boleh negatif',
      validatorFn,
    },
  ]);

  testNumericEdgeCases(
    n => ({
      double: n * 2,
      isPositive: n > 0,
    }),
    {
      zero: { double: 0, isPositive: false },
      negative: { double: -200, isPositive: false },
      maxSafeInteger: (result: unknown) => {
        expect(result).toEqual({
          double: Number.MAX_SAFE_INTEGER * 2,
          isPositive: true,
        });
      },
      decimal: { double: 246.9, isPositive: true },
    }
  );

  testPriceCalculationScenario(
    {
      name: 'sell price explicit',
      basePrice: 100,
      sellPrice: 120,
      expected: {
        sellPrice: 120,
        margin: 20,
        isValid: true,
      },
    },
    (basePrice, input) => ({
      sellPrice: input,
      margin: input - basePrice,
      isValid: input >= basePrice,
    })
  );

  testPriceCalculationScenario(
    {
      name: 'margin with warning',
      basePrice: 100,
      margin: -5,
      expected: {
        sellPrice: 95,
        margin: -5,
        warning: 'margin rendah',
      },
    },
    (basePrice, marginInput) => ({
      sellPrice: basePrice + marginInput,
      margin: marginInput,
      warnings: ['margin rendah'],
    })
  );

  it('keeps baseline validator valid for non-edge input', () => {
    const result = validatorFn({ name: 'Amoxicillin', quantity: 5 });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  describe('partial numeric edge expectations', () => {
    testNumericEdgeCases(n => n + 1, {
      zero: 1,
    });
  });

  testPriceCalculationScenario(
    {
      name: 'without warning expectation',
      basePrice: 50,
      sellPrice: 70,
      expected: {
        sellPrice: 70,
        isValid: true,
      },
    },
    (_basePrice, input) => ({
      sellPrice: input,
      isValid: true,
    })
  );
});
