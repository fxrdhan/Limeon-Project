import { describe, expect, it } from 'vite-plus/test';
import {
  extractDosageFromDisplayName,
  inferDosageFromDisplayName,
} from './item-dosage-inference';

const dosages = [
  { id: 'tab', name: 'TABLET' },
  { id: 'tfc', name: 'TABLET, FILM COATED' },
  { id: 'cap', name: 'CAPSULE' },
  { id: 'syr', name: 'SYRUP' },
  { id: 'inj', name: 'INJECTION' },
  { id: 'crm', name: 'CREAM' },
] as const;

describe('item dosage inference', () => {
  it('matches a simple dosage token from the item name', () => {
    expect(
      inferDosageFromDisplayName('Paracetamol tablet', [...dosages])
    ).toEqual({ id: 'tab', name: 'TABLET' });
  });

  it('prefers the most specific dosage when multiple options match', () => {
    expect(
      inferDosageFromDisplayName('Paracetamol film coated tablet', [...dosages])
    ).toEqual({
      id: 'tfc',
      name: 'TABLET, FILM COATED',
    });
  });

  it('supports common Indonesian dosage words', () => {
    expect(inferDosageFromDisplayName('Ambroxol sirup', [...dosages])).toEqual({
      id: 'syr',
      name: 'SYRUP',
    });

    expect(
      inferDosageFromDisplayName('Gentamicin injeksi', [...dosages])
    ).toEqual({
      id: 'inj',
      name: 'INJECTION',
    });
  });

  it('returns null when the item name does not imply a dosage', () => {
    expect(inferDosageFromDisplayName('Vitamin C', [...dosages])).toBeNull();
  });

  it('removes the inferred dosage phrase from the item name', () => {
    expect(
      extractDosageFromDisplayName('Paracetamol tablet', [...dosages])
    ).toEqual({
      cleanedDisplayName: 'Paracetamol',
      dosage: { id: 'tab', name: 'TABLET' },
    });

    expect(
      extractDosageFromDisplayName('Paracetamol film coated tablet', [
        ...dosages,
      ])
    ).toEqual({
      cleanedDisplayName: 'Paracetamol',
      dosage: { id: 'tfc', name: 'TABLET, FILM COATED' },
    });
  });
});
