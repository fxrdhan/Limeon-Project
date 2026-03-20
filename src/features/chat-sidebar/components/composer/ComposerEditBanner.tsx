import { motion } from 'motion/react';
import { forwardRef } from 'react';
import { TbPencil, TbX } from 'react-icons/tb';

interface ComposerEditBannerProps {
  editingMessagePreview: string;
  onCancelEditMessage: () => void;
  onFocusEditingTargetMessage: () => void;
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
      editingMessagePreview,
      onCancelEditMessage,
      onFocusEditingTargetMessage,
      transition,
    },
    ref
  ) => (
    <motion.div
      ref={ref}
      layout
      key="editing-preview-inline"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 2 }}
      transition={transition}
      className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-slate-700 transition-colors hover:border-primary/30 hover:bg-slate-100"
      role="button"
      tabIndex={0}
      aria-label="Lihat pesan yang sedang diedit"
      title="Klik untuk lihat pesan asal"
      onClick={onFocusEditingTargetMessage}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocusEditingTargetMessage();
        }
      }}
    >
      <button
        type="button"
        aria-label="Cancel editing message"
        onClick={event => {
          event.stopPropagation();
          onCancelEditMessage();
        }}
        className="group inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
      >
        <TbPencil className="h-4 w-4 group-hover:hidden" />
        <TbX className="hidden h-4 w-4 group-hover:block" />
      </button>
      <p className="min-w-0 flex-1 truncate text-left text-sm leading-5 text-slate-700">
        {editingMessagePreview}
      </p>
    </motion.div>
  )
);

ComposerEditBanner.displayName = 'ComposerEditBanner';

export default ComposerEditBanner;
