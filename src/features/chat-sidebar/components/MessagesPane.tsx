import { LayoutGroup } from 'motion/react';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { MAX_MESSAGE_CHARS } from '../constants';
import type { MessagesPaneModel } from '../models';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MessageItem from './messages/MessageItem';

const MessagesPaneContent = ({ model }: { model: MessagesPaneModel }) => {
  const { state, menu, interaction, refs, previews, actions } = model;

  return (
    <>
      <div
        ref={refs.messagesContainerRef}
        className="flex-1 overflow-x-hidden px-3 pt-20 overflow-y-auto space-y-3 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
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
            <div className="text-slate-400 text-sm">Loading messages...</div>
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
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
                >
                  {state.isLoadingOlderMessages
                    ? 'Loading older messages...'
                    : 'Load older messages'}
                </button>
                {state.olderMessagesError ? (
                  <p className="text-[11px] text-rose-600">
                    {state.olderMessagesError}
                  </p>
                ) : null}
              </div>
            ) : null}
            {state.messages.map(messageItem => {
              if (previews.captionMessageIds.has(messageItem.id)) {
                return null;
              }

              return (
                <MessageItem
                  key={messageItem.stableKey || messageItem.id}
                  model={{
                    message: messageItem,
                    resolvedMessageUrl:
                      messageItem.message_type === 'image'
                        ? previews.getImageMessageUrl(messageItem)
                        : messageItem.message,
                    userId: state.user?.id,
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
                    captionMessage: previews.captionMessagesByAttachmentId.get(
                      messageItem.id
                    ),
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
                    handleDeleteMessage: actions.handleDeleteMessage,
                    getAttachmentFileName: previews.getAttachmentFileName,
                    getAttachmentFileKind: previews.getAttachmentFileKind,
                    normalizedSearchQuery: state.normalizedSearchQuery,
                    openImageInPortal: previews.openImageInPortal,
                    openDocumentInPortal: previews.openDocumentInPortal,
                  }}
                />
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
        isOpen={Boolean(previews.imagePreviewUrl)}
        isVisible={previews.isImagePreviewVisible}
        onClose={previews.closeImagePreview}
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
        {previews.imagePreviewUrl ? (
          <img
            src={previews.imagePreviewUrl}
            alt={previews.imagePreviewName || 'Preview gambar'}
            className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
            draggable={false}
          />
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(previews.documentPreviewUrl)}
        isVisible={previews.isDocumentPreviewVisible}
        previewUrl={previews.documentPreviewUrl}
        previewName={previews.documentPreviewName}
        onClose={previews.closeDocumentPreview}
        backdropClassName="z-[80] px-4 py-6"
        iframeTitle="Preview dokumen"
      />
    </>
  );
};

const MessagesPane = ({ model }: { model: MessagesPaneModel }) => (
  <MessagesPaneContent model={model} />
);

export default MessagesPane;
