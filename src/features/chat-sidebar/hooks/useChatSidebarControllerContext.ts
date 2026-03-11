import {
  createElement,
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import type { useChatSidebarController } from './useChatSidebarController';

type ChatSidebarControllerValue = ReturnType<typeof useChatSidebarController>;

const ChatSidebarControllerContext =
  createContext<ChatSidebarControllerValue | null>(null);

export const ChatSidebarControllerProvider = ({
  value,
  children,
}: PropsWithChildren<{
  value: ChatSidebarControllerValue;
}>) =>
  createElement(
    ChatSidebarControllerContext.Provider,
    {
      value,
    },
    children
  );

export const useChatSidebarControllerContext = () => {
  const context = useContext(ChatSidebarControllerContext);
  if (!context) {
    throw new Error(
      'useChatSidebarControllerContext must be used within ChatSidebarControllerProvider'
    );
  }

  return context;
};

export type { ChatSidebarControllerValue };
