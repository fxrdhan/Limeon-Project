/**
 * Chat Testing Button Component
 *
 * A floating action button that opens the chat portal for UI testing purposes.
 * Provides easy access to test the chat bubble functionality with auto-replies.
 */

import { useState } from 'react';
import { FaComments } from 'react-icons/fa';
import ChatPortal from '@/components/shared/chat-portal';

/**
 * Props for ChatTestingButton component
 */
export interface ChatTestingButtonProps {
  /** Whether the button should be visible and enabled */
  enabled?: boolean;
  /** Custom target user for the chat (optional) */
  targetUser?: {
    id: string;
    name: string;
    email: string;
    profilephoto?: string | null;
  };
}

/**
 * Floating button component for chat testing
 */
export function ChatTestingButton({
  enabled = true,
  targetUser = {
    id: 'test_user',
    name: 'Test Bot',
    email: 'test@example.com',
  },
}: ChatTestingButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Don't render if not enabled
  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 left-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 z-40"
        title="Test Chat"
      >
        <FaComments className="w-5 h-5" />
      </button>

      {/* Chat Portal */}
      {isChatOpen && (
        <div className="fixed bottom-20 left-6 z-50">
          <ChatPortal
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            targetUser={targetUser}
          />
        </div>
      )}
    </>
  );
}
