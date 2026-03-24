import { describe, expect, it } from 'vite-plus/test';
import { buildImagePreviewStoragePath } from '../utils/image-preview-path';

describe('image-preview-path', () => {
  it('builds versioned webp preview paths for image messages', () => {
    expect(
      buildImagePreviewStoragePath(
        'images/channel/user-a_image_123.png',
        'image/webp'
      )
    ).toBe('previews/channel/user-a_image_123.fit-v2.webp');
  });

  it('builds versioned png preview paths when the preview encoder falls back to png', () => {
    expect(
      buildImagePreviewStoragePath(
        'documents/channel/user-a_document_123.png',
        'image/png'
      )
    ).toBe('previews/channel/user-a_document_123.fit-v2.png');
  });
});
