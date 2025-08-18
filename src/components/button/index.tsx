import classNames from 'classnames';
import type { ButtonProps } from '@/types';
import React from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import './style.scss';

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { withGlow?: boolean; withUnderline?: boolean }
>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      withGlow = false,
      withUnderline = true,
      ...props
    },
    ref
  ) => {
    const buttonClasses = classNames(
      'button-base',
      `button-${size}`,
      `button-${variant}`,
      {
        'button-glow': withGlow,
        'button-fullwidth': fullWidth,
        'button-underline': withUnderline && variant === 'text',
      },
      className
    );

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <AiOutlineLoading3Quarters className="animate-spin -ml-1 mr-2 h-4 w-4" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

export default Button;
