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

  return (
    <label
      htmlFor={id}
      ref={ref}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      className={getContainerStyles(disabled, className)}
    >
      <CheckboxInput
        id={id}
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
