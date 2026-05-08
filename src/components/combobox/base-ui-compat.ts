import type React from 'react';
import { Combobox, type ComboboxRootProps } from './index';

type RootWithAlwaysAutoHighlightProps<Item> = Omit<
  ComboboxRootProps<Item>,
  'autoHighlight'
> & {
  autoHighlight?: ComboboxRootProps<Item>['autoHighlight'] | 'always';
};

// Base UI runtime supports this mode; the current public Root type narrows it.
export const ComboboxRootWithAlwaysAutoHighlight = Combobox.Root as <Item>(
  props: RootWithAlwaysAutoHighlightProps<Item>
) => React.JSX.Element;
