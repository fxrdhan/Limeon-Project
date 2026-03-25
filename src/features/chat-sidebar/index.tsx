import { motion } from 'motion/react';
import { memo } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import ChatHeader from './components/ChatHeader';
import ComposerPanel from './components/ComposerPanel';
import MessagesPane from './components/MessagesPane';
import MessageForwardPicker from './components/messages/MessageForwardPicker';
import { CHAT_SIDEBAR_TOASTER_ID } from './constants';
import { useChatSidebarRefs } from './hooks/useChatSidebarRefs';
import { useChatSidebarRuntimeState } from './hooks/useChatSidebarRuntimeState';
import { useTargetProfilePhoto } from './hooks/useTargetProfilePhoto';
import type { ChatSidebarPanelProps } from './types';
import { computeDmChannelId } from './utils/channel';

const ChatSidebarPanel = memo(
  ({ isOpen, onClose, targetUser }: ChatSidebarPanelProps) => {
    const { user } = useAuthStore();
    const refs = useChatSidebarRefs();
    /* c8 ignore next */
    const currentChannelId =
      user && targetUser ? computeDmChannelId(user.id, targetUser.id) : null;
    const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
    const runtime = useChatSidebarRuntimeState({
      isOpen,
      onClose,
      targetUser,
      user,
      currentChannelId,
      refs,
      displayTargetPhotoUrl,
    });

    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`relative h-full w-full select-none ${
          isOpen ? 'bg-slate-100' : 'pointer-events-none bg-slate-100'
        }`}
        onClickCapture={runtime.viewport.handleChatPortalBackgroundClick}
      >
        <Toaster
          toasterId={CHAT_SIDEBAR_TOASTER_ID}
          position="top-right"
          containerStyle={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
          toastOptions={{
            style: {
              boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(226, 232, 240, 1)',
              color: '#0f172a',
            },
            success: {
              style: {
                backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.9)',
                color: 'white',
                border: '1px solid oklch(26.2% 0.051 172.552 / 0.3)',
              },
            },
            error: {
              style: {
                backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.9)',
                color: 'white',
                border: '1px solid oklch(27.1% 0.105 12.094 / 0.3)',
              },
            },
          }}
        />

        <div className="relative h-full flex flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-white via-white/92 via-white/72 to-transparent transition-opacity duration-300 ease-in-out ${
                runtime.viewport.isAtTop ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <div
              ref={runtime.refs.chatHeaderContainerRef}
              className="pointer-events-auto relative z-10"
            >
              <ChatHeader runtime={runtime} />
            </div>
          </div>

          <div className="min-h-0 flex flex-1 flex-col">
            <MessagesPane runtime={runtime} />
          </div>

          <ComposerPanel runtime={runtime} />
          <MessageForwardPicker runtime={runtime} />
        </div>
      </motion.div>
    );
  }
);

ChatSidebarPanel.displayName = 'ChatSidebarPanel';

export default ChatSidebarPanel;
