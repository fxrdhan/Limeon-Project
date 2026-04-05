import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Badge from '@/components/badge';
import {
  POPUP_HOVER_BG_CLASS,
  POPUP_SURFACE_CLASS,
} from '@/components/shared/popup-styles';
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
  const [resolvedTop, setResolvedTop] = useState(position.top);
  const [arrowTop, setArrowTop] = useState(18);
  const viewportPadding = 12;
  const popupWidth = popupRef.current?.getBoundingClientRect().width ?? 320;
  const clampedLeft =
    typeof window === 'undefined'
      ? position.left
      : Math.min(
          Math.max(position.left, viewportPadding),
          window.innerWidth - popupWidth - viewportPadding
        );

  useLayoutEffect(() => {
    if (!showContent || !popupRef.current) return;

    const arrowSize = 12;
    const popupRect = popupRef.current.getBoundingClientRect();
    const maxTop = Math.max(
      viewportPadding,
      window.innerHeight - popupRect.height - viewportPadding
    );
    const nextTop = Math.min(Math.max(position.top, viewportPadding), maxTop);
    const nextArrowTop = Math.min(
      Math.max(position.anchorCenterY - nextTop - arrowSize / 2, 12),
      Math.max(12, popupRect.height - arrowSize - 12)
    );

    setResolvedTop(prev => (Math.abs(prev - nextTop) < 1 ? prev : nextTop));
    setArrowTop(prev =>
      Math.abs(prev - nextArrowTop) < 1 ? prev : nextArrowTop
    );
  }, [position.anchorCenterY, position.top, showContent]);

  return createPortal(
    <AnimatePresence>
      {isVisible && data && (
        <motion.div
          key="hover-detail-portal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: resolvedTop,
            left: clampedLeft,
          }}
        >
          {/* Container with layout animation - resizes first, NO text animation */}
          <motion.div
            ref={popupRef}
            className={`group pointer-events-auto transition-colors duration-150 rounded-xl p-4 min-w-[250px] max-w-[500px] w-max relative shadow-xl ${POPUP_SURFACE_CLASS} ${POPUP_HOVER_BG_CLASS}`}
            layout
            layoutId={`hover-detail-${data.id}`}
            transition={{
              layout: {
                duration: 0.25,
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

            {/* Dynamic arrow based on position - always visible */}
            <div
              className={`absolute pointer-events-none h-3 w-3 border border-slate-300 bg-white transition-colors duration-150 group-hover:bg-slate-100 ${
                position.direction === 'right'
                  ? 'border-r-0 border-t-0'
                  : 'border-l-0 border-b-0'
              }`}
              style={
                position.direction === 'right'
                  ? {
                      left: '-6px',
                      top: `${arrowTop}px`,
                      transform: 'rotate(45deg)',
                    }
                  : {
                      right: '-6px',
                      top: `${arrowTop}px`,
                      transform: 'rotate(45deg)',
                    }
              }
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default HoverDetailPortal;
