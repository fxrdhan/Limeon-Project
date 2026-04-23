import { describe, expect, it } from "vite-plus/test";
import type { ChatMessage } from "../data/chatSidebarGateway";
import { buildMessageRenderItems } from "../utils/message-render-items";

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: overrides.id ?? "message-1",
  sender_id: overrides.sender_id ?? "user-a",
  receiver_id: overrides.receiver_id ?? "user-b",
  channel_id: overrides.channel_id ?? "channel-1",
  message: overrides.message ?? "documents/channel/report.pdf",
  message_type: overrides.message_type ?? "file",
  created_at: overrides.created_at ?? "2026-03-20T10:00:00.000Z",
  updated_at: overrides.updated_at ?? "2026-03-20T10:00:00.000Z",
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name ?? "Report.pdf",
  file_kind: overrides.file_kind ?? "document",
  file_mime_type: overrides.file_mime_type ?? "application/pdf",
  file_storage_path: overrides.file_storage_path ?? "documents/channel/report.pdf",
  stableKey: overrides.stableKey,
});

describe("buildMessageRenderItems", () => {
  it("groups 4 consecutive image attachments into a single render item", () => {
    const imageMessages = Array.from({ length: 4 }, (_, index) =>
      buildMessage({
        id: `image-${index + 1}`,
        message: `images/channel/chat-${index + 1}.png`,
        message_type: "image",
        file_name: `Chat-${index + 1}.png`,
        file_kind: undefined,
        file_mime_type: "image/png",
        file_storage_path: `images/channel/chat-${index + 1}.png`,
        created_at: `2026-03-20T10:00:${String(index * 8).padStart(2, "0")}.000Z`,
      }),
    );
    const captionMessage = buildMessage({
      id: "caption-4",
      message: "Batch screenshot",
      message_type: "text",
      file_name: undefined,
      file_kind: undefined,
      file_mime_type: undefined,
      file_storage_path: undefined,
      reply_to_id: "image-4",
      message_relation_kind: "attachment_caption",
    });

    const renderItems = buildMessageRenderItems({
      messages: imageMessages,
      captionMessagesByAttachmentId: new Map([["image-4", captionMessage]]),
      getAttachmentFileKind: () => "document",
      enableImageBubbleGrouping: true,
      enableDocumentBubbleGrouping: true,
    });

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0]?.kind).toBe("image-group");
    expect(renderItems[0]?.messages.map((message) => message.id)).toEqual([
      "image-1",
      "image-2",
      "image-3",
      "image-4",
    ]);
    expect(renderItems[0]?.captionMessage?.id).toBe("caption-4");
  });

  it("keeps 3 consecutive image attachments as separate bubbles", () => {
    const imageMessages = Array.from({ length: 3 }, (_, index) =>
      buildMessage({
        id: `image-${index + 1}`,
        message: `images/channel/chat-${index + 1}.png`,
        message_type: "image",
        file_name: `Chat-${index + 1}.png`,
        file_kind: undefined,
        file_mime_type: "image/png",
        file_storage_path: `images/channel/chat-${index + 1}.png`,
        created_at: `2026-03-20T10:00:${String(index * 8).padStart(2, "0")}.000Z`,
      }),
    );

    const renderItems = buildMessageRenderItems({
      messages: imageMessages,
      captionMessagesByAttachmentId: new Map(),
      getAttachmentFileKind: () => "document",
      enableImageBubbleGrouping: true,
      enableDocumentBubbleGrouping: true,
    });

    expect(renderItems).toHaveLength(3);
    expect(renderItems.every((renderItem) => renderItem.kind === "message")).toBe(true);
  });

  it("groups consecutive document attachments into a single render item", () => {
    const firstMessage = buildMessage({
      id: "file-1",
      file_name: "Report.pdf",
      created_at: "2026-03-20T10:00:00.000Z",
    });
    const secondMessage = buildMessage({
      id: "file-2",
      file_name: "Notes.docx",
      message: "documents/channel/notes.docx",
      file_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_storage_path: "documents/channel/notes.docx",
      created_at: "2026-03-20T10:00:12.000Z",
    });
    const captionMessage = buildMessage({
      id: "caption-2",
      message: "Catatan batch",
      message_type: "text",
      file_name: undefined,
      file_kind: undefined,
      file_mime_type: undefined,
      file_storage_path: undefined,
      reply_to_id: "file-2",
      message_relation_kind: "attachment_caption",
    });

    const renderItems = buildMessageRenderItems({
      messages: [firstMessage, secondMessage],
      captionMessagesByAttachmentId: new Map([["file-2", captionMessage]]),
      getAttachmentFileKind: () => "document",
      enableImageBubbleGrouping: true,
      enableDocumentBubbleGrouping: true,
    });

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0]?.kind).toBe("document-group");
    expect(renderItems[0]?.messages.map((message) => message.id)).toEqual(["file-1", "file-2"]);
    expect(renderItems[0]?.captionMessage?.id).toBe("caption-2");
  });

  it("stops grouping when the previous attachment already has a caption", () => {
    const firstMessage = buildMessage({
      id: "file-1",
      created_at: "2026-03-20T10:00:00.000Z",
    });
    const secondMessage = buildMessage({
      id: "file-2",
      message: "documents/channel/notes.docx",
      file_name: "Notes.docx",
      file_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_storage_path: "documents/channel/notes.docx",
      created_at: "2026-03-20T10:00:10.000Z",
    });
    const firstCaptionMessage = buildMessage({
      id: "caption-1",
      message: "Caption pertama",
      message_type: "text",
      file_name: undefined,
      file_kind: undefined,
      file_mime_type: undefined,
      file_storage_path: undefined,
      reply_to_id: "file-1",
      message_relation_kind: "attachment_caption",
    });

    const renderItems = buildMessageRenderItems({
      messages: [firstMessage, secondMessage],
      captionMessagesByAttachmentId: new Map([["file-1", firstCaptionMessage]]),
      getAttachmentFileKind: () => "document",
      enableImageBubbleGrouping: true,
      enableDocumentBubbleGrouping: true,
    });

    expect(renderItems).toHaveLength(2);
    expect(renderItems[0]?.kind).toBe("message");
    expect(renderItems[1]?.kind).toBe("message");
  });
});
