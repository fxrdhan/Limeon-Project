import type React from 'react';
import { Combobox, type ComboboxRootProps } from './index';

type RootWithAlwaysAutoHighlightProps<Item> = Omit<
  ComboboxRootProps<Item>,
  'autoHighlight'
> & {
  autoHighlight?: ComboboxRootProps<Item>['autoHighlight'] | 'always';
  keepHighlight?: boolean;
};

// Base UI runtime supports these modes; the current public Root type narrows them.
export const ComboboxRootWithAlwaysAutoHighlight = Combobox.Root as <Item>(
  props: RootWithAlwaysAutoHighlightProps<Item>
) => React.JSX.Element;
