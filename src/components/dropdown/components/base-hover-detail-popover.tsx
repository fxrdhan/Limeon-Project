import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import Badge from '@/components/badge';
import { cn } from '@/lib/utils';
import type {
  HoverDetailGeometry,
  HoverDetailPosition,
  HoverDetailSize,
} from '@/components/dropdown/internal-types';
import type { HoverDetailData } from '@/types';

const hoverDetailViewportPadding = 12;
const hoverDetailHiddenOffset = 4;
const hoverDetailSurfaceHorizontalPadding = 32;
const hoverDetailAppearTransition = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 24,
  mass: 0.75,
};
const hoverDetailExitTransition = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 30,
  mass: 0.65,
};
const hoverDetailRepositionTransition = {
  type: 'tween' as const,
  duration: 0.22,
  ease: 'easeOut' as const,
};
const defaultHoverDetailGeometry: HoverDetailGeometry = {
  x: 0,
  y: 0,
  hiddenX: 0,
  hiddenY: 0,
  width: 0,
  height: 0,
};

const getHoverDetailGeometry = (
  position: HoverDetailPosition,
  size: HoverDetailSize
): HoverDetailGeometry => {
  const viewportWidth =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? 768 : window.innerHeight;
  const maxTop = Math.max(
    hoverDetailViewportPadding,
    viewportHeight - size.height - hoverDetailViewportPadding
  );
  const x =
    typeof window === 'undefined'
      ? position.left
      : Math.min(
          Math.max(position.left, hoverDetailViewportPadding),
          viewportWidth - size.width - hoverDetailViewportPadding
        );
  const y = Math.min(
    Math.max(position.top, hoverDetailViewportPadding),
    maxTop
  );
  const hiddenX =
    position.direction === 'right'
      ? x - hoverDetailHiddenOffset
      : x + hoverDetailHiddenOffset;

  return {
    x,
    y,
    hiddenX,
    hiddenY: y,
    width: size.width,
    height: size.height,
  };
};

const getHoverDetailMetaBadgeVariant = (data?: HoverDetailData | null) =>
  data?.metaTone === 'success'
    ? 'success'
    : data?.metaTone === 'warning'
      ? 'warning'
      : data?.metaTone === 'info'
        ? 'info'
        : 'default';

const HoverDetailContent = ({ data }: { data: HoverDetailData }) => {
  const metaBadgeVariant = getHoverDetailMetaBadgeVariant(data);

  return (
    <div className="pointer-events-auto max-h-[calc(100vh-24px)] overflow-y-auto">
      <div
        className={cn(
          'flex items-start justify-between gap-3',
          data.description && 'mb-3'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {data.code ? (
            <Badge variant="success" size="sm" className="rounded-md">
              {data.code}
            </Badge>
          ) : null}
          <h3 className="min-w-0 whitespace-normal break-words font-semibold text-slate-900">
            {data.name}
          </h3>
        </div>
        {data.metaLabel ? (
          <Badge
            variant={metaBadgeVariant}
            size="sm"
            className="shrink-0 rounded-md uppercase tracking-wide"
          >
            {data.metaLabel}
          </Badge>
        ) : null}
      </div>
      {data.description ? (
        <p className="whitespace-normal break-words text-sm leading-relaxed text-slate-600">
          {data.description}
        </p>
      ) : null}
    </div>
  );
};

const hoverDetailSurfaceClassName =
  'group pointer-events-auto rounded-xl p-4 min-w-[250px] max-w-[500px] w-max relative bg-white shadow-thin-md';

const BaseHoverDetailPopover = ({
  data,
  isVisible,
  position,
}: {
  data: HoverDetailData | null;
  isVisible: boolean;
  position: HoverDetailPosition;
}) => {
  const showContent = isVisible && !!data;
  const popupSizerRef = useRef<HTMLDivElement | null>(null);
  const geometryRef = useRef<HoverDetailGeometry>(defaultHoverDetailGeometry);
  const visibleRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const controls = useAnimationControls();
  const [isPlacementReady, setIsPlacementReady] = useState(false);
  const [activeGeometry, setActiveGeometry] =
    useState<HoverDetailGeometry | null>(null);
  const [renderedData, setRenderedData] = useState<HoverDetailData | null>(
    data
  );
  const shouldRenderSizer = showContent && data !== renderedData;

  const cancelPendingAnimationFrame = useCallback(() => {
    if (animationFrameRef.current === null) return;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const getPopupSize = useCallback((): HoverDetailSize | null => {
    if (!popupSizerRef.current) return null;

    const rect = popupSizerRef.current.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const animateToMeasuredGeometry = useCallback(
    (forceAppear = false) => {
      const size = getPopupSize();
      if (!data || !size) return;

      const nextGeometry = getHoverDetailGeometry(position, size);
      const shouldAppear = forceAppear || !visibleRef.current;

      geometryRef.current = nextGeometry;
      setActiveGeometry(nextGeometry);
      setRenderedData(data);
      controls.stop();

      if (shouldAppear) {
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
    if (isVisible) return;

    visibleRef.current = false;
    setActiveGeometry(null);
    setRenderedData(null);
  }, [isVisible]);

  useEffect(
    () => () => {
      cancelPendingAnimationFrame();
    },
    [cancelPendingAnimationFrame]
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {shouldRenderSizer && data ? (
        <div
          ref={popupSizerRef}
          aria-hidden="true"
          className={`${hoverDetailSurfaceClassName} pointer-events-none absolute left-0 top-0 opacity-0`}
        >
          <HoverDetailContent data={data} />
        </div>
      ) : null}
      <AnimatePresence
        onExitComplete={() => {
          if (!isVisible) {
            setIsPlacementReady(false);
          }
        }}
      >
        {isVisible && renderedData && activeGeometry ? (
          <motion.div
            key="hover-detail-portal"
            className={hoverDetailSurfaceClassName}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              overflow: 'hidden',
              visibility: isPlacementReady ? 'visible' : 'hidden',
              transformOrigin:
                position.direction === 'right' ? 'left center' : 'right center',
            }}
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
              x: geometryRef.current.hiddenX,
              y: geometryRef.current.hiddenY,
              opacity: 0,
              scale: 0.95,
              transition: hoverDetailExitTransition,
            }}
          >
            <div
              style={{
                width: Math.max(
                  0,
                  activeGeometry.width - hoverDetailSurfaceHorizontalPadding
                ),
              }}
            >
              <HoverDetailContent data={renderedData} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default BaseHoverDetailPopover;
