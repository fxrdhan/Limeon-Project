import React, { createContext, forwardRef, useContext } from 'react';
import { Combobox } from './internal/primitive';
import type { ComboboxItemProps, ComboboxListProps } from './primitive-items';
import {
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';
import type { ComboboxRootProps } from './primitive-root-state';

type TypedComboboxItemScopeValue<Value> = {
  index: number;
  value: Value;
};

export type TypedComboboxCollectionProps<Value> = {
  children: (item: Value, index: number) => React.ReactNode;
};

export type TypedComboboxItemProps<Value> = Omit<
  ComboboxItemProps<Value>,
  'disabled' | 'index' | 'value'
>;

export type TypedComboboxListProps<Value> = Omit<
  ComboboxListProps<Value>,
  'children'
> & {
  children: (item: Value, index: number) => React.ReactNode;
};

export type TypedCombobox<Value> = Omit<
  typeof Combobox,
  'Collection' | 'Item' | 'List' | 'Root'
> & {
  Collection: (props: TypedComboboxCollectionProps<Value>) => React.ReactNode;
  Item: (props: TypedComboboxItemProps<Value>) => React.ReactElement | null;
  List: (
    props: TypedComboboxListProps<Value> & React.RefAttributes<HTMLDivElement>
  ) => React.ReactElement | null;
  Root: (props: ComboboxRootProps<Value>) => React.ReactElement | null;
};

export const createTypedCombobox = <Value>() => {
  const ItemScope = createContext<TypedComboboxItemScopeValue<Value> | null>(
    null
  );

  const useItemScope = () => {
    const itemScope = useContext(ItemScope);
    if (!itemScope) {
      throw new Error(
        'Typed Combobox.Item must be rendered inside a typed Combobox.List or Combobox.Collection item callback.'
      );
    }

    return itemScope;
  };

  const renderScopedItem = (
    item: Value,
    index: number,
    children: React.ReactNode,
    key: React.Key
  ) =>
    React.createElement(
      ItemScope.Provider,
      {
        key,
        value: {
          index,
          value: item,
        },
      },
      children
    );

  const TypedCollection = ({
    children,
  }: TypedComboboxCollectionProps<Value>) => {
    const { filteredItems } = useComboboxStateContext<Value>();
    const { getItemId } = useComboboxStaticContext();

    return filteredItems.map((item, index) =>
      renderScopedItem(item, index, children(item, index), getItemId(index))
    );
  };

  const TypedItem = (props: TypedComboboxItemProps<Value>) => {
    const { index, value } = useItemScope();

    return React.createElement(Combobox.Item, {
      ...props,
      index,
      value,
    });
  };

  const TypedList = forwardRef<HTMLDivElement, TypedComboboxListProps<Value>>(
    function TypedList({ children, ...props }, ref) {
      const { filteredItems } = useComboboxStateContext<Value>();
      const { getItemId } = useComboboxStaticContext();
      const renderedChildren = filteredItems.map((item, index) =>
        renderScopedItem(item, index, children(item, index), getItemId(index))
      );

      return React.createElement(
        Combobox.List,
        {
          ...props,
          ref,
        },
        renderedChildren
      );
    }
  );

  return {
    ...Combobox,
    Collection: TypedCollection,
    Item: TypedItem,
    List: TypedList,
    Root: Combobox.Root,
  } as TypedCombobox<Value>;
};
