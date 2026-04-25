import * as React from "react";
import { motion, useAnimationControls } from "motion/react";
import type { Transition } from "motion/react";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "start" | "center" | "end";

interface TooltipContentConfig {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof motion.div>["layout"];
  style?: React.ComponentProps<typeof motion.div>["style"];
}

interface TooltipShowRequest {
  id: string;
  triggerElement: HTMLElement;
  side: TooltipSide;
  sideOffset: number;
  align: TooltipAlign;
  alignOffset: number;
  content: TooltipContentConfig;
}

interface TooltipProviderValue {
  openDelay: number;
  closeDelay: number;
  transition: Transition;
  showTooltip: (request: TooltipShowRequest) => void;
  hideTooltip: (id: string) => void;
}

interface TooltipValue {
  setContent: (content: TooltipContentConfig) => void;
}

interface TooltipProviderProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  transition?: Transition;
}

interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  side?: TooltipSide;
  sideOffset?: number;
  align?: TooltipAlign;
  alignOffset?: number;
}

interface TooltipTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof motion.div>["layout"];
  style?: React.ComponentProps<typeof motion.div>["style"];
  asChild?: boolean;
}

interface TooltipPosition {
  x: number;
  y: number;
  hiddenX: number;
  hiddenY: number;
}

const defaultTooltipTransition = {
  type: "spring",
  stiffness: 300,
  damping: 35,
} as const;

const defaultTooltipPosition: TooltipPosition = {
  x: 0,
  y: 0,
  hiddenX: 0,
  hiddenY: -4,
};

const TooltipProviderContext = React.createContext<TooltipProviderValue>({
  openDelay: 0,
  closeDelay: 300,
  transition: defaultTooltipTransition,
  showTooltip: () => undefined,
  hideTooltip: () => undefined,
});

const TooltipContext = React.createContext<TooltipValue | null>(null);

const getTooltipArrowClassName = (side: TooltipSide) =>
  cn(
    "absolute size-3 rotate-45 rounded-[2px] bg-slate-950",
    side === "top" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-[35%]",
    side === "bottom" && "top-0 left-1/2 -translate-x-1/2 -translate-y-[35%]",
    side === "left" && "top-1/2 right-0 -translate-y-1/2 translate-x-[35%]",
    side === "right" && "top-1/2 left-0 -translate-x-[35%] -translate-y-1/2",
  );

const getAlignedAxisPosition = (
  start: number,
  end: number,
  size: number,
  align: TooltipAlign,
  alignOffset: number,
) => {
  if (align === "start") {
    return start + alignOffset;
  }

  if (align === "end") {
    return end - size - alignOffset;
  }

  return start + (end - start) / 2 - size / 2;
};

const getTooltipPosition = (
  {
    triggerElement,
    side,
    sideOffset,
    align,
    alignOffset,
  }: Omit<TooltipShowRequest, "id" | "content">,
  tooltipElement: HTMLElement,
): TooltipPosition => {
  const rect = triggerElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const mainAxisOffset = 4;

  if (side === "top" || side === "bottom") {
    const x = getAlignedAxisPosition(rect.left, rect.right, tooltipRect.width, align, alignOffset);
    const top =
      side === "top" ? rect.top - tooltipRect.height - sideOffset : rect.bottom + sideOffset;
    const hiddenY = side === "top" ? mainAxisOffset : -mainAxisOffset;

    return {
      x,
      y: top,
      hiddenX: x,
      hiddenY: top + hiddenY,
    };
  }

  const top = getAlignedAxisPosition(rect.top, rect.bottom, tooltipRect.height, align, alignOffset);
  const left =
    side === "left" ? rect.left - tooltipRect.width - sideOffset : rect.right + sideOffset;
  const hiddenX = side === "left" ? mainAxisOffset : -mainAxisOffset;

  return {
    x: left,
    y: top,
    hiddenX: left + hiddenX,
    hiddenY: top,
  };
};

const TooltipProvider = ({
  children,
  openDelay = 0,
  closeDelay = 300,
  transition = defaultTooltipTransition,
}: TooltipProviderProps) => {
  const [activeTooltip, setActiveTooltip] = React.useState<TooltipShowRequest | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const controls = useAnimationControls();
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const visibleRef = React.useRef(false);
  const positionRef = React.useRef<TooltipPosition>(defaultTooltipPosition);

  const showTooltip = React.useCallback((request: TooltipShowRequest) => {
    setActiveTooltip(request);
  }, []);

  const hideTooltip = React.useCallback(
    (id: string) => {
      setActiveTooltip((currentTooltip) => {
        if (currentTooltip?.id === id) {
          const position = positionRef.current;
          visibleRef.current = false;
          setIsVisible(false);
          void controls.start({
            x: position.hiddenX,
            y: position.hiddenY,
            opacity: 0,
            scale: 0.96,
            transition,
          });
        }

        return currentTooltip;
      });
    },
    [controls, transition],
  );

  const updatePosition = React.useCallback(() => {
    if (!activeTooltip || !tooltipRef.current) {
      return;
    }

    const nextPosition = getTooltipPosition(activeTooltip, tooltipRef.current);
    positionRef.current = nextPosition;

    if (visibleRef.current) {
      void controls.start({
        x: nextPosition.x,
        y: nextPosition.y,
        opacity: 1,
        scale: 1,
        transition,
      });
    }
  }, [activeTooltip, controls, transition]);

  React.useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) {
      return;
    }

    const nextPosition = getTooltipPosition(activeTooltip, tooltipRef.current);
    positionRef.current = nextPosition;

    if (!visibleRef.current) {
      controls.set({
        x: nextPosition.hiddenX,
        y: nextPosition.hiddenY,
        opacity: 0,
        scale: 0.96,
      });
    }

    visibleRef.current = true;
    setIsVisible(true);
    void controls.start({
      x: nextPosition.x,
      y: nextPosition.y,
      opacity: 1,
      scale: 1,
      transition,
    });
  }, [activeTooltip, controls, transition]);

  React.useEffect(() => {
    if (!tooltipRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(tooltipRef.current);

    return () => {
      observer.disconnect();
    };
  }, [updatePosition]);

  React.useEffect(() => {
    if (!activeTooltip || !isVisible) {
      return;
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeTooltip, isVisible, updatePosition]);

  const content = activeTooltip?.content;

  return (
    <TooltipProviderContext.Provider
      value={{ openDelay, closeDelay, transition, showTooltip, hideTooltip }}
    >
      {children}
      <motion.div
        ref={tooltipRef}
        className={cn(
          "pointer-events-none fixed z-50 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white shadow-md",
          content?.className,
        )}
        style={{
          ...content?.style,
          left: 0,
          top: 0,
          visibility: content ? "visible" : "hidden",
        }}
        initial={false}
        animate={controls}
      >
        <span className={getTooltipArrowClassName(activeTooltip?.side ?? "top")} />
        <span className="relative z-10">{content?.children}</span>
      </motion.div>
    </TooltipProviderContext.Provider>
  );
};

const Tooltip = ({
  children,
  className,
  side = "top",
  sideOffset = 10,
  align = "center",
  alignOffset = 0,
}: TooltipProps) => {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const contentRef = React.useRef<TooltipContentConfig | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openDelay, closeDelay, showTooltip, hideTooltip } =
    React.useContext(TooltipProviderContext);

  const clearTooltipTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openTooltip = React.useCallback(() => {
    const triggerElement = triggerRef.current;
    const content = contentRef.current;
    if (!triggerElement || !content) {
      return;
    }

    showTooltip({
      id,
      triggerElement,
      side,
      sideOffset,
      align,
      alignOffset,
      content,
    });
  }, [align, alignOffset, id, showTooltip, side, sideOffset]);

  const scheduleOpen = React.useCallback(() => {
    clearTooltipTimeout();

    if (openDelay === 0) {
      openTooltip();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      openTooltip();
      timeoutRef.current = null;
    }, openDelay);
  }, [clearTooltipTimeout, openDelay, openTooltip]);

  const scheduleClose = React.useCallback(() => {
    clearTooltipTimeout();

    if (closeDelay === 0) {
      hideTooltip(id);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      hideTooltip(id);
      timeoutRef.current = null;
    }, closeDelay);
  }, [clearTooltipTimeout, closeDelay, hideTooltip, id]);

  const setContent = React.useCallback((content: TooltipContentConfig) => {
    contentRef.current = content;
  }, []);

  React.useEffect(() => clearTooltipTimeout, [clearTooltipTimeout]);

  return (
    <TooltipContext.Provider value={{ setContent }}>
      <span
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
      >
        {children}
      </span>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = ({ children }: TooltipTriggerProps) => children;

const TooltipContent = ({
  children,
  className,
  asChild: _asChild,
  layout = "preserve-aspect",
  style,
}: TooltipContentProps) => {
  const tooltip = React.useContext(TooltipContext);

  tooltip?.setContent({
    children,
    className,
    layout,
    style,
  });

  return null;
};

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
