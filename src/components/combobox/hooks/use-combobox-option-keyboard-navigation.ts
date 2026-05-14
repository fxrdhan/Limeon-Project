import {
  useComboboxHighlight,
  type ComboboxHighlightOptions,
} from './use-combobox-highlight';

export function useComboboxOptionKeyboardNavigation<Item>(
  options: ComboboxHighlightOptions<Item>
) {
  return useComboboxHighlight(options);
}
