import { useEffect, useRef } from 'react';
import type React from 'react';
import type { ComboboxHiddenInputState } from './primitive-root-state';

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
  onFormReset,
  onRequiredInvalid,
  readOnly,
  required,
  triggerRef,
  value,
}: ComboboxHiddenInputState) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const onFormResetRef = useRef(onFormReset);
  const validationProxyRef = useRef<HTMLInputElement | null>(null);
  const shouldRenderValidationProxy = required && !disabled && !readOnly;

  useEffect(() => {
    onFormResetRef.current = onFormReset;
  }, [onFormReset]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const isAssociatedForm = (formElement: HTMLFormElement) => {
      const explicitForm = form ? document.getElementById(form) : null;
      if (explicitForm === formElement) return true;
      if (hiddenInputRef.current?.form === formElement) return true;
      if (validationProxyRef.current?.form === formElement) return true;

      const hasFormAssociatedControl =
        Boolean(form) ||
        Boolean(hiddenInputRef.current?.form) ||
        Boolean(validationProxyRef.current?.form);
      if (hasFormAssociatedControl) return false;

      const closestForm = triggerRef.current?.closest('form');
      return closestForm === formElement;
    };

    const handleReset = (event: Event) => {
      if (event.defaultPrevented) return;
      if (!(event.target instanceof HTMLFormElement)) return;
      if (!isAssociatedForm(event.target)) return;

      onFormResetRef.current(event);
    };

    document.addEventListener('reset', handleReset);

    return () => {
      document.removeEventListener('reset', handleReset);
    };
  }, [
    disabled,
    form,
    name,
    readOnly,
    required,
    shouldRenderValidationProxy,
    triggerRef,
  ]);

  return (
    <>
      {name ? (
        <input
          ref={hiddenInputRef}
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
          ref={validationProxyRef}
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
