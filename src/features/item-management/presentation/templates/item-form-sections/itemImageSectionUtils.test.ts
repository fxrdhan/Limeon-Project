import { describe, expect, it } from 'vite-plus/test';
import {
  buildItemImageSlotsFromUrls,
  buildItemImageUrlsPayload,
  resolveItemImageSlotPath,
} from './itemImageSectionUtils';

describe('item image section utilities', () => {
  it('uses extracted storage paths and removes cache-bust query strings', () => {
    const extractPath = (url: string) =>
      url ===
      'https://example.test/storage/v1/object/public/item_images/items/item-1/slot-0'
        ? 'items/item-1/slot-0'
        : null;

    expect(
      resolveItemImageSlotPath(
        'https://example.test/storage/v1/object/public/item_images/items/item-1/slot-0?t=123',
        'item-1',
        0,
        extractPath
      )
    ).toBe('items/item-1/slot-0');
  });

  it('falls back to deterministic slot paths when the URL cannot be parsed', () => {
    expect(
      buildItemImageSlotsFromUrls(
        ['https://cdn.example.test/image.png'],
        'item-2',
        () => null
      )
    ).toEqual([
      {
        url: 'https://cdn.example.test/image.png',
        path: 'items/item-2/slot-0',
      },
      { url: '', path: '' },
      { url: '', path: '' },
      { url: '', path: '' },
    ]);
  });

  it('omits empty image payloads when every slot is blank', () => {
    expect(
      buildItemImageUrlsPayload([
        { url: '' },
        { url: '' },
        { url: '' },
        { url: '' },
      ])
    ).toEqual([]);
  });
});
