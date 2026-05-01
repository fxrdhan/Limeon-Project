import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Badge from '@/components/badge';
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

const HoverDetailPortal: React.FC<HoverDetailPortalProps> = ({
  isVisible,
  position,
  data,
}) => {
  const metaBadgeVariant =
    data?.metaTone === 'success'
      ? 'success'
      : data?.metaTone === 'warning'
        ? 'warning'
        : data?.metaTone === 'info'
          ? 'info'
          : 'default';

  // Derive state directly from props - no effect needed!
  const showContent = isVisible && !!data;
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupSize, setPopupSize] = useState({ width: 320, height: 120 });
  const viewportPadding = 12;
  const viewportWidth =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? 768 : window.innerHeight;
  const maxTop = Math.max(
    viewportPadding,
    viewportHeight - popupSize.height - viewportPadding
  );
  const resolvedTop = Math.min(Math.max(position.top, viewportPadding), maxTop);
  const clampedLeft =
    typeof window === 'undefined'
      ? position.left
      : Math.min(
          Math.max(position.left, viewportPadding),
          viewportWidth - popupSize.width - viewportPadding
        );

  useLayoutEffect(() => {
    if (!showContent || !popupRef.current) return;

    const popupRect = popupRef.current.getBoundingClientRect();
    setPopupSize(prev =>
      Math.abs(prev.width - popupRect.width) < 1 &&
      Math.abs(prev.height - popupRect.height) < 1
        ? prev
        : { width: popupRect.width, height: popupRect.height }
    );
  }, [data, showContent]);

  return createPortal(
    <AnimatePresence>
      {isVisible && data && (
        <motion.div
          key="hover-detail-portal"
          initial={{
            opacity: 0,
            scale: 0.95,
            top: resolvedTop,
            left: clampedLeft,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            top: resolvedTop,
            left: clampedLeft,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            opacity: { duration: 0.15, ease: 'easeOut' },
            scale: { duration: 0.15, ease: 'easeOut' },
            top: { duration: 0.18, ease: 'easeOut' },
            left: { duration: 0.18, ease: 'easeOut' },
          }}
          className="fixed z-[9999] pointer-events-none"
        >
          {/* Container with layout animation - resizes first, NO text animation */}
          <motion.div
            ref={popupRef}
            className="group pointer-events-auto transition-colors duration-150 rounded-xl p-4 min-w-[250px] max-w-[500px] w-max relative bg-white shadow-thin-md"
            layout="size"
            transition={{
              layout: {
                duration: 0.18,
                ease: 'easeOut',
              },
            }}
          >
            {/* Content wrapper - fades in AFTER container resize */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={showContent ? { opacity: 1 } : { opacity: 0 }}
              transition={{
                duration: 0.12,
                ease: 'easeOut',
              }}
              className="pointer-events-auto max-h-[calc(100vh-24px)] overflow-y-auto"
            >
              {/* Header with code and name - static, no animation */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {data.code && (
                    <Badge variant="success" size="sm" className="rounded-md">
                      {data.code}
                    </Badge>
                  )}
                  <h3 className="font-semibold text-slate-900 break-words">
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

              {/* Description - static, no animation */}
              {data.description && (
                <div className="mb-3">
                  <p className="text-sm text-slate-600 leading-relaxed break-words">
                    {data.description}
                  </p>
                </div>
              )}

              {/* Metadata - static, no animation */}
              {data.updated_at && (
                <div className="border-t border-slate-100 pt-2">
                  <div className="text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Updated:</span>
                      <span className="ml-2">
                        {new Date(data.updated_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default HoverDetailPortal;
