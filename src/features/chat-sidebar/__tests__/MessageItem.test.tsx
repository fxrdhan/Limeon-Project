import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
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
  overrides: Partial<MessageItemModel> = {}
): MessageItemModel => ({
  message: baseMessage,
  resolvedMessageUrl: null,
  userId: 'user-a',
  isGroupedWithPrevious: false,
  isGroupedWithNext: false,
  isFirstVisibleMessage: true,
  isSelectionMode: false,
  isSelected: false,
  openMenuMessageId: null,
  menuPlacement: 'up',
  menuSideAnchor: 'middle',
  shouldAnimateMenuOpen: false,
  menuTransitionSourceId: null,
  menuOffsetX: 0,
  expandedMessageIds: new Set<string>(),
  flashingMessageId: null,
  isFlashHighlightVisible: false,
  searchMatchedMessageIds: new Set<string>(),
  activeSearchMessageId: null,
  maxMessageChars: 500,
  messageBubbleRefs: { current: new Map() },
  initialMessageAnimationKeysRef: { current: new Set() },
  initialOpenJumpAnimationKeysRef: { current: new Set() },
  captionMessage: undefined,
  pdfMessagePreview: undefined,
  onToggleMessageSelection: () => {},
  toggleMessageMenu: () => {},
  handleToggleExpand: () => {},
  handleEditMessage: () => {},
  handleCopyMessage: async () => {},
  handleDownloadMessage: async () => {},
  handleOpenForwardMessagePicker: () => {},
  handleDeleteMessage: async () => true,
  getAttachmentFileName: () => '',
  getAttachmentFileKind: () => 'document',
  getImageMessageUrl: () => null,
  getPdfMessagePreview: () => undefined,
  normalizedSearchQuery: '',
  openImageInPortal: async () => {},
  openDocumentInPortal: async () => {},
  ...overrides,
});

describe('MessageItem', () => {
  it('keeps text bubbles shrinkable for long links', () => {
    render(<MessageItem model={createModel()} />);

    const bubble = screen.getByRole('button');
    const bubbleWrapper = bubble.parentElement;
    const bubbleColumn = bubbleWrapper?.parentElement;

    expect(bubble.className).toContain('w-fit');
    expect(bubbleWrapper?.className).toContain('min-w-0');
    expect(bubbleColumn?.className).toContain('min-w-0');
    expect(bubble.getAttribute('style')).toContain('overflow-wrap: anywhere;');
  });

  it('uses a slate full-row highlight for selected messages without changing bubble tone', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          isSelectionMode: true,
          isSelected: true,
        })}
      />
    );

    const row = container.firstElementChild as HTMLElement | null;
    const bubble = screen.getByRole('button');
    const highlight = container.querySelector('[aria-hidden="true"]');

    expect(row?.className).toContain('group');
    expect(highlight?.className).toContain('-inset-x-3');
    expect(highlight?.className).toContain('bg-slate-200');
    expect(bubble.className).toContain('bg-emerald-200');
    expect(bubble.className).toContain('text-slate-900');
    expect(
      screen.getByRole('link', { name: baseMessage.message }).parentElement
        ?.className
    ).toContain('pointer-events-none');
    expect(container.querySelector('.rounded-full.border')).toBeNull();
  });

  it('moves the outgoing tail to the top-right corner for a standalone bubble', () => {
    render(<MessageItem model={createModel()} />);

    const bubble = screen.getByRole('button');

    expect(bubble.className).toContain('rounded-tr-[2px]');
    expect(bubble.className).toContain('rounded-br-xl');
    expect(bubble.className).not.toContain('rounded-br-[2px]');
  });

  it('keeps grouped outgoing bubbles connected and uses a single tail at the group start', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          isGroupedWithPrevious: true,
          isGroupedWithNext: true,
          isFirstVisibleMessage: false,
        })}
      />
    );

    const row = container.firstElementChild as HTMLElement | null;
    const bubble = screen.getByRole('button');

    expect(row?.className).toContain('mt-1');
    expect(bubble.className).toContain('rounded-tr-md');
    expect(bubble.className).toContain('rounded-br-md');
    expect(bubble.className).not.toContain('rounded-tr-[2px]');
    expect(bubble.className).not.toContain('rounded-br-[2px]');
  });

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
          groupedDocumentMessages: groupedMessages,
          getAttachmentFileName: targetMessage => targetMessage.file_name || '',
        })}
      />
    );

    expect(screen.getByText('Laporan.pdf')).toBeTruthy();
    expect(screen.getByText('Catatan.docx')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
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
          groupedDocumentMessages: groupedMessages,
          getAttachmentFileName: targetMessage => targetMessage.file_name || '',
          getPdfMessagePreview: targetMessage =>
            targetMessage.id === 'file-1'
              ? {
                  cacheKey: 'pdf-preview-1',
                  coverDataUrl: 'data:image/png;base64,preview',
                  pageCount: 2,
                }
              : undefined,
        })}
      />
    );

    expect(screen.getByAltText('PDF cover preview')).toBeTruthy();
  });

  it('keeps the active attachment menu visible in a grouped bubble', () => {
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
          groupedDocumentMessages: groupedMessages,
          openMenuMessageId: 'file-1',
          getAttachmentFileName: targetMessage => targetMessage.file_name || '',
        })}
      />
    );

    const firstRow = container.querySelector(
      '[data-chat-attachment-row-id="file-1"]'
    );
    const secondRow = container.querySelector(
      '[data-chat-attachment-row-id="file-2"]'
    );

    expect(screen.getByRole('menuitem', { name: 'Buka' })).toBeTruthy();
    expect(firstRow?.className).toContain('z-[2]');
    expect(firstRow?.className).not.toContain('blur-[2px]');
    expect(secondRow?.className).toContain('blur-[2px]');
  });

  it('blurs the whole row when another message menu is active elsewhere', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          openMenuMessageId: 'file-elsewhere',
        })}
      />
    );

    const row = container.firstElementChild as HTMLElement | null;

    expect(row?.className).toContain('blur-[2px]');
  });
});
