import type React from 'react';
import { motion } from 'motion/react';
import { getComboboxOptionMotionFrameProps } from './combobox-option-motion';

export function ComboboxOptionMotionFrame({
  children,
  shouldAnimate,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div {...getComboboxOptionMotionFrameProps(shouldAnimate)}>
      {children}
    </motion.div>
  );
}
