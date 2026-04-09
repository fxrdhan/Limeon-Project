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
      handleReplyMessage: () => {},
      handleCopyMessage: async () => {},
      handleDownloadMessage: async () => {},
      handleDownloadImageGroup: async () => {},
      handleDownloadDocumentGroup: async () => {},
      handleOpenForwardMessagePicker: () => {},
      handleDeleteMessage: async () => true,
      ...actions,
    },
    ...rootOverrides,
  };
};

describe('MessageItem', () => {
  it('keeps blurred bubbles clickable while disabling link interaction styling', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          menu: {
            openMessageId: 'message-2',
          },
        })}
      />
    );

    expect(container.firstElementChild?.className).not.toContain(
      'pointer-events-none'
    );
    expect(container.firstElementChild?.className).toContain('blur-[2px]');
    expect(
      Array.from(container.querySelectorAll('div')).some(element =>
        element.className.includes('[&_a]:pointer-events-none')
      )
    ).toBe(true);
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

    render(
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

  it('anchors grouped image menus to the outer bubble instead of the inner grid button', () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: 'image' as const,
      file_mime_type: 'image/png',
      file_storage_path: `images/channel/chat-${index + 1}.png`,
    }));
    const toggle = vi.fn();

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            toggle,
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: targetMessage => targetMessage.message,
          },
        })}
      />
    );

    const button = screen.getByRole('button', { name: 'Aksi grup gambar' });
    fireEvent.click(button);

    expect(toggle).toHaveBeenCalledTimes(1);
    const [anchorElement, messageId, preferredSide] = toggle.mock
      .calls[0] as unknown as [HTMLElement, string, 'left' | 'right'];
    expect(anchorElement).not.toBe(button);
    expect(anchorElement.contains(button)).toBe(true);
    expect(messageId).toBe('image-4');
    expect(preferredSide).toBe('left');
  });

  it('downloads grouped image bubbles as a zip from the group popover', async () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `https://example.com/chat-${index + 1}.png`,
      message_type: 'image' as const,
      file_mime_type: 'image/png',
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `chat-${index + 1}.png`,
    }));
    const handleDownloadImageGroup = vi.fn().mockResolvedValue(undefined);

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: 'image-4',
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: targetMessage => targetMessage.message,
          },
          actions: {
            handleDownloadImageGroup,
          },
        })}
      />
    );

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unduh' }));

    expect(handleDownloadImageGroup).toHaveBeenCalledWith(groupedMessages);
  });

  it('anchors grouped document menus to the outer bubble when clicking the bubble area', () => {
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
    const toggle = vi.fn();

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          menu: {
            toggle,
          },
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: targetMessage =>
              targetMessage.file_name || '',
          },
        })}
      />
    );

    const root = container.querySelector(
      '[data-chat-document-group-root]'
    ) as HTMLDivElement | null;
    expect(root).toBeTruthy();

    fireEvent.click(root as HTMLDivElement);

    expect(toggle).toHaveBeenCalledTimes(1);
    const [anchorElement, messageId, preferredSide] = toggle.mock
      .calls[0] as unknown as [HTMLElement, string, 'left' | 'right'];
    expect(anchorElement).not.toBe(root);
    expect(anchorElement.contains(root as HTMLDivElement)).toBe(true);
    expect(messageId).toBe('file-2');
    expect(preferredSide).toBe('left');
  });

  it('downloads grouped document bubbles as a zip from the group popover', async () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: 'file-1',
        message: 'https://example.com/report.pdf',
        message_type: 'file' as const,
        file_name: 'report.pdf',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel/report.pdf',
        file_kind: 'document' as const,
      },
      {
        ...baseMessage,
        id: 'file-2',
        message: 'https://example.com/notes.docx',
        message_type: 'file' as const,
        file_name: 'notes.docx',
        file_mime_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_storage_path: 'documents/channel/notes.docx',
        file_kind: 'document' as const,
      },
    ];
    const handleDownloadDocumentGroup = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          menu: {
            openMessageId: 'file-2',
            toggle: () => {},
          },
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: targetMessage =>
              targetMessage.file_name || '',
          },
          actions: {
            handleDownloadDocumentGroup,
          },
        })}
      />
    );

    const root = container.querySelector(
      '[data-chat-document-group-root]'
    ) as HTMLDivElement | null;
    fireEvent.click(root as HTMLDivElement);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unduh' }));

    expect(handleDownloadDocumentGroup).toHaveBeenCalledWith(groupedMessages);
  });
});
