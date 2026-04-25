import type { ChatTargetUser } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";

const ChatSidebarPanel = lazy(() => import("@/features/chat-sidebar"));
const ContactListPanel = lazy(() => import("@/features/chat-sidebar/components/ContactListPanel"));

const panelVariants = {
  enter: (direction: number) => ({
    x: `${direction * 100}%`,
    opacity: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: `${direction * -100}%`,
    opacity: 0.98,
  }),
};

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatTargetUser;
}

const ChatSidebar = ({ isOpen, onClose, targetUser }: ChatSidebarProps) => {
  const [persistedTargetUser, setPersistedTargetUser] = useState<ChatTargetUser | undefined>(
    targetUser,
  );
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 420;
    }

    return window.innerWidth < 768 ? window.innerWidth : 420;
  });

  useEffect(() => {
    if (!targetUser) return;
    setPersistedTargetUser(targetUser);
  }, [targetUser]);

  useEffect(() => {
    if (isOpen && !targetUser) {
      setPersistedTargetUser(undefined);
    }
  }, [isOpen, targetUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateSidebarWidth = () => {
      setSidebarWidth(window.innerWidth < 768 ? window.innerWidth : 420);
    };

    updateSidebarWidth();
    window.addEventListener("resize", updateSidebarWidth);

    return () => {
      window.removeEventListener("resize", updateSidebarWidth);
    };
  }, []);

  const activeTargetUser = isOpen ? targetUser : persistedTargetUser;
  const shouldRenderPanel = isOpen || Boolean(activeTargetUser);
  const panelDirection = activeTargetUser ? 1 : -1;
  const panelKey = activeTargetUser ? `chat:${activeTargetUser.id}` : "contacts";
  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== "width" || isOpen) {
        return;
      }

      setPersistedTargetUser(undefined);
    },
    [isOpen],
  );

  return (
    <aside
      aria-hidden={!isOpen}
      style={{
        width: isOpen ? sidebarWidth : 0,
        opacity: isOpen ? 1 : 0,
        maxWidth: "100vw",
      }}
      onTransitionEnd={handleTransitionEnd}
      className={`h-full overflow-hidden transition-[width,opacity] duration-200 ease-out ${
        isOpen
          ? "border-l border-slate-200 bg-slate-100"
          : "pointer-events-none border-l border-transparent bg-transparent"
      }`}
    >
      {shouldRenderPanel ? (
        <div className="relative h-full w-full overflow-hidden">
          <AnimatePresence initial={false} custom={panelDirection}>
            <motion.div
              key={panelKey}
              custom={panelDirection}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0 h-full w-full"
            >
              {activeTargetUser ? (
                <Suspense fallback={null}>
                  <ChatSidebarPanel
                    isOpen={isOpen}
                    onClose={onClose}
                    targetUser={activeTargetUser}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={null}>
                  <ContactListPanel onClose={onClose} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}
    </aside>
  );
};

export default ChatSidebar;
