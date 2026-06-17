import React from 'react';
import type { CheckboxProps } from '@/types';
import { CheckboxInput, CheckboxIcon, CheckboxLabel } from './components';
import { useKeyboardHandler } from './hooks';
import { getContainerStyles } from './utils';

const CheckboxComponent: React.ForwardRefRenderFunction<
  HTMLLabelElement,
  CheckboxProps
> = (
  { id, label, checked, onChange, disabled = false, className = '', tabIndex },
  ref
) => {
  const { handleKeyDown } = useKeyboardHandler({
    disabled,
    onChange,
    checked,
  });
  const keyboardProps = {
    tabIndex,
    onKeyDown: handleKeyDown,
  };

  return (
    <label
      {...keyboardProps}
      htmlFor={id}
      ref={ref}
      className={getContainerStyles(disabled, className)}
    >
      <CheckboxInput
        id={id}
        ariaLabel={label || 'Checkbox'}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        tabIndex={tabIndex !== undefined ? -1 : undefined}
      />
      <CheckboxIcon checked={checked} disabled={disabled} />
      <CheckboxLabel label={label} />
    </label>
  );
};

export const Checkbox = React.forwardRef(CheckboxComponent);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
