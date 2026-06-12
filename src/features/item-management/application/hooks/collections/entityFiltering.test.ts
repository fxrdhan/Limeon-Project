import { describe, expect, it } from 'vite-plus/test';
import { filterEntityData } from './entityFiltering';

interface TestEntity {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  nci_code?: string;
  abbreviation?: string;
}

describe('entityFiltering', () => {
  const alpha: TestEntity = {
    id: 'alpha',
    code: 'A-001',
    name: 'Alpha Kategori',
    description: 'Analgesik ringan',
  };
  const beta: TestEntity = {
    id: 'beta',
    code: 'B-002',
    name: 'Beta Alpha',
    address: 'Bandung',
  };
  const dosage: TestEntity = {
    id: 'dosage',
    name: 'Tablet',
    nci_code: 'NCI-TAB',
  };
  const unit: TestEntity = {
    id: 'unit',
    name: 'Miligram',
    abbreviation: 'mg',
  };

  it('returns the original data reference when search is empty', () => {
    const data = [alpha, beta];

    expect(filterEntityData({ data, searchTerm: '' })).toBe(data);
  });

  it('matches supported entity fields', () => {
    expect(
      filterEntityData({
        data: [alpha, beta],
        searchTerm: 'band',
      }).map(entity => entity.id)
    ).toEqual(['beta']);

    expect(
      filterEntityData({
        data: [dosage],
        searchTerm: 'tab',
      }).map(entity => entity.id)
    ).toEqual(['dosage']);

    expect(
      filterEntityData({
        data: [unit],
        searchTerm: 'mg',
      }).map(entity => entity.id)
    ).toEqual(['unit']);
  });

  it('ranks code and leading-name matches before contained-name matches', () => {
    expect(
      filterEntityData({
        data: [beta, alpha],
        searchTerm: 'a',
      }).map(entity => entity.id)
    ).toEqual(['alpha', 'beta']);

    expect(
      filterEntityData({
        data: [beta, alpha],
        searchTerm: 'alp',
      }).map(entity => entity.id)
    ).toEqual(['alpha', 'beta']);
  });
});
