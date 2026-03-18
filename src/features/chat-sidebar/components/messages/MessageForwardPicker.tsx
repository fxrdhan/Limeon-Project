import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import Button from '@/components/button';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { MessagesPaneModel } from '../../models';
import { getAttachmentFileName } from '../../utils/attachment';

interface MessageForwardPickerProps {
  model: MessagesPaneModel['forwarding'];
}

const getForwardSummary = (
  targetMessage: MessagesPaneModel['forwarding']['targetMessage'],
  captionMessage: MessagesPaneModel['forwarding']['captionMessage']
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

export const MessageForwardPicker = ({ model }: MessageForwardPickerProps) => {
  const {
    isOpen,
    targetMessage,
    captionMessage,
    availableUsers,
    selectedRecipientIds,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    isSubmitting,
    onClose,
    onToggleRecipient,
    onRetryLoadDirectory,
    onLoadMoreDirectoryUsers,
    onSubmit,
  } = model;

  const selectedRecipientCount = selectedRecipientIds.size;
  const summary = getForwardSummary(targetMessage, captionMessage);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && targetMessage ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute inset-0 z-[82] flex items-center justify-center bg-slate-950/15 px-4 py-6 backdrop-blur-[1px]"
          onClick={onClose}
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
                {isDirectoryLoading && availableUsers.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    Memuat daftar pengguna...
                  </div>
                ) : null}

                {directoryError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    <p>{directoryError}</p>
                    <button
                      type="button"
                      onClick={onRetryLoadDirectory}
                      className="mt-2 rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : null}

                {!isDirectoryLoading &&
                availableUsers.length === 0 &&
                !directoryError ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    Tidak ada pengguna lain yang tersedia.
                  </div>
                ) : null}

                {availableUsers.map(availableUser => {
                  const isSelected = selectedRecipientIds.has(availableUser.id);

                  return (
                    <button
                      key={availableUser.id}
                      type="button"
                      onClick={() => {
                        if (!isSubmitting) {
                          onToggleRecipient(availableUser.id);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      } ${isSubmitting ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
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
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
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

              {hasMoreDirectoryUsers && !directoryError ? (
                <button
                  type="button"
                  onClick={onLoadMoreDirectoryUsers}
                  disabled={isDirectoryLoading || isSubmitting}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
                >
                  {isDirectoryLoading
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void onSubmit();
                }}
                isLoading={isSubmitting}
                disabled={selectedRecipientCount === 0}
              >
                Kirim
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default MessageForwardPicker;
