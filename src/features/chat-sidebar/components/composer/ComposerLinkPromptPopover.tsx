import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { TbArrowUpRight, TbCopy, TbLink, TbPaperclip } from 'react-icons/tb';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { RefObject } from 'react';

const ATTACHMENT_LINK_PROMPT_MIN_WIDTH = 156;
const ATTACHMENT_PROMPT_BUTTON_CLASS_NAME =
  'flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-black transition-colors hover:bg-slate-100';
const ATTACHMENT_PROMPT_SECTION_LABEL_CLASS_NAME =
  'px-2.5 pb-1 pt-1.5 text-[11px] font-medium tracking-[0.03em] text-slate-500';

interface ComposerLinkPromptPopoverProps {
  isOpen: boolean;
  position: {
    left: number;
    top: number;
  } | null;
  isAttachmentCandidate: boolean;
  isShortenable: boolean;
  promptRef: RefObject<HTMLDivElement | null>;
  onCopyLink: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenLink: () => void;
  onShortenLink: () => void;
  onUseAsAttachment: () => void;
  onUseAsUrl: () => void;
}

export const ComposerLinkPromptPopover = ({
  isOpen,
  position,
  isAttachmentCandidate,
  isShortenable,
  promptRef,
  onCopyLink,
  onMouseEnter,
  onMouseLeave,
  onOpenLink,
  onShortenLink,
  onUseAsAttachment,
  onUseAsUrl,
}: ComposerLinkPromptPopoverProps) => {
  if (typeof document === 'undefined' || !isOpen || !position) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[120]"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, calc(-100% - 10px))',
      }}
    >
      <PopupMenuPopover isOpen className="origin-bottom">
        <div
          ref={promptRef}
          className="rounded-xl border border-slate-200 bg-white px-0.5 py-0.5 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
          style={{ minWidth: ATTACHMENT_LINK_PROMPT_MIN_WIDTH }}
          onClick={event => event.stopPropagation()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          role="dialog"
          aria-label="Aksi link composer"
        >
          <div className={ATTACHMENT_PROMPT_SECTION_LABEL_CLASS_NAME}>Aksi</div>
          <button
            type="button"
            onClick={onOpenLink}
            className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
          >
            <TbArrowUpRight className="h-4 w-4 text-black" aria-hidden="true" />
            <span>Buka</span>
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
          >
            <TbCopy className="h-4 w-4 text-black" aria-hidden="true" />
            <span>Salin</span>
          </button>
          {isShortenable ? (
            <button
              type="button"
              onClick={onShortenLink}
              className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
            >
              <TbLink className="h-4 w-4 text-black" aria-hidden="true" />
              <span>Shorten link</span>
            </button>
          ) : null}
          <AnimatePresence initial={false}>
            {isAttachmentCandidate ? (
              <motion.div
                key="attachment-paste-actions"
                initial={{ height: 0, opacity: 0, y: -4 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mx-1 my-0.5 h-px bg-slate-200" />
                <div className={ATTACHMENT_PROMPT_SECTION_LABEL_CLASS_NAME}>
                  Tempel sebagai
                </div>
                <button
                  type="button"
                  onClick={onUseAsUrl}
                  className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
                >
                  <TbLink className="h-4 w-4 text-black" aria-hidden="true" />
                  <span>URL</span>
                </button>
                <button
                  type="button"
                  onClick={onUseAsAttachment}
                  className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
                >
                  <TbPaperclip
                    className="h-4 w-4 text-black"
                    aria-hidden="true"
                  />
                  <span>Attachment</span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </PopupMenuPopover>
    </div>,
    document.body
  );
};
