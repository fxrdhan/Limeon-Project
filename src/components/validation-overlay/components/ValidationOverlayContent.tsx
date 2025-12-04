import React from 'react';
import { motion } from 'motion/react';
import { ValidationOverlayComponentProps } from '../types';
import { ANIMATION_VARIANTS, ANIMATION_TRANSITION, STYLES } from '../constants';
import ValidationIcon from './ValidationIcon';
import ValidationMessage from './ValidationMessage';
import ValidationArrow from './ValidationArrow';

const ValidationOverlayContent: React.FC<ValidationOverlayComponentProps> = ({
  error,
  position,
}) => {
  return (
    <motion.div
      initial={ANIMATION_VARIANTS.initial}
      animate={ANIMATION_VARIANTS.animate}
      exit={ANIMATION_VARIANTS.exit}
      transition={ANIMATION_TRANSITION}
      className={STYLES.overlay}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className={STYLES.container}>
        <ValidationIcon />
        <ValidationMessage message={error} />
      </div>
      <ValidationArrow />
    </motion.div>
  );
};

export default ValidationOverlayContent;
