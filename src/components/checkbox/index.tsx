import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';
import type { CheckboxProps } from '@/types';
import classNames from 'classnames';

const CheckboxComponent: React.ForwardRefRenderFunction<
  HTMLLabelElement,
  CheckboxProps
> = (
  { id, label, checked, onChange, disabled = false, className = '', tabIndex },
  ref
) => {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' && !disabled) {
      event.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      ref={ref}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      className={classNames(
        'inline-flex items-center group focus:outline-hidden',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <motion.div
        className={classNames(
          'relative w-5 h-5 border-2 rounded-md flex items-center justify-center mr-2 shrink-0 transition-colors duration-200 group-focus:border-emerald-400',
          checked ? 'bg-primary border-primary' : 'bg-white border-gray-300',
          !disabled && !checked ? 'group-hover:border-emerald-400' : ''
        )}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.1, ease: 'circOut' }}
            >
              <FaCheck className="text-white" style={{ fontSize: '0.7rem' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {label && (
        <span className="text-sm text-gray-700 select-none">{label}</span>
      )}
    </label>
  );
};

export const Checkbox = React.forwardRef(CheckboxComponent);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
