import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import MessageItem, {
  type MessageItemModel,
} from '../components/messages/MessageItem';

const baseMessage = {
  id: 'message-1',
  sender_id: 'user-a',
  receiver_id: 'user-b',
  channel_id: 'channel-1',
  message:
    'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
  message_type: 'text' as const,
  created_at: '2026-03-08T12:00:00.000Z',
  updated_at: '2026-03-08T12:00:00.000Z',
  is_read: false,
  is_delivered: false,
  reply_to_id: null,
};

const createModel = (
  overrides: Partial<
    Omit<
      MessageItemModel,
      'layout' | 'interaction' | 'menu' | 'refs' | 'content' | 'actions'
    >
  > & {
    layout?: Partial<MessageItemModel['layout']>;
    interaction?: Partial<MessageItemModel['interaction']>;
    menu?: Partial<MessageItemModel['menu']>;
    refs?: Partial<MessageItemModel['refs']>;
    content?: Partial<MessageItemModel['content']>;
    actions?: Partial<MessageItemModel['actions']>;
  } = {}
): MessageItemModel => {
  const {
    layout,
    interaction,
    menu,
    refs,
    content,
    actions,
    ...rootOverrides
  } = overrides;

  return {
    message: baseMessage,
    layout: {
      isGroupedWithPrevious: false,
      isGroupedWithNext: false,
      isFirstVisibleMessage: true,
      ...layout,
    },
    interaction: {
      userId: 'user-a',
      isSelectionMode: false,
      isSelected: false,
      expandedMessageIds: new Set<string>(),
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      searchMatchedMessageIds: new Set<string>(),
      activeSearchMessageId: null,
      maxMessageChars: 500,
      onToggleMessageSelection: () => {},
      handleToggleExpand: () => {},
      ...interaction,
    },
    menu: {
      openMessageId: null,
      placement: 'up',
      sideAnchor: 'middle',
      shouldAnimateOpen: false,
      transitionSourceId: null,
      offsetX: 0,
      toggle: () => {},
      ...menu,
    },
    refs: {
      messageBubbleRefs: { current: new Map() },
      initialMessageAnimationKeysRef: { current: new Set() },
      initialOpenJumpAnimationKeysRef: { current: new Set() },
      ...refs,
    },
    content: {
      resolvedMessageUrl: null,
      captionMessage: undefined,
      groupedDocumentMessages: undefined,
      groupedImageMessages: undefined,
      pdfMessagePreview: undefined,
      getAttachmentFileName: () => '',
      getAttachmentFileKind: () => 'document',
      getImageMessageUrl: () => null,
      getPdfMessagePreview: () => undefined,
      normalizedSearchQuery: '',
      openImageInPortal: async () => {},
      openImageGroupInPortal: async () => {},
      openDocumentInPortal: async () => {},
      ...content,
    },
    actions: {
      handleEditMessage: () => {},
      handleCopyMessage: async () => {},
      handleDownloadMessage: async () => {},
      handleOpenForwardMessagePicker: () => {},
      handleDeleteMessage: async () => true,
      ...actions,
    },
    ...rootOverrides,
  };
};

describe('MessageItem', () => {
  it('renders multiple document attachments in a single bubble without preview covers', () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: 'file-1',
        message: 'documents/channel/report.pdf',
        message_type: 'file' as const,
        file_name: 'Laporan.pdf',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel/report.pdf',
        file_kind: 'document' as const,
      },
      {
        ...baseMessage,
        id: 'file-2',
        message: 'documents/channel/notes.docx',
        message_type: 'file' as const,
        file_name: 'Catatan.docx',
        file_mime_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_storage_path: 'documents/channel/notes.docx',
        file_kind: 'document' as const,
      },
    ];

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: targetMessage =>
              targetMessage.file_name || '',
          },
        })}
      />
    );

    expect(screen.getByText('Laporan.pdf')).toBeTruthy();
    expect(screen.getByText('Catatan.docx')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders 4 images in a grouped 2x2 bubble', () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: 'image' as const,
      file_mime_type: 'image/png',
      file_storage_path: `images/channel/chat-${index + 1}.png`,
    }));

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: targetMessage => targetMessage.message,
          },
        })}
      />
    );

    expect(
      container.querySelector('[data-chat-image-group-grid]')
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-chat-image-group-tile-id]')
    ).toHaveLength(4);
  });

  it('shows a +N overlay on the last tile when grouped images exceed 4', () => {
    const groupedMessages = Array.from({ length: 6 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: 'image' as const,
      file_mime_type: 'image/png',
      file_storage_path: `images/channel/chat-${index + 1}.png`,
    }));

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[5],
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: targetMessage => targetMessage.message,
          },
        })}
      />
    );

    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('opens grouped images in the multi-image portal from the group action menu', async () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: 'image' as const,
      file_mime_type: 'image/png',
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));
    const openImageGroupInPortal = vi.fn(async () => {});

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: 'image-4',
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: targetMessage => targetMessage.message,
            openImageGroupInPortal,
          },
        })}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Aksi grup gambar' })
    ).toBeTruthy();
    expect(
      container.querySelector('[data-chat-image-group-tile-id="image-2"]')
    ).toBeTruthy();

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Lihat' }));

    expect(openImageGroupInPortal).toHaveBeenCalledTimes(1);
    const firstCall = openImageGroupInPortal.mock.calls[0] as unknown as [
      Array<{
        id: string;
        message: string;
        file_storage_path?: string | null;
        file_mime_type?: string | null;
        file_name?: string | null;
      }>,
      string | null | undefined,
      string | null | undefined,
    ];
    expect(firstCall).toBeTruthy();
    const previewMessages = firstCall[0];
    const activeMessageId = firstCall[1];
    const initialPreviewUrl = firstCall[2];
    expect(previewMessages).toHaveLength(4);
    expect(activeMessageId).toBe('image-1');
    expect(initialPreviewUrl).toBe('images/channel/chat-1.png');
  });

  it('renders a PDF cover thumbnail inside a grouped document bubble when preview data exists', () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: 'file-1',
        message: 'documents/channel/report.pdf',
        message_type: 'file' as const,
        file_name: 'Laporan.pdf',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel/report.pdf',
        file_kind: 'document' as const,
      },
      {
        ...baseMessage,
        id: 'file-2',
        message: 'documents/channel/notes.pdf',
        message_type: 'file' as const,
        file_name: 'Catatan.pdf',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel/notes.pdf',
        file_kind: 'document' as const,
      },
    ];

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: targetMessage =>
              targetMessage.file_name || '',
            getPdfMessagePreview: targetMessage =>
              targetMessage.id === 'file-1'
                ? {
                    cacheKey: 'pdf-preview-1',
                    coverDataUrl: 'data:image/png;base64,preview',
                    pageCount: 2,
                  }
                : undefined,
          },
        })}
      />
    );

    expect(screen.getByAltText('PDF cover preview')).toBeTruthy();
  });
});
