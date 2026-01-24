import classNames from 'classnames';
import type { ButtonProps, ButtonVariant, ButtonSize } from '@/types';
import { isButtonVariant, isButtonSize } from '@/types';
import React from 'react';
import { TbLoader2 } from 'react-icons/tb';
import './style.scss';

/**
 * Enhanced Button component with SCSS styling and theme support
 *
 * Features:
 * - Multiple variants (primary, secondary, text, danger, text-danger)
 * - Three sizes (sm, md, lg)
 * - Loading state with React Icons spinner
 * - Optional glow effects
 * - Full width support
 * - CSS custom properties for theming
 * - Type-safe with runtime validation
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" withGlow>
 *   Save Changes
 * </Button>
 *
 * <Button variant="danger" isLoading onClick={handleDelete}>
 *   Delete Item
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
    // Runtime validation for development
    if (process.env.NODE_ENV === 'development') {
      if (variant && !isButtonVariant(variant)) {
        console.warn(
          `[Button] Invalid variant "${variant}". Using fallback "primary".`
        );
      }
      if (size && !isButtonSize(size)) {
        console.warn(`[Button] Invalid size "${size}". Using fallback "md".`);
      }
    }

    // Ensure valid fallbacks
    const safeVariant: ButtonVariant = isButtonVariant(variant)
      ? variant
      : 'primary';
    const safeSize: ButtonSize = isButtonSize(size) ? size : 'md';
    const buttonClasses = classNames(
      'button',
      `button--${safeSize}`,
      `button--${safeVariant}`,
      {
        'button--glow': withGlow,
        'button--fullwidth': fullWidth,
        'button--underline': withUnderline && safeVariant === 'text',
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
          <span className="button__spinner">
            <TbLoader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
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
