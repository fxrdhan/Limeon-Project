import type React from 'react';

type ComboboxPreventableSyntheticEvent = React.SyntheticEvent & {
  preventComboboxHandler?: () => void;
};

export const setRef = <Node>(
  ref: React.Ref<Node> | undefined,
  value: Node | null
) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  ref.current = value;
};

export const preventComboboxHandler = (event: React.SyntheticEvent) => {
  (event as ComboboxPreventableSyntheticEvent).preventComboboxHandler?.();
};
