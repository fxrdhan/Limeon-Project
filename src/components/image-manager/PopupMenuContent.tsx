import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import Button from "@/components/button";
import {
  POPUP_ACTIVE_BG_CLASS,
  POPUP_DANGER_ACTIVE_BG_CLASS,
  POPUP_HOVER_BG_CLASS,
  POPUP_SURFACE_CLASS,
} from "@/components/shared/popup-styles";

type PopupMenuActionEvent = ReactMouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>;

export interface PopupMenuAction {
  label: string;
  icon: ReactNode;
  onClick: (event?: PopupMenuActionEvent) => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

interface PopupMenuContentProps {
  actions: PopupMenuAction[];
  header?: ReactNode;
  minWidthClassName?: string;
  enableArrowNavigation?: boolean;
  autoFocusFirstItem?: boolean;
  useMenuItemRole?: boolean;
  initialPreselectedIndex?: number;
  onPreselectedIndexChange?: (index: number) => void;
  iconClassName?: string;
  dangerIconClassName?: string;
  enableAnimatedHighlight?: boolean;
}

const highlightTransition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

const resolveInitialActionIndex = ({
  actions,
  enableArrowNavigation,
  autoFocusFirstItem,
  initialPreselectedIndex,
}: Pick<
  PopupMenuContentProps,
  "actions" | "enableArrowNavigation" | "autoFocusFirstItem" | "initialPreselectedIndex"
>) => {
  if (!enableArrowNavigation) return null;

  const hasValidInitialPreselectedIndex =
    Number.isInteger(initialPreselectedIndex) &&
    initialPreselectedIndex !== undefined &&
    initialPreselectedIndex >= 0 &&
    initialPreselectedIndex < actions.length &&
    !actions[initialPreselectedIndex]?.disabled;

  if (hasValidInitialPreselectedIndex) {
    return initialPreselectedIndex;
  }

  if (!autoFocusFirstItem) return null;

  const firstEnabledIndex = actions.findIndex((action) => !action.disabled);
  return firstEnabledIndex === -1 ? null : firstEnabledIndex;
};

const PopupMenuContent = ({
  actions,
  header,
  minWidthClassName = "min-w-[90px]",
  enableArrowNavigation = false,
  autoFocusFirstItem = false,
  useMenuItemRole = true,
  initialPreselectedIndex,
  onPreselectedIndexChange,
  iconClassName,
  dangerIconClassName,
  enableAnimatedHighlight = false,
}: PopupMenuContentProps) => {
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedActionIndex, setFocusedActionIndex] = useState<number | null>(() =>
    resolveInitialActionIndex({
      actions,
      enableArrowNavigation,
      autoFocusFirstItem,
      initialPreselectedIndex,
    }),
  );
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(null);
  const activeActionIndex = hoveredActionIndex ?? focusedActionIndex;
  const activeAction = activeActionIndex === null ? null : actions[activeActionIndex];
  const [highlightFrame, setHighlightFrame] = useState({
    top: 0,
    height: 0,
    isVisible: false,
  });
  const setFocusedActionIndexWithSync = useCallback(
    (nextIndex: number) => {
      setFocusedActionIndex(nextIndex);
      onPreselectedIndexChange?.(nextIndex);
    },
    [onPreselectedIndexChange],
  );
  const focusActionButton = useCallback((actionIndex: number) => {
    actionButtonRefs.current[actionIndex]?.focus({ preventScroll: true });
  }, []);

  const focusNextEnabledAction = (currentIndex: number, direction: 1 | -1) => {
    if (actions.length === 0) return;

    for (let step = 1; step <= actions.length; step += 1) {
      const nextIndex = (currentIndex + direction * step + actions.length) % actions.length;
      if (!actions[nextIndex]?.disabled) {
        setFocusedActionIndexWithSync(nextIndex);
        focusActionButton(nextIndex);
        return;
      }
    }
  };

  const handleActionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, actionIndex: number) => {
    if (!enableArrowNavigation) return;
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (!actions[actionIndex]?.disabled) {
        actions[actionIndex]?.onClick(event);
      }
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    event.preventDefault();
    event.stopPropagation();
    focusNextEnabledAction(actionIndex, event.key === "ArrowDown" ? 1 : -1);
  };

  useLayoutEffect(() => {
    const nextFocusedIndex = resolveInitialActionIndex({
      actions,
      enableArrowNavigation,
      autoFocusFirstItem,
      initialPreselectedIndex,
    });
    if (nextFocusedIndex === null) return;

    setFocusedActionIndex((currentIndex) =>
      currentIndex === nextFocusedIndex ? currentIndex : nextFocusedIndex,
    );

    const rafId = window.requestAnimationFrame(() => {
      setFocusedActionIndexWithSync(nextFocusedIndex);
      focusActionButton(nextFocusedIndex);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    actions,
    autoFocusFirstItem,
    enableArrowNavigation,
    initialPreselectedIndex,
    focusActionButton,
    setFocusedActionIndexWithSync,
  ]);

  useLayoutEffect(() => {
    if (!enableAnimatedHighlight || activeActionIndex === null || activeAction?.disabled) {
      setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
      return;
    }

    const actionButton = actionButtonRefs.current[activeActionIndex];
    if (!actionButton) {
      setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
      return;
    }

    const updateHighlightFrame = () => {
      setHighlightFrame({
        top: actionButton.offsetTop,
        height: actionButton.offsetHeight,
        isVisible: true,
      });
    };

    updateHighlightFrame();
    const animationFrameId = window.requestAnimationFrame(updateHighlightFrame);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlightFrame);
    resizeObserver?.observe(actionButton);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [activeAction, activeActionIndex, enableAnimatedHighlight]);

  return (
    <div
      className={`relative px-1 py-1 rounded-xl shadow-lg ${POPUP_SURFACE_CLASS} ${minWidthClassName}`}
      role={enableArrowNavigation ? "menu" : undefined}
      onMouseLeave={() => {
        setHoveredActionIndex(null);
      }}
    >
      {enableAnimatedHighlight ? (
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute left-1 right-1 top-0 z-0 rounded-lg ${
            activeAction?.tone === "danger" ? "bg-rose-50" : "bg-slate-100"
          }`}
          initial={false}
          animate={{
            opacity: highlightFrame.isVisible ? 1 : 0,
            y: highlightFrame.top,
            height: highlightFrame.height,
          }}
          transition={highlightTransition}
        />
      ) : null}
      {header}
      {actions.map((action, actionIndex) => {
        const isPreselected =
          (enableArrowNavigation || enableAnimatedHighlight) &&
          !action.disabled &&
          activeActionIndex === actionIndex;
        const toneClassName =
          action.tone === "danger"
            ? isPreselected && !enableAnimatedHighlight
              ? POPUP_DANGER_ACTIVE_BG_CLASS
              : ""
            : isPreselected && !enableAnimatedHighlight
              ? `${POPUP_ACTIVE_BG_CLASS} !text-black data-[preselected=true]:!text-black hover:!text-black`
              : `!text-black ${
                  enableAnimatedHighlight ? "" : POPUP_HOVER_BG_CLASS
                } hover:!text-black`;
        const iconToneClassName =
          action.tone === "danger"
            ? (dangerIconClassName ?? "")
            : (iconClassName ??
              "[&>svg]:text-slate-500 hover:[&>svg]:text-slate-500 data-[preselected=true]:[&>svg]:text-slate-500");

        return (
          <Button
            key={action.label}
            ref={(element) => {
              actionButtonRefs.current[actionIndex] = element;
            }}
            variant={action.tone === "danger" ? "text-danger" : "text"}
            size="sm"
            withUnderline={false}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick(event);
            }}
            disabled={action.disabled}
            role={enableArrowNavigation && useMenuItemRole ? "menuitem" : undefined}
            data-preselected={isPreselected ? "true" : undefined}
            onFocus={() => {
              if (!action.disabled) {
                setFocusedActionIndexWithSync(actionIndex);
              }
            }}
            onMouseEnter={() => {
              if (!action.disabled) {
                setHoveredActionIndex(actionIndex);
              }
            }}
            onMouseLeave={() => {
              setHoveredActionIndex(null);
            }}
            onKeyDown={(event) => {
              handleActionKeyDown(event, actionIndex);
            }}
            className={`relative z-10 w-full !rounded-lg !opacity-100 px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 hover:!opacity-100 data-[preselected=true]:!opacity-100 flex items-center gap-2 cursor-pointer justify-start outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ${toneClassName} ${iconToneClassName}`}
          >
            {action.icon}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};

export default PopupMenuContent;
