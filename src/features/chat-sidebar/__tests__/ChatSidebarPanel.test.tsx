import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import ChatSidebarPanel from '../index';

const { renderedChildProps } = vi.hoisted(() => ({
  renderedChildProps: {
    header: null as Record<string, unknown> | null,
    messages: null as Record<string, unknown> | null,
    composer: null as Record<string, unknown> | null,
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-a',
      name: 'Admin',
    },
  }),
}));

vi.mock('@/hooks/presence/usePresenceRoster', () => ({
  usePresenceRoster: () => ({
    onlineUserIds: new Set(['user-b']),
  }),
}));

vi.mock('../hooks/useTargetProfilePhoto', () => ({
  useTargetProfilePhoto: () => ({
    displayTargetPhotoUrl: null,
  }),
}));

vi.mock('../hooks/useChatSession', () => ({
  useChatSession: () => ({
    messages: [],
    setMessages: vi.fn(),
    loading: false,
    loadError: null,
    isTargetOnline: false,
    targetUserPresence: null,
    targetUserPresenceError: null,
    markMessageIdsAsRead: vi.fn(),
    hasOlderMessages: false,
    isLoadingOlderMessages: false,
    olderMessagesError: null,
    loadOlderMessages: vi.fn(),
    retryLoadMessages: vi.fn(),
    mergeSearchContextMessages: vi.fn(),
  }),
}));

vi.mock('../hooks/useChatComposer', () => ({
  useChatComposer: () => ({
    message: '',
    setMessage: vi.fn(),
    editingMessageId: null,
    setEditingMessageId: vi.fn(),
    messageInputHeight: 40,
    isMessageInputMultiline: false,
    isSendSuccessGlowVisible: false,
    isAttachModalOpen: false,
    linkPrompt: {
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      attachmentPastePromptRef: { current: null },
      clearAttachmentPasteState: vi.fn(),
      dismissAttachmentPastePrompt: vi.fn(),
      openAttachmentPastePrompt: vi.fn(),
      openComposerLinkPrompt: vi.fn(),
      handleEditAttachmentLink: vi.fn(),
      handleOpenAttachmentPastePromptLink: vi.fn(),
      handleCopyAttachmentPastePromptLink: vi.fn(),
      handleShortenAttachmentPastePromptLink: vi.fn(),
      handleComposerPaste: vi.fn(),
      handleUseAttachmentPasteAsUrl: vi.fn(),
      handleUseAttachmentPasteAsAttachment: vi.fn(),
    },
    attachmentPastePromptUrl: null,
    isAttachmentPastePromptAttachmentCandidate: false,
    isAttachmentPastePromptShortenable: false,
    hoverableAttachmentCandidates: [],
    hoverableAttachmentUrl: null,
    rawAttachmentUrl: null,
    pendingComposerAttachments: [],
    loadingComposerAttachments: [],
    isLoadingAttachmentComposerAttachments: false,
    previewComposerImageAttachment: undefined,
    isComposerImageExpanded: false,
    isComposerImageExpandedVisible: false,
    editingMessagePreview: null,
    composerContextualOffset: 0,
    composerAttachmentPreviewItems: [],
    attachButtonRef: { current: null },
    attachModalRef: { current: null },
    attachmentPastePromptRef: { current: null },
    imageInputRef: { current: null },
    documentInputRef: { current: null },
    audioInputRef: { current: null },
    pendingImagePreviewUrlsRef: { current: new Map<string, string>() },
    clearAttachmentPasteState: vi.fn(),
    dismissAttachmentPastePrompt: vi.fn(),
    openAttachmentPastePrompt: vi.fn(),
    openComposerLinkPrompt: vi.fn(),
    handleOpenAttachmentPastePromptLink: vi.fn(),
    handleCopyAttachmentPastePromptLink: vi.fn(),
    handleShortenAttachmentPastePromptLink: vi.fn(),
    handleComposerPaste: vi.fn(),
    handleMessageChange: vi.fn(),
    handleAttachButtonClick: vi.fn(),
    handleAttachImageClick: vi.fn(),
    handleAttachDocumentClick: vi.fn(),
    handleAttachAudioClick: vi.fn(),
    handleImageFileChange: vi.fn(),
    handleDocumentFileChange: vi.fn(),
    handleAudioFileChange: vi.fn(),
    handleUseAttachmentPasteAsUrl: vi.fn(),
    handleUseAttachmentPasteAsAttachment: vi.fn(),
    openComposerImagePreview: vi.fn(),
    closeComposerImagePreview: vi.fn(),
    removePendingComposerAttachment: vi.fn(),
    clearPendingComposerAttachments: vi.fn(),
    queueComposerImage: vi.fn(),
    restorePendingComposerAttachments: vi.fn(),
    triggerSendSuccessGlow: vi.fn(),
  }),
}));

vi.mock('../hooks/useChatConversationMutations', () => ({
  useChatConversationMutations: () => ({
    handleEditMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    handleDeleteMessages: vi.fn(),
    handleCancelEditMessage: vi.fn(),
    handleCopyMessage: vi.fn(),
    handleDownloadMessage: vi.fn(),
    handleOpenForwardMessagePicker: vi.fn(),
    isForwardPickerOpen: false,
    forwardTargetMessage: null,
    forwardCaptionMessage: null,
    availableForwardRecipients: [],
    selectedForwardRecipientIds: new Set<string>(),
    isForwardDirectoryLoading: false,
    forwardDirectoryError: null,
    hasMoreForwardDirectoryUsers: false,
    isSubmittingForwardMessage: false,
    handleCloseForwardMessagePicker: vi.fn(),
    handleToggleForwardRecipient: vi.fn(),
    handleRetryLoadForwardDirectory: vi.fn(),
    handleLoadMoreForwardDirectoryUsers: vi.fn(),
    handleSubmitForwardMessage: vi.fn(),
    handleSendMessage: vi.fn(),
    handleKeyPress: vi.fn(),
  }),
}));

vi.mock('../hooks/useChatInteractionModes', () => ({
  useChatInteractionModes: () => ({
    isMessageSearchMode: false,
    messageSearchQuery: '',
    messageSearchState: 'idle',
    searchMatchedMessageIds: [],
    activeSearchResultIndex: -1,
    canNavigateSearchUp: false,
    canNavigateSearchDown: false,
    isSelectionMode: false,
    selectedVisibleMessages: [],
    canDeleteSelectedMessages: false,
    searchInputRef: { current: null },
    handleEnterMessageSearchMode: vi.fn(),
    handleExitMessageSearchMode: vi.fn(),
    handleEnterMessageSelectionMode: vi.fn(),
    handleClearSelectedMessages: vi.fn(),
    handleExitMessageSelectionMode: vi.fn(),
    handleMessageSearchQueryChange: vi.fn(),
    handleNavigateSearchUp: vi.fn(),
    handleNavigateSearchDown: vi.fn(),
    handleFocusSearchInput: vi.fn(),
    handleCopySelectedMessages: vi.fn(),
    normalizedMessageSearchQuery: '',
    activeSearchMessageId: null,
    searchNavigationTick: 0,
    selectedMessageIds: new Set<string>(),
    searchMatchedMessageIdSet: new Set<string>(),
    handleToggleMessageSelection: vi.fn(),
    setSelectedMessageIds: vi.fn(),
  }),
}));

vi.mock('../hooks/useChatViewport', () => ({
  useChatViewport: () => ({
    closeMessageMenu: vi.fn(),
    scheduleScrollMessagesToBottom: vi.fn(),
    toggleMessageMenu: vi.fn(),
    handleChatPortalBackgroundClick: vi.fn(),
    isAtTop: true,
    composerContainerHeight: 0,
    openMenuMessageId: null,
    menuPlacement: 'up',
    menuSideAnchor: 'middle',
    shouldAnimateMenuOpen: true,
    menuTransitionSourceId: null,
    menuOffsetX: 0,
    flashingMessageId: null,
    isFlashHighlightVisible: false,
    hasNewMessages: false,
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    focusEditingTargetMessage: vi.fn(),
  }),
}));

vi.mock('../components/ChatHeader', () => {
  return {
    default: function MockChatHeader({
      runtime,
    }: {
      runtime: Record<string, unknown> & {
        actions: { handleClose: () => void };
      };
    }) {
      renderedChildProps.header = runtime;
      return (
        <button onClick={runtime.actions.handleClose} type="button">
          close chat
        </button>
      );
    },
  };
});

vi.mock('../components/MessagesPane', () => {
  return {
    default: function MockMessagesPane({
      runtime,
    }: {
      runtime: Record<string, unknown>;
    }) {
      renderedChildProps.messages = runtime;
      return <div>messages pane</div>;
    },
  };
});

vi.mock('../components/ComposerPanel', () => {
  return {
    default: function MockComposerPanel({
      runtime,
    }: {
      runtime: Record<string, unknown>;
    }) {
      renderedChildProps.composer = runtime;
      return <div>composer panel</div>;
    },
  };
});

describe('ChatSidebarPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderedChildProps.header = null;
    renderedChildProps.messages = null;
    renderedChildProps.composer = null;
  });

  it('closes the UI immediately through the header action', () => {
    const onClose = vi.fn();

    render(
      <ChatSidebarPanel
        isOpen
        onClose={onClose}
        targetUser={{
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'close chat' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('wires runtime slices into the rendered child components', () => {
    render(
      <ChatSidebarPanel
        isOpen
        onClose={vi.fn()}
        targetUser={{
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        }}
      />
    );

    expect(renderedChildProps.header).toEqual(
      expect.objectContaining({
        targetUser: expect.objectContaining({
          id: 'user-b',
          name: 'Gudang',
        }),
        interaction: expect.objectContaining({
          isMessageSearchMode: false,
          isSelectionMode: false,
          selectedVisibleMessages: [],
        }),
      })
    );
    expect(renderedChildProps.messages).toEqual(
      expect.objectContaining({
        conversation: expect.objectContaining({
          loading: false,
          messages: [],
        }),
        viewport: expect.objectContaining({
          hasNewMessages: false,
          isAtBottom: true,
        }),
        item: expect.objectContaining({
          interaction: expect.objectContaining({
            userId: 'user-a',
            isSelectionMode: false,
          }),
        }),
        previews: expect.objectContaining({
          isImagePreviewOpen: false,
          isDocumentPreviewVisible: false,
        }),
      })
    );
    expect(renderedChildProps.composer).toEqual(
      expect.objectContaining({
        composer: expect.objectContaining({
          message: '',
          isMessageInputMultiline: false,
          isAttachModalOpen: false,
        }),
      })
    );
  });
});
