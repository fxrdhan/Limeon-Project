import { describe, expect, it } from 'vite-plus/test';
import {
  getItemBasicInfoDisplayCode,
  shouldApplyGeneratedItemCode,
} from './itemBasicInfoFormState';

describe('item basic info form state helpers', () => {
  it('applies generated item codes in create mode when they differ', () => {
    expect(
      shouldApplyGeneratedItemCode({
        currentCode: 'OLD',
        generatedCode: 'NEW',
        isEditMode: false,
      })
    ).toBe(true);

    expect(
      shouldApplyGeneratedItemCode({
        currentCode: 'NEW',
        generatedCode: 'NEW',
        isEditMode: false,
      })
    ).toBe(false);
  });

  it('applies generated item codes in edit mode only for empty or placeholder codes', () => {
    expect(
      shouldApplyGeneratedItemCode({
        currentCode: '',
        generatedCode: 'AUTO-001',
        isEditMode: true,
      })
    ).toBe(true);

    expect(
      shouldApplyGeneratedItemCode({
        currentCode: 'OBT-[XXX]-...',
        generatedCode: 'AUTO-001',
        isEditMode: true,
      })
    ).toBe(true);

    expect(
      shouldApplyGeneratedItemCode({
        currentCode: 'FIXED-001',
        generatedCode: 'AUTO-001',
        isEditMode: true,
      })
    ).toBe(false);
  });

  it('keeps existing display code precedence', () => {
    expect(
      getItemBasicInfoDisplayCode({
        currentCode: 'FIXED-001',
        generatedCode: 'AUTO-001',
        isEditMode: true,
      })
    ).toBe('FIXED-001');

    expect(
      getItemBasicInfoDisplayCode({
        currentCode: 'OBT-[XXX]-...',
        generatedCode: 'AUTO-001',
        isEditMode: true,
      })
    ).toBe('AUTO-001');

    expect(
      getItemBasicInfoDisplayCode({
        currentCode: '',
        generatedCode: '',
        isEditMode: false,
      })
    ).toBe('Auto-generated');
  });
});
