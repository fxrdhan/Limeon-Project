import type React from 'react';
import { motion } from 'motion/react';

const listOptionTransition = {
  layout: {
    type: 'spring' as const,
    stiffness: 520,
    damping: 38,
    mass: 0.7,
  },
  opacity: {
    duration: 0.1,
  },
  y: {
    duration: 0.1,
    ease: 'easeOut' as const,
  },
};

export function ComboboxOptionMotionFrame({
  children,
  shouldAnimate,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      data-pharma-combobox-option-frame={shouldAnimate ? '' : undefined}
      layout={shouldAnimate ? 'position' : false}
      initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={listOptionTransition}
    >
      {children}
    </motion.div>
  );
}
