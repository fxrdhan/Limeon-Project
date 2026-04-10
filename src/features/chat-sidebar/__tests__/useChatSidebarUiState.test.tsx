import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { useChatSidebarUiState } from '../hooks/useChatSidebarUiState';

const {
  mockUseChatComposer,
  mockUseChatViewport,
  mockUseChatSidebarPreviewState,
  mockFetchConversationMessageContext,
} = vi.hoisted(() => ({
  mockUseChatComposer: vi.fn(),
  mockUseChatViewport: vi.fn(),
  mockUseChatSidebarPreviewState: vi.fn(),
  mockFetchConversationMessageContext: vi.fn(),
}));

vi.mock('../hooks/useChatComposer', () => ({
  useChatComposer: (...args: unknown[]) => mockUseChatComposer(...args),
}));

vi.mock('../hooks/useChatViewport', () => ({
  useChatViewport: (...args: unknown[]) => mockUseChatViewport(...args),
}));

vi.mock('../hooks/useChatSidebarPreviewState', () => ({
  useChatSidebarPreviewState: (...args: unknown[]) =>
    mockUseChatSidebarPreviewState(...args),
}));

vi.mock('../data/chatSidebarGateway', async () => {
  return {
    chatSidebarMessagesGateway: {
      fetchConversationMessageContext: (...args: unknown[]) =>
        mockFetchConversationMessageContext(...args),
    },
  };
});

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

const buildRefs = () =>
  ({
    messageInputRef: { current: null },
    composerContainerRef: { current: null },
    messagesContainerRef: { current: null },
    messagesContentRef: { current: null },
    messagesEndRef: { current: null },
    chatHeaderContainerRef: { current: null },
    messageBubbleRefs: { current: new Map() },
    closeMessageMenuRef: { current: null },
    scheduleScrollMessagesToBottomRef: { current: null },
  }) as never;

describe('useChatSidebarUiState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchConversationMessageContext.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('opens the image group viewer when focusing a replied image group target', () => {
    const replyingMessages = Array.from({ length: 5 }, (_, index) =>
      buildMessage({
        id: `image-${index + 1}`,
        message: `images/channel/image-${index + 1}.png`,
        message_type: 'image',
        file_name: `image-${index + 1}.png`,
        file_mime_type: 'image/png',
        file_storage_path: `images/channel/image-${index + 1}.png`,
        file_preview_url: `https://example.com/image-${index + 1}.png`,
      })
    );
    const openImageGroupInPortal = vi.fn(async () => {});
    const focusReplyTargetMessage = vi.fn();

    mockUseChatComposer.mockReturnValue({
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      composerAttachmentPreviewItems: [],
      pendingComposerAttachments: [],
      loadingComposerAttachments: [],
      editingMessageId: null,
      replyingMessageId: 'image-5',
      replyingMessagePreview: 'image-5.png',
      message: '',
      setMessage: vi.fn(),
      closeAttachModal: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      compressPendingComposerImage: vi.fn(),
      compressPendingComposerPdf: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      openComposerImagePreview: vi.fn(),
      pendingImagePreviewUrlsRef: { current: [] },
      isSendSuccessGlowVisible: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
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
      cancelLoadingComposerAttachment: vi.fn(),
      clearPendingComposerAttachments: vi.fn(),
      restorePendingComposerAttachments: vi.fn(),
      queueComposerImage: vi.fn(),
      triggerSendSuccessGlow: vi.fn(),
      isLoadingAttachmentComposerAttachments: false,
      linkPrompt: {},
      composerContextualOffset: 0,
    });

    mockUseChatViewport.mockReturnValue({
      closeMessageMenu: vi.fn(),
      scheduleScrollMessagesToBottom: vi.fn(),
      toggleMessageMenu: vi.fn(),
      getVisibleMessagesBounds: vi.fn(),
      focusEditingTargetMessage: vi.fn(),
      focusReplyTargetMessage,
      focusSearchTargetMessage: vi.fn(),
      isAtBottom: true,
      isAtTop: true,
      hasNewMessages: false,
      isInitialOpenPinPending: false,
      composerContainerHeight: 0,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      handleChatPortalBackgroundClick: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    mockUseChatSidebarPreviewState.mockReturnValue({
      openImageInPortal: vi.fn(async () => {}),
      openImageGroupInPortal,
      closeImageActionsMenu: vi.fn(),
      openDocumentInPortal: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      closeImagePreview: vi.fn(),
      openDocumentPreview: vi.fn(),
      closeDocumentPreview: vi.fn(),
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(),
      handleCopyMessage: vi.fn(),
      handleReplyMessage: vi.fn(),
      handleOpenForwardMessagePicker: vi.fn(),
      activeImageGroupPreviewMessage: null,
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
      closeImageGroupPreviewVisible: vi.fn(),
      captionMessagesByAttachmentId: new Map(),
      captionMessageIds: new Set(),
    });

    const { result } = renderHook(() =>
      useChatSidebarUiState({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: replyingMessages,
        loading: false,
        userId: 'user-a',
        targetUserId: 'user-b',
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        markMessageIdsAsRead: vi.fn(async () => {}),
        mergeSearchContextMessages: vi.fn(),
        refs: buildRefs(),
        closeMessageMenu: vi.fn(),
        getAttachmentFileName: message => message.file_name || 'Lampiran',
        getAttachmentFileKind: (_message: ChatMessage) => 'document',
        captionData: {
          captionMessagesByAttachmentId: new Map(),
          captionMessageIds: new Set(),
        },
      })
    );

    act(() => {
      result.current.viewport.focusReplyTargetMessage('image-5');
    });

    expect(openImageGroupInPortal).toHaveBeenCalledTimes(1);
    expect(openImageGroupInPortal).toHaveBeenCalledWith(
      replyingMessages,
      'image-5',
      'https://example.com/image-5.png'
    );
    expect(focusReplyTargetMessage).not.toHaveBeenCalled();
  });

  it('keeps text reply targets focused in the message list', () => {
    const textMessage = buildMessage({
      id: 'text-1',
      message: 'halo',
      message_type: 'text',
    });
    const openImageInPortal = vi.fn(async () => {});
    const focusReplyTargetMessage = vi.fn();

    mockUseChatComposer.mockReturnValue({
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      composerAttachmentPreviewItems: [],
      pendingComposerAttachments: [],
      loadingComposerAttachments: [],
      editingMessageId: null,
      replyingMessageId: 'text-1',
      replyingMessagePreview: 'halo',
      message: '',
      setMessage: vi.fn(),
      closeAttachModal: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      compressPendingComposerImage: vi.fn(),
      compressPendingComposerPdf: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      openComposerImagePreview: vi.fn(),
      pendingImagePreviewUrlsRef: { current: [] },
      isSendSuccessGlowVisible: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
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
      cancelLoadingComposerAttachment: vi.fn(),
      clearPendingComposerAttachments: vi.fn(),
      restorePendingComposerAttachments: vi.fn(),
      queueComposerImage: vi.fn(),
      triggerSendSuccessGlow: vi.fn(),
      isLoadingAttachmentComposerAttachments: false,
      linkPrompt: {},
      composerContextualOffset: 0,
    });

    mockUseChatViewport.mockReturnValue({
      closeMessageMenu: vi.fn(),
      scheduleScrollMessagesToBottom: vi.fn(),
      toggleMessageMenu: vi.fn(),
      getVisibleMessagesBounds: vi.fn(),
      focusEditingTargetMessage: vi.fn(),
      focusReplyTargetMessage,
      focusSearchTargetMessage: vi.fn(),
      isAtBottom: true,
      isAtTop: true,
      hasNewMessages: false,
      isInitialOpenPinPending: false,
      composerContainerHeight: 0,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      handleChatPortalBackgroundClick: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    mockUseChatSidebarPreviewState.mockReturnValue({
      openImageInPortal,
      closeImageActionsMenu: vi.fn(),
      openImageGroupInPortal: vi.fn(),
      openDocumentInPortal: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      closeImagePreview: vi.fn(),
      openDocumentPreview: vi.fn(),
      closeDocumentPreview: vi.fn(),
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(),
      handleCopyMessage: vi.fn(),
      handleReplyMessage: vi.fn(),
      handleOpenForwardMessagePicker: vi.fn(),
      activeImageGroupPreviewMessage: null,
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
      closeImageGroupPreviewVisible: vi.fn(),
      captionMessagesByAttachmentId: new Map(),
      captionMessageIds: new Set(),
    });

    const { result } = renderHook(() =>
      useChatSidebarUiState({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [textMessage],
        loading: false,
        userId: 'user-a',
        targetUserId: 'user-b',
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        markMessageIdsAsRead: vi.fn(async () => {}),
        mergeSearchContextMessages: vi.fn(),
        refs: buildRefs(),
        closeMessageMenu: vi.fn(),
        getAttachmentFileName: message => message.file_name || 'Lampiran',
        getAttachmentFileKind: (_message: ChatMessage) => 'document',
        captionData: {
          captionMessagesByAttachmentId: new Map(),
          captionMessageIds: new Set(),
        },
      })
    );

    act(() => {
      result.current.viewport.focusReplyTargetMessage('text-1');
    });

    expect(openImageInPortal).not.toHaveBeenCalled();
    expect(focusReplyTargetMessage).toHaveBeenCalledWith('text-1');
  });

  it('opens the single image viewer for non-group image replies', () => {
    const replyingMessage = buildMessage({
      id: 'image-1',
      message: 'images/channel/image-1.png',
      message_type: 'image',
      file_name: 'image-1.png',
      file_mime_type: 'image/png',
      file_storage_path: 'images/channel/image-1.png',
      file_preview_url: 'https://example.com/image-1.png',
    });
    const openImageInPortal = vi.fn(async () => {});

    mockUseChatComposer.mockReturnValue({
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      composerAttachmentPreviewItems: [],
      pendingComposerAttachments: [],
      loadingComposerAttachments: [],
      editingMessageId: null,
      replyingMessageId: 'image-1',
      replyingMessagePreview: 'image-1.png',
      message: '',
      setMessage: vi.fn(),
      closeAttachModal: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      compressPendingComposerImage: vi.fn(),
      compressPendingComposerPdf: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      openComposerImagePreview: vi.fn(),
      pendingImagePreviewUrlsRef: { current: [] },
      isSendSuccessGlowVisible: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
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
      cancelLoadingComposerAttachment: vi.fn(),
      clearPendingComposerAttachments: vi.fn(),
      restorePendingComposerAttachments: vi.fn(),
      queueComposerImage: vi.fn(),
      triggerSendSuccessGlow: vi.fn(),
      isLoadingAttachmentComposerAttachments: false,
      linkPrompt: {},
      composerContextualOffset: 0,
    });

    mockUseChatViewport.mockReturnValue({
      closeMessageMenu: vi.fn(),
      scheduleScrollMessagesToBottom: vi.fn(),
      toggleMessageMenu: vi.fn(),
      getVisibleMessagesBounds: vi.fn(),
      focusEditingTargetMessage: vi.fn(),
      focusReplyTargetMessage: vi.fn(),
      focusSearchTargetMessage: vi.fn(),
      isAtBottom: true,
      isAtTop: true,
      hasNewMessages: false,
      isInitialOpenPinPending: false,
      composerContainerHeight: 0,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      handleChatPortalBackgroundClick: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    mockUseChatSidebarPreviewState.mockReturnValue({
      openImageInPortal,
      openImageGroupInPortal: vi.fn(async () => {}),
      closeImageActionsMenu: vi.fn(),
      openDocumentInPortal: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      closeImagePreview: vi.fn(),
      openDocumentPreview: vi.fn(),
      closeDocumentPreview: vi.fn(),
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(),
      handleCopyMessage: vi.fn(),
      handleReplyMessage: vi.fn(),
      handleOpenForwardMessagePicker: vi.fn(),
      activeImageGroupPreviewMessage: null,
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
      closeImageGroupPreviewVisible: vi.fn(),
      captionMessagesByAttachmentId: new Map(),
      captionMessageIds: new Set(),
    });

    const { result } = renderHook(() =>
      useChatSidebarUiState({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [replyingMessage],
        loading: false,
        userId: 'user-a',
        targetUserId: 'user-b',
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        markMessageIdsAsRead: vi.fn(async () => {}),
        mergeSearchContextMessages: vi.fn(),
        refs: buildRefs(),
        closeMessageMenu: vi.fn(),
        getAttachmentFileName: message => message.file_name || 'Lampiran',
        getAttachmentFileKind: (_message: ChatMessage) => 'document',
        captionData: {
          captionMessagesByAttachmentId: new Map(),
          captionMessageIds: new Set(),
        },
      })
    );

    act(() => {
      result.current.viewport.focusReplyTargetMessage('image-1');
    });

    expect(openImageInPortal).toHaveBeenCalledWith(
      replyingMessage,
      'image-1.png',
      'https://example.com/image-1.png'
    );
  });

  it('loads missing reply target context before focusing a text source message', async () => {
    const mergeSearchContextMessages = vi.fn();
    const focusReplyTargetMessage = vi.fn();
    const sourceMessage = buildMessage({
      id: 'older-text-1',
      sender_id: 'user-b',
      receiver_id: 'user-a',
      message: 'Pesan lama',
      message_type: 'text',
      created_at: '2026-03-05T09:30:00.000Z',
      updated_at: '2026-03-05T09:30:00.000Z',
    });

    mockUseChatComposer.mockReturnValue({
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      composerAttachmentPreviewItems: [],
      pendingComposerAttachments: [],
      loadingComposerAttachments: [],
      editingMessageId: null,
      replyingMessageId: null,
      replyingMessagePreview: null,
      message: '',
      setMessage: vi.fn(),
      closeAttachModal: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      compressPendingComposerImage: vi.fn(),
      compressPendingComposerPdf: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      openComposerImagePreview: vi.fn(),
      pendingImagePreviewUrlsRef: { current: [] },
      isSendSuccessGlowVisible: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
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
      cancelLoadingComposerAttachment: vi.fn(),
      clearPendingComposerAttachments: vi.fn(),
      restorePendingComposerAttachments: vi.fn(),
      queueComposerImage: vi.fn(),
      triggerSendSuccessGlow: vi.fn(),
      isLoadingAttachmentComposerAttachments: false,
      linkPrompt: {},
      composerContextualOffset: 0,
    });

    mockUseChatViewport.mockReturnValue({
      closeMessageMenu: vi.fn(),
      scheduleScrollMessagesToBottom: vi.fn(),
      toggleMessageMenu: vi.fn(),
      getVisibleMessagesBounds: vi.fn(),
      focusEditingTargetMessage: vi.fn(),
      focusReplyTargetMessage,
      focusSearchTargetMessage: vi.fn(),
      isAtBottom: true,
      isAtTop: true,
      hasNewMessages: false,
      isInitialOpenPinPending: false,
      composerContainerHeight: 0,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      handleChatPortalBackgroundClick: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    mockUseChatSidebarPreviewState.mockReturnValue({
      openImageInPortal: vi.fn(async () => {}),
      openImageGroupInPortal: vi.fn(async () => {}),
      closeImageActionsMenu: vi.fn(),
      openDocumentInPortal: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      closeImagePreview: vi.fn(),
      openDocumentPreview: vi.fn(),
      closeDocumentPreview: vi.fn(),
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(),
      handleCopyMessage: vi.fn(),
      handleReplyMessage: vi.fn(),
      handleOpenForwardMessagePicker: vi.fn(),
      activeImageGroupPreviewMessage: null,
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
      closeImageGroupPreviewVisible: vi.fn(),
      captionMessagesByAttachmentId: new Map(),
      captionMessageIds: new Set(),
    });
    mockFetchConversationMessageContext.mockResolvedValue({
      data: [sourceMessage],
      error: null,
    });

    const { result } = renderHook(() =>
      useChatSidebarUiState({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        loading: false,
        userId: 'user-a',
        targetUserId: 'user-b',
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        markMessageIdsAsRead: vi.fn(async () => {}),
        mergeSearchContextMessages,
        refs: buildRefs(),
        closeMessageMenu: vi.fn(),
        getAttachmentFileName: message => message.file_name || 'Lampiran',
        getAttachmentFileKind: (_message: ChatMessage) => 'document',
        captionData: {
          captionMessagesByAttachmentId: new Map(),
          captionMessageIds: new Set(),
        },
      })
    );

    await act(async () => {
      result.current.viewport.focusReplyTargetMessage('older-text-1');
      await Promise.resolve();
    });

    expect(mockFetchConversationMessageContext).toHaveBeenCalledWith(
      'user-b',
      'older-text-1'
    );
    expect(mergeSearchContextMessages).toHaveBeenCalledWith([sourceMessage]);
    expect(focusReplyTargetMessage).toHaveBeenCalledWith('older-text-1');
  });

  it('loads missing reply target context before opening an image group source message', async () => {
    const mergeSearchContextMessages = vi.fn();
    const openImageGroupInPortal = vi.fn(async () => {});
    const sourceMessages = Array.from({ length: 5 }, (_, index) =>
      buildMessage({
        id: `older-image-${index + 1}`,
        sender_id: 'user-b',
        receiver_id: 'user-a',
        message: `images/channel/older-image-${index + 1}.png`,
        message_type: 'image',
        file_name: `older-image-${index + 1}.png`,
        file_mime_type: 'image/png',
        file_storage_path: `images/channel/older-image-${index + 1}.png`,
        file_preview_url: `https://example.com/older-image-${index + 1}.png`,
        created_at: `2026-03-05T09:30:${String(index * 8).padStart(2, '0')}.000Z`,
        updated_at: `2026-03-05T09:30:${String(index * 8).padStart(2, '0')}.000Z`,
      })
    );

    mockUseChatComposer.mockReturnValue({
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      composerAttachmentPreviewItems: [],
      pendingComposerAttachments: [],
      loadingComposerAttachments: [],
      editingMessageId: null,
      replyingMessageId: null,
      replyingMessagePreview: null,
      message: '',
      setMessage: vi.fn(),
      closeAttachModal: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      compressPendingComposerImage: vi.fn(),
      compressPendingComposerPdf: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      openComposerImagePreview: vi.fn(),
      pendingImagePreviewUrlsRef: { current: [] },
      isSendSuccessGlowVisible: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [],
      hoverableAttachmentUrl: null,
      rawAttachmentUrl: null,
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
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
      cancelLoadingComposerAttachment: vi.fn(),
      clearPendingComposerAttachments: vi.fn(),
      restorePendingComposerAttachments: vi.fn(),
      queueComposerImage: vi.fn(),
      triggerSendSuccessGlow: vi.fn(),
      isLoadingAttachmentComposerAttachments: false,
      linkPrompt: {},
      composerContextualOffset: 0,
    });

    mockUseChatViewport.mockReturnValue({
      closeMessageMenu: vi.fn(),
      scheduleScrollMessagesToBottom: vi.fn(),
      toggleMessageMenu: vi.fn(),
      getVisibleMessagesBounds: vi.fn(),
      focusEditingTargetMessage: vi.fn(),
      focusReplyTargetMessage: vi.fn(),
      focusSearchTargetMessage: vi.fn(),
      isAtBottom: true,
      isAtTop: true,
      hasNewMessages: false,
      isInitialOpenPinPending: false,
      composerContainerHeight: 0,
      openMenuMessageId: null,
      menuPlacement: 'up',
      menuSideAnchor: 'middle',
      shouldAnimateMenuOpen: false,
      menuTransitionSourceId: null,
      menuOffsetX: 0,
      flashingMessageId: null,
      isFlashHighlightVisible: false,
      handleChatPortalBackgroundClick: vi.fn(),
      scrollToBottom: vi.fn(),
    });

    mockUseChatSidebarPreviewState.mockReturnValue({
      openImageInPortal: vi.fn(async () => {}),
      openImageGroupInPortal,
      closeImageActionsMenu: vi.fn(),
      openDocumentInPortal: vi.fn(),
      closeImageGroupPreview: vi.fn(),
      closeImagePreview: vi.fn(),
      openDocumentPreview: vi.fn(),
      closeDocumentPreview: vi.fn(),
      imageGroupPreviewItems: [],
      activeImageGroupPreviewId: null,
      isImageGroupPreviewVisible: false,
      isImagePreviewOpen: false,
      isImagePreviewVisible: false,
      imagePreviewUrl: null,
      imagePreviewBackdropUrl: null,
      imagePreviewName: '',
      documentPreviewUrl: null,
      documentPreviewName: '',
      isDocumentPreviewVisible: false,
      selectImageGroupPreviewItem: vi.fn(),
      handleDownloadMessage: vi.fn(),
      handleCopyMessage: vi.fn(),
      handleReplyMessage: vi.fn(),
      handleOpenForwardMessagePicker: vi.fn(),
      activeImageGroupPreviewMessage: null,
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
      closeImageGroupPreviewVisible: vi.fn(),
      captionMessagesByAttachmentId: new Map(),
      captionMessageIds: new Set(),
    });
    mockFetchConversationMessageContext.mockResolvedValue({
      data: sourceMessages,
      error: null,
    });

    const { result } = renderHook(() =>
      useChatSidebarUiState({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        loading: false,
        userId: 'user-a',
        targetUserId: 'user-b',
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        markMessageIdsAsRead: vi.fn(async () => {}),
        mergeSearchContextMessages,
        refs: buildRefs(),
        closeMessageMenu: vi.fn(),
        getAttachmentFileName: message => message.file_name || 'Lampiran',
        getAttachmentFileKind: (_message: ChatMessage) => 'document',
        captionData: {
          captionMessagesByAttachmentId: new Map(),
          captionMessageIds: new Set(),
        },
      })
    );

    await act(async () => {
      result.current.viewport.focusReplyTargetMessage('older-image-5');
      await Promise.resolve();
    });

    expect(mockFetchConversationMessageContext).toHaveBeenCalledWith(
      'user-b',
      'older-image-5'
    );
    expect(mergeSearchContextMessages).toHaveBeenCalledWith(sourceMessages);
    expect(openImageGroupInPortal).toHaveBeenCalledWith(
      sourceMessages,
      'older-image-5',
      'https://example.com/older-image-5.png'
    );
  });
});
