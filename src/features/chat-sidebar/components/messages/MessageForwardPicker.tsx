import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import Button from '@/components/button';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { ChatSidebarRuntimeState } from '../../hooks/useChatSidebarRuntimeState';
import { getAttachmentFileName } from '../../utils/attachment';

type ForwardingRuntime = Pick<ChatSidebarRuntimeState, 'mutations'>;

interface MessageForwardPickerProps {
  runtime: ForwardingRuntime;
}

const getForwardSummary = (
  targetMessage: ChatMessage | null,
  captionMessage: ChatMessage | null
) => {
  if (!targetMessage) {
    return '';
  }

  if (targetMessage.message_type === 'text') {
    return targetMessage.message;
  }

  const attachmentLabel =
    targetMessage.message_type === 'image'
      ? 'Gambar'
      : getAttachmentFileName(targetMessage);
  const captionText = captionMessage?.message.trim();

  return captionText ? `${attachmentLabel} · ${captionText}` : attachmentLabel;
};

export const MessageForwardPicker = ({
  runtime,
}: MessageForwardPickerProps) => {
  const {
    isForwardPickerOpen,
    forwardTargetMessage,
    forwardCaptionMessage,
    availableForwardRecipients,
    selectedForwardRecipientIds,
    isForwardDirectoryLoading,
    forwardDirectoryError,
    hasMoreForwardDirectoryUsers,
    isSubmittingForwardMessage,
    handleCloseForwardMessagePicker,
    handleToggleForwardRecipient,
    handleRetryLoadForwardDirectory,
    handleLoadMoreForwardDirectoryUsers,
    handleSubmitForwardMessage,
  } = runtime.mutations;

  const selectedRecipientCount = selectedForwardRecipientIds.size;
  const summary = getForwardSummary(
    forwardTargetMessage,
    forwardCaptionMessage
  );

  useEffect(() => {
    if (!isForwardPickerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseForwardMessagePicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCloseForwardMessagePicker, isForwardPickerOpen]);

  return (
    <AnimatePresence>
      {isForwardPickerOpen && forwardTargetMessage ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute inset-0 z-[82] flex items-center justify-center bg-slate-950/15 px-4 py-6 backdrop-blur-[1px]"
          onClick={handleCloseForwardMessagePicker}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pilih penerima pesan"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                Teruskan pesan
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {summary}
              </p>
            </div>

            <div className="flex-1 overflow-hidden px-3 py-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Pilih penerima
                </p>
                <p className="text-xs text-slate-400">
                  {selectedRecipientCount} dipilih
                </p>
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {isForwardDirectoryLoading &&
                availableForwardRecipients.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    Memuat daftar pengguna...
                  </div>
                ) : null}

                {forwardDirectoryError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    <p>{forwardDirectoryError}</p>
                    <button
                      type="button"
                      onClick={handleRetryLoadForwardDirectory}
                      className="mt-2 rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : null}

                {!isForwardDirectoryLoading &&
                availableForwardRecipients.length === 0 &&
                !forwardDirectoryError ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    Tidak ada pengguna lain yang tersedia.
                  </div>
                ) : null}

                {availableForwardRecipients.map(availableUser => {
                  const isSelected = selectedForwardRecipientIds.has(
                    availableUser.id
                  );

                  return (
                    <button
                      key={availableUser.id}
                      type="button"
                      onClick={() => {
                        if (!isSubmittingForwardMessage) {
                          handleToggleForwardRecipient(availableUser.id);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      } ${
                        isSubmittingForwardMessage
                          ? 'cursor-default opacity-70'
                          : 'cursor-pointer'
                      }`}
                    >
                      {availableUser.profilephoto ? (
                        <img
                          src={availableUser.profilephoto}
                          alt={availableUser.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getInitialsColor(availableUser.id)}`}
                        >
                          {getInitials(availableUser.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {availableUser.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {availableUser.email}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </div>
                    </button>
                  );
                })}
              </div>

              {hasMoreForwardDirectoryUsers && !forwardDirectoryError ? (
                <button
                  type="button"
                  onClick={handleLoadMoreForwardDirectoryUsers}
                  disabled={
                    isForwardDirectoryLoading || isSubmittingForwardMessage
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
                >
                  {isForwardDirectoryLoading
                    ? 'Memuat pengguna...'
                    : 'Muat lebih banyak'}
                </button>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <Button
                type="button"
                variant="text"
                withUnderline={false}
                onClick={handleCloseForwardMessagePicker}
                disabled={isSubmittingForwardMessage}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleSubmitForwardMessage();
                }}
                disabled={
                  selectedRecipientCount === 0 || isSubmittingForwardMessage
                }
              >
                {isSubmittingForwardMessage ? 'Mengirim...' : 'Teruskan'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default MessageForwardPicker;
