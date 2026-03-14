import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

describe('pdf-message-preview-cache', () => {
  beforeEach(() => {
    chatRuntimeCache.pdfPreviews.reset();
  });

  it('replaces stale cache entries for the same message id', () => {
    chatRuntimeCache.pdfPreviews.set('message-1', {
      cacheKey: 'cache-1',
      coverDataUrl: 'data:image/png;base64,aaa',
      pageCount: 1,
    });
    chatRuntimeCache.pdfPreviews.set('message-1', {
      cacheKey: 'cache-2',
      coverDataUrl: 'data:image/png;base64,bbb',
      pageCount: 2,
    });

    expect(chatRuntimeCache.pdfPreviews.get('cache-1')).toBeUndefined();
    expect(chatRuntimeCache.pdfPreviews.get('cache-2')).toEqual(
      expect.objectContaining({
        cacheKey: 'cache-2',
        pageCount: 2,
      })
    );
  });

  it('prunes cache entries for inactive messages', () => {
    chatRuntimeCache.pdfPreviews.set('message-1', {
      cacheKey: 'cache-1',
      coverDataUrl: 'data:image/png;base64,aaa',
      pageCount: 1,
    });
    chatRuntimeCache.pdfPreviews.set('message-2', {
      cacheKey: 'cache-2',
      coverDataUrl: 'data:image/png;base64,bbb',
      pageCount: 2,
    });

    chatRuntimeCache.pdfPreviews.pruneInactiveMessageIds(
      new Set(['message-2'])
    );

    expect(chatRuntimeCache.pdfPreviews.get('cache-1')).toBeUndefined();
    expect(chatRuntimeCache.pdfPreviews.get('cache-2')).toEqual(
      expect.objectContaining({
        cacheKey: 'cache-2',
      })
    );
  });
});
