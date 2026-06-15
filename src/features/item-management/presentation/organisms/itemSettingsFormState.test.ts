import { describe, expect, it } from 'vite-plus/test';
import {
  isItemSettingsExpiryTabTarget,
  shouldRequestItemSettingsNextSection,
} from './itemSettingsFormState';

describe('item settings form state helpers', () => {
  it('detects the expiry label and input as next-section tab targets', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'has_expiry_date');
    const input = document.createElement('input');
    input.id = 'has_expiry_date';
    const otherInput = document.createElement('input');
    otherInput.id = 'is_active';

    expect(isItemSettingsExpiryTabTarget(label)).toBe(true);
    expect(isItemSettingsExpiryTabTarget(input)).toBe(true);
    expect(isItemSettingsExpiryTabTarget(otherInput)).toBe(false);
    expect(isItemSettingsExpiryTabTarget(null)).toBe(false);
  });

  it('requests the next section only for forward Tab on the expiry target when a handler exists', () => {
    const input = document.createElement('input');
    input.id = 'has_expiry_date';

    expect(
      shouldRequestItemSettingsNextSection({
        hasRequestNextSection: true,
        key: 'Tab',
        shiftKey: false,
        target: input,
      })
    ).toBe(true);
    expect(
      shouldRequestItemSettingsNextSection({
        hasRequestNextSection: true,
        key: 'Tab',
        shiftKey: true,
        target: input,
      })
    ).toBe(false);
    expect(
      shouldRequestItemSettingsNextSection({
        hasRequestNextSection: false,
        key: 'Tab',
        shiftKey: false,
        target: input,
      })
    ).toBe(false);
    expect(
      shouldRequestItemSettingsNextSection({
        hasRequestNextSection: true,
        key: 'Enter',
        shiftKey: false,
        target: input,
      })
    ).toBe(false);
  });
});
