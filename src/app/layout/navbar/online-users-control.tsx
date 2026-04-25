import { AnimatePresence, motion } from "motion/react";
import { TbLayoutSidebarLeftCollapse } from "react-icons/tb";
import { useChatSidebarLauncher } from "@/features/chat-sidebar/hooks/useChatSidebarLauncher";
import { useChatSidebarStore } from "@/store/chatSidebarStore";
import UserPresenceAvatar from "@/components/shared/user-presence-avatar";

const OnlineUsersControl = () => {
  const isChatSidebarOpen = useChatSidebarStore((state) => state.isOpen);
  const { onlineUserIds, portalOrderedUsers, openContactList } = useChatSidebarLauncher(true);

  return (
    <button
      type="button"
      aria-label="Buka daftar kontak"
      className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-50"
      onClick={openContactList}
    >
      <UserPresenceAvatar
        users={portalOrderedUsers}
        maxVisible={4}
        size="md"
        onlineUserIds={onlineUserIds}
      />

      <AnimatePresence initial={false}>
        {!isChatSidebarOpen ? (
          <motion.span
            key="contact-list-trigger-icon"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 20 }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex h-5 shrink-0 items-center justify-center overflow-hidden text-slate-600"
          >
            <TbLayoutSidebarLeftCollapse className="size-5" aria-hidden="true" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
};

export default OnlineUsersControl;
