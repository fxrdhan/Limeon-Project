import { useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';

interface UseStableMessageActionHandlersProps {
  onToggleMessageSelection: (messageId: string) => void;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
  handleToggleExpand: (messageId: string) => void;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
}

export const useStableMessageActionHandlers = ({
  onToggleMessageSelection,
  toggleMessageMenu,
  handleToggleExpand,
  handleEditMessage,
  handleCopyMessage,
  handleDownloadMessage,
  handleDeleteMessage,
  getAttachmentFileName,
  getAttachmentFileKind,
}: UseStableMessageActionHandlersProps) => {
  const messageActionHandlersRef = useRef({
    onToggleMessageSelection,
    toggleMessageMenu,
    handleToggleExpand,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDeleteMessage,
    getAttachmentFileName,
    getAttachmentFileKind,
  });

  useEffect(() => {
    messageActionHandlersRef.current = {
      onToggleMessageSelection,
      toggleMessageMenu,
      handleToggleExpand,
      handleEditMessage,
      handleCopyMessage,
      handleDownloadMessage,
      handleDeleteMessage,
      getAttachmentFileName,
      getAttachmentFileKind,
    };
  }, [
    getAttachmentFileKind,
    getAttachmentFileName,
    handleCopyMessage,
    handleDeleteMessage,
    handleDownloadMessage,
    handleEditMessage,
    handleToggleExpand,
    onToggleMessageSelection,
    toggleMessageMenu,
  ]);

  const handleToggleMessageSelectionStable = useCallback(
    (messageId: string) => {
      messageActionHandlersRef.current.onToggleMessageSelection(messageId);
    },
    []
  );

  const toggleMessageMenuStable = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      messageActionHandlersRef.current.toggleMessageMenu(
        anchor,
        messageId,
        preferredSide
      );
    },
    []
  );

  const handleToggleExpandStable = useCallback((messageId: string) => {
    messageActionHandlersRef.current.handleToggleExpand(messageId);
  }, []);

  const handleEditMessageStable = useCallback((targetMessage: ChatMessage) => {
    messageActionHandlersRef.current.handleEditMessage(targetMessage);
  }, []);

  const handleCopyMessageStable = useCallback(
    async (targetMessage: ChatMessage) => {
      await messageActionHandlersRef.current.handleCopyMessage(targetMessage);
    },
    []
  );

  const handleDownloadMessageStable = useCallback(
    async (targetMessage: ChatMessage) => {
      await messageActionHandlersRef.current.handleDownloadMessage(
        targetMessage
      );
    },
    []
  );

  const handleDeleteMessageStable = useCallback(
    async (targetMessage: ChatMessage) =>
      messageActionHandlersRef.current.handleDeleteMessage(targetMessage),
    []
  );

  const getAttachmentFileNameStable = useCallback(
    (targetMessage: ChatMessage) =>
      messageActionHandlersRef.current.getAttachmentFileName(targetMessage),
    []
  );

  const getAttachmentFileKindStable = useCallback(
    (targetMessage: ChatMessage) =>
      messageActionHandlersRef.current.getAttachmentFileKind(targetMessage),
    []
  );

  return {
    handleToggleMessageSelectionStable,
    toggleMessageMenuStable,
    handleToggleExpandStable,
    handleEditMessageStable,
    handleCopyMessageStable,
    handleDownloadMessageStable,
    handleDeleteMessageStable,
    getAttachmentFileNameStable,
    getAttachmentFileKindStable,
  };
};
