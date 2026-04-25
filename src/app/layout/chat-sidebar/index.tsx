import type { ChatTargetUser } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";

const ChatSidebarPanel = lazy(() => import("@/features/chat-sidebar"));
const ContactListPanel = lazy(() => import("@/features/chat-sidebar/components/ContactListPanel"));

const panelVariants: Variants = {
  enter: (direction: number) => ({
    x: direction < 0 ? "0%" : "100%",
    filter: "brightness(1)",
    opacity: 1,
    zIndex: direction < 0 ? 10 : 20,
  }),
  center: {
    x: "0%",
    filter: "brightness(1)",
    opacity: 1,
    zIndex: 20,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "0%",
    filter: "brightness(0.78)",
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
    zIndex: direction < 0 ? 30 : 10,
  }),
};

const panelTransition = {
  duration: 0.5,
  ease: "easeInOut",
} as const;

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
      className={`h-full overflow-hidden transition-[width,opacity] duration-500 ease-in-out ${
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
              transition={panelTransition}
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
