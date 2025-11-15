import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '@/components/badge';
import type { HoverDetailData } from '@/types';

interface HoverDetailPortalProps {
  isVisible: boolean;
  position: {
    top: number;
    left: number;
    direction: 'right' | 'left';
  };
  data: HoverDetailData | null;
}

const HoverDetailPortal: React.FC<HoverDetailPortalProps> = ({
  isVisible,
  position,
  data,
}) => {
  // Derive state directly from props - no effect needed!
  const showContent = isVisible && !!data;

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
            top: position.top,
            left: position.left,
          }}
        >
          {/* Container with layout animation - resizes first, NO text animation */}
          <motion.div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] max-w-[500px] w-max relative"
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
              className="pointer-events-auto"
            >
              {/* Header with code and name - static, no animation */}
              <div className="flex items-center gap-2 mb-3">
                {data.code && (
                  <Badge variant="success" size="sm">
                    {data.code}
                  </Badge>
                )}
                <h3 className="font-semibold text-gray-900 break-words">
                  {data.name}
                </h3>
              </div>

              {/* Description - static, no animation */}
              {data.description && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 leading-relaxed break-words">
                    {data.description}
                  </p>
                </div>
              )}

              {/* Metadata - static, no animation */}
              {data.updated_at && (
                <div className="border-t border-gray-100 pt-2">
                  <div className="text-xs text-gray-500">
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
              className="absolute pointer-events-none"
              style={
                position.direction === 'right'
                  ? {
                      left: '-6px',
                      top: '18px',
                      width: '12px',
                      height: '12px',
                      background: 'white',
                      border: '1px solid #D1D5DB',
                      borderRight: 'none',
                      borderTop: 'none',
                      transform: 'rotate(45deg)',
                    }
                  : {
                      right: '-6px',
                      top: '18px',
                      width: '12px',
                      height: '12px',
                      background: 'white',
                      border: '1px solid #D1D5DB',
                      borderLeft: 'none',
                      borderBottom: 'none',
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
