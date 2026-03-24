import { LayoutGroup } from 'motion/react';
import { Fragment } from 'react';
import { TbArrowDown } from 'react-icons/tb';
import { MESSAGE_BOTTOM_GAP } from '../constants';
import { buildMessageRenderItems } from '../utils/message-render-items';
import { buildMessageItemModel } from './messages/buildMessageItemModel';
import MessageItem from './messages/MessageItem';
import type { MessagesPaneRuntime } from './messagesPaneRuntime';
import { MessagesPanePreviewPortals } from './MessagesPanePreviewPortals';

const CHAT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const COMPOSER_BOTTOM_OFFSET = 8;
const EMPTY_MESSAGE_IDS = new Set<string>();

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
  const searchMatchedMessageIds = runtime.interaction.isMessageSearchMode
    ? runtime.interaction.searchMatchedMessageIdSet
    : EMPTY_MESSAGE_IDS;
  const activeSearchMessageId = runtime.interaction.isMessageSearchMode
    ? runtime.interaction.activeSearchMessageId
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
                  index > 0
                    ? renderItems[index - 1]?.anchorMessage || null
                    : null;
                const nextMessage =
                  index < renderItems.length - 1
                    ? renderItems[index + 1]?.anchorMessage || null
                    : null;
                const messageModel = buildMessageItemModel({
                  runtime,
                  renderItem,
                  index,
                  previousMessage,
                  nextMessage,
                  searchMatchedMessageIds,
                  activeSearchMessageId,
                });
                const shouldRenderDateSeparator = Boolean(
                  messageModel.layout.hasDateSeparatorBefore
                );

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

                    <MessageItem model={messageModel} />
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
      <MessagesPanePreviewPortals
        runtime={runtime}
        activeImageGroupPreviewMessage={activeImageGroupPreviewMessage}
      />
    </div>
  );
};

export default MessagesPane;
