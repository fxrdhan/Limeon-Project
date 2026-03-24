import { useCallback, useRef, useState } from 'react';

export const useChatSidebarRefs = () => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
  const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
  const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollMessagesToBottomRef = useRef<() => void>(() => {});

  const closeMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);

  const scheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollMessagesToBottomRef.current();
  }, []);

  const handleToggleExpand = useCallback((messageId: string) => {
    setExpandedMessageIds(previousIds => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(messageId)) {
        nextIds.delete(messageId);
      } else {
        nextIds.add(messageId);
      }
      return nextIds;
    });
  }, []);

  return {
    expandedMessageIds,
    messageInputRef,
    messagesEndRef,
    messagesContainerRef,
    messagesContentRef,
    composerContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    closeMessageMenuRef,
    scheduleScrollMessagesToBottomRef,
    closeMessageMenu,
    scheduleScrollMessagesToBottom,
    handleToggleExpand,
  };
};
