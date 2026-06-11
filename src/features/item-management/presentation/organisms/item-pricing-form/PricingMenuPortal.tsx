import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { POPOVER_SURFACE_CLASS } from '@/styles/uiPrimitives';
import type { PopoverPosition } from './types';

interface PricingMenuPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLevelPricing?: () => void;
  position: PopoverPosition | null;
  popoverRef: RefObject<HTMLDivElement | null>;
  showLevelPricing: boolean;
}

export function PricingMenuPortal({
  isOpen,
  onClose,
  onShowLevelPricing,
  position,
  popoverRef,
  showLevelPricing,
}: PricingMenuPortalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && position ? (
        <motion.div
          className="fixed z-50"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <div
            ref={popoverRef}
            className={`w-[190px] ${POPOVER_SURFACE_CLASS} p-1`}
          >
            <button
              type="button"
              className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors cursor-pointer ${
                showLevelPricing
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => {
                if (!onShowLevelPricing) return;
                onShowLevelPricing();
                onClose();
              }}
            >
              Atur per-level
            </button>
            <div className="px-3 py-2 text-sm text-slate-400 cursor-not-allowed">
              Atur per-volume
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
