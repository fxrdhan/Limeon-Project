import { motion } from 'motion/react';
import { COMPOSER_SYNC_LAYOUT_TRANSITION } from '../../constants';
import ComposerAttachmentPreviewList from './ComposerAttachmentPreviewList';
import { COMPOSER_CONTEXTUAL_PANEL_TRANSITION } from './composerPanelMotion';
import type {
  ComposerAttachmentScrollState,
  ComposerPanelRuntime,
} from './composerPanelTypes';

const COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT =
  'linear-gradient(to top, oklch(100% 0 0 / 0) 0%, oklch(100% 0 0 / 0.34) 18%, oklch(100% 0 0 / 0.72) 42%, oklch(100% 0 0 / 0.96) 68%, oklch(100% 0 0) 84%, oklch(100% 0 0) 100%)';
const COMPOSER_ATTACHMENT_BOTTOM_FOG_GRADIENT =
  'linear-gradient(to bottom, oklch(100% 0 0 / 0) 0%, oklch(100% 0 0 / 0.34) 18%, oklch(100% 0 0 / 0.72) 42%, oklch(100% 0 0 / 0.96) 68%, oklch(100% 0 0) 84%, oklch(100% 0 0) 100%)';

interface ComposerAttachmentTrayProps {
  composer: ComposerPanelRuntime['composer'];
  composerTrayMaxHeight: number | null;
  isComposerAttachmentTrayScrolledToBottom: boolean;
  onScrollStateChange: (state: ComposerAttachmentScrollState) => void;
  previews: ComposerPanelRuntime['previews'];
  shouldShowComposerAttachmentFog: boolean;
  shouldShowComposerAttachmentTopFog: boolean;
  totalSelectableComposerAttachments: number;
}

export const ComposerAttachmentTray = ({
  composer,
  composerTrayMaxHeight,
  isComposerAttachmentTrayScrolledToBottom,
  onScrollStateChange,
  previews,
  shouldShowComposerAttachmentFog,
  shouldShowComposerAttachmentTopFog,
  totalSelectableComposerAttachments,
}: ComposerAttachmentTrayProps) => (
  <motion.div
    layout
    initial={false}
    transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
    className="relative mb-[-1px] grid min-h-0 shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-2xl rounded-b-none bg-white px-2.5 pt-2.5 pb-0 shadow-thin"
    style={{
      maxHeight:
        composerTrayMaxHeight && composerTrayMaxHeight > 0
          ? composerTrayMaxHeight
          : undefined,
    }}
  >
    <div className="relative min-h-0 overflow-hidden">
      {composer.composerAttachmentPreviewItems.length > 0 ? (
        <ComposerAttachmentPreviewList
          attachments={composer.composerAttachmentPreviewItems}
          openImageActionsAttachmentId={previews.openImageActionsAttachmentId}
          isSelectionMode={previews.isComposerAttachmentSelectionMode}
          selectedAttachmentIds={previews.selectedComposerAttachmentIds}
          imageActionsButtonRef={previews.imageActionsButtonRef}
          transition={COMPOSER_CONTEXTUAL_PANEL_TRANSITION}
          onToggleImageActionsMenu={previews.handleToggleImageActionsMenu}
          onCloseImageActionsMenu={previews.closeImageActionsMenu}
          onMenuRepositionPauseChange={
            previews.setIsAttachmentMenuRepositionPaused
          }
          onToggleAttachmentSelection={
            previews.handleToggleComposerAttachmentSelection
          }
          onCancelLoadingComposerAttachment={
            composer.cancelLoadingComposerAttachment
          }
          onRemovePendingComposerAttachment={
            composer.removePendingComposerAttachment
          }
          onScrollStateChange={onScrollStateChange}
        />
      ) : null}
      {previews.isComposerAttachmentSelectionMode ? (
        <motion.div
          layout
          transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
          data-testid="composer-attachment-selection-fog"
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-14 text-sm"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-2.5 h-[calc(100%+0.625rem)]"
            style={{
              background: COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT,
            }}
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-1 pt-0.5">
            <button
              type="button"
              onClick={previews.handleSelectAllComposerAttachments}
              className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm font-medium text-black hover:underline hover:underline-offset-2"
            >
              Pilih semua
            </button>
            <p className="relative z-[1] text-sm font-medium text-slate-500">
              {previews.selectedComposerAttachmentIds.length}/
              {totalSelectableComposerAttachments} terpilih
            </p>
          </div>
        </motion.div>
      ) : shouldShowComposerAttachmentTopFog ? (
        <motion.div
          layout
          transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
          data-testid="composer-attachment-top-fog"
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-14 text-sm"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-2.5 h-[calc(100%+0.625rem)]"
            style={{
              background: COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT,
            }}
          />
        </motion.div>
      ) : null}
    </div>

    {shouldShowComposerAttachmentFog ? (
      <motion.div
        layout
        transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
        data-testid="composer-attachment-fog"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-14 text-sm"
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 ${
            isComposerAttachmentTrayScrolledToBottom ? 'h-7' : 'h-full'
          }`}
          style={{
            background: isComposerAttachmentTrayScrolledToBottom
              ? 'oklch(100% 0 0)'
              : COMPOSER_ATTACHMENT_BOTTOM_FOG_GRADIENT,
          }}
        />
        {previews.isComposerAttachmentSelectionMode ? (
          <div className="absolute inset-x-0 bottom-px flex items-end justify-between px-3">
            <button
              type="button"
              onClick={previews.handleClearComposerAttachmentSelection}
              className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm leading-tight font-medium text-black hover:underline hover:underline-offset-2"
            >
              Batal
            </button>
            {previews.selectedComposerAttachmentIds.length > 0 ? (
              <button
                type="button"
                onClick={previews.handleDeleteSelectedComposerAttachments}
                className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm leading-tight font-medium text-rose-600 hover:underline hover:underline-offset-2"
              >
                Hapus
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    ) : (
      <div />
    )}
  </motion.div>
);
