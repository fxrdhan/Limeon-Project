import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TbCheck } from 'react-icons/tb';
import classNames from 'classnames';
import type { CheckboxIconProps } from '../types';

export const CheckboxIcon: React.FC<CheckboxIconProps> = ({
  checked,
  disabled = false,
  className = '',
}) => {
  return (
    <motion.div
      className={classNames(
        'relative w-5 h-5 border-2 rounded-md flex items-center justify-center mr-2 shrink-0 transition-colors duration-200',
        !disabled
          ? 'group-hover:!border-primary group-focus:!border-primary'
          : '',
        className
      )}
      animate={{
        backgroundColor: checked ? 'var(--color-primary)' : '#ffffff',
        borderColor: checked ? 'var(--color-primary)' : '#d1d5db',
      }}
      whileHover={
        !disabled
          ? {
              borderColor: 'var(--color-primary)',
            }
          : {}
      }
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <AnimatePresence>
        {checked && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{
              duration: 0.3,
              ease: 'backOut',
              delay: 0.1,
            }}
          >
            <TbCheck
              className="text-white"
              style={{ fontSize: '0.7rem', marginLeft: '-0.7px' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
