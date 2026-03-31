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

type MessagesPaneConversationOverrides = Partial<
  Omit<MessagesPaneRuntime['conversation'], 'history' | 'search'>
> & {
  history?: Partial<MessagesPaneRuntime['conversation']['history']>;
  search?: Partial<MessagesPaneRuntime['conversation']['search']>;
};

type MessagesPaneItemOverrides = {
  interaction?: Partial<MessagesPaneRuntime['item']['interaction']>;
  menu?: Partial<MessagesPaneRuntime['item']['menu']>;
  refs?: Partial<MessagesPaneRuntime['item']['refs']>;
  content?: Partial<MessagesPaneRuntime['item']['content']>;
  actions?: Partial<MessagesPaneRuntime['item']['actions']>;
};

type MessagesPaneRuntimeOverrides = {
  conversation?: MessagesPaneConversationOverrides;
  viewport?: Partial<MessagesPaneRuntime['viewport']>;
  item?: MessagesPaneItemOverrides;
  previews?: Partial<MessagesPaneRuntime['previews']>;
};

const createRuntime = (overrides: MessagesPaneRuntimeOverrides = {}) => {
  const { conversation, viewport, item, previews } = overrides;

  return {
    conversation: {
      messages: [],
      loading: false,
      loadError: null,
      retryLoadMessages: vi.fn(),
      history: {
        hasOlderMessages: false,
        isLoadingOlderMessages: false,
        olderMessagesError: null,
        loadOlderMessages: vi.fn(),
        ...conversation?.history,
      },
      renderItems: [],
      search: {
        matchedMessageIds: new Set<string>(),
        activeMessageId: null,
        ...conversation?.search,
      },
      ...conversation,
    },
    viewport: {
      messagesContainerRef: createRef<HTMLDivElement>(),
      messagesContentRef: createRef<HTMLDivElement>(),
      messagesEndRef: createRef<HTMLDivElement>(),
      paddingBottom: 0,
      isInitialOpenPinPending: false,
      closeMessageMenu: vi.fn(),
      hasNewMessages: false,
      isAtBottom: true,
      scrollToBottom: vi.fn(),
      composerContainerHeight: 0,
      ...viewport,
    },
    item: {
      interaction: {
        userId: 'user-a',
        isSelectionMode: false,
        selectedMessageIds: new Set<string>(),
        handleToggleMessageSelection: vi.fn(),
        expandedMessageIds: new Set<string>(),
        handleToggleExpand: vi.fn(),
        flashingMessageId: null,
        isFlashHighlightVisible: false,
        normalizedMessageSearchQuery: '',
        ...item?.interaction,
      },
      menu: {
        openMessageId: null,
        placement: 'up',
        sideAnchor: 'middle',
        shouldAnimateOpen: false,
        transitionSourceId: null,
        offsetX: 0,
        toggle: vi.fn(),
        ...item?.menu,
      },
      refs: {
        messageBubbleRefs: { current: new Map<string, HTMLDivElement>() },
        initialMessageAnimationKeysRef: { current: new Set<string>() },
        initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
        ...item?.refs,
      },
      content: {
        getImageMessageUrl: vi.fn(() => null),
        getPdfMessagePreview: vi.fn(() => undefined),
        getAttachmentFileName: () => 'Lampiran',
        getAttachmentFileKind: () => 'document',
        openImageInPortal: vi.fn(async () => {}),
        openImageGroupInPortal: vi.fn(async () => {}),
        openDocumentInPortal: vi.fn(async () => {}),
        ...item?.content,
      },
      actions: {
        handleEditMessage: vi.fn(),
        handleCopyMessage: vi.fn(async () => {}),
        handleDownloadMessage: vi.fn(async () => {}),
        handleOpenForwardMessagePicker: vi.fn(),
        handleDeleteMessage: vi.fn(async () => true),
        ...item?.actions,
      },
    },
    previews: {
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
      activeImageGroupPreviewMessage: null,
      ...previews,
    },
  } as unknown as MessagesPaneRuntime;
};

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
      conversation: {
        messages: [
          { id: 'message-1', message: 'Halo' } as unknown as ChatMessage,
        ],
      },
      viewport: {
        paddingBottom: 128 + 8 + MESSAGE_BOTTOM_GAP,
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

  it('skips viewport padding transition while the initial open pin is still settling', () => {
    const runtime = createRuntime({
      viewport: {
        isInitialOpenPinPending: true,
      },
    });

    const { container } = render(<MessagesPane runtime={runtime} />);

    const messagesViewport = container.querySelector('[role="presentation"]');

    expect(messagesViewport).not.toBeNull();
    expect((messagesViewport as HTMLDivElement).className).not.toContain(
      'transition-[padding-bottom]'
    );
  });
});
