import type { ComboboxHiddenInputState } from './primitive-root-state';

export function ComboboxHiddenInput({
  disabled,
  form,
  name,
  readOnly,
  value,
}: ComboboxHiddenInputState) {
  if (!name) return null;

  return (
    <input
      type="hidden"
      name={name}
      form={form}
      value={value}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
