import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { TbArrowUpRight, TbCopy, TbLink, TbPaperclip } from 'react-icons/tb';
import { AnimatedMenuHighlight } from '@/components/shared/animated-menu-highlight';
import { useAnimatedMenuHighlight } from '@/components/shared/use-animated-menu-highlight';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { CHAT_POPUP_SURFACE_CLASS_NAME } from '../chatPopupSurface';

const ATTACHMENT_LINK_PROMPT_MIN_WIDTH = 156;
const ATTACHMENT_PROMPT_BUTTON_CLASS_NAME =
  'relative z-10 flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-black transition-colors';
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

type LinkPromptAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

interface LinkPromptContentProps extends Omit<
  ComposerLinkPromptPopoverProps,
  'isOpen' | 'position'
> {}

const LinkPromptContent = ({
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
}: LinkPromptContentProps) => {
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(
    null
  );
  const { highlightFrame, setItemRef } =
    useAnimatedMenuHighlight<HTMLButtonElement>(hoveredActionIndex);
  const primaryActions: LinkPromptAction[] = [
    {
      label: 'Buka',
      icon: (
        <TbArrowUpRight className="h-4 w-4 text-black" aria-hidden="true" />
      ),
      onClick: onOpenLink,
    },
    {
      label: 'Salin',
      icon: <TbCopy className="h-4 w-4 text-black" aria-hidden="true" />,
      onClick: onCopyLink,
    },
    ...(isShortenable
      ? [
          {
            label: 'Shorten link',
            icon: <TbLink className="h-4 w-4 text-black" aria-hidden="true" />,
            onClick: onShortenLink,
          },
        ]
      : []),
  ];
  const pasteActions: LinkPromptAction[] = [
    {
      label: 'URL',
      icon: <TbLink className="h-4 w-4 text-black" aria-hidden="true" />,
      onClick: onUseAsUrl,
    },
    {
      label: 'Attachment',
      icon: <TbPaperclip className="h-4 w-4 text-black" aria-hidden="true" />,
      onClick: onUseAsAttachment,
    },
  ];

  const renderActionButton = (
    action: LinkPromptAction,
    actionIndex: number
  ) => (
    <button
      key={action.label}
      ref={element => setItemRef(actionIndex, element)}
      type="button"
      onClick={action.onClick}
      onMouseEnter={() => {
        setHoveredActionIndex(actionIndex);
      }}
      className={ATTACHMENT_PROMPT_BUTTON_CLASS_NAME}
    >
      {action.icon}
      <span>{action.label}</span>
    </button>
  );

  return (
    <div
      ref={promptRef}
      className={`relative rounded-xl px-0.5 py-0.5 ${CHAT_POPUP_SURFACE_CLASS_NAME}`}
      style={{
        minWidth: ATTACHMENT_LINK_PROMPT_MIN_WIDTH,
      }}
      onClick={event => event.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        setHoveredActionIndex(null);
        onMouseLeave();
      }}
      role="dialog"
      aria-label="Aksi link composer"
    >
      <AnimatedMenuHighlight
        frame={highlightFrame}
        className="left-0.5 right-0.5 bg-slate-100"
      />
      <div className={ATTACHMENT_PROMPT_SECTION_LABEL_CLASS_NAME}>Aksi</div>
      {primaryActions.map((action, actionIndex) =>
        renderActionButton(action, actionIndex)
      )}
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
            {pasteActions.map((action, actionIndex) =>
              renderActionButton(action, primaryActions.length + actionIndex)
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

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
        <LinkPromptContent
          isAttachmentCandidate={isAttachmentCandidate}
          isShortenable={isShortenable}
          promptRef={promptRef}
          onCopyLink={onCopyLink}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onOpenLink={onOpenLink}
          onShortenLink={onShortenLink}
          onUseAsAttachment={onUseAsAttachment}
          onUseAsUrl={onUseAsUrl}
        />
      </PopupMenuPopover>
    </div>,
    document.body
  );
};
