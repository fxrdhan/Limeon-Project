import type React from 'react';
import { Combobox } from './primitive';
import type {
  ComboboxCollectionProps,
  ComboboxItemProps,
  ComboboxListProps,
} from './primitive-items';
import type { ComboboxRootProps } from './primitive-root-state';

export type TypedCombobox<Value> = Omit<
  typeof Combobox,
  'Collection' | 'Item' | 'List' | 'Root'
> & {
  Collection: (props: ComboboxCollectionProps<Value>) => React.ReactNode;
  Item: (props: ComboboxItemProps<Value>) => React.ReactElement | null;
  List: (
    props: ComboboxListProps<Value> & React.RefAttributes<HTMLDivElement>
  ) => React.ReactElement | null;
  Root: (props: ComboboxRootProps<Value>) => React.ReactElement | null;
};

export const createTypedCombobox = <Value>() =>
  Combobox as TypedCombobox<Value>;
