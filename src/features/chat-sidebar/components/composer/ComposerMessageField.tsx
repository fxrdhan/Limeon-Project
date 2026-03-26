import type {
  ClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react';
import { useCallback } from 'react';
import { motion } from 'motion/react';
import { COMPOSER_SYNC_LAYOUT_TRANSITION } from '../../constants';
import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPromptableLink,
} from '../../types';
import {
  buildComposerLinkOverlaySegments,
  getComposerLinkSelectionOffset,
  type ComposerLinkOverlaySegment,
} from '../../utils/composerLinkOverlay';
import { ComposerLinkPromptPopover } from './ComposerLinkPromptPopover';

interface ComposerMessageFieldProps {
  message: string;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  attachmentPastePromptRef: RefObject<HTMLDivElement | null>;
  linkPrompt: {
    url: string | null;
    isAttachmentCandidate: boolean;
    isShortenable: boolean;
    hoverableCandidates: ComposerHoverableAttachmentCandidate[];
  };
  attachmentPromptPosition: {
    top: number;
    left: number;
  } | null;
  onClearAttachmentPromptCloseTimer: () => void;
  onScheduleAttachmentPromptClose: () => void;
  onUpdateAttachmentPromptPosition: (anchorElement: HTMLAnchorElement) => void;
  onMessageChange: (nextMessage: string) => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onOpenAttachmentPastePrompt: (
    candidate?: ComposerHoverableAttachmentCandidate
  ) => void;
  onOpenComposerLinkPrompt: (link: ComposerPromptableLink) => void;
  onEditAttachmentLink: (
    candidate: ComposerHoverableAttachmentCandidate,
    selection?: {
      selectionStart: number;
      selectionEnd?: number;
    }
  ) => void;
  onOpenAttachmentPastePromptLink: () => void;
  onCopyAttachmentPastePromptLink: () => void;
  onShortenAttachmentPastePromptLink: () => void;
  onUseAttachmentPasteAsUrl: () => void;
  onUseAttachmentPasteAsAttachment: () => void;
}

export const ComposerMessageField = ({
  message,
  messageInputHeight,
  isMessageInputMultiline,
  messageInputRef,
  attachmentPastePromptRef,
  linkPrompt,
  attachmentPromptPosition,
  onClearAttachmentPromptCloseTimer,
  onScheduleAttachmentPromptClose,
  onUpdateAttachmentPromptPosition,
  onMessageChange,
  onKeyDown,
  onPaste,
  onOpenAttachmentPastePrompt,
  onOpenComposerLinkPrompt,
  onEditAttachmentLink,
  onOpenAttachmentPastePromptLink,
  onCopyAttachmentPastePromptLink,
  onShortenAttachmentPastePromptLink,
  onUseAttachmentPasteAsUrl,
  onUseAttachmentPasteAsAttachment,
}: ComposerMessageFieldProps) => {
  const composerLinkOverlaySegments = buildComposerLinkOverlaySegments({
    candidates: linkPrompt.hoverableCandidates,
    message,
  });
  const shouldRenderComposerLinkOverlay =
    composerLinkOverlaySegments.length > 0;

  const handleComposerAttachmentLinkClick = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      candidate: ComposerHoverableAttachmentCandidate
    ) => {
      event.preventDefault();
      if (event.detail !== 0) {
        return;
      }

      onEditAttachmentLink(candidate);
    },
    [onEditAttachmentLink]
  );

  const handleComposerAttachmentLinkMouseDown = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      candidate: ComposerHoverableAttachmentCandidate
    ) => {
      event.preventDefault();

      const selectionOffset = getComposerLinkSelectionOffset(
        event.currentTarget,
        event.clientX,
        event.clientY
      );

      onEditAttachmentLink(candidate, {
        selectionStart: candidate.rangeStart + selectionOffset,
        selectionEnd: candidate.rangeStart + selectionOffset,
      });
    },
    [onEditAttachmentLink]
  );

  const focusComposerSelection = useCallback(
    (selectionStart: number, selectionEnd = selectionStart) => {
      requestAnimationFrame(() => {
        const textarea = messageInputRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [messageInputRef]
  );

  const handleComposerPlainLinkMouseDown = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      segment: ComposerLinkOverlaySegment
    ) => {
      if (segment.rangeStart === undefined) {
        return;
      }

      event.preventDefault();

      const selectionOffset = getComposerLinkSelectionOffset(
        event.currentTarget,
        event.clientX,
        event.clientY
      );

      focusComposerSelection(segment.rangeStart + selectionOffset);
    },
    [focusComposerSelection]
  );

  return (
    <>
      <ComposerLinkPromptPopover
        isOpen={Boolean(linkPrompt.url && attachmentPromptPosition)}
        position={attachmentPromptPosition}
        isAttachmentCandidate={linkPrompt.isAttachmentCandidate}
        isShortenable={linkPrompt.isShortenable}
        promptRef={attachmentPastePromptRef}
        onCopyLink={onCopyAttachmentPastePromptLink}
        onMouseEnter={onClearAttachmentPromptCloseTimer}
        onMouseLeave={onScheduleAttachmentPromptClose}
        onOpenLink={onOpenAttachmentPastePromptLink}
        onShortenLink={onShortenAttachmentPastePromptLink}
        onUseAsAttachment={onUseAttachmentPasteAsAttachment}
        onUseAsUrl={onUseAttachmentPasteAsUrl}
      />

      <motion.div
        layout="position"
        transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
        className={`relative min-w-0 ${
          isMessageInputMultiline
            ? 'col-span-3 row-start-1 self-start'
            : 'col-start-2 row-start-1 self-center'
        }`}
      >
        {shouldRenderComposerLinkOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-[22px] text-slate-900">
            {composerLinkOverlaySegments.map(segment =>
              segment.href ? (
                <a
                  key={segment.key}
                  href={segment.href}
                  className="pointer-events-auto cursor-text text-slate-900 underline-offset-2 transition-colors hover:text-sky-700 hover:underline"
                  onMouseDown={event =>
                    segment.candidate
                      ? handleComposerAttachmentLinkMouseDown(
                          event,
                          segment.candidate
                        )
                      : handleComposerPlainLinkMouseDown(event, segment)
                  }
                  onClick={event => {
                    event.preventDefault();

                    if (segment.candidate) {
                      handleComposerAttachmentLinkClick(
                        event,
                        segment.candidate
                      );
                    }
                  }}
                  onMouseEnter={event => {
                    onClearAttachmentPromptCloseTimer();
                    onUpdateAttachmentPromptPosition(event.currentTarget);

                    if (segment.candidate) {
                      onOpenAttachmentPastePrompt(segment.candidate);
                      return;
                    }

                    if (segment.rangeStart === undefined || !segment.href) {
                      return;
                    }

                    onOpenComposerLinkPrompt({
                      url: segment.href,
                      pastedText: segment.text,
                      rangeStart: segment.rangeStart,
                      rangeEnd: segment.rangeEnd ?? segment.rangeStart,
                    });
                  }}
                  onMouseLeave={onScheduleAttachmentPromptClose}
                >
                  {segment.text}
                </a>
              ) : (
                <span key={segment.key}>{segment.text}</span>
              )
            )}
          </div>
        ) : null}

        <motion.textarea
          layout="position"
          transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
          ref={messageInputRef}
          value={message}
          onChange={event => onMessageChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Tulis pesan..."
          rows={1}
          style={{ height: `${messageInputHeight}px` }}
          className={`block w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-[22px] placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            shouldRenderComposerLinkOverlay
              ? 'relative z-0 text-transparent caret-slate-900'
              : 'text-slate-900'
          }`}
        />
      </motion.div>
    </>
  );
};
