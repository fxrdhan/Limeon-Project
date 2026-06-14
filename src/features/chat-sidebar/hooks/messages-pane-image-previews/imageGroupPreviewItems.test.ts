import { describe, expect, it } from 'vite-plus/test';
import {
  buildInitialImageGroupPreviewItems,
  getInitialImageGroupPreviewId,
  getInitialImageGroupPreviewMessage,
  getPrioritizedImageGroupPreviewMessageIds,
  withImageGroupPreviewResolvedUrl,
  withImageGroupPreviewThumbnailUrl,
} from './imageGroupPreviewItems';
import type { ImageGroupPreviewItem } from './types';
import type { PreviewableImageGroupMessage } from '../../utils/message-preview-assets';

const item = (
  id: string,
  overrides: Partial<ImageGroupPreviewItem> = {}
): ImageGroupPreviewItem => ({
  id,
  thumbnailUrl: null,
  previewUrl: null,
  fullPreviewUrl: null,
  previewName: `${id}.jpg`,
  ...overrides,
});

const message = (
  id: string,
  overrides: Partial<PreviewableImageGroupMessage> = {}
): PreviewableImageGroupMessage => ({
  id,
  file_mime_type: 'image/jpeg',
  file_name: null,
  file_preview_url: null,
  file_storage_path: null,
  message: `chat/images/${id}.jpg`,
  previewUrl: null,
  ...overrides,
});

describe('image group preview item updates', () => {
  it('selects the requested initial image when it belongs to the group', () => {
    const messages = [message('first'), message('second')];

    expect(getInitialImageGroupPreviewId(messages, 'second')).toBe('second');
    expect(getInitialImageGroupPreviewId(messages, 'missing')).toBe('first');
    expect(getInitialImageGroupPreviewId([], 'missing')).toBeNull();
  });

  it('resolves the active preview message from the selected id', () => {
    const firstMessage = message('first');
    const secondMessage = message('second');

    expect(
      getInitialImageGroupPreviewMessage(
        [firstMessage, secondMessage],
        'second'
      )
    ).toBe(secondMessage);
    expect(getInitialImageGroupPreviewMessage([firstMessage], null)).toBeNull();
  });

  it('prioritizes the active image for preview prefetching', () => {
    expect(
      getPrioritizedImageGroupPreviewMessageIds(
        [message('first'), message('second'), message('third')],
        'second'
      )
    ).toEqual(['second', 'first', 'third']);
  });

  it('builds initial image group items with the seeded active preview', () => {
    expect(
      buildInitialImageGroupPreviewItems({
        activePreviewId: 'second',
        currentChannelId: null,
        initialPreviewUrl: 'blob:clicked-preview',
        messages: [
          message('first', {
            file_name: 'first-explicit.jpg',
            previewUrl: 'blob:first-preview',
          }),
          message('second', {
            file_name: 'second-explicit.jpg',
            previewUrl: 'blob:second-message-preview',
          }),
        ],
        seededActivePreviewUrl: 'blob:seeded-active',
      })
    ).toEqual([
      {
        id: 'first',
        fullPreviewUrl: null,
        previewName: 'first-explicit.jpg',
        previewUrl: 'blob:first-preview',
        thumbnailUrl: null,
      },
      {
        id: 'second',
        fullPreviewUrl: 'blob:seeded-active',
        previewName: 'second-explicit.jpg',
        previewUrl: 'blob:seeded-active',
        thumbnailUrl: null,
      },
    ]);
  });

  it('updates only the requested thumbnail url', () => {
    const firstItem = item('first');
    const secondItem = item('second');

    expect(
      withImageGroupPreviewThumbnailUrl(
        [firstItem, secondItem],
        'second',
        'blob:thumbnail'
      )
    ).toEqual([
      firstItem,
      {
        ...secondItem,
        thumbnailUrl: 'blob:thumbnail',
      },
    ]);
  });

  it('resolves preview urls while preserving an existing thumbnail', () => {
    const firstItem = item('first', {
      thumbnailUrl: 'blob:thumbnail',
    });

    expect(
      withImageGroupPreviewResolvedUrl([firstItem], {
        messageId: 'first',
        previewUrl: 'blob:preview',
        previewName: 'Resolved name',
      })
    ).toEqual([
      {
        ...firstItem,
        thumbnailUrl: 'blob:thumbnail',
        previewUrl: 'blob:preview',
        fullPreviewUrl: 'blob:preview',
        previewName: 'Resolved name',
      },
    ]);
  });

  it('can preserve an existing full preview url for runtime cache refreshes', () => {
    const firstItem = item('first', {
      fullPreviewUrl: 'blob:existing-full',
    });

    expect(
      withImageGroupPreviewResolvedUrl([firstItem], {
        messageId: 'first',
        previewUrl: 'blob:runtime-full',
        preserveExistingFullPreviewUrl: true,
      })
    ).toEqual([
      {
        ...firstItem,
        thumbnailUrl: 'blob:runtime-full',
        previewUrl: 'blob:runtime-full',
        fullPreviewUrl: 'blob:existing-full',
      },
    ]);
  });

  it('leaves preview names unchanged when no replacement name is supplied', () => {
    const firstItem = item('first', {
      previewName: 'Original name',
    });

    expect(
      withImageGroupPreviewResolvedUrl([firstItem], {
        messageId: 'first',
        previewUrl: 'blob:preview',
      })[0]?.previewName
    ).toBe('Original name');
  });
});
