import * as React from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  defaultTooltipGeometry,
  defaultTooltipTransition,
  tooltipAppearTransition,
  tooltipExitTransition,
  tooltipRepositionTransition,
  TOOLTIP_HIDDEN_SCALE,
} from './constants';
import { TooltipProviderContext } from './context';
import {
  getTooltipGeometry,
  getTooltipTransformOrigin,
  hasTooltipGeometryChanged,
} from './geometry';
import type {
  TooltipGeometry,
  TooltipProviderProps,
  TooltipShowRequest,
  TooltipSize,
} from './types';

export const TooltipProvider = ({
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
