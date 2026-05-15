import type React from 'react';
import { motion } from 'motion/react';
import { getComboboxOptionMotionFrameProps } from './combobox-option-motion';

export function ComboboxOptionMotionFrame({
  children,
  shouldAnimate,
  shouldTrackLayout,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
  shouldTrackLayout?: boolean;
}) {
  return (
    <motion.div
      {...getComboboxOptionMotionFrameProps({
        shouldAnimate,
        shouldTrackLayout,
      })}
    >
      {children}
    </motion.div>
  );
}
