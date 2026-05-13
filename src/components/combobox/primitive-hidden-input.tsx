import type { ComboboxHiddenInputState } from './primitive-root-state';
import type React from 'react';

const comboboxValidationProxyStyle: React.CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  margin: -1,
  opacity: 0,
  overflow: 'hidden',
  padding: 0,
  pointerEvents: 'none',
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};

export function ComboboxHiddenInput({
  disabled,
  form,
  name,
  onRequiredInvalid,
  readOnly,
  required,
  triggerRef,
  value,
}: ComboboxHiddenInputState) {
  const shouldRenderValidationProxy = required && !disabled && !readOnly;

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          form={form}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
        />
      ) : null}
      {shouldRenderValidationProxy ? (
        <input
          aria-hidden="true"
          data-combobox-required-input=""
          form={form}
          required
          style={comboboxValidationProxyStyle}
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          onInvalid={event => {
            onRequiredInvalid?.(event);
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </>
  );
}
