import { motion } from 'motion/react';
import { forwardRef } from 'react';
import { TbX } from 'react-icons/tb';
import { QuotedMessagePreview } from '../QuotedMessagePreview';

interface ComposerEditBannerProps {
  messagePreview: string;
  authorLabel: string;
  isAuthorCurrentUser: boolean;
  mode: 'edit' | 'reply';
  onCancelContext: () => void;
  onFocusTargetMessage: () => void;
  transition: {
    duration: number;
    ease:
      | 'easeIn'
      | 'easeOut'
      | 'easeInOut'
      | readonly [number, number, number, number];
    layout: {
      type: 'tween';
      ease: readonly [number, number, number, number];
      duration: number;
    };
  };
}

const ComposerEditBanner = forwardRef<HTMLDivElement, ComposerEditBannerProps>(
  (
    {
      messagePreview,
      authorLabel,
      isAuthorCurrentUser,
      mode,
      onCancelContext,
      onFocusTargetMessage,
      transition,
    },
    ref
  ) => {
    const ariaLabel =
      mode === 'reply'
        ? 'Lihat pesan yang dibalas'
        : 'Lihat pesan yang sedang diedit';
    const cancelButtonAriaLabel =
      mode === 'reply' ? 'Hapus balasan' : 'Batalkan edit';
    const cancelButtonTitle =
      mode === 'reply' ? 'Hapus balasan' : 'Batalkan edit';

    return (
      <motion.div
        ref={ref}
        layout
        key={
          mode === 'reply'
            ? 'replying-preview-inline'
            : 'editing-preview-inline'
        }
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 2 }}
        transition={transition}
        className="mb-2"
      >
        <QuotedMessagePreview
          authorLabel={authorLabel}
          previewText={messagePreview}
          isAuthorCurrentUser={isAuthorCurrentUser}
          surface="composer"
          interactiveElement="div"
          ariaLabel={ariaLabel}
          title="Klik untuk lihat pesan asal"
          containerClassName="rounded-xl hover:bg-slate-100"
          contentClassName="min-w-0 pt-1.5 pr-9 pb-1.5 pl-3"
          onActivate={onFocusTargetMessage}
          action={
            <button
              type="button"
              aria-label={cancelButtonAriaLabel}
              title={cancelButtonTitle}
              onClick={event => {
                event.stopPropagation();
                onCancelContext();
              }}
              className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <TbX className="h-4 w-4" />
            </button>
          }
        />
      </motion.div>
    );
  }
);

ComposerEditBanner.displayName = 'ComposerEditBanner';

export default ComposerEditBanner;
