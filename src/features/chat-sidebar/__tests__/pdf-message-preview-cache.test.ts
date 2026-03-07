import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCachedPdfMessagePreview,
  pruneCachedPdfMessagePreviews,
  resetCachedPdfMessagePreviews,
  setCachedPdfMessagePreview,
} from '../utils/pdf-message-preview-cache';

describe('pdf-message-preview-cache', () => {
  beforeEach(() => {
    resetCachedPdfMessagePreviews();
  });

  it('replaces stale cache entries for the same message id', () => {
    setCachedPdfMessagePreview('message-1', {
      cacheKey: 'cache-1',
      coverDataUrl: 'data:image/png;base64,aaa',
      pageCount: 1,
    });
    setCachedPdfMessagePreview('message-1', {
      cacheKey: 'cache-2',
      coverDataUrl: 'data:image/png;base64,bbb',
      pageCount: 2,
    });

    expect(getCachedPdfMessagePreview('cache-1')).toBeUndefined();
    expect(getCachedPdfMessagePreview('cache-2')).toEqual(
      expect.objectContaining({
        cacheKey: 'cache-2',
        pageCount: 2,
      })
    );
  });

  it('prunes cache entries for inactive messages', () => {
    setCachedPdfMessagePreview('message-1', {
      cacheKey: 'cache-1',
      coverDataUrl: 'data:image/png;base64,aaa',
      pageCount: 1,
    });
    setCachedPdfMessagePreview('message-2', {
      cacheKey: 'cache-2',
      coverDataUrl: 'data:image/png;base64,bbb',
      pageCount: 2,
    });

    pruneCachedPdfMessagePreviews(new Set(['message-2']));

    expect(getCachedPdfMessagePreview('cache-1')).toBeUndefined();
    expect(getCachedPdfMessagePreview('cache-2')).toEqual(
      expect.objectContaining({
        cacheKey: 'cache-2',
      })
    );
  });
});
