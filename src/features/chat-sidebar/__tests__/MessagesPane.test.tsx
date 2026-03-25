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
  itemRuntime?: Partial<MessagesPaneRuntime['itemRuntime']>;
  previewRuntime?: Partial<MessagesPaneRuntime['previewRuntime']>;
} & Partial<Omit<MessagesPaneRuntime, 'itemRuntime' | 'previewRuntime'>>;

const createRuntime = (overrides: MessagesPaneRuntimeOverrides = {}) =>
  (({ itemRuntime, previewRuntime, ...runtimeOverrides }) => ({
    messages: [],
    loading: false,
    loadError: null,
    hasOlderMessages: false,
    isLoadingOlderMessages: false,
    olderMessagesError: null,
    loadOlderMessages: vi.fn(),
    retryLoadMessages: vi.fn(),
    renderItems: [],
    searchMatchedMessageIds: new Set<string>(),
    activeSearchMessageId: null,
    messagesContainerRef: createRef<HTMLDivElement>(),
    messagesContentRef: createRef<HTMLDivElement>(),
    messagesEndRef: createRef<HTMLDivElement>(),
    paddingBottom: 0,
    closeMessageMenu: vi.fn(),
    hasNewMessages: false,
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    composerContainerHeight: 0,
    activeImageGroupPreviewMessage: null,
    itemRuntime: {
      userId: 'user-a',
      isSelectionMode: false,
      selectedMessageIds: new Set<string>(),
      expandedMessageIds: new Set<string>(),
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      handleToggleMessageSelection: vi.fn(),
      handleToggleExpand: vi.fn(),
      toggleMessageMenu: vi.fn(),
      messageBubbleRefs: { current: new Map<string, HTMLDivElement>() },
      initialMessageAnimationKeysRef: { current: new Set<string>() },
      initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
      getImageMessageUrl: vi.fn(() => null),
      getPdfMessagePreview: vi.fn(() => undefined),
      getAttachmentFileName: () => 'Lampiran',
      getAttachmentFileKind: () => 'document',
      normalizedMessageSearchQuery: '',
      openImageInPortal: vi.fn(async () => {}),
      openImageGroupInPortal: vi.fn(async () => {}),
      openDocumentInPortal: vi.fn(async () => {}),
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn(async () => {}),
      handleDownloadMessage: vi.fn(async () => {}),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn(async () => true),
      ...itemRuntime,
    },
    previewRuntime: {
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      closeImagePreview: vi.fn(),
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(async () => {}),
      handleCopyMessage: vi.fn(async () => {}),
      handleOpenForwardMessagePicker: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      closeDocumentPreview: vi.fn(),
      ...previewRuntime,
    },
    ...runtimeOverrides,
  }))(overrides) as unknown as MessagesPaneRuntime;

describe('MessagesPane', () => {
  it('closes the single-image preview when the empty content area is clicked', () => {
    const closeImagePreview = vi.fn();
    const runtime = createRuntime({
      previewRuntime: {
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
      messages: [
        { id: 'message-1', message: 'Halo' } as unknown as ChatMessage,
      ],
      paddingBottom: 128 + 8 + MESSAGE_BOTTOM_GAP,
      composerContainerHeight: 128,
    });

    const { container } = render(<MessagesPane runtime={runtime} />);

    const messagesViewport = container.querySelector('[role="presentation"]');

    expect(messagesViewport).not.toBeNull();
    expect((messagesViewport as HTMLDivElement).style.paddingBottom).toBe(
      `${128 + 8 + MESSAGE_BOTTOM_GAP}px`
    );
  });
});
