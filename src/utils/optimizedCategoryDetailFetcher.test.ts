import { describe, it, expect } from 'vitest';
import {
  createOptimizedCategoryDetailFetcher,
  createOptimizedTypeDetailFetcher,
  createOptimizedUnitDetailFetcher,
  createOptimizedDosageDetailFetcher,
  createOptimizedManufacturerDetailFetcher,
} from './optimizedCategoryDetailFetcher';

const makeOption = (id: string) => ({
  id,
  code: `C-${id}`,
  name: `Name ${id}`,
  description: `Desc ${id}`,
  updated_at: '2024-01-01',
});

describe('optimized category detail fetchers', () => {
  it('returns cached details or null', async () => {
    const categories = [makeOption('cat-1')];
    const fetchCategory = createOptimizedCategoryDetailFetcher(categories);
    const result = await fetchCategory('cat-1');
    expect(result?.name).toBe('Name cat-1');
    expect(await fetchCategory('missing')).toBeNull();
  });

  it('handles other entity types', async () => {
    const types = [makeOption('type-1')];
    const units = [makeOption('unit-1')];
    const dosages = [makeOption('dos-1')];
    const manufacturers = [makeOption('man-1')];

    expect((await createOptimizedTypeDetailFetcher(types)('type-1'))?.id).toBe(
      'type-1'
    );
    expect((await createOptimizedUnitDetailFetcher(units)('unit-1'))?.id).toBe(
      'unit-1'
    );
    expect(
      (await createOptimizedDosageDetailFetcher(dosages)('dos-1'))?.id
    ).toBe('dos-1');
    expect(
      (await createOptimizedManufacturerDetailFetcher(manufacturers)('man-1'))
        ?.id
    ).toBe('man-1');
  });

  it('returns null for missing entity ids', async () => {
    const types = [makeOption('type-1')];
    const units = [makeOption('unit-1')];
    const dosages = [makeOption('dos-1')];
    const manufacturers = [makeOption('man-1')];

    expect(await createOptimizedTypeDetailFetcher(types)('missing')).toBeNull();
    expect(await createOptimizedUnitDetailFetcher(units)('missing')).toBeNull();
    expect(
      await createOptimizedDosageDetailFetcher(dosages)('missing')
    ).toBeNull();
    expect(
      await createOptimizedManufacturerDetailFetcher(manufacturers)('missing')
    ).toBeNull();
  });

  it('handles errors in optimized fetchers', async () => {
    const bad = null as unknown as { id: string }[];

    await expect(
      createOptimizedCategoryDetailFetcher(bad)('x')
    ).resolves.toBeNull();
    await expect(
      createOptimizedTypeDetailFetcher(bad)('x')
    ).resolves.toBeNull();
    await expect(
      createOptimizedUnitDetailFetcher(bad)('x')
    ).resolves.toBeNull();
    await expect(
      createOptimizedDosageDetailFetcher(bad)('x')
    ).resolves.toBeNull();
    await expect(
      createOptimizedManufacturerDetailFetcher(bad)('x')
    ).resolves.toBeNull();
  });
});
