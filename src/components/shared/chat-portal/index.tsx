import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiSendPlaneFill } from 'react-icons/ri';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface ChatPortalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    name: string;
    email: string;
    profilephoto?: string | null;
  };
}

// Mockup chat data for 1-1 conversation
const getMockMessages = (targetUser?: {
  name: string;
  id: string;
}): ChatMessage[] => [
  {
    id: '1',
    userId: targetUser?.id || 'target_user',
    userName: targetUser?.name || 'User',
    message: 'Hi there! How are you doing?',
    timestamp: '07:10 AM',
  },
  {
    id: '2',
    userId: 'current_user',
    userName: 'You',
    message: "Hey! I'm doing great, thanks for asking. How about you?",
    timestamp: '07:11 AM',
  },
  {
    id: '3',
    userId: targetUser?.id || 'target_user',
    userName: targetUser?.name || 'User',
    message: 'Pretty good! Just working on some projects.',
    timestamp: '07:12 AM',
  },
];

const ChatPortal = memo(({ isOpen, onClose, targetUser }: ChatPortalProps) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: Send message functionality
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'top right' }}
          className="relative z-50 min-w-80 bg-white rounded-xl shadow-lg border border-gray-200"
        >
          {/* Chat Content */}
          <div className="relative h-96 flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {targetUser ? targetUser.name : 'Chat'}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {getMockMessages(targetUser).map(msg => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {msg.userName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700">
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyUp={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-full px-3 text-sm h-[2.5rem] focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200 transition-all duration-200 ease-in-out"
                />
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${message.trim() ? 'w-10 ml-2' : 'w-0 ml-0'}`}
                >
                  <button
                    onClick={handleSendMessage}
                    className="p-1 transition-colors whitespace-nowrap"
                  >
                    <RiSendPlaneFill
                      size={28}
                      className="text-emerald-600 hover:text-primary"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ChatPortal.displayName = 'ChatPortal';

export default ChatPortal;
