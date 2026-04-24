import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import MessageItem, { type MessageItemModel } from "../components/messages/MessageItem";

const baseMessage = {
  id: "message-1",
  sender_id: "user-a",
  receiver_id: "user-b",
  channel_id: "channel-1",
  message: "https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing",
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
      selectionTargetMessageIds: [baseMessage.id],
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
      dimmingMessageId: null,
      placement: "up",
      sideAnchor: "middle",
      verticalAnchor: "left",
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

describe("MessageItem", () => {
  it("renders an inline reply panel and focuses the target message when clicked", () => {
    const toggle = vi.fn();
    const focusReplyTargetMessage = vi.fn();

    render(
      <MessageItem
        model={createModel({
          message: {
            ...baseMessage,
            id: "message-3",
            message: "balasan baru",
            reply_to_id: "message-2",
          },
          menu: {
            toggle,
          },
          content: {
            replyTargetMessage: {
              ...baseMessage,
              id: "message-2",
              sender_id: "user-b",
              receiver_id: "user-a",
              message: "pesan asal",
              sender_name: "Tester",
            },
            focusReplyTargetMessage,
          },
        })}
      />,
    );

    const replyPanel = screen.getByRole("button", {
      name: /Buka pesan yang dibalas dari Tester/i,
    });
    fireEvent.click(replyPanel);

    expect(focusReplyTargetMessage).toHaveBeenCalledWith("message-2");
    expect(toggle).not.toHaveBeenCalled();
  });

  it("lets the bubble capture reply-panel clicks when another message menu is active", () => {
    const toggle = vi.fn();
    const focusReplyTargetMessage = vi.fn();

    render(
      <MessageItem
        model={createModel({
          message: {
            ...baseMessage,
            id: "message-3",
            message: "balasan baru",
            reply_to_id: "message-2",
          },
          menu: {
            openMessageId: "message-other",
            dimmingMessageId: "message-other",
            toggle,
          },
          content: {
            replyTargetMessage: {
              ...baseMessage,
              id: "message-2",
              sender_id: "user-b",
              receiver_id: "user-a",
              message: "pesan asal",
              sender_name: "Tester",
            },
            focusReplyTargetMessage,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText("pesan asal"));

    expect(focusReplyTargetMessage).not.toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledTimes(1);
    const [anchorElement, messageId, preferredSide] = toggle.mock.calls[0] as unknown as [
      HTMLElement,
      string,
      "left" | "right",
    ];
    expect(anchorElement.getAttribute("role")).toBe("button");
    expect(messageId).toBe("message-3");
    expect(preferredSide).toBe("left");
  });

  it("lets the bubble capture reply-panel clicks when its own menu is active", () => {
    const toggle = vi.fn();
    const focusReplyTargetMessage = vi.fn();

    render(
      <MessageItem
        model={createModel({
          message: {
            ...baseMessage,
            id: "message-3",
            message: "balasan baru",
            reply_to_id: "message-2",
          },
          menu: {
            openMessageId: "message-3",
            dimmingMessageId: "message-3",
            toggle,
          },
          content: {
            replyTargetMessage: {
              ...baseMessage,
              id: "message-2",
              sender_id: "user-b",
              receiver_id: "user-a",
              message: "pesan asal",
              sender_name: "Tester",
            },
            focusReplyTargetMessage,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText("pesan asal"));

    expect(focusReplyTargetMessage).not.toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledTimes(1);
    const [, messageId, preferredSide] = toggle.mock.calls[0] as unknown as [
      HTMLElement,
      string,
      "left" | "right",
    ];
    expect(messageId).toBe("message-3");
    expect(preferredSide).toBe("left");
  });

  it("shows delete action for incoming white bubble messages", async () => {
    const incomingMessage = {
      ...baseMessage,
      id: "incoming-1",
      sender_id: "user-b",
      receiver_id: "user-a",
      message: "pesan masuk",
    };
    const handleDeleteMessage = vi.fn().mockResolvedValue(true);

    render(
      <MessageItem
        model={createModel({
          message: incomingMessage,
          interaction: {
            userId: "user-a",
            selectionTargetMessageIds: [incomingMessage.id],
          },
          menu: {
            openMessageId: incomingMessage.id,
          },
          actions: {
            handleDeleteMessage,
          },
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Hapus" }));

    expect(handleDeleteMessage).toHaveBeenCalledWith(incomingMessage);
  });

  it("opens grouped images in the multi-image portal from the group action menu", async () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));
    const openImageGroupInPortal = vi.fn(async () => {});

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: "image-4",
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
            openImageGroupInPortal,
          },
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Aksi grup gambar" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Lihat" }));

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
    expect(activeMessageId).toBe("image-1");
    expect(initialPreviewUrl).toBe("images/channel/chat-1.png");
  });

  it("shows an upload overlay while a grouped image bubble still has temp messages", () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `temp_image_${index + 1}`,
      message: `blob:image-${index + 1}`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("uses a one-row grid for grouped image bubbles with two attachments", () => {
    const groupedMessages = Array.from({ length: 2 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Aksi grup gambar" }).style.aspectRatio).toBe(
      "2 / 1",
    );
  });

  it("shows two tiles with an overflow count for grouped image bubbles with three attachments", () => {
    const groupedMessages = Array.from({ length: 3 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[2],
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    expect(container.querySelectorAll("[data-chat-image-group-tile-id]")).toHaveLength(2);
    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aksi grup gambar" }).style.aspectRatio).toBe(
      "2 / 1",
    );
  });

  it("selects every image id in a grouped bubble during selection mode", () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));
    const onToggleMessageSelection = vi.fn();

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          interaction: {
            isSelectionMode: true,
            selectionTargetMessageIds: groupedMessages.map((message) => message.id),
            onToggleMessageSelection,
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(onToggleMessageSelection).toHaveBeenCalledWith([
      "image-1",
      "image-2",
      "image-3",
      "image-4",
    ]);
  });

  it("anchors grouped image menus to the outer bubble instead of the inner grid button", () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
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
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    const button = screen.getByRole("button", { name: "Aksi grup gambar" });
    fireEvent.click(button);

    expect(toggle).toHaveBeenCalledTimes(1);
    const [anchorElement, messageId, preferredSide] = toggle.mock.calls[0] as unknown as [
      HTMLElement,
      string,
      "left" | "right",
    ];
    expect(anchorElement).not.toBe(button);
    expect(anchorElement.contains(button)).toBe(true);
    expect(messageId).toBe("image-4");
    expect(preferredSide).toBe("left");
  });

  it("downloads grouped image bubbles as a zip from the group popover", async () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `https://example.com/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `chat-${index + 1}.png`,
    }));
    const handleDownloadImageGroup = vi.fn().mockResolvedValue(undefined);

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: "image-4",
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
          actions: {
            handleDownloadImageGroup,
          },
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Unduh" }));

    expect(handleDownloadImageGroup).toHaveBeenCalledWith(groupedMessages);
  });

  it("deletes all grouped images from the group popover", async () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `https://example.com/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `chat-${index + 1}.png`,
    }));
    const handleDeleteMessages = vi.fn().mockResolvedValue({
      deletedTargetMessageIds: groupedMessages.map((message) => message.id),
      failedTargetMessageIds: [],
      cleanupWarningTargetMessageIds: [],
    });
    const handleDeleteMessage = vi.fn().mockResolvedValue(true);

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: "image-4",
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
          actions: {
            handleDeleteMessages,
            handleDeleteMessage,
          },
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Hapus" }));

    expect(handleDeleteMessages).toHaveBeenCalledWith(groupedMessages);
    expect(handleDeleteMessage).not.toHaveBeenCalled();
  });

  it("keeps the grouped image popover rendered while it is the transition source", () => {
    const groupedMessages = Array.from({ length: 4 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
    }));

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[3],
          menu: {
            openMessageId: "message-other",
            transitionSourceId: "image-4",
          },
          content: {
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
          },
        })}
      />,
    );

    expect(container.querySelector('[data-chat-menu-id="grouped-image-menu"]')).toBeTruthy();
  });

  it("lets grouped image bubbles capture reply-panel clicks while a message menu is active", () => {
    const groupedMessages = Array.from({ length: 2 }, (_, index) => ({
      ...baseMessage,
      id: `image-${index + 1}`,
      message: `images/channel/chat-${index + 1}.png`,
      message_type: "image" as const,
      file_mime_type: "image/png",
      file_storage_path: `images/channel/chat-${index + 1}.png`,
      file_name: `Chat-${index + 1}.png`,
      reply_to_id: "message-source",
    }));
    const toggle = vi.fn();
    const focusReplyTargetMessage = vi.fn();

    render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          menu: {
            openMessageId: "image-2",
            dimmingMessageId: "image-2",
            toggle,
          },
          content: {
            replyTargetMessage: {
              ...baseMessage,
              id: "message-source",
              sender_id: "user-b",
              receiver_id: "user-a",
              message: "pesan asal",
              sender_name: "Tester",
            },
            groupedImageMessages: groupedMessages,
            getImageMessageUrl: (targetMessage) => targetMessage.message,
            focusReplyTargetMessage,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText("pesan asal"));

    expect(focusReplyTargetMessage).not.toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledTimes(1);
    const [, messageId, preferredSide] = toggle.mock.calls[0] as unknown as [
      HTMLElement,
      string,
      "left" | "right",
    ];
    expect(messageId).toBe("image-2");
    expect(preferredSide).toBe("left");
  });

  it("anchors grouped document menus to the outer bubble when clicking the bubble area", () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: "file-1",
        message: "documents/channel/report.pdf",
        message_type: "file" as const,
        file_name: "Laporan.pdf",
        file_mime_type: "application/pdf",
        file_storage_path: "documents/channel/report.pdf",
        file_kind: "document" as const,
      },
      {
        ...baseMessage,
        id: "file-2",
        message: "documents/channel/notes.docx",
        message_type: "file" as const,
        file_name: "Catatan.docx",
        file_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_storage_path: "documents/channel/notes.docx",
        file_kind: "document" as const,
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
            getAttachmentFileName: (targetMessage) => targetMessage.file_name || "",
          },
        })}
      />,
    );

    const root = container.querySelector(
      "[data-chat-document-group-root]",
    ) as HTMLDivElement | null;
    expect(root).toBeTruthy();

    fireEvent.click(root as HTMLDivElement);

    expect(toggle).toHaveBeenCalledTimes(1);
    const [anchorElement, messageId, preferredSide] = toggle.mock.calls[0] as unknown as [
      HTMLElement,
      string,
      "left" | "right",
    ];
    expect(anchorElement).not.toBe(root);
    expect(anchorElement.contains(root as HTMLDivElement)).toBe(true);
    expect(messageId).toBe("file-2");
    expect(preferredSide).toBe("left");
  });

  it("downloads grouped document bubbles as a zip from the group popover", async () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: "file-1",
        message: "https://example.com/report.pdf",
        message_type: "file" as const,
        file_name: "report.pdf",
        file_mime_type: "application/pdf",
        file_storage_path: "documents/channel/report.pdf",
        file_kind: "document" as const,
      },
      {
        ...baseMessage,
        id: "file-2",
        message: "https://example.com/notes.docx",
        message_type: "file" as const,
        file_name: "notes.docx",
        file_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_storage_path: "documents/channel/notes.docx",
        file_kind: "document" as const,
      },
    ];
    const handleDownloadDocumentGroup = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          menu: {
            openMessageId: "file-2",
            toggle: () => {},
          },
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: (targetMessage) => targetMessage.file_name || "",
          },
          actions: {
            handleDownloadDocumentGroup,
          },
        })}
      />,
    );

    const root = container.querySelector(
      "[data-chat-document-group-root]",
    ) as HTMLDivElement | null;
    fireEvent.click(root as HTMLDivElement);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Unduh" }));

    expect(handleDownloadDocumentGroup).toHaveBeenCalledWith(groupedMessages);
  });

  it("deletes all grouped documents from the group popover", async () => {
    const groupedMessages = [
      {
        ...baseMessage,
        id: "file-1",
        message: "https://example.com/report.pdf",
        message_type: "file" as const,
        file_name: "report.pdf",
        file_mime_type: "application/pdf",
        file_storage_path: "documents/channel/report.pdf",
        file_kind: "document" as const,
      },
      {
        ...baseMessage,
        id: "file-2",
        message: "https://example.com/notes.docx",
        message_type: "file" as const,
        file_name: "notes.docx",
        file_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_storage_path: "documents/channel/notes.docx",
        file_kind: "document" as const,
      },
    ];
    const handleDeleteMessages = vi.fn().mockResolvedValue({
      deletedTargetMessageIds: groupedMessages.map((message) => message.id),
      failedTargetMessageIds: [],
      cleanupWarningTargetMessageIds: [],
    });
    const handleDeleteMessage = vi.fn().mockResolvedValue(true);

    const { container } = render(
      <MessageItem
        model={createModel({
          message: groupedMessages[1],
          menu: {
            openMessageId: "file-2",
            toggle: () => {},
          },
          content: {
            groupedDocumentMessages: groupedMessages,
            getAttachmentFileName: (targetMessage) => targetMessage.file_name || "",
          },
          actions: {
            handleDeleteMessages,
            handleDeleteMessage,
          },
        })}
      />,
    );

    const root = container.querySelector(
      "[data-chat-document-group-root]",
    ) as HTMLDivElement | null;
    fireEvent.click(root as HTMLDivElement);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Hapus" }));

    expect(handleDeleteMessages).toHaveBeenCalledWith(groupedMessages);
    expect(handleDeleteMessage).not.toHaveBeenCalled();
  });
});
