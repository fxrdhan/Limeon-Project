import { describe, expect, it } from "vite-plus/test";
import type { MessageItemModel } from "../components/messages/MessageItem";
import { areMessageItemPropsEqual } from "../components/messages/messageItemMemo";

const baseMessage = {
  id: "message-1",
  sender_id: "user-a",
  receiver_id: "user-b",
  channel_id: "channel-1",
  message: "halo",
  message_type: "text" as const,
  created_at: "2026-03-08T12:00:00.000Z",
  updated_at: "2026-03-08T12:00:00.000Z",
  is_read: false,
  is_delivered: false,
  reply_to_id: null,
};

const createModel = (
  overrides: Partial<
    Omit<MessageItemModel, "layout" | "interaction" | "menu" | "refs" | "content" | "actions">
  > & {
    layout?: Partial<MessageItemModel["layout"]>;
    interaction?: Partial<MessageItemModel["interaction"]>;
    menu?: Partial<MessageItemModel["menu"]>;
    refs?: Partial<MessageItemModel["refs"]>;
    content?: Partial<MessageItemModel["content"]>;
    actions?: Partial<MessageItemModel["actions"]>;
  } = {},
): MessageItemModel => {
  const { layout, interaction, menu, refs, content, actions, ...rootOverrides } = overrides;

  return {
    message: baseMessage,
    layout: {
      isGroupedWithPrevious: false,
      isGroupedWithNext: false,
      isFirstVisibleMessage: true,
      ...layout,
    },
    interaction: {
      userId: "user-a",
      isSelectionMode: false,
      isSelected: false,
      selectionTargetMessageIds: ["message-1"],
      expandedMessageIds: new Set<string>(),
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      searchMatchedMessageIds: new Set<string>(),
      activeSearchMessageId: null,
      maxMessageChars: 220,
      onToggleMessageSelection: () => {},
      handleToggleExpand: () => {},
      ...interaction,
    },
    menu: {
      openMessageId: null,
      placement: "up",
      sideAnchor: "middle",
      verticalAnchor: "left",
      shouldAnimateOpen: true,
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
      replyTargetMessage: undefined,
      groupedDocumentMessages: undefined,
      groupedImageMessages: undefined,
      pdfMessagePreview: undefined,
      getAttachmentFileName: () => "",
      getAttachmentFileKind: () => "document",
      getImageMessageUrl: () => null,
      getPdfMessagePreview: () => undefined,
      normalizedSearchQuery: "",
      openImageInPortal: async () => {},
      openImageGroupInPortal: async () => {},
      openDocumentInPortal: async () => {},
      focusReplyTargetMessage: () => {},
      ...content,
    },
    actions: {
      handleEditMessage: () => {},
      handleReplyMessage: () => {},
      handleCopyMessage: async () => {},
      handleDownloadMessage: async () => {},
      handleDownloadImageGroup: async () => {},
      handleDownloadDocumentGroup: async () => {},
      handleDeleteMessages: async () => ({
        deletedTargetMessageIds: [],
        failedTargetMessageIds: [],
        cleanupWarningTargetMessageIds: [],
      }),
      handleOpenForwardMessagePicker: () => {},
      handleDeleteMessage: async () => true,
      ...actions,
    },
    ...rootOverrides,
  };
};

describe("areMessageItemPropsEqual", () => {
  it("treats unrelated open-menu message changes as equal for the current item", () => {
    const previousModel = createModel({ menu: { openMessageId: "message-2" } });
    const nextModel = createModel({ menu: { openMessageId: "message-3" } });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(true);
  });

  it("detects when the current message selection state changes", () => {
    const previousModel = createModel({ interaction: { isSelected: false } });
    const nextModel = createModel({ interaction: { isSelected: true } });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when an image preview URL resolves for the current item", () => {
    const previousModel = createModel({
      content: { resolvedMessageUrl: null },
    });
    const nextModel = createModel({
      content: {
        resolvedMessageUrl: "https://example.com/image.png",
      },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when grouped bubble layout changes for the current item", () => {
    const previousModel = createModel({
      layout: { isGroupedWithNext: false },
    });
    const nextModel = createModel({
      layout: { isGroupedWithNext: true },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when grouped document members change for the current item", () => {
    const groupedDocumentMessages = [
      {
        ...baseMessage,
        id: "file-1",
        message: "documents/channel/report.pdf",
        message_type: "file" as const,
      },
    ];
    const previousModel = createModel();
    const nextModel = createModel({
      content: { groupedDocumentMessages },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when the reply target changes for the current item", () => {
    const previousModel = createModel();
    const nextModel = createModel({
      content: {
        replyTargetMessage: {
          ...baseMessage,
          id: "message-2",
          sender_id: "user-b",
          receiver_id: "user-a",
          message: "pesan sumber",
        },
      },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when grouped image members change for the current item", () => {
    const groupedImageMessages = [
      {
        ...baseMessage,
        id: "image-1",
        message: "images/channel/chat.png",
        message_type: "image" as const,
      },
    ];
    const previousModel = createModel();
    const nextModel = createModel({
      content: { groupedImageMessages },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });

  it("detects when menu blur state changes for the current item", () => {
    const previousModel = createModel({ menu: { openMessageId: null } });
    const nextModel = createModel({
      menu: { openMessageId: "file-elsewhere" },
    });

    expect(areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })).toBe(false);
  });
});
