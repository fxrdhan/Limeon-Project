import React, {
  forwardRef,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import { useComboboxContext } from './primitive-context';
import {
  callIfFunction,
  getPreventableEvent,
  isComboboxHandlerPrevented,
  mergeRenderElementProps,
  setRef,
} from './utils/primitive-render';

type RenderProp<Props, State> =
  | React.ReactElement<Record<string, unknown>>
  | ((props: Props, state: State) => React.ReactElement | null);

type RenderableProps<Props, State> = {
  render?: RenderProp<Props, State>;
};

type ItemElementProps = React.HTMLAttributes<HTMLElement> & {
  [key: `data-${string}`]: string | undefined;
};

type ItemRenderProps = ItemElementProps & {
  ref: React.Ref<HTMLElement>;
};

type ItemState = {
  disabled: boolean;
  highlighted: boolean;
  selected: boolean;
};

type ComboboxListProps<Value = React.ReactNode> = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children' | 'id'
> & {
  children?:
    | React.ReactNode
    | ((item: Value, index: number) => React.ReactNode);
};

type ComboboxCollectionProps<Value = React.ReactNode> = {
  children: (item: Value, index: number) => React.ReactNode;
};

type ComboboxItemProps<Value> = Omit<
  React.HTMLAttributes<HTMLElement>,
  'children' | 'id'
> &
  RenderableProps<ItemRenderProps, ItemState> & {
    children?: React.ReactNode;
    disabled?: boolean;
    index: number;
    value: Value;
  };

type ComboboxItemIndicatorProps = React.ComponentPropsWithoutRef<'span'>;
type ComboboxEmptyProps = React.ComponentPropsWithoutRef<'div'>;
type ComboboxStatusProps = React.ComponentPropsWithoutRef<'div'>;

type ComboboxListComponent = <Value = React.ReactNode>(
  props: ComboboxListProps<Value> & React.RefAttributes<HTMLDivElement>
) => React.ReactElement | null;

export const ComboboxList = forwardRef(function ComboboxList<
  Value = React.ReactNode,
>(
  { children, ...props }: ComboboxListProps<Value>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const context = useComboboxContext<unknown>();
  const labelledBy =
    props['aria-label'] === undefined
      ? (props['aria-labelledby'] ?? context.labelId)
      : props['aria-labelledby'];
  const renderedChildren =
    typeof children === 'function'
      ? context.filteredItems.map((item, index) =>
          children(item as Value, index)
        )
      : children;

  return (
    <div
      {...props}
      ref={ref}
      id={context.listboxId}
      role="listbox"
      aria-labelledby={labelledBy}
    >
      {renderedChildren}
    </div>
  );
}) as ComboboxListComponent;

export function ComboboxCollection<Value = React.ReactNode>({
  children,
}: ComboboxCollectionProps<Value>) {
  const context = useComboboxContext<unknown>();

  return context.filteredItems.map((item, index) =>
    children(item as Value, index)
  );
}

export function ComboboxItem<Value>({
  children,
  disabled = false,
  index,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  render,
  value,
  ...props
}: ComboboxItemProps<Value>) {
  const context = useComboboxContext<Value>();
  const itemRef = useRef<HTMLElement | null>(null);
  const { registerItem } = context;
  const selected =
    context.selectedValue !== null &&
    context.isItemEqualToValue(value, context.selectedValue);
  const highlighted = context.activeIndex === index;
  const itemDisabled =
    context.disabled || disabled || context.isItemDisabled(value);

  useLayoutEffect(
    () =>
      registerItem(index, {
        disabled: itemDisabled,
        value,
      }),
    [index, itemDisabled, registerItem, value]
  );

  const setItemRef = useCallback((node: HTMLElement | null) => {
    itemRef.current = node;
  }, []);

  const itemState: ItemState = {
    disabled: itemDisabled,
    highlighted,
    selected,
  };

  const itemElementProps: ItemElementProps = {
    ...props,
    'aria-disabled': itemDisabled || undefined,
    'aria-selected': selected,
    'data-disabled': itemDisabled ? '' : undefined,
    'data-highlighted': highlighted ? '' : undefined,
    'data-selected': selected ? '' : undefined,
    ...(children === undefined ? {} : { children }),
    id: context.getItemId(index),
    onClick: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onClick, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        itemDisabled
      ) {
        return;
      }

      context.selectItem(value, 'item-press', event, index);
    },
    onMouseEnter: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onMouseEnter, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        itemDisabled ||
        !context.highlightItemOnHover
      ) {
        return;
      }

      context.setActiveIndex(index, 'pointer', event);
    },
    onMouseLeave: event => {
      getPreventableEvent(event);
      callIfFunction(onMouseLeave, event);
    },
    onMouseMove: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onMouseMove, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        itemDisabled ||
        !context.highlightItemOnHover
      ) {
        return;
      }

      context.setActiveIndex(index, 'pointer', event);
    },
    role: 'option',
    tabIndex: -1,
  };

  const itemRenderProps: ItemRenderProps = {
    ...itemElementProps,
    ref: setItemRef,
  };

  if (typeof render === 'function') {
    return render(itemRenderProps, itemState);
  }

  if (isValidElement<Record<string, unknown>>(render)) {
    const renderRef = render.props.ref as React.Ref<HTMLElement> | undefined;

    return React.cloneElement(render, {
      ...mergeRenderElementProps(render.props, itemRenderProps),
      ref: (node: HTMLElement | null) => {
        setRef(renderRef, node);
        setItemRef(node);
      },
    } satisfies Record<string, unknown>);
  }

  return (
    <div {...itemElementProps} ref={setItemRef}>
      {children}
    </div>
  );
}

export function ComboboxItemIndicator({
  children,
  ...props
}: ComboboxItemIndicatorProps) {
  return <span {...props}>{children}</span>;
}

export function ComboboxEmpty({ children, ...props }: ComboboxEmptyProps) {
  const context = useComboboxContext<unknown>();
  if (context.filteredItems.length > 0) return null;

  return (
    <div role="status" {...props}>
      {children}
    </div>
  );
}

export function ComboboxStatus({ children, ...props }: ComboboxStatusProps) {
  return (
    <div role="status" {...props}>
      {children}
    </div>
  );
}
