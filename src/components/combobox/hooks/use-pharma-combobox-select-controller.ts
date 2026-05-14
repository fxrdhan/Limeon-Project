import type { PharmaComboboxSelectProps } from '../presets-types';
import { getPharmaComboboxControllerConfig } from '../utils/preset-controller-config';
import { getPharmaComboboxViewModel } from '../utils/preset-controller-view-model';
import { usePharmaComboboxBehavior } from './use-pharma-combobox-behavior';
import { usePharmaComboboxStateModel } from './use-pharma-combobox-state-model';

export function usePharmaComboboxSelectController<Item>(
  props: PharmaComboboxSelectProps<Item>
) {
  const config = getPharmaComboboxControllerConfig(props);
  const state = usePharmaComboboxStateModel(config);
  const behavior = usePharmaComboboxBehavior({ config, state });

  return getPharmaComboboxViewModel({ behavior, config, state });
}
