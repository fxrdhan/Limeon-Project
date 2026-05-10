import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import type {
  ComboboxHoverDetailGeometry,
  ComboboxHoverDetailPosition,
} from '@/components/combobox/internal-types';
import { ComboboxHoverDetailContent } from './combobox-hover-detail-content';
import {
  defaultHoverDetailGeometry,
  getHoverDetailElementSize,
  getHoverDetailGeometry,
  hoverDetailAppearTransition,
  hoverDetailExitTransition,
  hoverDetailMinWidth,
  hoverDetailRepositionTransition,
  hoverDetailSurfaceHorizontalPadding,
} from '../utils/preset-hover-detail-popover';

const hoverDetailSurfaceClassName =
  'group pointer-events-auto rounded-xl p-4 w-fit relative bg-white shadow-thin-md';

const ComboboxHoverDetailPopover = ({
  data,
  isVisible,
  position,
}: {
  data: HoverDetailData | null;
  isVisible: boolean;
  position: ComboboxHoverDetailPosition;
}) => {
  const showContent = isVisible && !!data;
  const popupSizerRef = useRef<HTMLDivElement | null>(null);
  const geometryRef = useRef<ComboboxHoverDetailGeometry>(
    defaultHoverDetailGeometry
  );
  const visibleRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const controls = useAnimationControls();
  const [isPlacementReady, setIsPlacementReady] = useState(false);
  const [activeGeometry, setActiveGeometry] =
    useState<ComboboxHoverDetailGeometry | null>(null);
  const [renderedData, setRenderedData] = useState<HoverDetailData | null>(
    data
  );

  const cancelPendingAnimationFrame = useCallback(() => {
    if (animationFrameRef.current === null) return;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const getPopupSize = useCallback(() => {
    if (!popupSizerRef.current) return null;

    return getHoverDetailElementSize(popupSizerRef.current);
  }, []);

  const animateToMeasuredGeometry = useCallback(
    (forceAppear = false) => {
      const size = getPopupSize();
      if (!data || !size) return;

      const nextGeometry = getHoverDetailGeometry(position, size);
      const shouldAppear = forceAppear || !visibleRef.current;

      geometryRef.current = nextGeometry;
      controls.stop();

      if (shouldAppear) {
        setActiveGeometry(nextGeometry);
        setRenderedData(data);
        controls.set({
          x: nextGeometry.hiddenX,
          y: nextGeometry.hiddenY,
          width: nextGeometry.width,
          height: nextGeometry.height,
          opacity: 0,
          scale: 0.95,
        });

        cancelPendingAnimationFrame();
        animationFrameRef.current = window.requestAnimationFrame(() => {
          setIsPlacementReady(true);
          visibleRef.current = true;
          animationFrameRef.current = window.requestAnimationFrame(() => {
            animationFrameRef.current = null;
            void controls.start({
              x: nextGeometry.x,
              y: nextGeometry.y,
              width: nextGeometry.width,
              height: nextGeometry.height,
              opacity: 1,
              scale: 1,
              transition: hoverDetailAppearTransition,
            });
          });
        });
        return;
      }

      setActiveGeometry(nextGeometry);
      setRenderedData(data);
      setIsPlacementReady(true);
      visibleRef.current = true;
      void controls.start({
        x: nextGeometry.x,
        y: nextGeometry.y,
        width: nextGeometry.width,
        height: nextGeometry.height,
        opacity: 1,
        scale: 1,
        transition: hoverDetailRepositionTransition,
      });
    },
    [cancelPendingAnimationFrame, controls, data, getPopupSize, position]
  );

  useLayoutEffect(() => {
    if (!showContent) return;

    animateToMeasuredGeometry(!visibleRef.current);
  }, [animateToMeasuredGeometry, showContent]);

  useEffect(() => {
    if (
      !showContent ||
      !popupSizerRef.current ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    const observer = new ResizeObserver(() => {
      animateToMeasuredGeometry();
    });
    observer.observe(popupSizerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [animateToMeasuredGeometry, showContent]);

  useEffect(() => {
    if (showContent) return;

    cancelPendingAnimationFrame();
    setIsPlacementReady(false);

    if (!visibleRef.current) {
      setRenderedData(data);
      return;
    }

    const previousGeometry = geometryRef.current;
    visibleRef.current = false;
    void controls.start({
      x: previousGeometry.hiddenX,
      y: previousGeometry.hiddenY,
      width: previousGeometry.width,
      height: previousGeometry.height,
      opacity: 0,
      scale: 0.95,
      transition: hoverDetailExitTransition,
    });
  }, [cancelPendingAnimationFrame, controls, data, showContent]);

  useEffect(() => {
    return () => {
      cancelPendingAnimationFrame();
    };
  }, [cancelPendingAnimationFrame]);

  if (typeof document === 'undefined') return null;

  const shouldRenderPositionedPopup =
    Boolean(renderedData && activeGeometry) &&
    (!showContent || isPlacementReady);
  const activeContentWidth = activeGeometry
    ? Math.max(0, activeGeometry.width - hoverDetailSurfaceHorizontalPadding)
    : undefined;

  return createPortal(
    <>
      {showContent ? (
        <div
          ref={popupSizerRef}
          aria-hidden="true"
          data-combobox-hover-detail-sizer=""
          className={cn(
            hoverDetailSurfaceClassName,
            'pointer-events-none fixed left-0 top-0 -z-10 opacity-0'
          )}
          style={{ maxWidth: position.maxWidth, minWidth: hoverDetailMinWidth }}
        >
          <ComboboxHoverDetailContent data={data} />
        </div>
      ) : null}
      <AnimatePresence>
        {shouldRenderPositionedPopup && activeGeometry ? (
          <motion.div
            key="combobox-hover-detail-portal"
            className={cn(
              hoverDetailSurfaceClassName,
              'fixed left-0 top-0 z-[1100] overflow-hidden',
              showContent &&
                !isPlacementReady &&
                'pointer-events-none opacity-0'
            )}
            initial={{
              x: activeGeometry.hiddenX,
              y: activeGeometry.hiddenY,
              width: activeGeometry.width,
              height: activeGeometry.height,
              opacity: 0,
              scale: 0.95,
            }}
            animate={controls}
            exit={{
              x: activeGeometry.hiddenX,
              y: activeGeometry.hiddenY,
              width: activeGeometry.width,
              height: activeGeometry.height,
              opacity: 0,
              scale: 0.95,
              transition: hoverDetailExitTransition,
            }}
          >
            {renderedData ? (
              <ComboboxHoverDetailContent
                data={renderedData}
                width={activeContentWidth}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default ComboboxHoverDetailPopover;
