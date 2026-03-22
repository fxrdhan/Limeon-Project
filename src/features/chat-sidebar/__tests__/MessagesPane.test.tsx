import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { MessagesPaneModel } from '../models';
import type { ChatMessage } from '../data/chatSidebarGateway';
import MessagesPane from '../components/MessagesPane';

vi.mock('@/components/shared/image-expand-preview', () => ({
  default: ({
    children,
    onClose,
    closeOnContentBackgroundClick,
  }: {
    children?: React.ReactNode;
    onClose?: () => void;
    closeOnContentBackgroundClick?: boolean;
  }) => (
    <div data-testid="image-expand-preview">
      <div
        data-testid="image-expand-preview-content"
        role="presentation"
        onClick={() => {
          if (closeOnContentBackgroundClick) {
            onClose?.();
          }
        }}
      >
        {children}
      </div>
    </div>
  ),
}));

vi.mock('../components/DocumentPreviewPortal', () => ({
  default: () => <div data-testid="document-preview-portal" />,
}));

vi.mock('../components/MultiImagePreviewPortal', () => ({
  default: () => <div data-testid="multi-image-preview-portal" />,
}));

vi.mock('../components/messages/MessageItem', () => ({
  default: ({ model }: { model: { message: ChatMessage } }) => (
    <div data-testid={`message-item-${model.message.id}`}>
      {model.message.message}
    </div>
  ),
}));

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'halo',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-08T12:00:00',
  updated_at: overrides.updated_at ?? '2026-03-08T12:00:00',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  stableKey: overrides.stableKey,
  file_name: overrides.file_name,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  file_kind: overrides.file_kind,
  message_relation_kind: overrides.message_relation_kind,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
});

type MessagesPaneModelOverrides = {
  state?: Partial<MessagesPaneModel['state']>;
  menu?: Partial<MessagesPaneModel['menu']>;
  interaction?: Partial<MessagesPaneModel['interaction']>;
  refs?: Partial<MessagesPaneModel['refs']>;
  previews?: Partial<MessagesPaneModel['previews']>;
  actions?: Partial<MessagesPaneModel['actions']>;
  forwarding?: Partial<MessagesPaneModel['forwarding']>;
};

const createModel = (
  overrides: MessagesPaneModelOverrides = {}
): MessagesPaneModel => ({
  state: {
    loading: false,
    loadError: null,
    messages: [],
    user: { id: 'user-a', name: 'Admin' },
    normalizedSearchQuery: '',
    messageInputHeight: 0,
    composerContextualOffset: 0,
    composerContainerHeight: 0,
    showScrollToBottom: false,
    hasOlderMessages: false,
    isLoadingOlderMessages: false,
    olderMessagesError: null,
    ...overrides.state,
  },
  menu: {
    openMessageId: null,
    placement: 'up',
    sideAnchor: 'middle',
    shouldAnimateOpen: false,
    transitionSourceId: null,
    offsetX: 0,
    close: vi.fn(),
    toggle: vi.fn(),
    ...overrides.menu,
  },
  interaction: {
    isSelectionMode: false,
    selectedMessageIds: new Set<string>(),
    searchMatchedMessageIds: new Set<string>(),
    activeSearchMessageId: null,
    expandedMessageIds: new Set<string>(),
    flashingMessageId: null,
    isFlashHighlightVisible: false,
    onToggleMessageSelection: vi.fn(),
    onToggleExpand: vi.fn(),
    ...overrides.interaction,
  },
  refs: {
    messagesContainerRef: createRef<HTMLDivElement>(),
    messagesEndRef: createRef<HTMLDivElement>(),
    messageBubbleRefs: { current: new Map<string, HTMLDivElement>() },
    initialMessageAnimationKeysRef: { current: new Set<string>() },
    initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
    ...overrides.refs,
  },
  previews: {
    captionMessagesByAttachmentId: new Map<string, ChatMessage>(),
    captionMessageIds: new Set<string>(),
    getAttachmentFileName: () => 'Lampiran',
    getAttachmentFileKind: () => 'document',
    getImageMessageUrl: vi.fn(() => null),
    getPdfMessagePreview: vi.fn(() => undefined),
    documentPreviewUrl: null,
    documentPreviewName: '',
    isDocumentPreviewVisible: false,
    closeDocumentPreview: vi.fn(),
    isImagePreviewOpen: false,
    imagePreviewUrl: null,
    imagePreviewBackdropUrl: null,
    imagePreviewStageUrls: [],
    imagePreviewName: '',
    isImagePreviewVisible: false,
    closeImagePreview: vi.fn(),
    imageGroupPreviewItems: [],
    activeImageGroupPreviewId: null,
    isImageGroupPreviewVisible: false,
    closeImageGroupPreview: vi.fn(),
    selectImageGroupPreviewItem: vi.fn(),
    openImageInPortal: vi.fn(async () => {}),
    openImageGroupInPortal: vi.fn(async () => {}),
    openDocumentInPortal: vi.fn(async () => {}),
    ...overrides.previews,
  },
  actions: {
    handleEditMessage: vi.fn(),
    handleCopyMessage: vi.fn(async () => {}),
    handleDownloadMessage: vi.fn(async () => {}),
    handleOpenForwardMessagePicker: vi.fn(),
    handleDeleteMessage: vi.fn(async () => true),
    onScrollToBottom: vi.fn(),
    onLoadOlderMessages: vi.fn(),
    onRetryLoadMessages: vi.fn(),
    ...overrides.actions,
  },
  forwarding: {
    isOpen: false,
    targetMessage: null,
    captionMessage: null,
    availableUsers: [],
    selectedRecipientIds: new Set<string>(),
    isDirectoryLoading: false,
    directoryError: null,
    hasMoreDirectoryUsers: false,
    isSubmitting: false,
    onClose: vi.fn(),
    onToggleRecipient: vi.fn(),
    onRetryLoadDirectory: vi.fn(),
    onLoadMoreDirectoryUsers: vi.fn(),
    onSubmit: vi.fn(async () => {}),
    ...overrides.forwarding,
  },
});

describe('MessagesPane', () => {
  it('renders a centered date separator for the first message and each day change', () => {
    const model = createModel({
      state: {
        loading: false,
        loadError: null,
        messages: [
          buildMessage({
            id: 'message-1',
            message: 'hari pertama',
            created_at: '2026-03-08T09:00:00',
            updated_at: '2026-03-08T09:00:00',
          }),
          buildMessage({
            id: 'message-2',
            message: 'masih hari pertama',
            created_at: '2026-03-08T10:00:00',
            updated_at: '2026-03-08T10:00:00',
          }),
          buildMessage({
            id: 'message-3',
            message: 'hari kedua',
            created_at: '2026-03-09T08:00:00',
            updated_at: '2026-03-09T08:00:00',
          }),
        ],
      },
    });

    render(<MessagesPane model={model} />);

    expect(screen.getByText('8 Maret 2026')).toBeTruthy();
    expect(screen.getByText('9 Maret 2026')).toBeTruthy();
    expect(screen.getAllByText(/Maret 2026/)).toHaveLength(2);
    expect(screen.getByTestId('message-item-message-1')).toBeTruthy();
    expect(screen.getByTestId('message-item-message-2')).toBeTruthy();
    expect(screen.getByTestId('message-item-message-3')).toBeTruthy();
  });

  it('closes the single-image preview when the empty content area is clicked', () => {
    const closeImagePreview = vi.fn();
    const model = createModel({
      previews: {
        isImagePreviewOpen: true,
        isImagePreviewVisible: true,
        imagePreviewUrl: 'https://example.com/full.png',
        imagePreviewBackdropUrl: null,
        imagePreviewStageUrls: [],
        imagePreviewName: 'Lampiran',
        closeImagePreview,
      },
    });

    render(<MessagesPane model={model} />);

    const previewContent = screen.getByTestId('image-expand-preview-content');

    fireEvent.click(previewContent);

    expect(closeImagePreview).toHaveBeenCalledTimes(1);
  });
});
