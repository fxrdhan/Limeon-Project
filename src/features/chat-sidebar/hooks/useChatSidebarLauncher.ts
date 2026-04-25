import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatSidebarStore } from "@/store/chatSidebarStore";
import type { ChatTargetUser } from "@/types";
import { chatSidebarMessagesGateway } from "../data/chatSidebarGateway";
import { CHAT_CONVERSATION_PAGE_SIZE } from "../constants";
import { useChatDirectoryRoster } from "./useChatDirectoryRoster";
import { chatRuntimeCache } from "../utils/chatRuntimeCache";
import { mapConversationMessagesForDisplay } from "../utils/message-display";
import { computeDmChannelId } from "../utils/channel";

const pendingConversationPrefetches = new Map<string, Promise<void>>();

export const useChatSidebarLauncher = (shouldLoadDirectory = false) => {
  const { user } = useAuthStore();
  const openContactList = useChatSidebarStore((state) => state.openContactList);
  const openChat = useChatSidebarStore((state) => state.openChat);
  const directoryRoster = useChatDirectoryRoster(shouldLoadDirectory);

  const openContactListSidebar = useCallback(() => {
    openContactList();
  }, [openContactList]);

  const openChatForUser = useCallback(
    (targetUser: ChatTargetUser) => {
      openChat(targetUser);
    },
    [openChat],
  );

  const prefetchConversationForUser = useCallback(
    async (targetUser: ChatTargetUser) => {
      const currentUserId = user?.id?.trim() || "";
      const targetUserId = targetUser.id.trim();
      if (!currentUserId || !targetUserId) {
        return;
      }

      const channelId = computeDmChannelId(currentUserId, targetUserId);
      if (chatRuntimeCache.conversation.getFreshEntry(channelId)) {
        return;
      }

      const pendingPrefetch = pendingConversationPrefetches.get(channelId);
      if (pendingPrefetch) {
        await pendingPrefetch;
        return;
      }

      const nextPrefetch = (async () => {
        const { data, error } = await chatSidebarMessagesGateway.fetchConversationMessages(
          targetUserId,
          {
            limit: CHAT_CONVERSATION_PAGE_SIZE,
          },
        );

        if (error || !data) {
          return;
        }

        chatRuntimeCache.conversation.setEntry(
          channelId,
          mapConversationMessagesForDisplay(data.messages, {
            currentUserId,
            currentUserName: user?.name || "You",
            targetUserName: targetUser.name || "Unknown",
          }),
          data.hasMore,
        );
      })();

      pendingConversationPrefetches.set(channelId, nextPrefetch);

      try {
        await nextPrefetch;
      } finally {
        if (pendingConversationPrefetches.get(channelId) === nextPrefetch) {
          pendingConversationPrefetches.delete(channelId);
        }
      }
    },
    [user?.id, user?.name],
  );

  return {
    ...directoryRoster,
    openContactList: openContactListSidebar,
    openChatForUser,
    prefetchConversationForUser,
  };
};
