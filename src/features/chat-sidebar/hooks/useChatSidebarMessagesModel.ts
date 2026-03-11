import { useMemo } from 'react';
import type { MessagesPaneModel } from '../components/MessagesPane';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { useChatComposer } from './useChatComposer';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatSidebarPreviewState } from './useChatSidebarPreviewState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatViewport } from './useChatViewport';

type MessagesSessionState = Pick<
  ReturnType<typeof useChatSession>,
  | 'loading'
  | 'loadError'
  | 'messages'
  | 'hasOlderMessages'
  | 'isLoadingOlderMessages'
  | 'olderMessagesError'
  | 'loadOlderMessages'
  | 'retryLoadMessages'
>;

type MessagesInteractionState = Pick<
  ReturnType<typeof useChatInteractionModes>,
  | 'normalizedMessageSearchQuery'
  | 'isMessageSearchMode'
  | 'searchMatchedMessageIdSet'
  | 'activeSearchMessageId'
  | 'isSelectionMode'
  | 'selectedMessageIds'
  | 'handleToggleMessageSelection'
>;

type MessagesComposerState = Pick<
  ReturnType<typeof useChatComposer>,
  | 'messageInputHeight'
  | 'composerContextualOffset'
  | 'handleEditMessage'
  | 'handleCopyMessage'
  | 'handleDownloadMessage'
  | 'handleDeleteMessage'
>;

type MessagesViewportState = Pick<
  ReturnType<typeof useChatViewport>,
  | 'isAtBottom'
  | 'hasNewMessages'
  | 'composerContainerHeight'
  | 'openMenuMessageId'
  | 'menuPlacement'
  | 'menuSideAnchor'
  | 'shouldAnimateMenuOpen'
  | 'menuTransitionSourceId'
  | 'menuOffsetX'
  | 'flashingMessageId'
  | 'isFlashHighlightVisible'
  | 'closeMessageMenu'
  | 'scrollToBottom'
>;

type MessagesPreviewState = Pick<
  ReturnType<typeof useChatSidebarPreviewState>,
  | 'captionMessagesByAttachmentId'
  | 'captionMessageIds'
  | 'getImageMessageUrl'
  | 'getPdfMessagePreview'
  | 'documentPreviewUrl'
  | 'documentPreviewName'
  | 'isDocumentPreviewVisible'
  | 'closeDocumentPreview'
  | 'imagePreviewUrl'
  | 'imagePreviewName'
  | 'isImagePreviewVisible'
  | 'closeImagePreview'
  | 'openImageInPortal'
  | 'openDocumentInPortal'
>;

interface UseChatSidebarMessagesModelProps {
  user?: {
    id: string;
    name: string;
  } | null;
  session: MessagesSessionState;
  interaction: MessagesInteractionState;
  composer: MessagesComposerState;
  viewport: MessagesViewportState;
  previewState: MessagesPreviewState;
  refs: ReturnType<typeof useChatSidebarRefs>;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
}

export const useChatSidebarMessagesModel = ({
  user,
  session,
  interaction,
  composer,
  viewport,
  previewState,
  refs,
  toggleMessageMenu,
}: UseChatSidebarMessagesModelProps) =>
  useMemo<MessagesPaneModel>(
    () => ({
      loading: session.loading,
      loadError: session.loadError,
      messages: session.messages,
      user,
      normalizedSearchQuery: interaction.normalizedMessageSearchQuery,
      messageInputHeight: composer.messageInputHeight,
      composerContextualOffset: composer.composerContextualOffset,
      composerContainerHeight: viewport.composerContainerHeight,
      openMenuMessageId: viewport.openMenuMessageId,
      menuPlacement: viewport.menuPlacement,
      menuSideAnchor: viewport.menuSideAnchor,
      shouldAnimateMenuOpen: viewport.shouldAnimateMenuOpen,
      menuTransitionSourceId: viewport.menuTransitionSourceId,
      menuOffsetX: viewport.menuOffsetX,
      expandedMessageIds: refs.expandedMessageIds,
      flashingMessageId: viewport.flashingMessageId,
      isFlashHighlightVisible: viewport.isFlashHighlightVisible,
      isSelectionMode: interaction.isSelectionMode,
      selectedMessageIds: interaction.selectedMessageIds,
      searchMatchedMessageIds: interaction.isMessageSearchMode
        ? interaction.searchMatchedMessageIdSet
        : new Set<string>(),
      activeSearchMessageId: interaction.isMessageSearchMode
        ? interaction.activeSearchMessageId
        : null,
      showScrollToBottom: viewport.hasNewMessages || !viewport.isAtBottom,
      hasOlderMessages: session.hasOlderMessages,
      isLoadingOlderMessages: session.isLoadingOlderMessages,
      olderMessagesError: session.olderMessagesError,
      messagesContainerRef: refs.messagesContainerRef,
      messagesEndRef: refs.messagesEndRef,
      messageBubbleRefs: refs.messageBubbleRefs,
      initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
      captionMessagesByAttachmentId: previewState.captionMessagesByAttachmentId,
      captionMessageIds: previewState.captionMessageIds,
      closeMessageMenu: viewport.closeMessageMenu,
      toggleMessageMenu,
      handleToggleExpand: refs.handleToggleExpand,
      handleEditMessage: composer.handleEditMessage,
      handleCopyMessage: composer.handleCopyMessage,
      handleDownloadMessage: composer.handleDownloadMessage,
      handleDeleteMessage: composer.handleDeleteMessage,
      onToggleMessageSelection: interaction.handleToggleMessageSelection,
      getAttachmentFileName,
      getAttachmentFileKind,
      getImageMessageUrl: previewState.getImageMessageUrl,
      getPdfMessagePreview: previewState.getPdfMessagePreview,
      documentPreviewUrl: previewState.documentPreviewUrl,
      documentPreviewName: previewState.documentPreviewName,
      isDocumentPreviewVisible: previewState.isDocumentPreviewVisible,
      closeDocumentPreview: previewState.closeDocumentPreview,
      imagePreviewUrl: previewState.imagePreviewUrl,
      imagePreviewName: previewState.imagePreviewName,
      isImagePreviewVisible: previewState.isImagePreviewVisible,
      closeImagePreview: previewState.closeImagePreview,
      openImageInPortal: previewState.openImageInPortal,
      openDocumentInPortal: previewState.openDocumentInPortal,
      onScrollToBottom: viewport.scrollToBottom,
      onLoadOlderMessages: session.loadOlderMessages,
      onRetryLoadMessages: session.retryLoadMessages,
    }),
    [
      composer.composerContextualOffset,
      composer.handleCopyMessage,
      composer.handleDeleteMessage,
      composer.handleDownloadMessage,
      composer.handleEditMessage,
      composer.messageInputHeight,
      interaction.activeSearchMessageId,
      interaction.handleToggleMessageSelection,
      interaction.isMessageSearchMode,
      interaction.isSelectionMode,
      interaction.normalizedMessageSearchQuery,
      interaction.searchMatchedMessageIdSet,
      interaction.selectedMessageIds,
      previewState.captionMessageIds,
      previewState.captionMessagesByAttachmentId,
      previewState.closeDocumentPreview,
      previewState.closeImagePreview,
      previewState.documentPreviewName,
      previewState.documentPreviewUrl,
      previewState.getImageMessageUrl,
      previewState.getPdfMessagePreview,
      previewState.imagePreviewName,
      previewState.imagePreviewUrl,
      previewState.isDocumentPreviewVisible,
      previewState.isImagePreviewVisible,
      previewState.openDocumentInPortal,
      previewState.openImageInPortal,
      refs.expandedMessageIds,
      refs.handleToggleExpand,
      refs.initialMessageAnimationKeysRef,
      refs.initialOpenJumpAnimationKeysRef,
      refs.messageBubbleRefs,
      refs.messagesContainerRef,
      refs.messagesEndRef,
      session.hasOlderMessages,
      session.isLoadingOlderMessages,
      session.loadError,
      session.loadOlderMessages,
      session.loading,
      session.messages,
      session.olderMessagesError,
      session.retryLoadMessages,
      toggleMessageMenu,
      user,
      viewport.closeMessageMenu,
      viewport.composerContainerHeight,
      viewport.flashingMessageId,
      viewport.hasNewMessages,
      viewport.isAtBottom,
      viewport.isFlashHighlightVisible,
      viewport.menuOffsetX,
      viewport.menuPlacement,
      viewport.menuSideAnchor,
      viewport.menuTransitionSourceId,
      viewport.openMenuMessageId,
      viewport.scrollToBottom,
      viewport.shouldAnimateMenuOpen,
    ]
  );
