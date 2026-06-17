import { describe, expect, it } from 'vite-plus/test';
import { normalizeColumnDisplayModes } from './useColumnDisplayMode';

describe('column display mode normalization', () => {
  it('falls back to defaults for non-record values', () => {
    expect(normalizeColumnDisplayModes(null)).toEqual({
      'manufacturer.name': 'name',
      'category.name': 'name',
      'type.name': 'name',
      'package.name': 'name',
      'dosage.name': 'name',
    });
  });

  it('keeps only supported modes for reference columns', () => {
    expect(
      normalizeColumnDisplayModes({
        'manufacturer.name': 'code',
        'category.name': 'invalid',
        'type.name': 'name',
        'unknown.name': 'code',
      })
    ).toEqual({
      'manufacturer.name': 'code',
      'category.name': 'name',
      'type.name': 'name',
      'package.name': 'name',
      'dosage.name': 'name',
    });
  });
});
