import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { MenuPlacement, MenuVerticalAnchor } from '../../types';

const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

interface MessageActionPopoverProps {
  isOpen: boolean;
  menuId: string;
  shouldAnimateMenuOpen: boolean;
  menuPlacement: MenuPlacement;
  menuOffsetX: number;
  sidePlacementClass: string;
  menuVerticalAnchor: MenuVerticalAnchor;
  actions: PopupMenuAction[];
}

export const MessageActionPopover = ({
  isOpen,
  menuId,
  shouldAnimateMenuOpen,
  menuPlacement,
  menuOffsetX,
  sidePlacementClass,
  menuVerticalAnchor,
  actions,
}: MessageActionPopoverProps) => {
  const resolvedPlacementClass =
    menuPlacement === 'left' || menuPlacement === 'right'
      ? sidePlacementClass
      : menuPlacement === 'down'
        ? menuVerticalAnchor === 'right'
          ? 'bottom-full mb-2 right-0 origin-bottom-right'
          : 'bottom-full mb-2 left-0 origin-bottom-left'
        : menuVerticalAnchor === 'right'
          ? 'top-full mt-2 right-0 origin-top-right'
          : 'top-full mt-2 left-0 origin-top-left';

  return (
    <PopupMenuPopover
      isOpen={isOpen}
      menuId={menuId}
      disableEnterAnimation={!shouldAnimateMenuOpen}
      disableExitAnimation={!shouldAnimateMenuOpen}
      layout
      layoutId="chat-message-menu-popover"
      initial={{
        opacity: 0,
        scale: 0.96,
        x:
          menuOffsetX +
          (menuPlacement === 'left' ? -6 : menuPlacement === 'right' ? 6 : 0),
        y: menuPlacement === 'down' ? 6 : menuPlacement === 'up' ? -6 : 0,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: menuOffsetX,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.98,
        x: menuOffsetX,
        y: 0,
      }}
      transition={{
        duration: 0.12,
        ease: 'easeOut',
        layout: {
          type: 'spring',
          stiffness: 420,
          damping: 34,
        },
      }}
      className={`pointer-events-auto absolute z-40 touch-pan-y text-slate-900 ${resolvedPlacementClass}`}
      onClick={event => event.stopPropagation()}
    >
      <div className="relative z-20">
        <PopupMenuContent
          actions={actions}
          minWidthClassName="min-w-[120px]"
          enableArrowNavigation
          autoFocusFirstItem
          iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
          enableAnimatedHighlight
        />
      </div>
    </PopupMenuPopover>
  );
};
