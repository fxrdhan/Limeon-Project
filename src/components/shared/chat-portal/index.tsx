import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane } from 'react-icons/fa';

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
}

// Mockup chat data
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Harmony',
    message: 'Where are you Dylan?',
    timestamp: '07:13 AM',
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Dylan',
    message: 'At the Supabase Meetup - just getting coffee',
    timestamp: '07:13 AM',
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Mark S',
    message: "I'm there too!",
    timestamp: '07:13 AM',
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'Indio',
    message: 'hai',
    timestamp: '07:01 AM',
  },
  {
    id: '5',
    userId: 'user5',
    userName: 'Orion',
    message: 'hello',
    timestamp: '07:01 AM',
  },
  {
    id: '6',
    userId: 'user4',
    userName: 'Indio',
    message: 'can you',
    timestamp: '07:01 AM',
  },
];

const ChatPortal = memo(({ isOpen, onClose }: ChatPortalProps) => {
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ transformOrigin: 'top right' }}
          className="relative z-50 min-w-80 bg-white rounded-xl shadow-lg border border-gray-200"
        >
          {/* Chat Content */}
          <div className="relative h-96 flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Team Chat</h3>
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
              {mockMessages.map(msg => (
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaPaperPlane size={16} />
                </button>
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
