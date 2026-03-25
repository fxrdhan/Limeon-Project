import { LayoutGroup } from 'motion/react';
import { Fragment } from 'react';
import { TbArrowDown } from 'react-icons/tb';
import { buildMessageItemModel } from './messages/buildMessageItemModel';
import MessageItem from './messages/MessageItem';
import type { MessagesPaneRuntime } from './messagesPaneRuntime';
import { MessagesPanePreviewPortals } from './MessagesPanePreviewPortals';

const CHAT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

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
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={runtime.messagesContainerRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-3 pt-20 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          overflowAnchor: 'none',
          paddingBottom: runtime.paddingBottom,
        }}
        onClick={runtime.closeMessageMenu}
        role="presentation"
      >
        <div ref={runtime.messagesContentRef}>
          {runtime.loading && runtime.messages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-slate-400">Memuat percakapan...</div>
            </div>
          ) : runtime.loadError && runtime.messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="max-w-xs rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {runtime.loadError}
              </div>
              <button
                type="button"
                onClick={runtime.retryLoadMessages}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <LayoutGroup id="chat-message-menus">
              {runtime.loadError ? (
                <div className="pb-2">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span>{runtime.loadError}</span>
                    <button
                      type="button"
                      onClick={runtime.retryLoadMessages}
                      className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Muat ulang
                    </button>
                  </div>
                </div>
              ) : null}

              {runtime.hasOlderMessages ? (
                <div className="flex flex-col items-center gap-1 pb-1">
                  <button
                    type="button"
                    onClick={runtime.loadOlderMessages}
                    disabled={runtime.isLoadingOlderMessages}
                    className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runtime.isLoadingOlderMessages
                      ? 'Memuat pesan sebelumnya...'
                      : 'Muat pesan sebelumnya'}
                  </button>
                  {runtime.olderMessagesError ? (
                    <p className="text-[11px] text-rose-600">
                      {runtime.olderMessagesError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {runtime.renderItems.map((renderItem, index) => {
                const messageItem = renderItem.anchorMessage;
                const previousMessage =
                  index > 0
                    ? runtime.renderItems[index - 1]?.anchorMessage || null
                    : null;
                const nextMessage =
                  index < runtime.renderItems.length - 1
                    ? runtime.renderItems[index + 1]?.anchorMessage || null
                    : null;
                const messageModel = buildMessageItemModel({
                  runtime: runtime.itemRuntime,
                  renderItem,
                  index,
                  previousMessage,
                  nextMessage,
                  searchMatchedMessageIds: runtime.searchMatchedMessageIds,
                  activeSearchMessageId: runtime.activeSearchMessageId,
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

          <div ref={runtime.messagesEndRef} />
        </div>
      </div>

      {(runtime.hasNewMessages || !runtime.isAtBottom) &&
      runtime.messages.length > 0 ? (
        <button
          type="button"
          onClick={runtime.scrollToBottom}
          aria-label="Scroll ke pesan terbaru"
          className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-sm transition-colors hover:text-black/80"
          style={{
            bottom: Math.max(runtime.composerContainerHeight + 24, 46),
          }}
        >
          <TbArrowDown size={18} />
        </button>
      ) : null}
      <MessagesPanePreviewPortals
        runtime={runtime.previewRuntime}
        activeImageGroupPreviewMessage={runtime.activeImageGroupPreviewMessage}
      />
    </div>
  );
};

export default MessagesPane;
