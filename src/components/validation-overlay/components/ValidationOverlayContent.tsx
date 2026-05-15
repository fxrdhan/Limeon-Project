import React from 'react';
import { motion } from 'motion/react';
import { ValidationOverlayComponentProps } from '../types';
import { ANIMATION_VARIANTS, ANIMATION_TRANSITION, STYLES } from '../constants';
import ValidationIcon from './ValidationIcon';
import ValidationMessage from './ValidationMessage';
import ValidationArrow from './ValidationArrow';
import { cn } from '@/lib/utils';

const ValidationOverlayContent: React.FC<ValidationOverlayComponentProps> = ({
  classNames,
  error,
  position,
}) => {
  return (
    <motion.div
      initial={ANIMATION_VARIANTS.initial}
      animate={ANIMATION_VARIANTS.animate}
      exit={ANIMATION_VARIANTS.exit}
      transition={ANIMATION_TRANSITION}
      className={cn(STYLES.overlay, classNames?.overlay)}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className={cn(STYLES.container, classNames?.container)}>
        <ValidationIcon className={cn(STYLES.icon, classNames?.icon)} />
        <ValidationMessage
          message={error}
          className={cn(STYLES.message, classNames?.message)}
        />
      </div>
      <ValidationArrow className={cn(STYLES.arrow, classNames?.arrow)} />
    </motion.div>
  );
};

export default ValidationOverlayContent;
