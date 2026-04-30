import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { forwardRef, type CSSProperties, type MouseEventHandler } from 'react';
import type { MotionProps } from 'motion/react';
import { CHAT_POPUP_MENU_SURFACE_CLASS_NAME } from './chatPopupSurface';

const CHAT_ACTION_POPOVER_LAYOUT_ID = 'chat-action-menu-popover';
const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

interface ChatActionPopoverProps extends Pick<
  MotionProps,
  'initial' | 'animate' | 'exit' | 'transition' | 'layout' | 'layoutId'
> {
  isOpen: boolean;
  actions: PopupMenuAction[];
  menuId?: string;
  className?: string;
  style?: CSSProperties;
  minWidthClassName?: string;
  disableEnterAnimation?: boolean;
  disableExitAnimation?: boolean;
  presenceInitial?: boolean;
  enableArrowNavigation?: boolean;
  autoFocusFirstItem?: boolean;
  initialPreselectedIndex?: number;
  iconClassName?: string;
  dangerIconClassName?: string;
  enableAnimatedHighlight?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export const ChatActionPopover = forwardRef<
  HTMLDivElement,
  ChatActionPopoverProps
>(
  (
    {
      isOpen,
      actions,
      menuId,
      className,
      style,
      minWidthClassName,
      disableEnterAnimation,
      disableExitAnimation,
      presenceInitial,
      enableArrowNavigation = true,
      autoFocusFirstItem,
      initialPreselectedIndex,
      iconClassName = CHAT_POPOVER_ICON_CLASS_NAME,
      dangerIconClassName,
      enableAnimatedHighlight = true,
      onClick,
      initial,
      animate,
      exit,
      transition,
      layout,
      layoutId = CHAT_ACTION_POPOVER_LAYOUT_ID,
    },
    ref
  ) => (
    <PopupMenuPopover
      isOpen={isOpen}
      menuId={menuId}
      disableEnterAnimation={disableEnterAnimation}
      disableExitAnimation={disableExitAnimation}
      presenceInitial={presenceInitial}
      layout={layout}
      layoutId={layoutId}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      className={className}
      style={style}
      onClick={event => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      <div ref={ref} className="relative z-20" role="presentation">
        <PopupMenuContent
          actions={actions}
          minWidthClassName={minWidthClassName}
          enableArrowNavigation={enableArrowNavigation}
          autoFocusFirstItem={autoFocusFirstItem}
          initialPreselectedIndex={initialPreselectedIndex}
          iconClassName={iconClassName}
          dangerIconClassName={dangerIconClassName}
          enableAnimatedHighlight={enableAnimatedHighlight}
          surfaceClassName={CHAT_POPUP_MENU_SURFACE_CLASS_NAME}
        />
      </div>
    </PopupMenuPopover>
  )
);

ChatActionPopover.displayName = 'ChatActionPopover';
