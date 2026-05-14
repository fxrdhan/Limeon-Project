import { useComboboxOptionInteractionModel } from './use-combobox-option-interaction-model';
import type { UseComboboxOptionInteractionOptions } from './use-combobox-option-interaction-types';

export function useComboboxOptionInteraction<Item>(
  options: UseComboboxOptionInteractionOptions<Item>
) {
  return useComboboxOptionInteractionModel(options);
}
