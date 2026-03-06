import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatSidebarPanel from '../index';

const { mockPerformClose } = vi.hoisted(() => ({
  mockPerformClose: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-a',
      name: 'Admin',
    },
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
    targetUserPresence: null,
    performClose: mockPerformClose,
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
    messageInputHeight: 40,
    isMessageInputMultiline: false,
    isSendSuccessGlowVisible: false,
    isAttachModalOpen: false,
    pendingComposerAttachments: [],
    previewComposerImageAttachment: undefined,
    isComposerImageExpanded: false,
    isComposerImageExpandedVisible: false,
    editingMessagePreview: null,
    composerContextualOffset: 0,
    attachButtonRef: { current: null },
    attachModalRef: { current: null },
    imageInputRef: { current: null },
    documentInputRef: { current: null },
    audioInputRef: { current: null },
    handleKeyPress: vi.fn(),
    handleComposerPaste: vi.fn(),
    handleSendMessage: vi.fn(),
    handleAttachButtonClick: vi.fn(),
    handleAttachImageClick: vi.fn(),
    handleAttachDocumentClick: vi.fn(),
    handleAttachAudioClick: vi.fn(),
    handleImageFileChange: vi.fn(),
    handleDocumentFileChange: vi.fn(),
    handleAudioFileChange: vi.fn(),
    handleCancelEditMessage: vi.fn(),
    openComposerImagePreview: vi.fn(),
    closeComposerImagePreview: vi.fn(),
    removePendingComposerAttachment: vi.fn(),
    queueComposerImage: vi.fn(),
    handleEditMessage: vi.fn(),
    handleCopyMessage: vi.fn(),
    handleDownloadMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
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

vi.mock('../components/ChatHeader', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} type="button">
      close chat
    </button>
  ),
}));

vi.mock('../components/MessagesPane', () => ({
  default: () => <div>messages pane</div>,
}));

vi.mock('../components/ComposerPanel', () => ({
  default: () => <div>composer panel</div>,
}));

describe('ChatSidebarPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformClose.mockImplementation(() => new Promise(() => {}));
  });

  it('closes the UI immediately without waiting for performClose to resolve', () => {
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

    expect(mockPerformClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
