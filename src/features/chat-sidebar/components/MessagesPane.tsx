import { LayoutGroup } from 'motion/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import {
  CHAT_COPY_LOADING_TOAST_DELAY_MS,
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_MESSAGE_CHARS,
  MESSAGE_BOTTOM_GAP,
} from '../constants';
import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';
import {
  openChatFileInNewTab,
  resolveCopyableChatAssetUrl,
} from '../utils/message-file';
import { buildMessageRenderItems } from '../utils/message-render-items';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MultiImagePreviewPortal from './MultiImagePreviewPortal';
import ProgressiveImagePreview from './ProgressiveImagePreview';
import MessageItem from './messages/MessageItem';

const CHAT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const COMPOSER_BOTTOM_OFFSET = 8;

type MessagesPaneRuntime = Pick<
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

interface MessagesPaneProps {
  runtime: MessagesPaneRuntime;
}

const formatMessageGroupDate = (value: string) => {
  const parsedDate = new Date(value);

  if (!Number.isFinite(parsedDate.getTime())) {
    return value;
  }

  return CHAT_DATE_FORMATTER.format(parsedDate);
};

const MessagesPane = ({ runtime }: MessagesPaneProps) => {
  const visibleMessages = runtime.session.messages.filter(
    messageItem => !runtime.previews.captionMessageIds.has(messageItem.id)
  );
  const renderItems = buildMessageRenderItems({
    messages: visibleMessages,
    captionMessagesByAttachmentId:
      runtime.previews.captionMessagesByAttachmentId,
    getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
    enableDocumentBubbleGrouping:
      !runtime.interaction.isSelectionMode &&
      runtime.interaction.normalizedMessageSearchQuery.length === 0,
  });
  const activeImageGroupPreviewMessage = runtime.previews
    .activeImageGroupPreviewId
    ? runtime.session.messages.find(
        messageItem =>
          messageItem.id === runtime.previews.activeImageGroupPreviewId
      ) || null
    : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={runtime.refs.messagesContainerRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-3 pt-20 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          overflowAnchor: 'none',
          paddingBottom: Math.max(
            runtime.viewport.composerContainerHeight +
              COMPOSER_BOTTOM_OFFSET +
              MESSAGE_BOTTOM_GAP,
            runtime.composer.messageInputHeight +
              84 +
              runtime.composer.composerContextualOffset
          ),
        }}
        onClick={runtime.viewport.closeMessageMenu}
        role="presentation"
      >
        <div ref={runtime.refs.messagesContentRef}>
          {runtime.session.loading && runtime.session.messages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-slate-400">Memuat percakapan...</div>
            </div>
          ) : runtime.session.loadError &&
            runtime.session.messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="max-w-xs rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {runtime.session.loadError}
              </div>
              <button
                type="button"
                onClick={runtime.session.retryLoadMessages}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <LayoutGroup id="chat-message-menus">
              {runtime.session.loadError ? (
                <div className="pb-2">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span>{runtime.session.loadError}</span>
                    <button
                      type="button"
                      onClick={runtime.session.retryLoadMessages}
                      className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Muat ulang
                    </button>
                  </div>
                </div>
              ) : null}

              {runtime.session.hasOlderMessages ? (
                <div className="flex flex-col items-center gap-1 pb-1">
                  <button
                    type="button"
                    onClick={runtime.session.loadOlderMessages}
                    disabled={runtime.session.isLoadingOlderMessages}
                    className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runtime.session.isLoadingOlderMessages
                      ? 'Memuat pesan sebelumnya...'
                      : 'Muat pesan sebelumnya'}
                  </button>
                  {runtime.session.olderMessagesError ? (
                    <p className="text-[11px] text-rose-600">
                      {runtime.session.olderMessagesError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {renderItems.map((renderItem, index) => {
                const messageItem = renderItem.anchorMessage;
                const previousMessage =
                  index > 0 ? renderItems[index - 1]?.anchorMessage : null;
                const nextMessage =
                  index < renderItems.length - 1
                    ? renderItems[index + 1]?.anchorMessage
                    : null;
                const currentMessageDate = new Date(
                  messageItem.created_at
                ).toDateString();
                const previousMessageDate = previousMessage
                  ? new Date(previousMessage.created_at).toDateString()
                  : null;
                const shouldRenderDateSeparator =
                  index === 0 || previousMessageDate !== currentMessageDate;
                const isGroupedWithPrevious =
                  previousMessage?.sender_id === messageItem.sender_id &&
                  previousMessageDate === currentMessageDate;
                const isGroupedWithNext =
                  nextMessage?.sender_id === messageItem.sender_id &&
                  new Date(nextMessage.created_at).toDateString() ===
                    currentMessageDate;

                return (
                  <Fragment key={renderItem.key}>
                    {shouldRenderDateSeparator ? (
                      <div
                        className={`flex justify-center ${
                          index === 0 ? 'pb-3' : 'py-3'
                        }`}
                      >
                        <div className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-black shadow-none">
                          {formatMessageGroupDate(messageItem.created_at)}
                        </div>
                      </div>
                    ) : null}

                    <MessageItem
                      model={{
                        message: messageItem,
                        layout: {
                          isGroupedWithPrevious,
                          isGroupedWithNext,
                          isFirstVisibleMessage: index === 0,
                          hasDateSeparatorBefore: shouldRenderDateSeparator,
                        },
                        interaction: {
                          userId: runtime.user?.id,
                          isSelectionMode: runtime.interaction.isSelectionMode,
                          isSelected:
                            runtime.interaction.selectedMessageIds.has(
                              messageItem.id
                            ),
                          expandedMessageIds: runtime.refs.expandedMessageIds,
                          flashingMessageId: runtime.viewport.flashingMessageId,
                          isFlashHighlightVisible:
                            runtime.viewport.isFlashHighlightVisible,
                          searchMatchedMessageIds: runtime.interaction
                            .isMessageSearchMode
                            ? runtime.interaction.searchMatchedMessageIdSet
                            : new Set<string>(),
                          activeSearchMessageId: runtime.interaction
                            .isMessageSearchMode
                            ? runtime.interaction.activeSearchMessageId
                            : null,
                          maxMessageChars: MAX_MESSAGE_CHARS,
                          onToggleMessageSelection:
                            runtime.interaction.handleToggleMessageSelection,
                          handleToggleExpand: runtime.refs.handleToggleExpand,
                        },
                        menu: {
                          openMessageId: runtime.viewport.openMenuMessageId,
                          placement: runtime.viewport.menuPlacement,
                          sideAnchor: runtime.viewport.menuSideAnchor,
                          shouldAnimateOpen:
                            runtime.viewport.shouldAnimateMenuOpen,
                          transitionSourceId:
                            runtime.viewport.menuTransitionSourceId,
                          offsetX: runtime.viewport.menuOffsetX,
                          toggle: runtime.actions.toggleMessageMenu,
                        },
                        refs: {
                          messageBubbleRefs: runtime.refs.messageBubbleRefs,
                          initialMessageAnimationKeysRef:
                            runtime.refs.initialMessageAnimationKeysRef,
                          initialOpenJumpAnimationKeysRef:
                            runtime.refs.initialOpenJumpAnimationKeysRef,
                        },
                        content: {
                          resolvedMessageUrl:
                            runtime.previews.getImageMessageUrl(messageItem),
                          captionMessage: renderItem.captionMessage,
                          groupedDocumentMessages:
                            renderItem.kind === 'document-group'
                              ? renderItem.messages
                              : undefined,
                          groupedImageMessages:
                            renderItem.kind === 'image-group'
                              ? renderItem.messages
                              : undefined,
                          pdfMessagePreview:
                            runtime.previews.getPdfMessagePreview(
                              messageItem,
                              runtime.actions.getAttachmentFileName(messageItem)
                            ),
                          getAttachmentFileName:
                            runtime.actions.getAttachmentFileName,
                          getAttachmentFileKind:
                            runtime.actions.getAttachmentFileKind,
                          getImageMessageUrl:
                            runtime.previews.getImageMessageUrl,
                          getPdfMessagePreview:
                            runtime.previews.getPdfMessagePreview,
                          normalizedSearchQuery:
                            runtime.interaction.normalizedMessageSearchQuery,
                          openImageInPortal: runtime.previews.openImageInPortal,
                          openImageGroupInPortal:
                            runtime.previews.openImageGroupInPortal,
                          openDocumentInPortal:
                            runtime.previews.openDocumentInPortal,
                        },
                        actions: {
                          handleEditMessage:
                            runtime.mutations.handleEditMessage,
                          handleCopyMessage:
                            runtime.mutations.handleCopyMessage,
                          handleDownloadMessage:
                            runtime.mutations.handleDownloadMessage,
                          handleOpenForwardMessagePicker:
                            runtime.mutations.handleOpenForwardMessagePicker,
                          handleDeleteMessage:
                            runtime.mutations.handleDeleteMessage,
                        },
                      }}
                    />
                  </Fragment>
                );
              })}
            </LayoutGroup>
          )}

          <div ref={runtime.refs.messagesEndRef} />
        </div>
      </div>

      {(runtime.viewport.hasNewMessages || !runtime.viewport.isAtBottom) &&
      runtime.session.messages.length > 0 ? (
        <button
          type="button"
          onClick={runtime.viewport.scrollToBottom}
          aria-label="Scroll ke pesan terbaru"
          className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-sm transition-colors hover:text-black/80"
          style={{
            bottom: Math.max(runtime.viewport.composerContainerHeight + 24, 46),
          }}
        >
          <TbArrowDown size={18} />
        </button>
      ) : null}

      <ImageExpandPreview
        isOpen={runtime.previews.isImagePreviewOpen}
        isVisible={runtime.previews.isImagePreviewVisible}
        onClose={runtime.previews.closeImagePreview}
        animateScale={false}
        closeOnContentBackgroundClick={true}
        backdropClassName="z-[79] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            runtime.previews.closeImagePreview();
          }
        }}
      >
        <ProgressiveImagePreview
          fullSrc={runtime.previews.imagePreviewUrl}
          backdropSrc={runtime.previews.imagePreviewBackdropUrl}
          allowPointerPassthrough={true}
          alt={runtime.previews.imagePreviewName || 'Preview gambar'}
          className="h-[92vh] w-[92vw] box-border px-6 py-8"
          imageClassName="h-full w-full rounded-xl"
        />
      </ImageExpandPreview>

      <MultiImagePreviewPortal
        isOpen={runtime.previews.imageGroupPreviewItems.length > 0}
        isVisible={runtime.previews.isImageGroupPreviewVisible}
        previewItems={runtime.previews.imageGroupPreviewItems}
        activePreviewId={runtime.previews.activeImageGroupPreviewId}
        isActivePreviewForwardable={Boolean(
          activeImageGroupPreviewMessage &&
          !activeImageGroupPreviewMessage.id.startsWith('temp_')
        )}
        onSelectPreview={runtime.previews.selectImageGroupPreviewItem}
        onDownloadActivePreview={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void runtime.mutations.handleDownloadMessage(
            activeImageGroupPreviewMessage
          );
        }}
        onOpenActivePreviewInNewTab={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void openChatFileInNewTab(
            activeImageGroupPreviewMessage.message,
            activeImageGroupPreviewMessage.file_storage_path,
            activeImageGroupPreviewMessage.file_mime_type
          );
        }}
        onCopyActivePreviewLink={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void (async () => {
            const loadingToastId = 'chat-copy-image-link';
            let didShowLoadingToast = false;
            const loadingToastTimeout = window.setTimeout(() => {
              didShowLoadingToast = true;
              toast.loading('Menyiapkan link gambar...', {
                id: loadingToastId,
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }, CHAT_COPY_LOADING_TOAST_DELAY_MS);

            try {
              const copyableUrl = await resolveCopyableChatAssetUrl(
                activeImageGroupPreviewMessage.message,
                activeImageGroupPreviewMessage.file_storage_path,
                {
                  messageId: activeImageGroupPreviewMessage.id,
                  sharedLinkSlug:
                    activeImageGroupPreviewMessage.shared_link_slug,
                }
              );

              if (!copyableUrl) {
                throw new Error('Link gambar tidak tersedia');
              }

              await navigator.clipboard.writeText(copyableUrl);
              window.clearTimeout(loadingToastTimeout);
              toast.success('Link gambar berhasil disalin', {
                id: didShowLoadingToast ? loadingToastId : undefined,
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            } catch (error) {
              window.clearTimeout(loadingToastTimeout);
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Gagal menyalin link gambar',
                {
                  id: didShowLoadingToast ? loadingToastId : undefined,
                  toasterId: CHAT_SIDEBAR_TOASTER_ID,
                }
              );
              console.error('Failed to copy image link:', error);
            }
          })();
        }}
        onCopyActivePreviewImage={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void runtime.mutations.handleCopyMessage(
            activeImageGroupPreviewMessage
          );
        }}
        onForwardActivePreview={() => {
          if (
            !activeImageGroupPreviewMessage ||
            activeImageGroupPreviewMessage.id.startsWith('temp_')
          ) {
            return;
          }

          runtime.mutations.handleOpenForwardMessagePicker(
            activeImageGroupPreviewMessage
          );
        }}
        onClose={runtime.previews.closeImageGroupPreview}
        backdropClassName="z-[80] px-4 py-6"
      />

      <DocumentPreviewPortal
        isOpen={Boolean(runtime.previews.documentPreviewUrl)}
        isVisible={runtime.previews.isDocumentPreviewVisible}
        previewUrl={runtime.previews.documentPreviewUrl}
        previewName={runtime.previews.documentPreviewName}
        onClose={runtime.previews.closeDocumentPreview}
        backdropClassName="z-[80] px-4 py-6"
        iframeTitle="Preview dokumen"
      />
    </div>
  );
};

export default MessagesPane;
