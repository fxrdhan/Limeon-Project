import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { TbBellOff, TbLayoutSidebarRightCollapse, TbSearch } from "react-icons/tb";
import { AnimatedMenuHighlight } from "@/components/shared/animated-menu-highlight";
import { useAnimatedMenuHighlight } from "@/components/shared/use-animated-menu-highlight";
import { useAuthStore } from "@/store/authStore";
import { getInitials, getInitialsColor } from "@/utils/avatar";
import { useChatSidebarLauncher } from "../hooks/useChatSidebarLauncher";

interface ContactListPanelProps {
  onClose: () => void;
}

const formatContactMessageTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const now = new Date();
  const elapsedMs = now.getTime() - date.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (elapsedMs >= 0 && elapsedMs < oneDayMs) {
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((startOfToday.getTime() - startOfMessageDate.getTime()) / oneDayMs);

  if (dayDiff === 1) {
    return "Kemarin";
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ContactListPanel = ({ onClose }: ContactListPanelProps) => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
  const {
    onlineUserIds,
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
    openChatForUser,
    prefetchConversationForUser,
  } = useChatSidebarLauncher(true);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("id-ID");
  const filteredContacts = useMemo(() => {
    if (!normalizedSearchQuery) {
      return portalOrderedUsers;
    }

    return portalOrderedUsers.filter((portalUser) => {
      const searchableText = `${portalUser.name} ${portalUser.email}`.toLocaleLowerCase("id-ID");
      return searchableText.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, portalOrderedUsers]);
  const fallbackActiveContactId =
    user?.id && filteredContacts.some((portalUser) => portalUser.id === user.id) ? user.id : null;
  const highlightedContactId = hoveredContactId ?? fallbackActiveContactId;
  const highlightedContactIndex = highlightedContactId
    ? filteredContacts.findIndex((portalUser) => portalUser.id === highlightedContactId)
    : -1;
  const { highlightFrame, setItemRef } = useAnimatedMenuHighlight<HTMLButtonElement>(
    highlightedContactIndex === -1 ? null : highlightedContactIndex,
  );
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex h-full w-full flex-col bg-white"
    >
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Chats</h2>
          <button
            type="button"
            aria-label="Tutup sidebar kontak"
            className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
          >
            <TbLayoutSidebarRightCollapse className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-transparent px-3 text-slate-500 transition-[border-color,box-shadow] focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100">
          <TbSearch className="size-4 shrink-0" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto bg-white pt-3 pb-2"
        onMouseLeave={() => {
          setHoveredContactId(null);
        }}
      >
        <AnimatedMenuHighlight
          className="left-3 right-3 !rounded-2xl bg-slate-100"
          frame={highlightFrame}
        />

        {isDirectoryLoading && portalOrderedUsers.length === 0 ? (
          <div className="relative z-10 mx-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            Memuat daftar pengguna...
          </div>
        ) : null}

        {directoryError ? (
          <div className="relative z-10 mx-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <span>{directoryError}</span>
            <button
              type="button"
              onClick={retryLoadDirectory}
              className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              Coba lagi
            </button>
          </div>
        ) : null}

        {filteredContacts.length === 0 && !isDirectoryLoading ? (
          <div className="relative z-10 px-4 py-8 text-center text-sm text-slate-500">
            Tidak ada kontak
          </div>
        ) : null}

        {filteredContacts.map((portalUser, contactIndex) => {
          const isOnline = onlineUserIds.has(portalUser.id);
          const isCurrentUser = portalUser.id === user?.id;
          const displayName = isCurrentUser ? `${portalUser.name} (You)` : portalUser.name;
          const previewText = portalUser.last_message?.trim() || portalUser.email;
          const messageTime = formatContactMessageTime(portalUser.last_message_created_at);

          return (
            <div key={portalUser.id} className="px-3">
              <button
                ref={(element) => {
                  setItemRef(contactIndex, element);
                }}
                type="button"
                className="group relative z-10 flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-transparent px-3 py-3 text-left"
                onMouseEnter={() => {
                  setHoveredContactId(portalUser.id);
                  void prefetchConversationForUser(portalUser);
                }}
                onFocus={() => {
                  setHoveredContactId(portalUser.id);
                  void prefetchConversationForUser(portalUser);
                }}
                onBlur={() => {
                  setHoveredContactId(null);
                }}
                onClick={() => openChatForUser(portalUser)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative size-12 shrink-0 overflow-hidden rounded-full bg-slate-100"
                >
                  {portalUser.profilephoto_thumb || portalUser.profilephoto ? (
                    <img
                      src={portalUser.profilephoto_thumb || portalUser.profilephoto || ""}
                      alt={portalUser.name}
                      className={`h-full w-full object-cover ${isOnline ? "" : "grayscale"}`}
                      draggable={false}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center text-base font-medium text-white ${getInitialsColor(portalUser.id)}`}
                    >
                      {getInitials(portalUser.name)}
                    </div>
                  )}
                </motion.div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <p className="min-w-0 truncate text-[15px] font-medium text-slate-950">
                        {displayName}
                      </p>
                      {isOnline ? (
                        <span
                          className="size-2 shrink-0 rounded-full bg-emerald-500"
                          aria-label="Online"
                        />
                      ) : null}
                    </div>
                    {messageTime ? (
                      <span className="shrink-0 text-xs text-slate-500">{messageTime}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm text-slate-500">{previewText}</p>
                    {!isOnline && !isCurrentUser ? (
                      <TbBellOff className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    ) : null}
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        {hasMoreDirectoryUsers && !directoryError && !normalizedSearchQuery ? (
          <button
            type="button"
            onClick={loadMoreDirectoryUsers}
            disabled={isDirectoryLoading}
            className="relative z-10 mx-4 mt-2 w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
          >
            {isDirectoryLoading ? "Memuat pengguna..." : "Muat lebih banyak"}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
};

export default ContactListPanel;
