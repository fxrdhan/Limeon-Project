import PopupMenuContent, {
  type PopupMenuAction,
} from "@/components/image-manager/PopupMenuContent";
import PopupMenuPopover from "@/components/shared/popup-menu-popover";
import type { MenuPlacement, MenuVerticalAnchor } from "../../types";

const CHAT_POPOVER_ICON_CLASS_NAME =
  "[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black";

interface MessageActionPopoverProps {
  isOpen: boolean;
  menuId: string;
  shouldAnimateMenuOpen: boolean;
  menuPlacement: MenuPlacement;
  menuOffsetX: number;
  sidePlacementClass: string;
  sideArrowAnchorClass: string;
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
  sideArrowAnchorClass,
  menuVerticalAnchor,
  actions,
}: MessageActionPopoverProps) => {
  const resolvedPlacementClass =
    menuPlacement === "left" || menuPlacement === "right"
      ? sidePlacementClass
      : menuPlacement === "down"
        ? menuVerticalAnchor === "right"
          ? "bottom-full mb-2 right-0 origin-bottom-right"
          : "bottom-full mb-2 left-0 origin-bottom-left"
        : menuVerticalAnchor === "right"
          ? "top-full mt-2 right-0 origin-top-right"
          : "top-full mt-2 left-0 origin-top-left";

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
        x: menuOffsetX + (menuPlacement === "left" ? -6 : menuPlacement === "right" ? 6 : 0),
        y: menuPlacement === "down" ? 6 : menuPlacement === "up" ? -6 : 0,
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
        ease: "easeOut",
        layout: {
          type: "spring",
          stiffness: 420,
          damping: 34,
        },
      }}
      className={`pointer-events-auto absolute z-[200] touch-pan-y text-slate-900 ${resolvedPlacementClass}`}
      onClick={(event) => event.stopPropagation()}
    >
      {menuPlacement === "left" ? (
        <div className={`absolute right-0 translate-x-full ${sideArrowAnchorClass}`}>
          <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-slate-200" />
          <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white left-[-1px] top-1/2 transform -translate-y-1/2" />
        </div>
      ) : menuPlacement === "right" ? (
        <div className={`absolute left-0 -translate-x-full ${sideArrowAnchorClass}`}>
          <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-200" />
          <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white right-[-1px] top-1/2 transform -translate-y-1/2" />
        </div>
      ) : menuPlacement === "down" ? (
        <div
          data-chat-menu-arrow-position={menuVerticalAnchor}
          className={`absolute bottom-0 translate-y-full ${
            menuVerticalAnchor === "right" ? "right-3" : "left-3"
          }`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-200" />
          <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white left-1/2 top-[-1px] -translate-x-1/2" />
        </div>
      ) : (
        <div
          data-chat-menu-arrow-position={menuVerticalAnchor}
          className={`absolute top-0 -translate-y-full ${
            menuVerticalAnchor === "right" ? "right-3" : "left-3"
          }`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-200" />
          <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white left-1/2 bottom-[-1px] -translate-x-1/2" />
        </div>
      )}
      <PopupMenuContent
        actions={actions}
        minWidthClassName="min-w-[120px]"
        enableArrowNavigation
        autoFocusFirstItem
        iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
        enableAnimatedHighlight
      />
    </PopupMenuPopover>
  );
};
