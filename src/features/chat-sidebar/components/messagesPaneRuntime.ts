import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';

export type MessagesPaneRuntime = Pick<
  ChatSidebarRuntimeState,
  | 'user'
  | 'session'
  | 'interaction'
  | 'composer'
  | 'viewport'
  | 'refs'
  | 'previews'
  | 'mutations'
  | 'actions'
>;
