import type React from 'react';
import {
  useComboboxActionsContext,
  useComboboxStateContext,
} from './primitive-context';

type ComboboxValueProps = React.ComponentPropsWithoutRef<'span'> & {
  placeholder?: string;
};

export function ComboboxValue({
  children,
  placeholder,
  ...props
}: ComboboxValueProps) {
  const { selectedValue } = useComboboxStateContext<unknown>();
  const { itemToStringLabel } = useComboboxActionsContext<unknown>();
  const selectedLabel =
    selectedValue === null ? '' : itemToStringLabel(selectedValue);
  const isPlaceholder = selectedLabel === '';

  return (
    <span data-placeholder={isPlaceholder ? '' : undefined} {...props}>
      {children ?? (selectedLabel || placeholder)}
    </span>
  );
}
