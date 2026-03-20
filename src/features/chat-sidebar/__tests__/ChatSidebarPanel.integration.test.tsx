import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import ChatSidebarPanel from '../index';

const { mockComposerState } = vi.hoisted(() => ({
  mockComposerState: {
    loadingComposerAttachments: [] as Array<{
      id: string;
      fileName: string;
      sourceUrl: string;
      status: 'loading';
    }>,
    isLoadingAttachmentComposerAttachments: false,
  },
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  LayoutGroup: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get:
        (_target, element) =>
        ({
          children,
          animate: _animate,
          exit: _exit,
          initial: _initial,
          layout: _layout,
          transition: _transition,
          ...props
        }: React.HTMLAttributes<HTMLElement> & {
          animate?: unknown;
          children?: React.ReactNode;
          exit?: unknown;
          initial?: unknown;
          layout?: unknown;
          transition?: unknown;
        }) =>
          React.createElement(element as string, props, children),
    }
  ),
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
    isTargetOnline: true,
    targetUserPresence: {
      user_id: 'user-b',
      is_online: true,
      last_seen: '2026-03-07T09:59:40.000Z',
    },
    broadcastNewMessage: vi.fn(),
    broadcastUpdatedMessage: vi.fn(),
    broadcastDeletedMessage: vi.fn(),
    markMessageIdsAsRead: vi.fn(),
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
    attachmentPastePromptUrl: null,
    isAttachmentPastePromptAttachmentCandidate: false,
    isAttachmentPastePromptShortenable: false,
    hoverableAttachmentCandidates: [],
    hoverableAttachmentUrl: null,
    rawAttachmentUrl: null,
    pendingComposerAttachments: [],
    loadingComposerAttachments: mockComposerState.loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments:
      mockComposerState.isLoadingAttachmentComposerAttachments,
    previewComposerImageAttachment: undefined,
    isComposerImageExpanded: false,
    isComposerImageExpandedVisible: false,
    editingMessagePreview: null,
    composerContextualOffset: 0,
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
    queueComposerImage: vi.fn(() => true),
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

describe('ChatSidebarPanel integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'));
    mockComposerState.loadingComposerAttachments = [];
    mockComposerState.isLoadingAttachmentComposerAttachments = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the real header, messages shell, and composer shell from controller models', () => {
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

    expect(screen.getByText('Gudang')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tulis pesan...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lampirkan file' })).toBeTruthy();
  });

  it('disables send while a remote attachment is still converting', () => {
    mockComposerState.loadingComposerAttachments = [
      {
        id: 'loading-1',
        fileName: 'quokka.jpg',
        sourceUrl:
          'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg',
        status: 'loading',
      },
    ];
    mockComposerState.isLoadingAttachmentComposerAttachments = true;

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

    expect(
      (screen.getByRole('button', { name: 'Kirim pesan' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByText('Lampiran 1/5')).toBeTruthy();
  });

  it('closes through the real header action', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Tutup sidebar chat' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
