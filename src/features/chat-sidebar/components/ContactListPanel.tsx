import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { TbBellOff, TbLayoutSidebarRightCollapse, TbSearch } from "react-icons/tb";
import { useAuthStore } from "@/store/authStore";
import { getInitials, getInitialsColor } from "@/utils/avatar";
import { useChatSidebarLauncher } from "../hooks/useChatSidebarLauncher";

interface ContactListPanelProps {
  onClose: () => void;
}

const ContactListPanel = ({ onClose }: ContactListPanelProps) => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex h-full w-full flex-col bg-white"
    >
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 pb-3">
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

        <div className="mt-3 flex h-10 items-center gap-2 rounded-full bg-slate-100 px-3 text-slate-500">
          <TbSearch className="size-4 shrink-0" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white py-2">
        {isDirectoryLoading && portalOrderedUsers.length === 0 ? (
          <div className="mx-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            Memuat daftar pengguna...
          </div>
        ) : null}

        {directoryError ? (
          <div className="mx-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
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
          <div className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada kontak</div>
        ) : null}

        {filteredContacts.map((portalUser) => {
          const isOnline = onlineUserIds.has(portalUser.id);
          const isCurrentUser = portalUser.id === user?.id;
          const previewText = isCurrentUser
            ? portalUser.email
            : isOnline
              ? "Available now"
              : portalUser.email;
          const metaText = isCurrentUser ? "You" : isOnline ? "Now" : "";

          return (
            <button
              key={portalUser.id}
              type="button"
              className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                isCurrentUser ? "cursor-default bg-slate-50" : "cursor-pointer hover:bg-slate-50"
              }`}
              onMouseEnter={() => {
                if (!isCurrentUser) {
                  void prefetchConversationForUser(portalUser);
                }
              }}
              onFocus={() => {
                if (!isCurrentUser) {
                  void prefetchConversationForUser(portalUser);
                }
              }}
              onClick={!isCurrentUser ? () => openChatForUser(portalUser) : undefined}
              disabled={isCurrentUser}
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
                {isOnline ? (
                  <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-emerald-500" />
                ) : null}
              </motion.div>

              <div className="min-w-0 flex-1 border-b border-slate-100 py-0.5 group-last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px] font-medium text-slate-950">
                    {portalUser.name}
                  </p>
                  {metaText ? (
                    <span
                      className={`shrink-0 text-xs ${
                        isOnline && !isCurrentUser ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {metaText}
                    </span>
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
          );
        })}

        {hasMoreDirectoryUsers && !directoryError && !normalizedSearchQuery ? (
          <button
            type="button"
            onClick={loadMoreDirectoryUsers}
            disabled={isDirectoryLoading}
            className="mx-4 mt-2 w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
          >
            {isDirectoryLoading ? "Memuat pengguna..." : "Muat lebih banyak"}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
};

export default ContactListPanel;
