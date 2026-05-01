import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import Badge from '@/components/badge';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types';

interface HoverDetailPortalProps {
  isVisible: boolean;
  position: {
    top: number;
    left: number;
    direction: 'right' | 'left';
    anchorCenterY: number;
  };
  data: HoverDetailData | null;
}

interface HoverDetailGeometry {
  x: number;
  y: number;
  hiddenX: number;
  hiddenY: number;
  width: number;
  height: number;
}

interface HoverDetailSize {
  width: number;
  height: number;
}

const viewportPadding = 12;
const hiddenOffset = 4;
const surfaceHorizontalPadding = 32;

const hoverDetailAppearTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 24,
  mass: 0.75,
} as const;

const hoverDetailExitTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 30,
  mass: 0.65,
} as const;

const hoverDetailRepositionTransition = {
  type: 'tween',
  duration: 0.22,
  ease: 'easeOut',
} as const;

const defaultHoverDetailGeometry: HoverDetailGeometry = {
  x: 0,
  y: 0,
  hiddenX: 0,
  hiddenY: 0,
  width: 0,
  height: 0,
};

const getHoverDetailGeometry = (
  position: HoverDetailPortalProps['position'],
  size: HoverDetailSize
): HoverDetailGeometry => {
  const viewportWidth =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? 768 : window.innerHeight;
  const maxTop = Math.max(
    viewportPadding,
    viewportHeight - size.height - viewportPadding
  );
  const x =
    typeof window === 'undefined'
      ? position.left
      : Math.min(
          Math.max(position.left, viewportPadding),
          viewportWidth - size.width - viewportPadding
        );
  const y = Math.min(Math.max(position.top, viewportPadding), maxTop);
  const hiddenX =
    position.direction === 'right' ? x - hiddenOffset : x + hiddenOffset;

  return {
    x,
    y,
    hiddenX,
    hiddenY: y,
    width: size.width,
    height: size.height,
  };
};

const getMetaBadgeVariant = (data?: HoverDetailData | null) =>
  data?.metaTone === 'success'
    ? 'success'
    : data?.metaTone === 'warning'
      ? 'warning'
      : data?.metaTone === 'info'
        ? 'info'
        : 'default';

const HoverDetailContent = ({ data }: { data: HoverDetailData }) => {
  const metaBadgeVariant = getMetaBadgeVariant(data);

  return (
    <div className="pointer-events-auto max-h-[calc(100vh-24px)] overflow-y-auto">
      <div
        className={cn(
          'flex items-start justify-between gap-3',
          data.description && 'mb-3'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {data.code && (
            <Badge variant="success" size="sm" className="rounded-md">
              {data.code}
            </Badge>
          )}
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

      {data.description && (
        <div>
          <p className="whitespace-normal break-words text-sm text-slate-600 leading-relaxed">
            {data.description}
          </p>
        </div>
      )}
    </div>
  );
};

const hoverDetailSurfaceClassName =
  'group pointer-events-auto rounded-xl p-4 min-w-[250px] max-w-[500px] w-max relative bg-white shadow-thin-md';

const HoverDetailPortal: React.FC<HoverDetailPortalProps> = ({
  isVisible,
  position,
  data,
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
    if (!showContent || !popupSizerRef.current) return;

    const observer = new ResizeObserver(() => {
      animateToMeasuredGeometry();
    });
    observer.observe(popupSizerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [animateToMeasuredGeometry, showContent]);

  useEffect(() => {
    if (isVisible) {
      return;
    }

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

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {data && (
        <div
          ref={popupSizerRef}
          aria-hidden
          className={`${hoverDetailSurfaceClassName} pointer-events-none absolute left-0 top-0 opacity-0`}
        >
          <HoverDetailContent data={data} />
        </div>
      )}
      <AnimatePresence
        onExitComplete={() => {
          if (!isVisible) {
            setIsPlacementReady(false);
          }
        }}
      >
        {isVisible && renderedData && activeGeometry && (
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
                  activeGeometry.width - surfaceHorizontalPadding
                ),
              }}
            >
              <HoverDetailContent data={renderedData} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default HoverDetailPortal;
