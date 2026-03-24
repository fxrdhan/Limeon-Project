import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

interface ComposerAttachmentActionMenusProps {
  openImageActionsAttachmentId: string | null;
  imageActionsMenuPosition: {
    top: number;
    left: number;
  } | null;
  pdfCompressionMenuPosition: {
    top: number;
    left: number;
  } | null;
  imageActions: PopupMenuAction[];
  pdfCompressionLevelActions: PopupMenuAction[];
  imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  pdfCompressionMenuRef: RefObject<HTMLDivElement | null>;
}

export const ComposerAttachmentActionMenus = ({
  openImageActionsAttachmentId,
  imageActionsMenuPosition,
  pdfCompressionMenuPosition,
  imageActions,
  pdfCompressionLevelActions,
  imageActionsMenuRef,
  pdfCompressionMenuRef,
}: ComposerAttachmentActionMenusProps) => {
  if (typeof document === 'undefined' || !openImageActionsAttachmentId) {
    return null;
  }

  return (
    <>
      {imageActionsMenuPosition
        ? createPortal(
            <PopupMenuPopover
              isOpen
              className="fixed z-[120] origin-top-right"
              style={{
                top: imageActionsMenuPosition.top,
                left: imageActionsMenuPosition.left,
              }}
            >
              <div
                ref={imageActionsMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={imageActions}
                  minWidthClassName="min-w-[132px]"
                  enableArrowNavigation
                  autoFocusFirstItem
                  iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}

      {pdfCompressionMenuPosition && pdfCompressionLevelActions.length > 0
        ? createPortal(
            <PopupMenuPopover
              isOpen
              className="fixed z-[121] origin-top-right"
              style={{
                top: pdfCompressionMenuPosition.top,
                left: pdfCompressionMenuPosition.left,
              }}
            >
              <div
                ref={pdfCompressionMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={pdfCompressionLevelActions}
                  minWidthClassName="min-w-[168px]"
                  enableArrowNavigation
                  initialPreselectedIndex={1}
                  iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}
    </>
  );
};
