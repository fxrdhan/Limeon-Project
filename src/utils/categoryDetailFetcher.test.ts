import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoryDetail } from './categoryDetailFetcher';

const getByIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/api/masterData.service', () => ({
  categoryService: {
    getById: getByIdMock,
  },
}));

describe('categoryDetailFetcher', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('returns formatted data when found', async () => {
    getByIdMock.mockResolvedValue({
      data: {
        id: 'cat-1',
        code: 'CAT',
        name: 'Category',
        description: 'desc',
        updated_at: '2024-01-01',
      },
      error: null,
    });

    const result = await fetchCategoryDetail('cat-1');

    expect(result).toEqual({
      id: 'cat-1',
      code: 'CAT',
      name: 'Category',
      description: 'desc',
      created_at: undefined,
      updated_at: '2024-01-01',
    });
  });

  it('returns null when no data or errors', async () => {
    getByIdMock.mockResolvedValue({ data: null, error: null });
    expect(await fetchCategoryDetail('cat-2')).toBeNull();

    getByIdMock.mockResolvedValue({ data: null, error: new Error('fail') });
    expect(await fetchCategoryDetail('cat-3')).toBeNull();
  });

  it('handles thrown errors', async () => {
    getByIdMock.mockRejectedValue(new Error('boom'));
    await expect(fetchCategoryDetail('cat-4')).resolves.toBeNull();
  });
});
