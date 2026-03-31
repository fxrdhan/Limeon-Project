import { describe, expect, it, vi } from 'vite-plus/test';
import { MESSAGE_BOTTOM_GAP } from '../constants';
import { buildMessagesPaneRuntime } from '../components/messagesPaneRuntime';

const createSource = ({
  composerContainerHeight,
  messageInputHeight = 22,
  composerContextualOffset = 0,
}: {
  composerContainerHeight: number;
  messageInputHeight?: number;
  composerContextualOffset?: number;
}) =>
  ({
    user: {
      id: 'user-a',
    },
    session: {
      messages: [],
      loading: false,
      loadError: null,
      retryLoadMessages: vi.fn(),
      hasOlderMessages: false,
      isLoadingOlderMessages: false,
      olderMessagesError: null,
      loadOlderMessages: vi.fn(),
    },
    interaction: {
      isSelectionMode: false,
      normalizedMessageSearchQuery: '',
      isMessageSearchMode: false,
      searchMatchedMessageIdSet: new Set<string>(),
      activeSearchMessageId: null,
    },
    composer: {
      messageInputHeight,
      composerContextualOffset,
    },
    viewport: {
      composerContainerHeight,
      isInitialOpenPinPending: false,
      closeMessageMenu: vi.fn(),
      hasNewMessages: false,
      isAtBottom: true,
      scrollToBottom: vi.fn(),
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
    },
    refs: {
      messagesContainerRef: { current: null },
      messagesContentRef: { current: null },
      messagesEndRef: { current: null },
      messageBubbleRefs: { current: new Map<string, HTMLDivElement>() },
      initialMessageAnimationKeysRef: { current: new Set<string>() },
      initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
      expandedMessageIds: new Set<string>(),
      handleToggleExpand: vi.fn(),
    },
    previews: {
      captionMessageIds: new Set<string>(),
      captionMessagesByAttachmentId: new Map(),
      activeImageGroupPreviewId: null,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      closeImagePreview: vi.fn(),
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      imageGroupPreviewItems: [],
      isImageGroupPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      closeDocumentPreview: vi.fn(),
      getImageMessageUrl: vi.fn(() => null),
      getPdfMessagePreview: vi.fn(() => undefined),
      openImageInPortal: vi.fn(async () => {}),
      openImageGroupInPortal: vi.fn(async () => {}),
      openDocumentInPortal: vi.fn(async () => {}),
    },
    mutations: {
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn(async () => {}),
      handleDownloadMessage: vi.fn(async () => {}),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn(async () => true),
    },
    actions: {
      getAttachmentFileName: vi.fn(() => 'Lampiran'),
      getAttachmentFileKind: vi.fn(() => 'document'),
      toggleMessageMenu: vi.fn(),
    },
  }) as unknown as Parameters<typeof buildMessagesPaneRuntime>[0];

describe('buildMessagesPaneRuntime', () => {
  it('prefers the measured composer height once it is available', () => {
    const runtime = buildMessagesPaneRuntime(
      createSource({
        composerContainerHeight: 80,
      })
    );

    expect(runtime.viewport.paddingBottom).toBe(80 + 8 + MESSAGE_BOTTOM_GAP);
  });

  it('falls back to the composer heuristic before the measurement is ready', () => {
    const runtime = buildMessagesPaneRuntime(
      createSource({
        composerContainerHeight: 0,
        messageInputHeight: 22,
        composerContextualOffset: 44,
      })
    );

    expect(runtime.viewport.paddingBottom).toBe(22 + 84 + 44);
  });
});
