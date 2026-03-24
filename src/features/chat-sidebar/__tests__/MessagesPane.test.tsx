import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { MessagesPaneModel } from '../models';
import type { ChatMessage } from '../data/chatSidebarGateway';
import MessagesPane from '../components/MessagesPane';
import { MESSAGE_BOTTOM_GAP } from '../constants';

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
  it('closes the single-image preview when the empty content area is clicked', () => {
    const closeImagePreview = vi.fn();
    const model = createModel({
      previews: {
        isImagePreviewOpen: true,
        isImagePreviewVisible: true,
        imagePreviewUrl: 'https://example.com/full.png',
        imagePreviewBackdropUrl: null,
        imagePreviewName: 'Lampiran',
        closeImagePreview,
      },
    });

    render(<MessagesPane model={model} />);

    const previewContent = screen.getByTestId('image-expand-preview-content');

    fireEvent.click(previewContent);

    expect(closeImagePreview).toHaveBeenCalledTimes(1);
  });

  it('reserves scroll space from the measured composer height so the last bubble keeps a gap above it', () => {
    const model = createModel({
      state: {
        messages: [
          {
            id: 'message-1',
            sender_id: 'user-a',
            receiver_id: 'user-b',
            message: 'Halo',
            created_at: '2026-03-24T08:00:00.000Z',
            updated_at: '2026-03-24T08:00:00.000Z',
            is_read: true,
            is_deleted: false,
            type: 'text',
            file_name: null,
            file_size: null,
            storage_path: null,
            thumbnail_path: null,
            mime_type: null,
            metadata: null,
            reply_to_message_id: null,
          },
        ],
        composerContainerHeight: 128,
        messageInputHeight: 22,
        composerContextualOffset: 0,
      },
    });

    const { container } = render(<MessagesPane model={model} />);

    const messagesViewport = container.querySelector('[role="presentation"]');

    expect(messagesViewport).not.toBeNull();
    expect((messagesViewport as HTMLDivElement).style.paddingBottom).toBe(
      `${128 + 8 + MESSAGE_BOTTOM_GAP}px`
    );
  });
});
