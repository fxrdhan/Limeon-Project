import { describe, it, expect } from 'vitest';
import {
  itemNameSchema,
  itemNameObjectSchema,
  basePriceSchema,
  sellPriceSchema,
  itemQuantitySchema,
  sellPriceComparisonSchema,
  itemSchema,
} from './itemValidation';

describe('manual item validation schemas', () => {
  it('validates item name and name objects', () => {
    expect(itemNameSchema.safeParse('Paracetamol').success).toBe(true);
    expect(itemNameSchema.safeParse('   ').success).toBe(false);
    expect(itemNameObjectSchema.safeParse({ name: 'Item A' }).success).toBe(
      true
    );
  });

  it('validates price schemas with currency strings', () => {
    expect(basePriceSchema.safeParse('Rp 10.000').success).toBe(true);
    expect(basePriceSchema.safeParse('Rp 0').success).toBe(false);
    expect(sellPriceSchema.safeParse('1000').success).toBe(true);
    expect(sellPriceSchema.safeParse('0').success).toBe(false);
  });

  it('validates quantities and comparative sell price', () => {
    expect(itemQuantitySchema.safeParse('2').success).toBe(true);
    expect(itemQuantitySchema.safeParse('0').success).toBe(false);

    const compareSchema = sellPriceComparisonSchema('Rp 10.000');
    expect(compareSchema.safeParse('Rp 12.000').success).toBe(true);
    expect(compareSchema.safeParse('Rp 9.000').success).toBe(false);

    const compareWithInvalidBase = sellPriceComparisonSchema('Rp ABC');
    expect(compareWithInvalidBase.safeParse('Rp 1').success).toBe(true);
  });

  it('parses full item schema with defaults', () => {
    const result = itemSchema.parse({
      name: 'Vitamin C',
      category_id: 'cat-1',
      type_id: 'type-1',
      unit_id: 'unit-1',
      base_price: 100,
      sell_price: 150,
      min_stock: 0,
    });

    expect(result.is_medicine).toBe(false);
    expect(result.is_active).toBe(true);
    expect(result.has_expiry_date).toBe(false);
  });
});
