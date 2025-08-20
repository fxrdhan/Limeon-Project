import { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiSendPlaneFill } from 'react-icons/ri';
import { useAuthStore } from '@/store/authStore';

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

// Lorem ipsum generator for auto-replies
const loremWords = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
];

const generateLoremIpsum = (minWords = 3, maxWords = 15): string => {
  const wordCount =
    Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  const selectedWords = [];

  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * loremWords.length);
    selectedWords.push(loremWords[randomIndex]);
  }

  // Capitalize first word
  selectedWords[0] =
    selectedWords[0].charAt(0).toUpperCase() + selectedWords[0].slice(1);

  return selectedWords.join(' ') + '.';
};

// Initial messages for the chat
const getInitialMessages = (targetUser?: {
  name: string;
  id: string;
}): ChatMessage[] => [
  {
    id: '1',
    userId: targetUser?.id || 'target_user',
    userName: targetUser?.name || 'User',
    message: 'Hi there! Ready to test the chat?',
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  },
];

const ChatPortal = memo(({ isOpen, onClose, targetUser }: ChatPortalProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuthStore();

  // Initialize messages when component mounts or targetUser changes
  useEffect(() => {
    setMessages(getInitialMessages(targetUser));
  }, [targetUser]);

  // Helper functions for avatar display
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getInitialsColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-gray-500',
    ];

    const index = userId
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: 'current_user',
        userName: 'You',
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Add user message
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Auto-reply with lorem ipsum after a short delay
      setTimeout(
        () => {
          const replyMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            userId: targetUser?.id || 'target_user',
            userName: targetUser?.name || 'User',
            message: generateLoremIpsum(),
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          setMessages(prev => [...prev, replyMessage]);
        },
        800 + Math.random() * 1200
      ); // Random delay between 800ms - 2s
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
              {messages.map(msg => {
                const isCurrentUser = msg.userId === 'current_user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs ${isCurrentUser ? 'order-2' : 'order-1'}`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`relative px-3 py-2 text-sm ${
                          isCurrentUser
                            ? 'bg-primary text-gray-100 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl'
                            : 'bg-gray-100 text-gray-800 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                        }`}
                        style={{
                          [isCurrentUser
                            ? 'borderBottomRightRadius'
                            : 'borderBottomLeftRadius']: '2px',
                        }}
                      >
                        {msg.message}
                      </div>

                      {/* Message Info */}
                      <div
                        className={`flex items-center gap-2 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {isCurrentUser ? (
                          <>
                            <span className="text-xs text-gray-400">
                              {msg.timestamp}
                            </span>
                            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                              {user?.profilephoto ? (
                                <img
                                  src={user.profilephoto}
                                  alt={user.name || 'You'}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(user?.id || 'current_user')}`}
                                >
                                  {getInitials(user?.name || 'You')}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                              {targetUser?.profilephoto ? (
                                <img
                                  src={targetUser.profilephoto}
                                  alt={targetUser.name}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(targetUser?.id || 'target_user')}`}
                                >
                                  {getInitials(targetUser?.name || 'User')}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              {msg.timestamp}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
