import { describe, it, expect, vi, beforeEach } from 'vitest';
import { itemStorageService } from './itemStorage.service';

const listMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: storageFromMock,
    },
  },
}));

describe('itemStorageService', () => {
  beforeEach(() => {
    listMock.mockReset();
    uploadMock.mockReset();
    storageFromMock.mockReset();
    storageFromMock.mockReturnValue({ list: listMock, upload: uploadMock });
  });

  it('lists item images', async () => {
    listMock.mockResolvedValue({ data: [{ name: 'img.png' }], error: null });

    const result = await itemStorageService.listItemImages('bucket', '1');
    expect(result.data).toEqual([{ name: 'img.png' }]);
  });

  it('returns empty list when no images', async () => {
    listMock.mockResolvedValue({ data: null, error: null });

    const result = await itemStorageService.listItemImages('bucket', '1');
    expect(result.data).toEqual([]);
  });

  it('returns error when list fails', async () => {
    listMock.mockResolvedValue({ data: null, error: new Error('fail') });

    const result = await itemStorageService.listItemImages('bucket', '1');
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('uploads item image', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const file = new File([new Uint8Array(10)], 'img.png', {
      type: 'image/png',
    });

    const result = await itemStorageService.uploadItemImage({
      bucketName: 'bucket',
      path: 'items/1/img.png',
      file,
      contentType: 'image/png',
    });

    expect(result.error).toBeNull();
    expect(uploadMock).toHaveBeenCalled();
  });

  it('handles upload and list exceptions', async () => {
    uploadMock.mockResolvedValue({ error: new Error('fail') });
    const file = new File([new Uint8Array(10)], 'img.png', {
      type: 'image/png',
    });

    const uploadResult = await itemStorageService.uploadItemImage({
      bucketName: 'bucket',
      path: 'items/1/img.png',
      file,
      contentType: 'image/png',
    });
    expect(uploadResult.error).toBeTruthy();

    storageFromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const listResult = await itemStorageService.listItemImages('bucket', '1');
    expect(listResult.data).toBeNull();
  });

  it('handles upload exceptions from storage', async () => {
    storageFromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const file = new File([new Uint8Array(10)], 'img.png', {
      type: 'image/png',
    });

    const result = await itemStorageService.uploadItemImage({
      bucketName: 'bucket',
      path: 'items/1/img.png',
      file,
      contentType: 'image/png',
    });

    expect(result.data).toBeNull();
  });
});
