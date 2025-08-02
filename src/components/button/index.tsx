import classNames from 'classnames';
import type { ButtonProps, ButtonVariant } from '@/types';
import React from 'react';

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { withGlow?: boolean }
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
      ...props
    },
    ref
  ) => {
    const variants: Record<ButtonVariant, string> = {
      text: 'text-gray-500 hover:text-black hover:underline underline-offset-2 decoration-2',
      primary:
        'rounded-lg ring-0 outline-hidden shadow-md bg-primary flex items-center text-white hover:text-white',
      secondary:
        'rounded-lg bg-secondary bg-secondary ring-0 outline-hidden flex items-center text-white hover:text-white',
      danger:
        'text-danger hover:text-white hover:bg-danger/80 outline-hidden hover:opacity-100!',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    const baseClasses = classNames(
      'cursor-pointer font-medium rounded-lg transition-all duration-300 ease-in-out',
      'disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden',
      {
        'hover:opacity-80': !withGlow,
      }
    );

    let glowClass = '';
    if (withGlow) {
      if (variant === 'primary') {
        glowClass =
          'hover:shadow-[0_0_5px_var(--color-primary),0_0_15px_var(--color-primary),0_0_30px_var(--color-primary)] focus:shadow-[0_0_5px_var(--color-primary),0_0_15px_var(--color-primary),0_0_30px_var(--color-primary)]';
      } else if (variant === 'danger') {
        glowClass =
          'focus:shadow-[0_0_5px_var(--color-danger),0_0_15px_var(--color-danger),0_0_30px_var(--color-danger)] hover:shadow-[0_0_5px_var(--color-danger),0_0_15px_var(--color-danger),0_0_30px_var(--color-danger)]';
      }
    }

    return (
      <button
        ref={ref}
        className={classNames(
          baseClasses,
          sizes[size],
          variants[variant],
          {
            'w-full': fullWidth,
            [glowClass]: withGlow && glowClass,
          },
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
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
