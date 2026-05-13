import type React from 'react';

type ComboboxPreventableSyntheticEvent = React.SyntheticEvent & {
  preventComboboxHandler?: () => void;
};

export const pharmaComboboxOptionIndexAttribute =
  'data-pharma-combobox-index' as const;

type PharmaComboboxOptionIndexAttributes = {
  [pharmaComboboxOptionIndexAttribute]: string;
};

const getPharmaComboboxOptionIndexValue = (index: number) => index.toString();

export const getPharmaComboboxOptionIndexAttributes = (
  index: number
): PharmaComboboxOptionIndexAttributes => ({
  [pharmaComboboxOptionIndexAttribute]:
    getPharmaComboboxOptionIndexValue(index),
});

export const getPharmaComboboxOptionIndexSelector = (index: number) =>
  `[${pharmaComboboxOptionIndexAttribute}="${getPharmaComboboxOptionIndexValue(
    index
  )}"]`;

export const preventComboboxHandler = (event: React.SyntheticEvent) => {
  (event as ComboboxPreventableSyntheticEvent).preventComboboxHandler?.();
};
