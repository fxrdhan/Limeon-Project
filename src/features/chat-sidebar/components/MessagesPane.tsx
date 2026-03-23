import { LayoutGroup } from 'motion/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import {
  CHAT_COPY_LOADING_TOAST_DELAY_MS,
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_MESSAGE_CHARS,
} from '../constants';
import type { MessagesPaneModel } from '../models';
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

const formatMessageGroupDate = (value: string) => {
  const parsedDate = new Date(value);

  if (!Number.isFinite(parsedDate.getTime())) {
    return value;
  }

  return CHAT_DATE_FORMATTER.format(parsedDate);
};

const MessagesPaneContent = ({ model }: { model: MessagesPaneModel }) => {
  const { state, menu, interaction, refs, previews, actions } = model;
  const visibleMessages = state.messages.filter(
    messageItem => !previews.captionMessageIds.has(messageItem.id)
  );
  const renderItems = buildMessageRenderItems({
    messages: visibleMessages,
    captionMessagesByAttachmentId: previews.captionMessagesByAttachmentId,
    getAttachmentFileKind: previews.getAttachmentFileKind,
    enableDocumentBubbleGrouping:
      !interaction.isSelectionMode && state.normalizedSearchQuery.length === 0,
  });
  const activeImageGroupPreviewMessage = previews.activeImageGroupPreviewId
    ? state.messages.find(
        messageItem => messageItem.id === previews.activeImageGroupPreviewId
      ) || null
    : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={refs.messagesContainerRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-3 pt-20 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          overflowAnchor: 'none',
          paddingBottom:
            state.messageInputHeight + 84 + state.composerContextualOffset,
        }}
        onClick={menu.close}
        role="presentation"
      >
        {state.loading && state.messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-slate-400 text-sm">Memuat percakapan...</div>
          </div>
        ) : state.loadError && state.messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="max-w-xs rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {state.loadError}
            </div>
            <button
              type="button"
              onClick={actions.onRetryLoadMessages}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <LayoutGroup id="chat-message-menus">
            {state.loadError ? (
              <div className="pb-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>{state.loadError}</span>
                  <button
                    type="button"
                    onClick={actions.onRetryLoadMessages}
                    className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    Muat ulang
                  </button>
                </div>
              </div>
            ) : null}
            {state.hasOlderMessages ? (
              <div className="flex flex-col items-center gap-1 pb-1">
                <button
                  type="button"
                  onClick={actions.onLoadOlderMessages}
                  disabled={state.isLoadingOlderMessages}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state.isLoadingOlderMessages
                    ? 'Memuat pesan sebelumnya...'
                    : 'Muat pesan sebelumnya'}
                </button>
                {state.olderMessagesError ? (
                  <p className="text-[11px] text-rose-600">
                    {state.olderMessagesError}
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
                      resolvedMessageUrl:
                        previews.getImageMessageUrl(messageItem),
                      userId: state.user?.id,
                      isGroupedWithPrevious,
                      isGroupedWithNext,
                      isFirstVisibleMessage: index === 0,
                      hasDateSeparatorBefore: shouldRenderDateSeparator,
                      isSelectionMode: interaction.isSelectionMode,
                      isSelected: interaction.selectedMessageIds.has(
                        messageItem.id
                      ),
                      openMenuMessageId: menu.openMessageId,
                      menuPlacement: menu.placement,
                      menuSideAnchor: menu.sideAnchor,
                      shouldAnimateMenuOpen: menu.shouldAnimateOpen,
                      menuTransitionSourceId: menu.transitionSourceId,
                      menuOffsetX: menu.offsetX,
                      expandedMessageIds: interaction.expandedMessageIds,
                      flashingMessageId: interaction.flashingMessageId,
                      isFlashHighlightVisible:
                        interaction.isFlashHighlightVisible,
                      searchMatchedMessageIds:
                        interaction.searchMatchedMessageIds,
                      activeSearchMessageId: interaction.activeSearchMessageId,
                      maxMessageChars: MAX_MESSAGE_CHARS,
                      messageBubbleRefs: refs.messageBubbleRefs,
                      initialMessageAnimationKeysRef:
                        refs.initialMessageAnimationKeysRef,
                      initialOpenJumpAnimationKeysRef:
                        refs.initialOpenJumpAnimationKeysRef,
                      captionMessage: renderItem.captionMessage,
                      groupedDocumentMessages:
                        renderItem.kind === 'document-group'
                          ? renderItem.messages
                          : undefined,
                      groupedImageMessages:
                        renderItem.kind === 'image-group'
                          ? renderItem.messages
                          : undefined,
                      pdfMessagePreview: previews.getPdfMessagePreview(
                        messageItem,
                        previews.getAttachmentFileName(messageItem)
                      ),
                      onToggleMessageSelection:
                        interaction.onToggleMessageSelection,
                      toggleMessageMenu: menu.toggle,
                      handleToggleExpand: interaction.onToggleExpand,
                      handleEditMessage: actions.handleEditMessage,
                      handleCopyMessage: actions.handleCopyMessage,
                      handleDownloadMessage: actions.handleDownloadMessage,
                      handleOpenForwardMessagePicker:
                        actions.handleOpenForwardMessagePicker,
                      handleDeleteMessage: actions.handleDeleteMessage,
                      getAttachmentFileName: previews.getAttachmentFileName,
                      getAttachmentFileKind: previews.getAttachmentFileKind,
                      getImageMessageUrl: previews.getImageMessageUrl,
                      getPdfMessagePreview: previews.getPdfMessagePreview,
                      normalizedSearchQuery: state.normalizedSearchQuery,
                      openImageInPortal: previews.openImageInPortal,
                      openImageGroupInPortal: previews.openImageGroupInPortal,
                      openDocumentInPortal: previews.openDocumentInPortal,
                    }}
                  />
                </Fragment>
              );
            })}
          </LayoutGroup>
        )}
        <div ref={refs.messagesEndRef} />
      </div>

      {state.showScrollToBottom && state.messages.length > 0 ? (
        <button
          type="button"
          onClick={actions.onScrollToBottom}
          aria-label="Scroll ke pesan terbaru"
          className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-sm transition-colors hover:text-black/80"
          style={{
            bottom: Math.max(state.composerContainerHeight + 24, 46),
          }}
        >
          <TbArrowDown size={18} />
        </button>
      ) : null}

      <ImageExpandPreview
        isOpen={previews.isImagePreviewOpen}
        isVisible={previews.isImagePreviewVisible}
        onClose={previews.closeImagePreview}
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
            previews.closeImagePreview();
          }
        }}
      >
        <ProgressiveImagePreview
          fullSrc={previews.imagePreviewUrl}
          backdropSrc={previews.imagePreviewBackdropUrl}
          allowPointerPassthrough={true}
          alt={previews.imagePreviewName || 'Preview gambar'}
          className="h-[92vh] w-[92vw] box-border px-6 py-8"
          imageClassName="h-full w-full rounded-xl"
        />
      </ImageExpandPreview>

      <MultiImagePreviewPortal
        isOpen={previews.imageGroupPreviewItems.length > 0}
        isVisible={previews.isImageGroupPreviewVisible}
        previewItems={previews.imageGroupPreviewItems}
        activePreviewId={previews.activeImageGroupPreviewId}
        isActivePreviewForwardable={Boolean(
          activeImageGroupPreviewMessage &&
          !activeImageGroupPreviewMessage.id.startsWith('temp_')
        )}
        onSelectPreview={previews.selectImageGroupPreviewItem}
        onDownloadActivePreview={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void actions.handleDownloadMessage(activeImageGroupPreviewMessage);
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
        onForwardActivePreview={() => {
          if (
            !activeImageGroupPreviewMessage ||
            activeImageGroupPreviewMessage.id.startsWith('temp_')
          ) {
            return;
          }

          actions.handleOpenForwardMessagePicker(
            activeImageGroupPreviewMessage
          );
        }}
        onClose={previews.closeImageGroupPreview}
        backdropClassName="z-[80] px-4 py-6"
      />

      <DocumentPreviewPortal
        isOpen={Boolean(previews.documentPreviewUrl)}
        isVisible={previews.isDocumentPreviewVisible}
        previewUrl={previews.documentPreviewUrl}
        previewName={previews.documentPreviewName}
        onClose={previews.closeDocumentPreview}
        backdropClassName="z-[80] px-4 py-6"
        iframeTitle="Preview dokumen"
      />
    </div>
  );
};

const MessagesPane = ({ model }: { model: MessagesPaneModel }) => (
  <MessagesPaneContent model={model} />
);

export default MessagesPane;
