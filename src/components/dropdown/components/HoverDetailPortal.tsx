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
  const portalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      x: -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
    },
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && data && (
        <motion.div
          key="hover-detail-portal"
          variants={portalVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] max-w-[500px] w-max relative">
            {/* Header with code and name */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 whitespace-nowrap">
                {data.code && (
                  <Badge variant="success" size="sm">
                    {data.code}
                  </Badge>
                )}
                <h3 className="font-semibold text-gray-900">{data.name}</h3>
              </div>
            </div>

            {/* Description */}
            {data.description && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 leading-relaxed break-words">
                  {data.description}
                </p>
              </div>
            )}

            {/* Metadata */}
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

            {/* Dynamic arrow based on position */}
            <div
              className="absolute"
              style={
                position.direction === 'right'
                  ? {
                      // Arrow pointing left (portal to right of option)
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
                      // Arrow pointing right (portal to left of option)
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default HoverDetailPortal;
