import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import type { ChatMessage } from "../data/chatSidebarGateway";
import { useChatBulkDelete } from "../hooks/useChatBulkDelete";

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? "message-1",
  sender_id: overrides.sender_id ?? "user-b",
  receiver_id: overrides.receiver_id ?? "user-a",
  channel_id: overrides.channel_id ?? "channel-1",
  message: overrides.message ?? "pesan masuk",
  message_type: overrides.message_type ?? "text",
  created_at: overrides.created_at ?? "2026-03-06T09:30:00.000Z",
  updated_at: overrides.updated_at ?? "2026-03-06T09:30:00.000Z",
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  message_relation_kind: overrides.message_relation_kind ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe("useChatBulkDelete", () => {
  it("passes selected incoming messages to the delete mutation", async () => {
    const incomingMessage = buildMessage({
      id: "incoming-1",
      sender_id: "user-b",
      receiver_id: "user-a",
    });
    const deleteMessages = vi.fn().mockResolvedValue({
      deletedTargetMessageIds: ["incoming-1"],
      failedTargetMessageIds: [],
      cleanupWarningTargetMessageIds: [],
    });

    const { result } = renderHook(() => {
      const [selectedMessageIds, setSelectedMessageIds] = useState(() => new Set(["incoming-1"]));
      const handleBulkDelete = useChatBulkDelete({
        user: { id: "user-a" },
        selectedVisibleMessages: [incomingMessage],
        setSelectedMessageIds,
        deleteMessages,
      });

      return {
        handleBulkDelete,
        selectedMessageIds,
      };
    });

    await act(async () => {
      await result.current.handleBulkDelete();
    });

    expect(deleteMessages).toHaveBeenCalledWith([incomingMessage], {
      suppressErrorToast: true,
    });
    expect([...result.current.selectedMessageIds]).toEqual([]);
  });
});
