import * as React from 'react';
import { motion, useAnimationControls } from 'motion/react';
import type { Transition } from 'motion/react';
import { cn } from '@/lib/utils';

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
type TooltipAlign = 'start' | 'center' | 'end';

interface TooltipContentConfig {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof motion.div>['layout'];
  style?: React.ComponentProps<typeof motion.div>['style'];
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
  isProvided: boolean;
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
  layout?: React.ComponentProps<typeof motion.div>['layout'];
  style?: React.ComponentProps<typeof motion.div>['style'];
  asChild?: boolean;
}

interface TooltipSize {
  width: number;
  height: number;
}

interface TooltipGeometry {
  bubbleX: number;
  bubbleY: number;
  hiddenBubbleX: number;
  hiddenBubbleY: number;
  arrowOffset: number;
  width: number;
  height: number;
}

const defaultTooltipTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 35,
} as const;

const tooltipAppearTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 24,
  mass: 0.75,
} as const;

const tooltipExitTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 30,
  mass: 0.65,
} as const;

const tooltipRepositionTransition = {
  type: 'tween',
  duration: 0.22,
  ease: 'easeOut',
} as const;

const defaultTooltipGeometry: TooltipGeometry = {
  bubbleX: 0,
  bubbleY: 0,
  hiddenBubbleX: 0,
  hiddenBubbleY: -4,
  arrowOffset: 0,
  width: 0,
  height: 0,
};

const TooltipProviderContext = React.createContext<TooltipProviderValue>({
  isProvided: false,
  openDelay: 0,
  closeDelay: 100,
  transition: defaultTooltipTransition,
  showTooltip: () => undefined,
  hideTooltip: () => undefined,
});

const TooltipContext = React.createContext<TooltipValue | null>(null);

const TOOLTIP_ARROW_SIZE = 12;
const TOOLTIP_HIDDEN_SCALE = 0.45;
const TOOLTIP_GEOMETRY_EPSILON = 0.5;
const hasTooltipGeometryChanged = (
  current: TooltipGeometry,
  next: TooltipGeometry
) =>
  Math.abs(current.bubbleX - next.bubbleX) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.bubbleY - next.bubbleY) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.width - next.width) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.height - next.height) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.arrowOffset - next.arrowOffset) > TOOLTIP_GEOMETRY_EPSILON;

const getClampedArrowOffset = (rawOffset: number, axisSize: number) => {
  const minOffset = 8;
  const maxOffset = Math.max(
    minOffset,
    axisSize - TOOLTIP_ARROW_SIZE - minOffset
  );

  return Math.min(Math.max(rawOffset, minOffset), maxOffset);
};

const getTooltipTransformOrigin = (side: TooltipSide, arrowOffset: number) => {
  const arrowCenter = arrowOffset + TOOLTIP_ARROW_SIZE / 2;

  if (side === 'top') {
    return `${arrowCenter}px bottom`;
  }

  if (side === 'bottom') {
    return `${arrowCenter}px top`;
  }

  if (side === 'left') {
    return `right ${arrowCenter}px`;
  }

  return `left ${arrowCenter}px`;
};

const getAlignedAxisPosition = (
  start: number,
  end: number,
  size: number,
  align: TooltipAlign,
  alignOffset: number
) => {
  if (align === 'start') {
    return start + alignOffset;
  }

  if (align === 'end') {
    return end - size - alignOffset;
  }

  return start + (end - start) / 2 - size / 2;
};

const getTooltipGeometry = (
  {
    triggerElement,
    side,
    sideOffset,
    align,
    alignOffset,
  }: Omit<TooltipShowRequest, 'id' | 'content'>,
  size: TooltipSize
): TooltipGeometry => {
  const rect = triggerElement.getBoundingClientRect();
  const mainAxisOffset = 4;
  const triggerCenterX = rect.left + rect.width / 2;
  const triggerCenterY = rect.top + rect.height / 2;

  if (side === 'top' || side === 'bottom') {
    const bubbleX = getAlignedAxisPosition(
      rect.left,
      rect.right,
      size.width,
      align,
      alignOffset
    );
    const bubbleY =
      side === 'top'
        ? rect.top - size.height - sideOffset
        : rect.bottom + sideOffset;
    const hiddenOffsetY = side === 'top' ? mainAxisOffset : -mainAxisOffset;
    const arrowOffset = getClampedArrowOffset(
      triggerCenterX - bubbleX - TOOLTIP_ARROW_SIZE / 2,
      size.width
    );

    return {
      bubbleX,
      bubbleY,
      hiddenBubbleX: bubbleX,
      hiddenBubbleY: bubbleY + hiddenOffsetY,
      arrowOffset,
      width: size.width,
      height: size.height,
    };
  }

  const bubbleY = getAlignedAxisPosition(
    rect.top,
    rect.bottom,
    size.height,
    align,
    alignOffset
  );
  const bubbleX =
    side === 'left'
      ? rect.left - size.width - sideOffset
      : rect.right + sideOffset;
  const hiddenOffsetX = side === 'left' ? mainAxisOffset : -mainAxisOffset;
  const arrowOffset = getClampedArrowOffset(
    triggerCenterY - bubbleY - TOOLTIP_ARROW_SIZE / 2,
    size.height
  );

  return {
    bubbleX,
    bubbleY,
    hiddenBubbleX: bubbleX + hiddenOffsetX,
    hiddenBubbleY: bubbleY,
    arrowOffset,
    width: size.width,
    height: size.height,
  };
};

const TooltipProvider = ({
  children,
  openDelay = 0,
  closeDelay = 100,
  transition = defaultTooltipTransition,
}: TooltipProviderProps) => {
  const parentTooltipProvider = React.useContext(TooltipProviderContext);
  const [activeTooltip, setActiveTooltip] =
    React.useState<TooltipShowRequest | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isPlacementReady, setIsPlacementReady] = React.useState(false);
  const [arrowOffset, setArrowOffset] = React.useState(0);
  const bubbleControls = useAnimationControls();
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const tooltipSizerRef = React.useRef<HTMLDivElement | null>(null);
  const visibleRef = React.useRef(false);
  const placementReadyRef = React.useRef(false);
  const geometryRef = React.useRef<TooltipGeometry>(defaultTooltipGeometry);
  const geometryTooltipIdRef = React.useRef<string | null>(null);
  const exitGenerationRef = React.useRef(0);
  const animationFrameRef = React.useRef<number | null>(null);

  const cancelPendingAnimationFrame = React.useCallback(() => {
    if (animationFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const showTooltip = React.useCallback(
    (request: TooltipShowRequest) => {
      cancelPendingAnimationFrame();
      exitGenerationRef.current += 1;
      if (!visibleRef.current) {
        placementReadyRef.current = false;
        geometryTooltipIdRef.current = null;
        setIsPlacementReady(false);
      }
      setActiveTooltip(request);
    },
    [cancelPendingAnimationFrame]
  );

  const hideTooltip = React.useCallback(
    (id: string) => {
      cancelPendingAnimationFrame();
      setActiveTooltip(currentTooltip => {
        if (currentTooltip?.id === id) {
          const exitGeneration = ++exitGenerationRef.current;
          visibleRef.current = false;
          setIsVisible(false);

          if (
            !placementReadyRef.current ||
            geometryTooltipIdRef.current !== id
          ) {
            placementReadyRef.current = false;
            geometryTooltipIdRef.current = null;
            setIsPlacementReady(false);
            return null;
          }

          const geometry = geometryRef.current;
          const bubbleAnimation = bubbleControls.start({
            x: geometry.hiddenBubbleX,
            y: geometry.hiddenBubbleY,
            opacity: 0,
            scale: TOOLTIP_HIDDEN_SCALE,
            transition: tooltipExitTransition,
          });

          void bubbleAnimation.then(() => {
            if (
              exitGenerationRef.current === exitGeneration &&
              !visibleRef.current
            ) {
              placementReadyRef.current = false;
              geometryTooltipIdRef.current = null;
              setIsPlacementReady(false);
              setActiveTooltip(current =>
                current?.id === id ? null : current
              );
            }
          });
        }

        return currentTooltip;
      });
    },
    [bubbleControls, cancelPendingAnimationFrame]
  );

  const getTooltipSize = React.useCallback((): TooltipSize | null => {
    if (!tooltipSizerRef.current) {
      return null;
    }

    const rect = tooltipSizerRef.current.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const updatePosition = React.useCallback(() => {
    const size = getTooltipSize();
    if (!activeTooltip || !size) {
      return;
    }

    const nextGeometry = getTooltipGeometry(activeTooltip, size);
    if (
      visibleRef.current &&
      !hasTooltipGeometryChanged(geometryRef.current, nextGeometry)
    ) {
      return;
    }

    geometryRef.current = nextGeometry;
    geometryTooltipIdRef.current = activeTooltip.id;
    setArrowOffset(nextGeometry.arrowOffset);

    if (visibleRef.current) {
      bubbleControls.stop();
      void bubbleControls.start({
        x: nextGeometry.bubbleX,
        y: nextGeometry.bubbleY,
        width: nextGeometry.width,
        height: nextGeometry.height,
        opacity: 1,
        scale: 1,
        transition: tooltipRepositionTransition,
      });
    }
  }, [activeTooltip, bubbleControls, getTooltipSize]);

  React.useLayoutEffect(() => {
    const size = getTooltipSize();
    if (!activeTooltip || !size) {
      return;
    }

    const nextGeometry = getTooltipGeometry(activeTooltip, size);
    const shouldReposition = hasTooltipGeometryChanged(
      geometryRef.current,
      nextGeometry
    );
    geometryRef.current = nextGeometry;
    geometryTooltipIdRef.current = activeTooltip.id;
    setArrowOffset(nextGeometry.arrowOffset);
    const shouldUseAppearTransition = !visibleRef.current;

    if (!visibleRef.current) {
      bubbleControls.set({
        x: nextGeometry.hiddenBubbleX,
        y: nextGeometry.hiddenBubbleY,
        width: nextGeometry.width,
        height: nextGeometry.height,
        opacity: 0,
        scale: TOOLTIP_HIDDEN_SCALE,
      });
    }

    const revealTooltip = () => {
      placementReadyRef.current = true;
      setIsPlacementReady(true);
      visibleRef.current = true;
      setIsVisible(true);
    };

    const startAnimation = () => {
      void bubbleControls.start({
        x: nextGeometry.bubbleX,
        y: nextGeometry.bubbleY,
        width: nextGeometry.width,
        height: nextGeometry.height,
        opacity: 1,
        scale: 1,
        transition: shouldUseAppearTransition
          ? tooltipAppearTransition
          : tooltipRepositionTransition,
      });
    };

    if (!shouldUseAppearTransition && !shouldReposition) {
      return;
    }

    bubbleControls.stop();

    if (shouldUseAppearTransition) {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        revealTooltip();
        animationFrameRef.current = window.requestAnimationFrame(() => {
          animationFrameRef.current = null;
          startAnimation();
        });
      });
      return;
    }

    revealTooltip();
    startAnimation();
  }, [
    activeTooltip,
    bubbleControls,
    cancelPendingAnimationFrame,
    getTooltipSize,
  ]);

  React.useEffect(
    () => () => {
      cancelPendingAnimationFrame();
    },
    [cancelPendingAnimationFrame]
  );

  React.useEffect(() => {
    if (!tooltipSizerRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(tooltipSizerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [updatePosition]);

  React.useEffect(() => {
    if (!activeTooltip || !isVisible) {
      return;
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeTooltip, isVisible, updatePosition]);

  const content = activeTooltip?.content;
  const shouldShowTooltip = Boolean(
    content && placementReadyRef.current && isPlacementReady
  );

  if (parentTooltipProvider.isProvided) {
    return <>{children}</>;
  }

  return (
    <TooltipProviderContext.Provider
      value={{
        isProvided: true,
        openDelay,
        closeDelay,
        transition,
        showTooltip,
        hideTooltip,
      }}
    >
      {children}
      <motion.div
        ref={tooltipSizerRef}
        aria-hidden
        className={cn(
          'pointer-events-none fixed left-0 top-0 -z-10 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-sm font-medium text-black opacity-0 shadow-thin',
          content?.className
        )}
        style={{
          ...content?.style,
        }}
      >
        <span className="relative z-10 block max-w-full overflow-hidden whitespace-nowrap">
          {content?.children}
        </span>
      </motion.div>
      <motion.div
        ref={tooltipRef}
        className={cn(
          'pointer-events-none fixed left-0 top-0 z-50 overflow-visible whitespace-nowrap rounded-lg bg-white px-2 py-1 text-sm font-medium text-black shadow-thin',
          content?.className
        )}
        style={{
          ...content?.style,
          visibility: shouldShowTooltip ? 'visible' : 'hidden',
          transformOrigin: getTooltipTransformOrigin(
            activeTooltip?.side ?? 'top',
            arrowOffset
          ),
        }}
        initial={false}
        animate={bubbleControls}
      >
        <span className="relative z-10 block max-w-full overflow-hidden whitespace-nowrap">
          {content?.children}
        </span>
      </motion.div>
    </TooltipProviderContext.Provider>
  );
};

const Tooltip = ({
  children,
  className,
  side = 'top',
  sideOffset = 6,
  align = 'center',
  alignOffset = 0,
}: TooltipProps) => {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const contentRef = React.useRef<TooltipContentConfig | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openDelay, closeDelay, showTooltip, hideTooltip } = React.useContext(
    TooltipProviderContext
  );

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

  React.useEffect(
    () => () => {
      clearTooltipTimeout();
      hideTooltip(id);
    },
    [clearTooltipTimeout, hideTooltip, id]
  );

  return (
    <TooltipContext.Provider value={{ setContent }}>
      <span
        ref={triggerRef}
        className={cn('relative inline-flex', className)}
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
  layout = 'preserve-aspect',
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
