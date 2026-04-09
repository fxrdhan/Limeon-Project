import { motion } from 'motion/react';
import { forwardRef } from 'react';
import { TbCornerUpLeft, TbPencil, TbX } from 'react-icons/tb';

interface ComposerEditBannerProps {
  messagePreview: string;
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
    { messagePreview, mode, onCancelContext, onFocusTargetMessage, transition },
    ref
  ) => {
    const Icon = mode === 'reply' ? TbCornerUpLeft : TbPencil;
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
        className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-slate-700 transition-colors hover:border-primary/30 hover:bg-slate-100"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        title="Klik untuk lihat pesan asal"
        onClick={onFocusTargetMessage}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFocusTargetMessage();
          }
        }}
      >
        <button
          type="button"
          aria-label={cancelButtonAriaLabel}
          title={cancelButtonTitle}
          onClick={event => {
            event.stopPropagation();
            onCancelContext();
          }}
          className="group inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <Icon className="h-4 w-4 group-hover:hidden" />
          <TbX className="hidden h-4 w-4 group-hover:block" />
        </button>
        <p className="min-w-0 flex-1 truncate text-left text-sm leading-5 text-slate-700">
          {messagePreview}
        </p>
      </motion.div>
    );
  }
);

ComposerEditBanner.displayName = 'ComposerEditBanner';

export default ComposerEditBanner;
