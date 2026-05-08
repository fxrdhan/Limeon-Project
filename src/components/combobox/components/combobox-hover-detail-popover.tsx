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
import type { HoverDetailData } from '@/types/components';
import type {
  ComboboxHoverDetailGeometry,
  ComboboxHoverDetailPosition,
  ComboboxHoverDetailSize,
} from '@/components/combobox/internal-types';

const hoverDetailViewportPadding = 12;
const hoverDetailHiddenOffset = 4;
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
const defaultHoverDetailGeometry: ComboboxHoverDetailGeometry = {
  x: 0,
  y: 0,
  hiddenX: 0,
  hiddenY: 0,
  width: 0,
  height: 0,
};

const getHoverDetailGeometry = (
  position: ComboboxHoverDetailPosition,
  size: ComboboxHoverDetailSize
): ComboboxHoverDetailGeometry => {
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

const getDisplayCode = (data: HoverDetailData) =>
  data.display?.code ?? data.code;

const getDisplayDescription = (data: HoverDetailData) =>
  data.display?.description ?? data.description;

const getDisplayBadgeLabel = (data: HoverDetailData) =>
  data.display?.badgeLabel ?? data.metaLabel;

const getDisplayBadgeTone = (data?: HoverDetailData | null) =>
  data?.display?.badgeTone ?? data?.metaTone ?? 'default';

const getHoverDetailMetaBadgeVariant = (data?: HoverDetailData | null) => {
  const tone = getDisplayBadgeTone(data);
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'info') return 'info';
  return 'default';
};

const HoverDetailContent = ({ data }: { data: HoverDetailData }) => {
  const code = getDisplayCode(data);
  const description = getDisplayDescription(data);
  const metaLabel = getDisplayBadgeLabel(data);
  const metaBadgeVariant = getHoverDetailMetaBadgeVariant(data);

  return (
    <div className="pointer-events-auto max-h-[calc(100vh-24px)] overflow-y-auto">
      <div
        className={cn(
          'flex items-start justify-between gap-3',
          description && 'mb-3'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {code ? (
            <Badge variant="success" size="sm" className="rounded-md">
              {code}
            </Badge>
          ) : null}
          <h3 className="min-w-0 whitespace-normal break-words font-semibold text-slate-900">
            {data.name}
          </h3>
        </div>
        {metaLabel ? (
          <Badge
            variant={metaBadgeVariant}
            size="sm"
            className="shrink-0 rounded-md uppercase tracking-wide"
          >
            {metaLabel}
          </Badge>
        ) : null}
      </div>
      {description ? (
        <p className="whitespace-normal break-words text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
};

const hoverDetailSurfaceClassName =
  'group pointer-events-auto rounded-xl p-4 min-w-[250px] max-w-[500px] w-max relative bg-white shadow-thin-md';

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
  const shouldRenderSizer = showContent && data !== renderedData;

  const cancelPendingAnimationFrame = useCallback(() => {
    if (animationFrameRef.current === null) return;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const getPopupSize = useCallback((): ComboboxHoverDetailSize | null => {
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

  return createPortal(
    <>
      {showContent ? (
        <div
          ref={popupSizerRef}
          className={cn(
            hoverDetailSurfaceClassName,
            'pointer-events-none fixed left-0 top-0 -z-10 opacity-0'
          )}
        >
          <HoverDetailContent data={data} />
        </div>
      ) : null}
      {shouldRenderSizer && data ? (
        <div
          ref={popupSizerRef}
          className={cn(
            hoverDetailSurfaceClassName,
            'pointer-events-none fixed left-0 top-0 -z-10 opacity-0'
          )}
        >
          <HoverDetailContent data={data} />
        </div>
      ) : null}
      <AnimatePresence>
        {(showContent || renderedData) && activeGeometry ? (
          <motion.div
            key="combobox-hover-detail-portal"
            className={cn(
              hoverDetailSurfaceClassName,
              'fixed left-0 top-0 z-[1100]',
              !isPlacementReady && 'pointer-events-none opacity-0'
            )}
            initial={false}
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
            {renderedData ? <HoverDetailContent data={renderedData} /> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default ComboboxHoverDetailPopover;
