import { describe, expect, it } from 'vite-plus/test';
import { itemsService } from './items.service';

describe('itemsService stock validation', () => {
  it('returns an Error when single stock updates would become negative', async () => {
    const result = await itemsService.updateStock('item-1', -1);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Stock cannot be negative');
  });

  it('returns an Error when bulk stock updates include a negative value', async () => {
    const result = await itemsService.bulkUpdateStock([
      { id: 'item-1', stock: 3 },
      { id: 'item-2', stock: -1 },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe(
      'Stock cannot be negative for item item-2'
    );
  });
});
