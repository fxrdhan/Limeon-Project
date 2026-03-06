import { useAuthStore } from '@/store/authStore';
import { motion } from 'motion/react';
import { memo, useCallback, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ChatHeader from './components/ChatHeader';
import ComposerPanel from './components/ComposerPanel';
import MessagesPane from './components/MessagesPane';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  COMPOSER_BASE_BORDER_COLOR,
  COMPOSER_BASE_SHADOW,
  COMPOSER_GLOW_SHADOW_FADE,
  COMPOSER_GLOW_SHADOW_HIGH,
  COMPOSER_GLOW_SHADOW_LOW,
  COMPOSER_GLOW_SHADOW_MID,
  COMPOSER_GLOW_SHADOW_PEAK,
  COMPOSER_SYNC_LAYOUT_TRANSITION,
  MAX_MESSAGE_CHARS,
  SEND_SUCCESS_GLOW_DURATION,
} from './constants';
import { useChatComposer } from './hooks/useChatComposer';
import { useChatInteractionModes } from './hooks/useChatInteractionModes';
import { useChatSession } from './hooks/useChatSession';
import { useChatViewport } from './hooks/useChatViewport';
import { useTargetProfilePhoto } from './hooks/useTargetProfilePhoto';
import type { ChatSidebarPanelProps } from './types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from './utils/attachment';
import { getInitials, getInitialsColor } from './utils/avatar';
import { generateChannelId } from './utils/channel';

const ChatSidebarPanel = memo(
  ({ isOpen, onClose, targetUser }: ChatSidebarPanelProps) => {
    const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
      () => new Set()
    );
    const { user } = useAuthStore();
    const messageInputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const composerContainerRef = useRef<HTMLDivElement>(null);
    const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
    const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
    const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
    /* c8 ignore next */
    const currentChannelId =
      user && targetUser ? generateChannelId(user.id, targetUser.id) : null;

    const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
    const {
      messages,
      setMessages,
      loading,
      targetUserPresence,
      performClose,
      broadcastNewMessage,
      broadcastUpdatedMessage,
      broadcastDeletedMessage,
      markMessageIdsAsRead,
    } = useChatSession({
      isOpen,
      user,
      targetUser,
      currentChannelId,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
    });

    const focusMessageComposer = useCallback(() => {
      const textarea = messageInputRef.current;
      if (!textarea) return;

      textarea.focus();
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, []);

    const closeMessageMenuRef = useRef<() => void>(() => {});
    const scheduleScrollToBottomRef = useRef<() => void>(() => {});
    const proxyCloseMessageMenu = useCallback(() => {
      closeMessageMenuRef.current();
    }, []);
    const proxyScheduleScrollMessagesToBottom = useCallback(() => {
      scheduleScrollToBottomRef.current();
    }, []);

    const composer = useChatComposer({
      isOpen,
      user,
      targetUser,
      currentChannelId,
      messages,
      setMessages,
      closeMessageMenu: proxyCloseMessageMenu,
      scheduleScrollMessagesToBottom: proxyScheduleScrollMessagesToBottom,
      broadcastNewMessage,
      broadcastUpdatedMessage,
      broadcastDeletedMessage,
      messageInputRef,
      focusMessageComposer,
    });

    const interaction = useChatInteractionModes({
      isOpen,
      currentChannelId,
      messages,
      user,
      targetUser,
      closeMessageMenu: proxyCloseMessageMenu,
      getAttachmentFileName,
    });

    const viewport = useChatViewport({
      isOpen,
      currentChannelId,
      messages,
      userId: user?.id,
      targetUserId: targetUser?.id,
      messagesCount: messages.length,
      loading,
      messageInputHeight: composer.messageInputHeight,
      composerContextualOffset: composer.composerContextualOffset,
      isMessageInputMultiline: composer.isMessageInputMultiline,
      pendingComposerAttachmentsCount:
        composer.pendingComposerAttachments.length,
      normalizedMessageSearchQuery: interaction.normalizedMessageSearchQuery,
      isMessageSearchMode: interaction.isMessageSearchMode,
      activeSearchMessageId: interaction.activeSearchMessageId,
      searchNavigationTick: interaction.searchNavigationTick,
      editingMessageId: composer.editingMessageId,
      focusMessageComposer,
      markMessageIdsAsRead,
      messagesContainerRef,
      messagesEndRef,
      composerContainerRef,
      chatHeaderContainerRef,
      messageBubbleRefs,
    });
    closeMessageMenuRef.current = viewport.closeMessageMenu;
    scheduleScrollToBottomRef.current = viewport.scheduleScrollMessagesToBottom;

    const toggleMessageMenu = useCallback(
      (
        anchor: HTMLElement,
        messageId: string,
        preferredSide: 'left' | 'right'
      ) => {
        composer.closeAttachModal();
        viewport.toggleMessageMenu(anchor, messageId, preferredSide);
      },
      [composer, viewport]
    );

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

    const handleDeleteSelectedMessages = useCallback(async () => {
      if (!user) return;

      const deletableMessages = interaction.selectedVisibleMessages.filter(
        messageItem => messageItem.sender_id === user.id
      );

      if (deletableMessages.length === 0) {
        toast.error('Pilih minimal 1 pesan Anda untuk dihapus', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      for (const messageItem of deletableMessages) {
        await composer.handleDeleteMessage(messageItem);
      }

      const deletedMessageIds = new Set(
        deletableMessages.map(messageItem => messageItem.id)
      );
      interaction.setSelectedMessageIds(previousSelectedIds => {
        const nextSelectedIds = new Set<string>();
        previousSelectedIds.forEach(messageId => {
          if (!deletedMessageIds.has(messageId)) {
            nextSelectedIds.add(messageId);
          }
        });
        return nextSelectedIds;
      });

      toast.success(`${deletableMessages.length} pesan berhasil dihapus`, {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    }, [composer, interaction, user]);

    const handleClose = useCallback(async () => {
      await performClose();
      onClose();
    }, [onClose, performClose]);

    if (!isOpen) {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative h-full w-full select-none"
        onClickCapture={viewport.handleChatPortalBackgroundClick}
      >
        <Toaster
          toasterId={CHAT_SIDEBAR_TOASTER_ID}
          position="top-right"
          containerStyle={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
          toastOptions={{
            style: {
              boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(226, 232, 240, 1)',
              color: '#0f172a',
            },
            success: {
              style: {
                backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.9)',
                color: 'white',
                border: '1px solid oklch(26.2% 0.051 172.552 / 0.3)',
              },
            },
            error: {
              style: {
                backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.9)',
                color: 'white',
                border: '1px solid oklch(27.1% 0.105 12.094 / 0.3)',
              },
            },
          }}
        />

        <div className="relative h-full flex flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-white via-white/92 via-white/72 to-transparent transition-opacity duration-300 ease-in-out ${
                viewport.isAtTop ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <div
              ref={chatHeaderContainerRef}
              className="pointer-events-auto relative z-10"
            >
              <ChatHeader
                targetUser={targetUser}
                displayTargetPhotoUrl={displayTargetPhotoUrl}
                targetUserPresence={targetUserPresence}
                currentChannelId={currentChannelId}
                isSearchMode={interaction.isMessageSearchMode}
                searchQuery={interaction.messageSearchQuery}
                searchState={interaction.messageSearchState}
                searchResultCount={interaction.searchMatchedMessageIds.length}
                activeSearchResultIndex={Math.max(
                  interaction.activeSearchResultIndex,
                  0
                )}
                canNavigateSearchUp={interaction.canNavigateSearchUp}
                canNavigateSearchDown={interaction.canNavigateSearchDown}
                isSelectionMode={interaction.isSelectionMode}
                selectedMessageCount={
                  interaction.selectedVisibleMessages.length
                }
                canDeleteSelectedMessages={
                  interaction.canDeleteSelectedMessages
                }
                searchInputRef={interaction.searchInputRef}
                onEnterSearchMode={interaction.handleEnterMessageSearchMode}
                onExitSearchMode={interaction.handleExitMessageSearchMode}
                onEnterSelectionMode={
                  interaction.handleEnterMessageSelectionMode
                }
                onExitSelectionMode={interaction.handleExitMessageSelectionMode}
                onSearchQueryChange={interaction.handleMessageSearchQueryChange}
                onNavigateSearchUp={interaction.handleNavigateSearchUp}
                onNavigateSearchDown={interaction.handleNavigateSearchDown}
                onFocusSearchInput={interaction.handleFocusSearchInput}
                onCopySelectedMessages={interaction.handleCopySelectedMessages}
                onDeleteSelectedMessages={handleDeleteSelectedMessages}
                onClose={handleClose}
                getInitials={getInitials}
                getInitialsColor={getInitialsColor}
              />
            </div>
          </div>

          <div className="min-h-0 flex flex-1 flex-col">
            <MessagesPane
              loading={loading}
              messages={messages}
              user={user}
              messageInputHeight={composer.messageInputHeight}
              composerContextualOffset={composer.composerContextualOffset}
              composerContainerHeight={viewport.composerContainerHeight}
              openMenuMessageId={viewport.openMenuMessageId}
              menuPlacement={viewport.menuPlacement}
              menuSideAnchor={viewport.menuSideAnchor}
              shouldAnimateMenuOpen={viewport.shouldAnimateMenuOpen}
              menuTransitionSourceId={viewport.menuTransitionSourceId}
              menuOffsetX={viewport.menuOffsetX}
              expandedMessageIds={expandedMessageIds}
              flashingMessageId={viewport.flashingMessageId}
              isFlashHighlightVisible={viewport.isFlashHighlightVisible}
              isSelectionMode={interaction.isSelectionMode}
              selectedMessageIds={interaction.selectedMessageIds}
              searchQuery={
                interaction.isMessageSearchMode
                  ? interaction.messageSearchQuery
                  : ''
              }
              searchMatchedMessageIds={
                interaction.isMessageSearchMode
                  ? interaction.searchMatchedMessageIdSet
                  : new Set()
              }
              activeSearchMessageId={
                interaction.isMessageSearchMode
                  ? interaction.activeSearchMessageId
                  : null
              }
              showScrollToBottom={
                viewport.hasNewMessages || !viewport.isAtBottom
              }
              maxMessageChars={MAX_MESSAGE_CHARS}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              messageBubbleRefs={messageBubbleRefs}
              initialMessageAnimationKeysRef={initialMessageAnimationKeysRef}
              initialOpenJumpAnimationKeysRef={initialOpenJumpAnimationKeysRef}
              closeMessageMenu={viewport.closeMessageMenu}
              toggleMessageMenu={toggleMessageMenu}
              handleToggleExpand={handleToggleExpand}
              handleEditMessage={composer.handleEditMessage}
              handleCopyMessage={composer.handleCopyMessage}
              handleDownloadMessage={composer.handleDownloadMessage}
              handleDeleteMessage={composer.handleDeleteMessage}
              onToggleMessageSelection={
                interaction.handleToggleMessageSelection
              }
              getAttachmentFileName={getAttachmentFileName}
              getAttachmentFileKind={getAttachmentFileKind}
              onScrollToBottom={viewport.scrollToBottom}
            />
          </div>

          <ComposerPanel
            message={composer.message}
            editingMessagePreview={composer.editingMessagePreview}
            messageInputHeight={composer.messageInputHeight}
            isMessageInputMultiline={composer.isMessageInputMultiline}
            isSendSuccessGlowVisible={composer.isSendSuccessGlowVisible}
            isAttachModalOpen={composer.isAttachModalOpen}
            pendingComposerAttachments={composer.pendingComposerAttachments}
            previewComposerImageAttachment={
              composer.previewComposerImageAttachment
            }
            isComposerImageExpanded={composer.isComposerImageExpanded}
            isComposerImageExpandedVisible={
              composer.isComposerImageExpandedVisible
            }
            messageInputRef={messageInputRef}
            composerContainerRef={composerContainerRef}
            attachButtonRef={composer.attachButtonRef}
            attachModalRef={composer.attachModalRef}
            imageInputRef={composer.imageInputRef}
            documentInputRef={composer.documentInputRef}
            audioInputRef={composer.audioInputRef}
            composerSyncLayoutTransition={COMPOSER_SYNC_LAYOUT_TRANSITION}
            composerBaseBorderColor={COMPOSER_BASE_BORDER_COLOR}
            composerBaseShadow={COMPOSER_BASE_SHADOW}
            composerGlowShadowPeak={COMPOSER_GLOW_SHADOW_PEAK}
            composerGlowShadowHigh={COMPOSER_GLOW_SHADOW_HIGH}
            composerGlowShadowMid={COMPOSER_GLOW_SHADOW_MID}
            composerGlowShadowFade={COMPOSER_GLOW_SHADOW_FADE}
            composerGlowShadowLow={COMPOSER_GLOW_SHADOW_LOW}
            sendSuccessGlowDuration={SEND_SUCCESS_GLOW_DURATION}
            onMessageChange={composer.setMessage}
            onKeyDown={composer.handleKeyPress}
            onPaste={composer.handleComposerPaste}
            onSendMessage={composer.handleSendMessage}
            onAttachButtonClick={composer.handleAttachButtonClick}
            onAttachImageClick={composer.handleAttachImageClick}
            onAttachDocumentClick={composer.handleAttachDocumentClick}
            onAttachAudioClick={composer.handleAttachAudioClick}
            onImageFileChange={composer.handleImageFileChange}
            onDocumentFileChange={composer.handleDocumentFileChange}
            onAudioFileChange={composer.handleAudioFileChange}
            onCancelEditMessage={composer.handleCancelEditMessage}
            onFocusEditingTargetMessage={viewport.focusEditingTargetMessage}
            onOpenComposerImagePreview={composer.openComposerImagePreview}
            onCloseComposerImagePreview={composer.closeComposerImagePreview}
            onRemovePendingComposerAttachment={
              composer.removePendingComposerAttachment
            }
            onQueueComposerImage={composer.queueComposerImage}
          />
        </div>
      </motion.div>
    );
  }
);

ChatSidebarPanel.displayName = 'ChatSidebarPanel';

export default ChatSidebarPanel;
