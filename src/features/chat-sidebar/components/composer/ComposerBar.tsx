import type { RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbArrowUp } from 'react-icons/tb';
import {
  COMPOSER_BASE_SHADOW,
  COMPOSER_GLOW_SHADOW_FADE,
  COMPOSER_GLOW_SHADOW_HIGH,
  COMPOSER_GLOW_SHADOW_LOW,
  COMPOSER_GLOW_SHADOW_MID,
  COMPOSER_GLOW_SHADOW_PEAK,
  COMPOSER_SYNC_LAYOUT_TRANSITION,
  SEND_SUCCESS_GLOW_DURATION,
} from '../../constants';
import { useComposerLinkPromptPopover } from '../../hooks/useComposerLinkPromptPopover';
import { ComposerAttachmentMenu } from './ComposerAttachmentMenu';
import ComposerEditBanner from './ComposerEditBanner';
import { ComposerMessageField } from './ComposerMessageField';
import { COMPOSER_CONTEXTUAL_PANEL_TRANSITION } from './composerPanelMotion';
import type { ComposerPanelRuntime } from './composerPanelTypes';

interface ComposerBarProps {
  composer: ComposerPanelRuntime['composer'];
  composerBarRef: RefObject<HTMLDivElement | null>;
  hasComposerAttachmentTray: boolean;
  mutations: ComposerPanelRuntime['mutations'];
  refs: ComposerPanelRuntime['refs'];
  viewport: ComposerPanelRuntime['viewport'];
}

export const ComposerBar = ({
  composer,
  composerBarRef,
  hasComposerAttachmentTray,
  mutations,
  refs,
  viewport,
}: ComposerBarProps) => {
  const linkPromptPopover = useComposerLinkPromptPopover({
    linkPromptUrl: composer.attachmentPastePromptUrl,
    onDismissAttachmentPastePrompt: composer.dismissAttachmentPastePrompt,
  });

  return (
    <motion.div
      ref={composerBarRef}
      layout
      initial={false}
      animate={
        composer.isSendSuccessGlowVisible
          ? {
              boxShadow: hasComposerAttachmentTray
                ? 'none'
                : [
                    COMPOSER_BASE_SHADOW,
                    COMPOSER_GLOW_SHADOW_PEAK,
                    COMPOSER_GLOW_SHADOW_HIGH,
                    COMPOSER_GLOW_SHADOW_MID,
                    COMPOSER_GLOW_SHADOW_FADE,
                    COMPOSER_GLOW_SHADOW_LOW,
                    COMPOSER_BASE_SHADOW,
                  ],
            }
          : {
              boxShadow: hasComposerAttachmentTray
                ? 'none'
                : COMPOSER_BASE_SHADOW,
            }
      }
      transition={
        composer.isSendSuccessGlowVisible
          ? {
              layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
              duration: SEND_SUCCESS_GLOW_DURATION / 1000,
              times: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
              ease: 'easeOut',
            }
          : {
              layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
              duration: 0.12,
              ease: 'easeOut',
            }
      }
      className={`relative z-10 shrink-0 bg-white ${
        hasComposerAttachmentTray
          ? 'rounded-t-none rounded-b-2xl'
          : 'rounded-2xl'
      }`}
    >
      <motion.div
        layout
        transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
        className={`relative z-10 px-2.5 py-2.5 transition-[height,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          hasComposerAttachmentTray
            ? 'rounded-t-none rounded-b-xl'
            : 'rounded-xl'
        }`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {composer.editingMessagePreview ? (
            <ComposerEditBanner
              messagePreview={composer.editingMessagePreview}
              authorLabel={composer.editingMessageAuthorLabel ?? 'Anda'}
              isAuthorCurrentUser={composer.isEditingMessageFromCurrentUser}
              mode="edit"
              onCancelContext={mutations.handleCancelEditMessage}
              onFocusTargetMessage={viewport.focusEditingTargetMessage}
              transition={COMPOSER_CONTEXTUAL_PANEL_TRANSITION}
            />
          ) : composer.replyingMessagePreview ? (
            <ComposerEditBanner
              messagePreview={composer.replyingMessagePreview}
              authorLabel={composer.replyingMessageAuthorLabel ?? 'Pengguna'}
              isAuthorCurrentUser={composer.isReplyingMessageFromCurrentUser}
              mode="reply"
              onCancelContext={mutations.handleCancelReplyMessage}
              onFocusTargetMessage={() => {
                if (composer.replyingMessageId) {
                  viewport.focusReplyTargetMessage(composer.replyingMessageId);
                }
              }}
              transition={COMPOSER_CONTEXTUAL_PANEL_TRANSITION}
            />
          ) : null}
        </AnimatePresence>

        <motion.div
          layout
          transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
          className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
            composer.isMessageInputMultiline
              ? 'grid-rows-[auto_auto] items-end gap-y-1'
              : 'grid-rows-[auto] items-center gap-y-0'
          }`}
        >
          <ComposerMessageField
            message={composer.message}
            messageInputHeight={composer.messageInputHeight}
            isMessageInputMultiline={composer.isMessageInputMultiline}
            messageInputRef={refs.messageInputRef}
            attachmentPastePromptRef={composer.attachmentPastePromptRef}
            linkPrompt={{
              url: composer.attachmentPastePromptUrl,
              isAttachmentCandidate:
                composer.isAttachmentPastePromptAttachmentCandidate,
              isShortenable: composer.isAttachmentPastePromptShortenable,
              hoverableCandidates: composer.hoverableAttachmentCandidates,
            }}
            attachmentPromptPosition={
              linkPromptPopover.attachmentPromptPosition
            }
            onClearAttachmentPromptCloseTimer={
              linkPromptPopover.clearAttachmentPromptCloseTimer
            }
            onScheduleAttachmentPromptClose={
              linkPromptPopover.scheduleAttachmentPromptClose
            }
            onUpdateAttachmentPromptPosition={
              linkPromptPopover.updateAttachmentPromptPosition
            }
            onMessageChange={composer.handleMessageChange}
            onKeyDown={mutations.handleKeyPress}
            onPaste={composer.handleComposerPaste}
            onOpenAttachmentPastePrompt={composer.openAttachmentPastePrompt}
            onOpenComposerLinkPrompt={composer.openComposerLinkPrompt}
            onEditAttachmentLink={composer.handleEditAttachmentLink}
            onOpenAttachmentPastePromptLink={
              composer.handleOpenAttachmentPastePromptLink
            }
            onCopyAttachmentPastePromptLink={
              composer.handleCopyAttachmentPastePromptLink
            }
            onShortenAttachmentPastePromptLink={
              composer.handleShortenAttachmentPastePromptLink
            }
            onUseAttachmentPasteAsUrl={composer.handleUseAttachmentPasteAsUrl}
            onUseAttachmentPasteAsAttachment={
              composer.handleUseAttachmentPasteAsAttachment
            }
          />

          <ComposerAttachmentMenu
            isAttachModalOpen={composer.isAttachModalOpen}
            isMessageInputMultiline={composer.isMessageInputMultiline}
            attachButtonRef={composer.attachButtonRef}
            attachModalRef={composer.attachModalRef}
            imageInputRef={composer.imageInputRef}
            documentInputRef={composer.documentInputRef}
            audioInputRef={composer.audioInputRef}
            onAttachButtonClick={composer.handleAttachButtonClick}
            onAttachImageClick={composer.handleAttachImageClick}
            onAttachDocumentClick={composer.handleAttachDocumentClick}
            onAttachAudioClick={composer.handleAttachAudioClick}
            onImageFileChange={composer.handleImageFileChange}
            onDocumentFileChange={composer.handleDocumentFileChange}
            onAudioFileChange={composer.handleAudioFileChange}
          />

          <motion.button
            layout="position"
            transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
            type="button"
            onClick={mutations.handleSendMessage}
            aria-label="Kirim pesan"
            disabled={composer.isLoadingAttachmentComposerAttachments}
            className={`flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-xl bg-primary text-white whitespace-nowrap transition-opacity ${
              composer.isLoadingAttachmentComposerAttachments
                ? 'cursor-not-allowed opacity-55'
                : 'cursor-pointer'
            } ${
              composer.isMessageInputMultiline
                ? 'col-start-3 row-start-2'
                : 'col-start-3 row-start-1'
            }`}
          >
            <TbArrowUp size={20} className="text-white" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
