import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";
import { TbMessageDots } from "react-icons/tb";
import { useAuthStore } from "@/store/authStore";
import { useChatSidebarLauncher } from "@/features/chat-sidebar/hooks/useChatSidebarLauncher";
import { getInitials, getInitialsColor } from "@/utils/avatar";
import UserPresenceAvatar from "@/components/shared/user-presence-avatar";

interface OnlineUsersPortalProps {
  portalContainerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

const OnlineUsersPortal = ({ portalContainerRef, children }: OnlineUsersPortalProps) => {
  const isPresent = useIsPresent();

  return (
    <div
      ref={portalContainerRef}
      role="dialog"
      aria-label="Daftar pengguna online"
      className="absolute top-full left-1/2 z-50 mt-2 min-w-64 -translate-x-1/2 transform"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
      >
        <div className="space-y-1">{children}</div>
      </motion.div>
    </div>
  );
};

const OnlineUsersControl = () => {
  const { user } = useAuthStore();
  const [showPortal, setShowPortal] = useState(false);
  const {
    displayOnlineUsers,
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
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const portalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  const openPortal = useCallback(() => {
    setShowPortal(true);
  }, []);

  const closePortal = useCallback(() => {
    setShowPortal(false);
    setHoveredUser(null);
  }, []);

  const handlePortalTriggerClick = useCallback(() => {
    if (showPortal) {
      closePortal();
      return;
    }

    openPortal();
  }, [closePortal, openPortal, showPortal]);

  const handleChatOpen = useCallback(
    (targetUser: Parameters<typeof openChatForUser>[0]) => {
      closePortal();
      openChatForUser(targetUser);
    },
    [closePortal, openChatForUser],
  );

  useEffect(() => {
    if (!showPortal) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) return;
      if (portalTriggerRef.current?.contains(eventTarget)) return;
      if (portalContainerRef.current?.contains(eventTarget)) return;
      closePortal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePortal();
        portalTriggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePortal, showPortal]);

  return (
    <div className="relative">
      <button
        ref={portalTriggerRef}
        type="button"
        aria-label="Buka daftar pengguna online"
        aria-expanded={showPortal}
        aria-haspopup="dialog"
        className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-50"
        onClick={handlePortalTriggerClick}
      >
        <UserPresenceAvatar
          users={portalOrderedUsers}
          maxVisible={4}
          size="md"
          showPortal={showPortal}
          onlineUserIds={onlineUserIds}
        />

        <div className="flex items-center text-sm text-slate-600">
          <span className="font-medium">{displayOnlineUsers} Online</span>
        </div>
      </button>

      <AnimatePresence>
        {showPortal ? (
          <OnlineUsersPortal portalContainerRef={portalContainerRef}>
            {isDirectoryLoading && portalOrderedUsers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Memuat daftar pengguna...
              </div>
            ) : null}
            {directoryError ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
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
            {portalOrderedUsers.map((portalUser) => {
              const isOnline = onlineUserIds.has(portalUser.id);

              return (
                <div
                  key={portalUser.id}
                  className={`relative mx-0 w-full rounded-xl px-4 py-3 transition-colors ${
                    portalUser.id !== user?.id
                      ? "cursor-pointer hover:bg-emerald-50"
                      : "cursor-default hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => {
                    setHoveredUser(portalUser.id);
                    void prefetchConversationForUser(portalUser);
                  }}
                  onMouseLeave={() => setHoveredUser(null)}
                  onFocus={() => {
                    setHoveredUser(portalUser.id);
                    void prefetchConversationForUser(portalUser);
                  }}
                  onBlur={() => setHoveredUser(null)}
                  onClick={
                    portalUser.id !== user?.id ? () => handleChatOpen(portalUser) : undefined
                  }
                  onKeyDown={(event) => {
                    if (
                      portalUser.id !== user?.id &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      handleChatOpen(portalUser);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative flex items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: isOnline ? 1 : 0.5,
                        scale: 1.25,
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                      }}
                      className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-sm ${isOnline ? "" : "opacity-50"}`}
                      title={`${portalUser.name} - ${isOnline ? "Online" : "Offline"}`}
                    >
                      {portalUser.profilephoto_thumb || portalUser.profilephoto ? (
                        <img
                          src={portalUser.profilephoto_thumb || portalUser.profilephoto || ""}
                          alt={portalUser.name}
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center text-sm font-medium text-white ${getInitialsColor(portalUser.id)}`}
                        >
                          {getInitials(portalUser.name)}
                        </div>
                      )}
                    </motion.div>

                    <motion.div
                      className="ml-3 w-36 min-w-0 overflow-hidden"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {portalUser.name}
                        </p>
                        {portalUser.id === user?.id ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="h-px w-3 translate-y-0.5 bg-slate-400"></span>
                            <span className="font-medium text-primary">You</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-slate-500">{portalUser.email}</p>
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {portalUser.id !== user?.id && hoveredUser === portalUser.id ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          duration: 0.15,
                          ease: "easeOut",
                        }}
                        className="absolute top-3 right-3 text-emerald-600"
                        title="Click to chat with this user"
                      >
                        <TbMessageDots size={18} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
            {hasMoreDirectoryUsers && !directoryError ? (
              <button
                type="button"
                onClick={loadMoreDirectoryUsers}
                disabled={isDirectoryLoading}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
              >
                {isDirectoryLoading ? "Memuat pengguna..." : "Muat lebih banyak"}
              </button>
            ) : null}
          </OnlineUsersPortal>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default OnlineUsersControl;
