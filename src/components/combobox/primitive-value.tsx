import type React from 'react';
import { useComboboxContext } from './primitive-context';

type ComboboxValueProps = React.ComponentPropsWithoutRef<'span'> & {
  placeholder?: string;
};

export function ComboboxValue({
  children,
  placeholder,
  ...props
}: ComboboxValueProps) {
  const context = useComboboxContext<unknown>();
  const selectedLabel =
    context.selectedValue === null
      ? ''
      : context.itemToStringLabel(context.selectedValue);
  const isPlaceholder = selectedLabel === '';

  return (
    <span data-placeholder={isPlaceholder ? '' : undefined} {...props}>
      {children ?? (selectedLabel || placeholder)}
    </span>
  );
}
