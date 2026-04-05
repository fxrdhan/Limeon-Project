import { usePresence } from '@/hooks/presence/usePresence';
import { useChatRuntime } from './hooks/useChatRuntime';

const ChatRuntimeHost = () => {
  usePresence();
  useChatRuntime();

  return null;
};

export default ChatRuntimeHost;
