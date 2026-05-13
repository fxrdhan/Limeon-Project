import React, {
  forwardRef,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  useComboboxActionsContext,
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';
import {
  callIfFunction,
  getPreventableEvent,
  isComboboxHandlerPrevented,
  mergeRenderElementProps,
  setRef,
} from './utils/primitive-render';

export type ComboboxRenderProp<Props, State> =
  | React.ReactElement<Record<string, unknown>>
  | ((props: Props, state: State) => React.ReactElement | null);

type RenderableProps<Props, State> = {
  render?: ComboboxRenderProp<Props, State>;
};

export type ComboboxItemElementProps = React.HTMLAttributes<HTMLElement> & {
  [key: `data-${string}`]: string | undefined;
};

export type ComboboxItemRenderProps = ComboboxItemElementProps & {
  ref: React.Ref<HTMLElement>;
};

export type ComboboxItemState = {
  disabled: boolean;
  highlighted: boolean;
  selected: boolean;
};

export type ComboboxListProps<Value = React.ReactNode> = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children' | 'id'
> & {
  children?:
    | React.ReactNode
    | ((item: Value, index: number) => React.ReactNode);
};

export type ComboboxCollectionProps<Value = React.ReactNode> = {
  children: (item: Value, index: number) => React.ReactNode;
};

export type ComboboxItemProps<Value> = Omit<
  React.HTMLAttributes<HTMLElement>,
  'children' | 'id'
> &
  RenderableProps<ComboboxItemRenderProps, ComboboxItemState> & {
    children?: React.ReactNode;
    disabled?: boolean;
    index: number;
    value: Value;
  };

type ComboboxItemIndicatorProps = React.ComponentPropsWithoutRef<'span'>;
type ComboboxEmptyProps = React.ComponentPropsWithoutRef<'div'>;
type ComboboxStatusProps = React.ComponentPropsWithoutRef<'div'>;

export type ComboboxListComponent = <Value = React.ReactNode>(
  props: ComboboxListProps<Value> & React.RefAttributes<HTMLDivElement>
) => React.ReactElement | null;

export const ComboboxList = forwardRef(function ComboboxList<
  Value = React.ReactNode,
>(
  { children, ...props }: ComboboxListProps<Value>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { labelId, filteredItems } = useComboboxStateContext<unknown>();
  const labelledBy =
    props['aria-label'] === undefined
      ? (props['aria-labelledby'] ?? labelId)
      : props['aria-labelledby'];
  const renderedChildren =
    typeof children === 'function'
      ? filteredItems.map((item, index) => children(item as Value, index))
      : children;
  const { listboxId } = useComboboxStaticContext();

  return (
    <div
      {...props}
      ref={ref}
      id={listboxId}
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
  const { filteredItems } = useComboboxStateContext<unknown>();

  return filteredItems.map((item, index) => children(item as Value, index));
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
  const {
    activeIndex,
    disabled: comboboxDisabled,
    filteredItems,
    highlightItemOnHover,
    selectedValue,
  } = useComboboxStateContext<Value>();
  const { getItemId } = useComboboxStaticContext();
  const {
    isItemDisabled,
    isItemEqualToValue,
    registerItem,
    selectItem,
    setActiveIndex,
  } = useComboboxActionsContext<Value>();
  const itemRef = useRef<HTMLElement | null>(null);
  const indexedValue = filteredItems[index];
  if (!(index in filteredItems) || !Object.is(indexedValue, value)) {
    throw new Error(
      'Combobox.Item value/index mismatch. Render items from Combobox.List or Combobox.Collection and pass the exact item and index provided by the primitive.'
    );
  }

  const selected =
    selectedValue !== null && isItemEqualToValue(value, selectedValue);
  const highlighted = activeIndex === index;
  const itemDisabled = comboboxDisabled || disabled || isItemDisabled(value);

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

  const itemState: ComboboxItemState = {
    disabled: itemDisabled,
    highlighted,
    selected,
  };

  const itemElementProps: ComboboxItemElementProps = {
    ...props,
    'aria-disabled': itemDisabled || undefined,
    'aria-selected': selected,
    'data-disabled': itemDisabled ? '' : undefined,
    'data-highlighted': highlighted ? '' : undefined,
    'data-selected': selected ? '' : undefined,
    ...(children === undefined ? {} : { children }),
    id: getItemId(index),
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

      selectItem(value, 'item-press', event, index);
    },
    onMouseEnter: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onMouseEnter, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        itemDisabled ||
        !highlightItemOnHover
      ) {
        return;
      }

      setActiveIndex(index, 'pointer', event);
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
        !highlightItemOnHover
      ) {
        return;
      }

      setActiveIndex(index, 'pointer', event);
    },
    role: 'option',
    tabIndex: -1,
  };

  const itemRenderProps: ComboboxItemRenderProps = {
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
  const { filteredItems } = useComboboxStateContext<unknown>();
  if (filteredItems.length > 0) return null;

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
