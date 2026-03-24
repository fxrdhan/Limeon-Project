import { createRef, type ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
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

type MessagesPaneRuntime = ComponentProps<typeof MessagesPane>['runtime'];

type MessagesPaneRuntimeOverrides = {
  user?: Partial<MessagesPaneRuntime['user']>;
  session?: Partial<MessagesPaneRuntime['session']>;
  interaction?: Partial<MessagesPaneRuntime['interaction']>;
  composer?: Partial<MessagesPaneRuntime['composer']>;
  viewport?: Partial<MessagesPaneRuntime['viewport']>;
  refs?: Partial<MessagesPaneRuntime['refs']>;
  previews?: Partial<MessagesPaneRuntime['previews']>;
  mutations?: Partial<MessagesPaneRuntime['mutations']>;
  actions?: Partial<MessagesPaneRuntime['actions']>;
};

const createRuntime = (overrides: MessagesPaneRuntimeOverrides = {}) =>
  ({
    user: { id: 'user-a', name: 'Admin', ...overrides.user },
    session: {
      loading: false,
      loadError: null,
      messages: [],
      hasOlderMessages: false,
      isLoadingOlderMessages: false,
      olderMessagesError: null,
      loadOlderMessages: vi.fn(),
      retryLoadMessages: vi.fn(),
      ...overrides.session,
    },
    interaction: {
      isSelectionMode: false,
      isMessageSearchMode: false,
      normalizedMessageSearchQuery: '',
      selectedMessageIds: new Set<string>(),
      searchMatchedMessageIdSet: new Set<string>(),
      activeSearchMessageId: null,
      handleToggleMessageSelection: vi.fn(),
      ...overrides.interaction,
    },
    composer: {
      messageInputHeight: 0,
      composerContextualOffset: 0,
      ...overrides.composer,
    },
    viewport: {
      composerContainerHeight: 0,
      hasNewMessages: false,
      isAtBottom: true,
      closeMessageMenu: vi.fn(),
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      scrollToBottom: vi.fn(),
      ...overrides.viewport,
    },
    refs: {
      expandedMessageIds: new Set<string>(),
      messagesContainerRef: createRef<HTMLDivElement>(),
      messagesContentRef: createRef<HTMLDivElement>(),
      messagesEndRef: createRef<HTMLDivElement>(),
      messageBubbleRefs: { current: new Map<string, HTMLDivElement>() },
      initialMessageAnimationKeysRef: { current: new Set<string>() },
      initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
      handleToggleExpand: vi.fn(),
      ...overrides.refs,
    },
    previews: {
      captionMessagesByAttachmentId: new Map<string, ChatMessage>(),
      captionMessageIds: new Set<string>(),
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
    mutations: {
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn(async () => {}),
      handleDownloadMessage: vi.fn(async () => {}),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn(async () => true),
      ...overrides.mutations,
    },
    actions: {
      getAttachmentFileName: () => 'Lampiran',
      getAttachmentFileKind: () => 'document',
      toggleMessageMenu: vi.fn(),
      ...overrides.actions,
    },
  }) as unknown as MessagesPaneRuntime;

describe('MessagesPane', () => {
  it('closes the single-image preview when the empty content area is clicked', () => {
    const closeImagePreview = vi.fn();
    const runtime = createRuntime({
      previews: {
        isImagePreviewOpen: true,
        isImagePreviewVisible: true,
        imagePreviewUrl: 'https://example.com/full.png',
        imagePreviewBackdropUrl: null,
        imagePreviewName: 'Lampiran',
        closeImagePreview,
      },
    });

    render(<MessagesPane runtime={runtime} />);

    const previewContent = screen.getByTestId('image-expand-preview-content');

    fireEvent.click(previewContent);

    expect(closeImagePreview).toHaveBeenCalledTimes(1);
  });

  it('reserves scroll space from the measured composer height so the last bubble keeps a gap above it', () => {
    const runtime = createRuntime({
      session: {
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
      },
      composer: {
        messageInputHeight: 22,
        composerContextualOffset: 0,
      },
      viewport: {
        composerContainerHeight: 128,
      },
    });

    const { container } = render(<MessagesPane runtime={runtime} />);

    const messagesViewport = container.querySelector('[role="presentation"]');

    expect(messagesViewport).not.toBeNull();
    expect((messagesViewport as HTMLDivElement).style.paddingBottom).toBe(
      `${128 + 8 + MESSAGE_BOTTOM_GAP}px`
    );
  });
});
