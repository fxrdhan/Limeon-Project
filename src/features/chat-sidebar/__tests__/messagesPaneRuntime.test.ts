import { describe, expect, it, vi } from "vite-plus/test";
import { MESSAGE_BOTTOM_GAP } from "../constants";
import { buildMessagesPaneRuntime } from "../components/messagesPaneRuntime";

const createSource = ({
  composerContainerHeight,
  messageInputHeight = 22,
  composerContextualOffset = 0,
  messages = [],
  isSelectionMode = false,
  normalizedMessageSearchQuery = "",
  getAttachmentFileKind = vi.fn(() => "document"),
}: {
  composerContainerHeight: number;
  messageInputHeight?: number;
  composerContextualOffset?: number;
  messages?: unknown[];
  isSelectionMode?: boolean;
  normalizedMessageSearchQuery?: string;
  getAttachmentFileKind?: ReturnType<typeof vi.fn>;
}) =>
  ({
    user: {
      id: "user-a",
    },
    session: {
      messages,
      loading: false,
      loadError: null,
      retryLoadMessages: vi.fn(),
      hasOlderMessages: false,
      isLoadingOlderMessages: false,
      olderMessagesError: null,
      loadOlderMessages: vi.fn(),
    },
    interaction: {
      isSelectionMode,
      normalizedMessageSearchQuery,
      isMessageSearchMode: false,
      searchMatchedMessageIdSet: new Set<string>(),
      activeSearchMessageId: null,
      selectedMessageIds: new Set<string>(),
      handleToggleMessageSelection: vi.fn(),
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
      menuDimmingMessageId: null,
      menuPlacement: "up",
      menuSideAnchor: "middle",
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
      imagePreviewName: "",
      imageGroupPreviewItems: [],
      isImageGroupPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      documentPreviewUrl: null,
      documentPreviewName: "",
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
      handleDownloadImageGroup: vi.fn(async () => {}),
      handleDownloadDocumentGroup: vi.fn(async () => {}),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn(async () => true),
    },
    actions: {
      getAttachmentFileName: vi.fn(() => "Lampiran"),
      getAttachmentFileKind,
      toggleMessageMenu: vi.fn(),
    },
  }) as unknown as Parameters<typeof buildMessagesPaneRuntime>[0];

describe("buildMessagesPaneRuntime", () => {
  it("prefers the measured composer height once it is available", () => {
    const runtime = buildMessagesPaneRuntime(
      createSource({
        composerContainerHeight: 80,
      }),
    );

    expect(runtime.viewport.paddingBottom).toBe(80 + 8 + MESSAGE_BOTTOM_GAP);
  });

  it("falls back to the composer heuristic before the measurement is ready", () => {
    const runtime = buildMessagesPaneRuntime(
      createSource({
        composerContainerHeight: 0,
        messageInputHeight: 22,
        composerContextualOffset: 44,
      }),
    );

    expect(runtime.viewport.paddingBottom).toBe(22 + 84 + 44);
  });

  it("keeps grouped image bubbles in selection mode", () => {
    const imageMessages = Array.from({ length: 4 }, (_, index) => ({
      id: `image-${index + 1}`,
      sender_id: "user-a",
      receiver_id: "user-b",
      channel_id: "channel-1",
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image",
      created_at: `2026-03-20T10:00:${String(index * 8).padStart(2, "0")}.000Z`,
      updated_at: `2026-03-20T10:00:${String(index * 8).padStart(2, "0")}.000Z`,
      is_read: false,
      is_delivered: false,
      reply_to_id: null,
      file_name: `Chat-${index + 1}.png`,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
    }));

    const runtime = buildMessagesPaneRuntime(
      createSource({
        composerContainerHeight: 80,
        messages: imageMessages,
        isSelectionMode: true,
      }),
    );

    expect(runtime.conversation.renderItems).toHaveLength(1);
    expect(runtime.conversation.renderItems[0]?.kind).toBe("image-group");
  });
});
