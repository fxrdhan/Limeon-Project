import { describe, expect, it } from 'vitest';
import { useComparisonData } from './useComparisonData';

describe('useComparisonData', () => {
  it('builds dual-mode comparison and original data for regular entities', () => {
    const versionA = {
      version_number: 1,
      entity_data: { code: 'A-001', name: 'Item A', description: 'Desc A' },
    };
    const versionB = {
      version_number: 2,
      entity_data: { code: 'B-001', name: 'Item B', description: 'Desc B' },
    };

    const result = useComparisonData({
      isDualMode: true,
      currentData: {
        code: 'CUR',
        name: 'Current',
        description: 'Current Desc',
      },
      versionA,
      versionB,
      entityName: 'Kategori',
    });

    expect(result.compData).toMatchObject({
      leftKode: 'A-001',
      rightKode: 'B-001',
      leftName: 'Item A',
      rightName: 'Item B',
      leftDescription: 'Desc A',
      rightDescription: 'Desc B',
      isKodeDifferent: true,
      isNameDifferent: true,
      isDescriptionDifferent: true,
    });
    expect(result.originalData).toMatchObject({
      originalLeftKode: 'A-001',
      originalRightKode: 'B-001',
      originalLeftDescription: 'Desc A',
      originalRightDescription: 'Desc B',
    });
  });

  it('builds single-mode comparison against current data', () => {
    const selectedVersion = {
      version_number: 3,
      entity_data: { code: 'OLD', name: 'Old Name', description: 'Old Desc' },
    };

    const result = useComparisonData({
      isDualMode: false,
      selectedVersion,
      currentData: { code: 'NEW', name: 'New Name', description: 'New Desc' },
      entityName: 'Kategori',
    });

    expect(result.compData).toMatchObject({
      leftKode: 'OLD',
      rightKode: 'NEW',
      leftName: 'Old Name',
      rightName: 'New Name',
      leftDescription: 'Old Desc',
      rightDescription: 'New Desc',
      isKodeDifferent: true,
      isNameDifferent: true,
      isDescriptionDifferent: true,
      leftVersion: selectedVersion,
      rightVersion: null,
    });
    expect(result.originalData).toBeNull();
  });

  it('uses address field for manufacturer comparison and handles empty state', () => {
    const versionA = {
      version_number: 1,
      entity_data: { code: 'M-1', name: 'Produsen A', address: 'Jl. A' },
    };
    const versionB = {
      version_number: 2,
      entity_data: { code: 'M-1', name: 'Produsen A', address: 'Jl. B' },
    };

    const dualManufacturer = useComparisonData({
      isDualMode: true,
      currentData: { code: '', name: '', description: '' },
      versionA,
      versionB,
      entityName: 'Produsen',
    });

    expect(dualManufacturer.compData?.isDescriptionDifferent).toBe(true);
    expect(dualManufacturer.compData?.leftDescription).toBe('Jl. A');
    expect(dualManufacturer.compData?.rightDescription).toBe('Jl. B');

    const empty = useComparisonData({
      isDualMode: false,
      currentData: { code: '', name: '', description: '' },
      entityName: 'Kategori',
    });
    expect(empty.compData).toBeNull();
    expect(empty.originalData).toBeNull();
  });
});
