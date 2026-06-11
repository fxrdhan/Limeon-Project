import { motion } from 'motion/react';
import { TbLock, TbLockOpen } from 'react-icons/tb';
import { BRAND_NAME, MENU_ICON_CLASS_NAME } from './constants';
import {
  brandTitleCharacterVariants,
  brandTitleVariants,
} from './motionConfig';

export const LockToggleIcon = ({ isLocked }: { isLocked: boolean }) => (
  <div className="transition-all duration-200">
    {isLocked ? (
      <TbLock className={MENU_ICON_CLASS_NAME} />
    ) : (
      <TbLockOpen className={MENU_ICON_CLASS_NAME} />
    )}
  </div>
);

export const BrandTitle = () => (
  <motion.h2
    className="ml-4 flex overflow-hidden whitespace-nowrap text-lg font-bold text-slate-800"
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={brandTitleVariants}
  >
    {BRAND_NAME.split('').map((character, index) => (
      <motion.span
        key={`${character}-${index}`}
        className="inline-block"
        variants={brandTitleCharacterVariants}
        transition={{ duration: 0.08, ease: 'easeOut' }}
      >
        {character}
      </motion.span>
    ))}
  </motion.h2>
);
