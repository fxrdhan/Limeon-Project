import { describe, expect, it } from 'vite-plus/test';
import { requireMutationResponseData } from './mutationResponse';

describe('requireMutationResponseData', () => {
  it('returns mutation data when present', () => {
    const data = { id: 'category-1', name: 'Analgesik' };

    expect(
      requireMutationResponseData(data, {
        entityDisplayName: 'kategori',
        operation: 'create',
      })
    ).toBe(data);
  });

  it('throws a useful error when mutation response data is missing', () => {
    expect(() =>
      requireMutationResponseData(null, {
        entityDisplayName: 'kategori',
        operation: 'update',
      })
    ).toThrow('update response for kategori is missing data.');
  });
});
