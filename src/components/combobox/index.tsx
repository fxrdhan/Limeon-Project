import React, {
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { BaseUIChangeEventDetails } from '@/types';
import { createComboboxChangeDetails } from './utils/eventDetails';

type EventLike = Event | SyntheticEvent<HTMLElement>;

export type ComboboxOpenChangeReason =
  | 'trigger-press'
  | 'outside-press'
  | 'item-press'
  | 'escape-key'
  | 'focus-out'
  | 'input-focus'
  | 'none';
export type ComboboxValueChangeReason = 'item-press' | 'none';
export type ComboboxInputValueChangeReason =
  | 'input-change'
  | 'reset'
  | 'typeahead';
export type ComboboxHighlightChangeReason = 'keyboard' | 'pointer' | 'none';

export type ComboboxOpenChangeDetails =
  BaseUIChangeEventDetails<ComboboxOpenChangeReason>;
export type ComboboxValueChangeDetails =
  BaseUIChangeEventDetails<ComboboxValueChangeReason>;
export type ComboboxInputValueChangeDetails =
  BaseUIChangeEventDetails<ComboboxInputValueChangeReason>;
export interface ComboboxHighlightChangeDetails extends BaseUIChangeEventDetails<ComboboxHighlightChangeReason> {
  index: number;
}

export type ComboboxRenderProp<Props, State> =
  | ReactElement<Partial<Props>>
  | ((props: Props, state: State) => ReactElement<Partial<Props>>);

type DataAttributes = {
  [key: `data-${string}`]: string | undefined;
};

type ComboboxValue<
  Item,
  Multiple extends boolean | undefined,
> = Multiple extends true ? Item[] : Item | null;

type ComboboxFilter<Item> = (
  item: Item,
  inputValue: string,
  locale: string
) => boolean;

export interface ComboboxRootState<Item = unknown> {
  open: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  multiple: boolean;
  inputValue: string;
  highlightedItem: Item | null;
  selectedItems: Item[];
}

export type ComboboxRootRenderProps = ComponentPropsWithoutRef<'div'> &
  DataAttributes & {
    ref: Ref<HTMLDivElement>;
  };

export interface ComboboxRootProps<
  Item,
  Multiple extends boolean | undefined = false,
> extends Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange'> {
  items: Item[];
  filteredItems?: Item[];
  value?: ComboboxValue<Item, Multiple>;
  defaultValue?: ComboboxValue<Item, Multiple>;
  onValueChange?: (
    value: ComboboxValue<Item, Multiple>,
    details: ComboboxValueChangeDetails
  ) => void;
  multiple?: Multiple;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ComboboxOpenChangeDetails) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (
    value: string,
    details: ComboboxInputValueChangeDetails
  ) => void;
  highlightedItem?: Item | null;
  onItemHighlighted?: (
    item: Item | null,
    details: ComboboxHighlightChangeDetails
  ) => void;
  filter?: ComboboxFilter<Item> | null;
  limit?: number;
  locale?: string;
  itemToStringLabel?: (item: Item) => string;
  itemToStringValue?: (item: Item) => string;
  isItemEqualToValue?: (item: Item, value: Item) => boolean;
  name?: string;
  form?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  modal?: boolean;
  autoHighlight?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  render?: ComboboxRenderProp<ComboboxRootRenderProps, ComboboxRootState<Item>>;
}

export interface ComboboxLabelState {
  disabled: boolean;
  required: boolean;
}

export interface ComboboxTriggerState<Item = unknown> {
  open: boolean;
  disabled: boolean;
  readOnly: boolean;
  placeholder: boolean;
  selectedItem: Item | null;
  selectedItems: Item[];
  selectedLabel: string;
}

export interface ComboboxPopupState {
  open: boolean;
  side: 'top' | 'bottom';
}

export interface ComboboxSearchInputState {
  open: boolean;
  value: string;
  empty: boolean;
}

export interface ComboboxListState<Item = unknown> {
  open: boolean;
  empty: boolean;
  highlightedItem: Item | null;
}

export interface ComboboxItemState<Item = unknown> {
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
  item: Item;
}

type RenderPartProps = {
  className?: string;
  style?: CSSProperties;
  ref?: unknown;
};

type ComboboxContextValue<Item> = {
  rootId: string;
  labelId: string;
  labelMounted: boolean;
  triggerId: string;
  popupId: string;
  listId: string;
  inputId: string;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  rootRef: MutableRefObject<HTMLDivElement | null>;
  popupRef: MutableRefObject<HTMLDivElement | null>;
  items: Item[];
  visibleItems: Item[];
  selectedItems: Item[];
  selectedItem: Item | null;
  highlightedItem: Item | null;
  highlightedIndex: number;
  open: boolean;
  inputValue: string;
  multiple: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  name?: string;
  form?: string;
  autoHighlight: boolean;
  highlightItemOnHover: boolean;
  loopFocus: boolean;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  isItemEqualToValue: (item: Item, value: Item) => boolean;
  setOpen: (
    open: boolean,
    reason: ComboboxOpenChangeReason,
    event?: EventLike
  ) => ComboboxOpenChangeDetails | null;
  setInputValue: (
    value: string,
    reason: ComboboxInputValueChangeReason,
    event?: EventLike
  ) => void;
  highlightItem: (
    item: Item | null,
    reason: ComboboxHighlightChangeReason,
    event?: EventLike
  ) => void;
  selectItem: (item: Item, event?: EventLike) => void;
  getItemId: (item: Item, fallbackIndex?: number) => string;
  registerLabel: () => () => void;
};

const ComboboxContext = createContext<ComboboxContextValue<unknown> | null>(
  null
);

const useComboboxInternal = <Item,>() => {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox parts must be rendered inside Combobox.Root.');
  }
  return context as ComboboxContextValue<Item>;
};

const setRef = <Node,>(ref: unknown, value: Node | null) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (typeof ref === 'object' && 'current' in ref) {
    (ref as MutableRefObject<Node | null>).current = value;
  }
};

const composeRefs =
  <Node,>(...refs: unknown[]) =>
  (value: Node | null) => {
    refs.forEach(ref => setRef(ref, value));
  };

const isEventHandler = (key: string, value: unknown) =>
  /^on[A-Z]/.test(key) && typeof value === 'function';

const isDefaultPrevented = (event: unknown) =>
  typeof event === 'object' &&
  event !== null &&
  'defaultPrevented' in event &&
  event.defaultPrevented === true;

const mergeElementProps = <Props extends RenderPartProps>(
  element: ReactElement,
  props: Props
) => {
  const elementProps = element.props as RenderPartProps &
    Record<string, unknown>;
  const propRecord = props as RenderPartProps & Record<string, unknown>;
  const mergedProps: RenderPartProps & Record<string, unknown> = {
    ...elementProps,
    ...props,
  };

  if (elementProps.className || props.className) {
    mergedProps.className = [props.className, elementProps.className]
      .filter(Boolean)
      .join(' ');
  }

  if (elementProps.style || props.style) {
    mergedProps.style = {
      ...props.style,
      ...elementProps.style,
    };
  }

  Object.entries(elementProps).forEach(([key, elementValue]) => {
    const propValue = propRecord[key];
    if (!isEventHandler(key, elementValue) || typeof propValue !== 'function') {
      return;
    }

    mergedProps[key] = (...args: unknown[]) => {
      (elementValue as (...handlerArgs: unknown[]) => void)(...args);
      if (!isDefaultPrevented(args[0])) {
        (propValue as (...handlerArgs: unknown[]) => void)(...args);
      }
    };
  });

  const elementRef = (element as ReactElement & { ref?: unknown }).ref;
  if (elementRef && props.ref) {
    mergedProps.ref = composeRefs(props.ref, elementRef);
  } else if (elementRef) {
    mergedProps.ref = elementRef;
  }

  return mergedProps;
};

const renderPart = <Props extends RenderPartProps, State>(
  render: ComboboxRenderProp<Props, State> | undefined,
  props: Props,
  state: State
) => {
  if (typeof render === 'function') return render(props, state);
  if (isValidElement(render)) {
    return React.cloneElement(
      render as ReactElement<Record<string, unknown>>,
      mergeElementProps(render, props) as Record<string, unknown>
    );
  }
  return null;
};

const defaultItemToString = <Item,>(item: Item) =>
  item == null ? '' : String(item);

const isElementInside = (
  event: EventLike | MouseEvent,
  element: Element | null
) =>
  element
    ? event.target instanceof Node && element.contains(event.target)
    : false;

const findNextEnabledIndex = <Item,>(
  items: Item[],
  startIndex: number,
  direction: 1 | -1,
  loop: boolean
) => {
  if (items.length === 0) return -1;
  let nextIndex = startIndex;

  for (let step = 0; step < items.length; step += 1) {
    nextIndex += direction;
    if (nextIndex < 0) {
      if (!loop) return -1;
      nextIndex = items.length - 1;
    } else if (nextIndex >= items.length) {
      if (!loop) return -1;
      nextIndex = 0;
    }

    const item = items[nextIndex];
    if (
      !(typeof item === 'object' && item && 'disabled' in item && item.disabled)
    ) {
      return nextIndex;
    }
  }

  return -1;
};

const getSafeIdPart = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, '_') || 'item';

function Root<Item, Multiple extends boolean | undefined = false>({
  children,
  items,
  filteredItems,
  value,
  defaultValue,
  onValueChange,
  multiple,
  open,
  defaultOpen = false,
  onOpenChange,
  inputValue,
  defaultInputValue = '',
  onInputValueChange,
  highlightedItem,
  onItemHighlighted,
  filter,
  limit,
  locale = 'id-ID',
  itemToStringLabel = defaultItemToString,
  itemToStringValue = defaultItemToString,
  isItemEqualToValue = Object.is,
  name,
  form,
  disabled = false,
  readOnly = false,
  required = false,
  modal = false,
  autoHighlight = true,
  highlightItemOnHover = true,
  loopFocus = true,
  render,
  id,
  className,
  style,
  ...domProps
}: ComboboxRootProps<Item, Multiple>) {
  const generatedId = useId();
  const rootId = id ?? `combobox-${generatedId.replace(/:/g, '')}`;
  const labelId = `${rootId}-label`;
  const triggerId = `${rootId}-trigger`;
  const popupId = `${rootId}-popup`;
  const listId = `${rootId}-list`;
  const inputId = `${rootId}-input`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const isOpenControlled = open !== undefined;
  const isValueControlled = value !== undefined;
  const isInputControlled = inputValue !== undefined;
  const isHighlightControlled = highlightedItem !== undefined;
  const isMultiple = Boolean(multiple);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    useState(defaultInputValue);
  const [uncontrolledValue, setUncontrolledValue] = useState<
    Item | Item[] | null
  >(
    defaultValue === undefined
      ? isMultiple
        ? []
        : null
      : (defaultValue as Item | Item[] | null)
  );
  const [uncontrolledHighlightedItem, setUncontrolledHighlightedItem] =
    useState<Item | null>(null);
  const [labelMounted, setLabelMounted] = useState(false);
  const actualOpen = isOpenControlled ? open : uncontrolledOpen;
  const actualInputValue = isInputControlled
    ? inputValue
    : uncontrolledInputValue;
  const actualValue = isValueControlled ? value : uncontrolledValue;
  const selectedItems = useMemo(() => {
    if (isMultiple) return Array.isArray(actualValue) ? actualValue : [];
    return actualValue == null || Array.isArray(actualValue)
      ? []
      : [actualValue as Item];
  }, [actualValue, isMultiple]);
  const selectedItem = selectedItems[0] ?? null;

  const visibleItems = useMemo(() => {
    const source = filteredItems ?? items;
    const defaultLabelFilter: ComboboxFilter<Item> = (item, search, locale) =>
      itemToStringLabel(item)
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale));
    const filtered =
      filteredItems !== undefined || filter === null
        ? source
        : source.filter(item =>
            (filter ?? defaultLabelFilter)(item, actualInputValue, locale)
          );

    return limit == null ? filtered : filtered.slice(0, limit);
  }, [
    actualInputValue,
    filter,
    filteredItems,
    itemToStringLabel,
    items,
    limit,
    locale,
  ]);

  const actualHighlightedItem = isHighlightControlled
    ? highlightedItem
    : uncontrolledHighlightedItem;
  const highlightedIndex = actualHighlightedItem
    ? visibleItems.findIndex(item =>
        isItemEqualToValue(item, actualHighlightedItem)
      )
    : -1;

  const commitOpen = useCallback(
    (
      nextOpen: boolean,
      reason: ComboboxOpenChangeReason,
      event?: EventLike
    ) => {
      if (disabled || readOnly) return null;

      const details = createComboboxChangeDetails(reason, event);
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return details;
      if (!isOpenControlled) setUncontrolledOpen(nextOpen);
      return details;
    },
    [disabled, isOpenControlled, onOpenChange, readOnly]
  );

  const commitInputValue = useCallback(
    (
      nextInputValue: string,
      reason: ComboboxInputValueChangeReason,
      event?: EventLike
    ) => {
      const details = createComboboxChangeDetails(reason, event);
      onInputValueChange?.(nextInputValue, details);
      if (details.isCanceled) return;
      if (!isInputControlled) setUncontrolledInputValue(nextInputValue);
    },
    [isInputControlled, onInputValueChange]
  );

  const commitHighlightedItem = useCallback(
    (
      nextHighlightedItem: Item | null,
      reason: ComboboxHighlightChangeReason,
      event?: EventLike
    ) => {
      const nextIndex = nextHighlightedItem
        ? visibleItems.findIndex(item =>
            isItemEqualToValue(item, nextHighlightedItem)
          )
        : -1;
      const details = {
        ...createComboboxChangeDetails(reason, event),
        index: nextIndex,
      };
      onItemHighlighted?.(nextHighlightedItem, details);
      if (details.isCanceled) return;
      if (!isHighlightControlled)
        setUncontrolledHighlightedItem(nextHighlightedItem);
    },
    [isHighlightControlled, isItemEqualToValue, onItemHighlighted, visibleItems]
  );

  const commitValue = useCallback(
    (nextValue: Item | Item[] | null, event?: EventLike) => {
      if (disabled || readOnly) return;

      const details = createComboboxChangeDetails('item-press', event);
      onValueChange?.(nextValue as ComboboxValue<Item, Multiple>, details);
      if (details.isCanceled) return;
      if (!isValueControlled) setUncontrolledValue(nextValue);
    },
    [disabled, isValueControlled, onValueChange, readOnly]
  );

  const selectItem = useCallback(
    (item: Item, event?: EventLike) => {
      if (isMultiple) {
        const exists = selectedItems.some(selected =>
          isItemEqualToValue(item, selected)
        );
        commitValue(
          exists
            ? selectedItems.filter(
                selected => !isItemEqualToValue(item, selected)
              )
            : [...selectedItems, item],
          event
        );
        return;
      }

      commitValue(item, event);
      commitOpen(false, 'item-press', event);
    },
    [commitOpen, commitValue, isItemEqualToValue, isMultiple, selectedItems]
  );

  useEffect(() => {
    if (!actualOpen) return;

    if (visibleItems.length === 0) {
      if (actualHighlightedItem !== null) {
        commitHighlightedItem(null, 'none');
      }
      return;
    }

    const highlightedItemVisible =
      actualHighlightedItem !== null &&
      visibleItems.some(item =>
        isItemEqualToValue(item, actualHighlightedItem)
      );

    if (highlightedItemVisible) return;

    if (!autoHighlight) {
      if (actualHighlightedItem !== null) {
        commitHighlightedItem(null, 'none');
      }
      return;
    }

    const lastSelectedItem =
      selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null;
    const selectedVisibleItem = lastSelectedItem
      ? visibleItems.find(item => isItemEqualToValue(item, lastSelectedItem))
      : null;

    commitHighlightedItem(
      selectedVisibleItem ?? visibleItems[0] ?? null,
      'none'
    );
  }, [
    actualHighlightedItem,
    actualOpen,
    autoHighlight,
    commitHighlightedItem,
    isItemEqualToValue,
    selectedItems,
    visibleItems,
  ]);

  const getItemId = useCallback(
    (item: Item, fallbackIndex = -1) => {
      const itemIndex = visibleItems.findIndex(visibleItem =>
        isItemEqualToValue(item, visibleItem)
      );
      const resolvedIndex = itemIndex >= 0 ? itemIndex : fallbackIndex;
      return `${listId}-item-${resolvedIndex}-${getSafeIdPart(
        itemToStringValue(item)
      )}`;
    },
    [isItemEqualToValue, itemToStringValue, listId, visibleItems]
  );
  const registerLabel = useCallback(() => {
    setLabelMounted(true);
    return () => setLabelMounted(false);
  }, []);

  useEffect(() => {
    if (!actualOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (isElementInside(event, rootRef.current)) return;
      if (isElementInside(event, popupRef.current)) return;
      commitOpen(false, 'outside-press', event);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [actualOpen, commitOpen]);

  useEffect(() => {
    if (!actualOpen || !modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [actualOpen, modal]);

  const contextValue = useMemo<ComboboxContextValue<Item>>(
    () => ({
      rootId,
      labelId,
      labelMounted,
      triggerId,
      popupId,
      listId,
      inputId,
      triggerRef,
      rootRef,
      popupRef,
      items,
      visibleItems,
      selectedItems,
      selectedItem,
      highlightedItem: actualHighlightedItem ?? null,
      highlightedIndex,
      open: Boolean(actualOpen),
      inputValue: actualInputValue,
      multiple: isMultiple,
      disabled,
      readOnly,
      required,
      name,
      form,
      autoHighlight,
      highlightItemOnHover,
      loopFocus,
      itemToStringLabel,
      itemToStringValue,
      isItemEqualToValue,
      setOpen: commitOpen,
      setInputValue: commitInputValue,
      highlightItem: commitHighlightedItem,
      selectItem,
      getItemId,
      registerLabel,
    }),
    [
      actualHighlightedItem,
      actualInputValue,
      actualOpen,
      autoHighlight,
      commitHighlightedItem,
      commitInputValue,
      commitOpen,
      disabled,
      form,
      getItemId,
      highlightedIndex,
      highlightItemOnHover,
      inputId,
      isItemEqualToValue,
      isMultiple,
      itemToStringLabel,
      itemToStringValue,
      items,
      labelId,
      labelMounted,
      listId,
      loopFocus,
      name,
      popupId,
      popupRef,
      readOnly,
      required,
      rootId,
      registerLabel,
      selectItem,
      selectedItem,
      selectedItems,
      triggerId,
      visibleItems,
    ]
  );

  const rootProps: ComboboxRootRenderProps = {
    ...domProps,
    id: rootId,
    ref: rootRef,
    className,
    style,
    'data-state': actualOpen ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
    'data-readonly': readOnly ? '' : undefined,
    'data-required': required ? '' : undefined,
    children,
  };
  const rootState: ComboboxRootState<Item> = {
    open: Boolean(actualOpen),
    disabled,
    readOnly,
    required,
    multiple: isMultiple,
    inputValue: actualInputValue,
    highlightedItem: actualHighlightedItem ?? null,
    selectedItems,
  };
  const renderedRoot = renderPart(render, rootProps, rootState);
  const hiddenValue = selectedItems.map(itemToStringValue);

  return (
    <ComboboxContext.Provider
      value={contextValue as ComboboxContextValue<unknown>}
    >
      {renderedRoot ?? <div {...rootProps} />}
      {name && isMultiple
        ? hiddenValue.map(valueString => (
            <input
              key={valueString}
              type="hidden"
              name={name}
              form={form}
              value={valueString}
              disabled={disabled}
              data-combobox-hidden-input=""
            />
          ))
        : name && (
            <input
              type="hidden"
              name={name}
              form={form}
              value={hiddenValue[0] ?? ''}
              disabled={disabled}
              required={required}
              data-combobox-hidden-input=""
            />
          )}
    </ComboboxContext.Provider>
  );
}

type LabelProps = ComponentPropsWithoutRef<'label'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'label'>,
    ComboboxLabelState
  >;
};

function Label({ children, render, className, ...props }: LabelProps) {
  const context = useComboboxInternal<unknown>();
  const { registerLabel } = context;
  useEffect(() => registerLabel(), [registerLabel]);

  const labelProps = {
    ...props,
    id: props.id ?? context.labelId,
    htmlFor: props.htmlFor ?? context.triggerId,
    className,
    'data-disabled': context.disabled ? '' : undefined,
    'data-required': context.required ? '' : undefined,
    children,
  };
  const state = {
    disabled: context.disabled,
    required: context.required,
  };

  return renderPart(render, labelProps, state) ?? <label {...labelProps} />;
}

type TriggerProps = Omit<ComponentPropsWithoutRef<'button'>, 'value'> & {
  placeholder?: string;
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'button'> &
      DataAttributes & { ref: Ref<HTMLButtonElement> },
    ComboboxTriggerState
  >;
};

const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  (
    {
      children,
      placeholder = '',
      render,
      className,
      onClick,
      onKeyDown,
      ...props
    },
    forwardedRef
  ) => {
    const context = useComboboxInternal<unknown>();
    const selectedLabel = context.multiple
      ? context.selectedItems.map(context.itemToStringLabel).join(', ')
      : context.selectedItem !== null
        ? context.itemToStringLabel(context.selectedItem)
        : '';
    const state: ComboboxTriggerState = {
      open: context.open,
      disabled: context.disabled,
      readOnly: context.readOnly,
      placeholder: selectedLabel.length === 0,
      selectedItem: context.selectedItem,
      selectedItems: context.selectedItems,
      selectedLabel,
    };
    const moveHighlight = (
      direction: 1 | -1,
      event: KeyboardEvent<HTMLButtonElement>
    ) => {
      const nextIndex = findNextEnabledIndex(
        context.visibleItems,
        context.highlightedIndex,
        direction,
        context.loopFocus
      );
      if (nextIndex >= 0) {
        context.highlightItem(
          context.visibleItems[nextIndex] ?? null,
          'keyboard',
          event
        );
      }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!context.open) context.setOpen(true, 'trigger-press', event);
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        context.setOpen(!context.open, 'trigger-press', event);
        return;
      }

      if (event.key === 'Escape' && context.open) {
        event.preventDefault();
        const details = context.setOpen(false, 'escape-key', event);
        if (!details?.isPropagationAllowed) {
          event.stopPropagation();
        }
      }
    };
    const triggerProps = {
      ...props,
      ref: composeRefs(context.triggerRef, forwardedRef),
      id: props.id ?? context.triggerId,
      type: props.type ?? 'button',
      disabled: context.disabled || props.disabled,
      'aria-haspopup': 'listbox',
      'aria-expanded': context.open,
      'aria-controls': context.listId,
      'aria-labelledby':
        props['aria-labelledby'] ??
        (context.labelMounted ? context.labelId : undefined),
      'data-state': context.open ? 'open' : 'closed',
      'data-placeholder': selectedLabel ? undefined : '',
      'data-disabled': context.disabled ? '' : undefined,
      'data-readonly': context.readOnly ? '' : undefined,
      className,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        context.setOpen(!context.open, 'trigger-press', event);
      },
      onKeyDown: handleKeyDown,
      children: children ?? (selectedLabel || placeholder),
    };

    const { ref, ...buttonProps } = triggerProps;
    const renderTriggerProps =
      triggerProps as ComponentPropsWithoutRef<'button'> &
        DataAttributes & { ref: Ref<HTMLButtonElement> };

    return (
      renderPart(render, renderTriggerProps, state) ?? (
        <button
          {...(buttonProps as ComponentPropsWithoutRef<'button'>)}
          ref={ref as Ref<HTMLButtonElement>}
        />
      )
    );
  }
);
Trigger.displayName = 'Combobox.Trigger';

function Portal({ children }: { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

type PositionerProps = ComponentPropsWithoutRef<'div'> & {
  side?: 'auto' | 'top' | 'bottom';
  sideOffset?: number;
  collisionPadding?: number;
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'> & DataAttributes,
    ComboboxPopupState
  >;
};

type PositionerLayout = {
  side: 'top' | 'bottom';
  maxHeight: number | null;
  positioned: boolean;
};

const DEFAULT_POSITIONER_OFFSET = 4;
const DEFAULT_COLLISION_PADDING = 8;
const FALLBACK_POPUP_HEIGHT = 240;

const PositionerLayoutContext = createContext<PositionerLayout>({
  side: 'bottom',
  maxHeight: null,
  positioned: false,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function Positioner({
  children,
  render,
  className,
  style,
  side = 'auto',
  sideOffset = DEFAULT_POSITIONER_OFFSET,
  collisionPadding = DEFAULT_COLLISION_PADDING,
  ...props
}: PositionerProps) {
  const context = useComboboxInternal<unknown>();
  const openCycleRef = useRef(0);
  const wasOpenRef = useRef(false);
  const [layout, setLayout] = useState<{
    openCycle: number;
    side: 'top' | 'bottom';
    style: CSSProperties;
    maxHeight: number | null;
  }>({
    openCycle: 0,
    side: 'bottom',
    style: {},
    maxHeight: null,
  });

  if (context.open && !wasOpenRef.current) {
    openCycleRef.current += 1;
    wasOpenRef.current = true;
  } else if (!context.open && wasOpenRef.current) {
    wasOpenRef.current = false;
  }

  const currentOpenCycle = openCycleRef.current;
  const isPositioned = context.open && layout.openCycle === currentOpenCycle;

  useLayoutEffect(() => {
    if (!context.open) return;
    const effectOpenCycle = currentOpenCycle;

    const updatePosition = () => {
      const triggerRect = context.triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const popupRect = context.popupRef.current?.getBoundingClientRect();
      const popupHeight = popupRect?.height || FALLBACK_POPUP_HEIGHT;
      const popupWidth = popupRect?.width || triggerRect.width;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const availableBelow =
        viewportHeight - triggerRect.bottom - sideOffset - collisionPadding;
      const availableAbove = triggerRect.top - sideOffset - collisionPadding;
      const resolvedSide =
        side === 'auto'
          ? availableBelow >= popupHeight || availableBelow >= availableAbove
            ? 'bottom'
            : 'top'
          : side;
      const availableHeight = Math.max(
        0,
        resolvedSide === 'bottom' ? availableBelow : availableAbove
      );
      const renderedHeight = Math.min(popupHeight, availableHeight);
      const top =
        resolvedSide === 'bottom'
          ? triggerRect.bottom + sideOffset
          : triggerRect.top - sideOffset - renderedHeight;
      const maxLeft = Math.max(
        collisionPadding,
        viewportWidth - collisionPadding - popupWidth
      );

      setLayout({
        openCycle: effectOpenCycle,
        side: resolvedSide,
        maxHeight: availableHeight,
        style: {
          position: 'fixed',
          top: Math.max(collisionPadding, top),
          left: clamp(triggerRect.left, collisionPadding, maxLeft),
          minWidth: triggerRect.width,
          zIndex: 1000,
        },
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePosition)
        : null;
    if (context.popupRef.current) {
      resizeObserver?.observe(context.popupRef.current);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [
    collisionPadding,
    context.open,
    context.popupRef,
    context.triggerRef,
    currentOpenCycle,
    side,
    sideOffset,
  ]);

  if (!context.open) return null;

  const positionerProps = {
    ...props,
    className,
    style: isPositioned
      ? { ...layout.style, ...style }
      : {
          ...style,
          position: 'fixed',
          top: 0,
          left: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: 1000,
        },
    'data-side': layout.side,
    'data-positioned': isPositioned ? '' : undefined,
    'data-state': context.open ? 'open' : 'closed',
    children,
  };
  const state = { open: context.open, side: layout.side };
  const renderPositionerProps =
    positionerProps as ComponentPropsWithoutRef<'div'> & DataAttributes;

  return (
    <PositionerLayoutContext.Provider
      value={{
        side: layout.side,
        maxHeight: isPositioned ? layout.maxHeight : null,
        positioned: isPositioned,
      }}
    >
      {renderPart(render, renderPositionerProps, state) ?? (
        <div {...(positionerProps as ComponentPropsWithoutRef<'div'>)} />
      )}
    </PositionerLayoutContext.Provider>
  );
}

type PopupProps = ComponentPropsWithoutRef<'div'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'> &
      DataAttributes & { ref: Ref<HTMLDivElement> },
    ComboboxPopupState
  >;
};

function Popup({ children, render, className, ...props }: PopupProps) {
  const context = useComboboxInternal<unknown>();
  const positionerLayout = useContext(PositionerLayoutContext);
  if (!context.open) return null;

  const popupProps = {
    ...props,
    id: props.id ?? context.popupId,
    ref: context.popupRef,
    role: props.role,
    'aria-labelledby':
      props['aria-labelledby'] ??
      (context.labelMounted ? context.labelId : undefined),
    'data-state': 'open',
    'data-side': positionerLayout.side,
    'data-positioned': positionerLayout.positioned ? '' : undefined,
    className,
    style: {
      maxHeight:
        positionerLayout.maxHeight == null
          ? undefined
          : positionerLayout.maxHeight,
      ...props.style,
    },
    children,
  };
  const state = { open: context.open, side: positionerLayout.side };

  return renderPart(render, popupProps, state) ?? <div {...popupProps} />;
}

type SearchInputProps = ComponentPropsWithoutRef<'input'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'input'> &
      DataAttributes & { ref: Ref<HTMLInputElement> },
    ComboboxSearchInputState
  >;
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { render, className, onChange, onFocus, onKeyDown, ...props },
    forwardedRef
  ) => {
    const context = useComboboxInternal<unknown>();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const moveHighlight = (
      direction: 1 | -1,
      event: KeyboardEvent<HTMLInputElement>
    ) => {
      const nextIndex = findNextEnabledIndex(
        context.visibleItems,
        context.highlightedIndex,
        direction,
        context.loopFocus
      );
      if (nextIndex >= 0) {
        context.highlightItem(
          context.visibleItems[nextIndex] ?? null,
          'keyboard',
          event
        );
      }
    };
    const inputProps = {
      ...props,
      ref: composeRefs(inputRef, forwardedRef),
      id: props.id ?? context.inputId,
      value: context.inputValue,
      disabled: context.disabled || props.disabled,
      readOnly: context.readOnly || props.readOnly,
      role: props.role ?? 'combobox',
      'aria-autocomplete': 'list',
      'aria-controls': context.listId,
      'aria-expanded': context.open,
      'aria-labelledby':
        props['aria-labelledby'] ??
        (context.labelMounted ? context.labelId : undefined),
      'aria-activedescendant':
        context.highlightedItem && context.highlightedIndex >= 0
          ? context.getItemId(context.highlightedItem)
          : undefined,
      'data-state': context.open ? 'open' : 'closed',
      'data-empty': context.visibleItems.length === 0 ? '' : undefined,
      className,
      onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
        onFocus?.(event);
        if (!event.defaultPrevented)
          context.setOpen(true, 'input-focus', event);
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
        if (!event.defaultPrevented) {
          context.setInputValue(event.target.value, 'input-change', event);
        }
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
        } else if (
          event.key === 'Enter' &&
          context.highlightedItem &&
          context.highlightedIndex >= 0
        ) {
          event.preventDefault();
          context.selectItem(context.highlightedItem, event);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          const details = context.setOpen(false, 'escape-key', event);
          if (!details?.isPropagationAllowed) {
            event.stopPropagation();
          }
        }
      },
    };
    const state = {
      open: context.open,
      value: context.inputValue,
      empty: context.visibleItems.length === 0,
    };

    const { ref, ...domInputProps } = inputProps;
    const renderInputProps = inputProps as ComponentPropsWithoutRef<'input'> &
      DataAttributes & { ref: Ref<HTMLInputElement> };

    return (
      renderPart(render, renderInputProps, state) ?? (
        <input
          {...(domInputProps as ComponentPropsWithoutRef<'input'>)}
          ref={ref as Ref<HTMLInputElement>}
        />
      )
    );
  }
);
SearchInput.displayName = 'Combobox.SearchInput';

type ListProps = ComponentPropsWithoutRef<'div'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'>,
    ComboboxListState
  >;
};

function List({ children, render, className, onKeyDown, ...props }: ListProps) {
  const context = useComboboxInternal<unknown>();
  const { getItemId, highlightedItem, open } = context;
  useEffect(() => {
    if (!open || !highlightedItem) return;

    const highlightedId = getItemId(highlightedItem);
    const frame = window.requestAnimationFrame(() => {
      const highlightedElement = document.getElementById(highlightedId);
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [getItemId, highlightedItem, open]);

  const moveHighlight = (
    direction: 1 | -1,
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    const nextIndex = findNextEnabledIndex(
      context.visibleItems,
      context.highlightedIndex,
      direction,
      context.loopFocus
    );
    if (nextIndex >= 0) {
      context.highlightItem(
        context.visibleItems[nextIndex] ?? null,
        'keyboard',
        event
      );
    }
  };
  const listProps = {
    ...props,
    id: props.id ?? context.listId,
    role: props.role ?? 'listbox',
    'aria-labelledby':
      props['aria-labelledby'] ??
      (context.labelMounted ? context.labelId : undefined),
    'aria-multiselectable': context.multiple ? true : undefined,
    'data-state': context.open ? 'open' : 'closed',
    'data-empty': context.visibleItems.length === 0 ? '' : undefined,
    tabIndex: props.tabIndex ?? -1,
    className,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
      } else if (
        event.key === 'Enter' &&
        context.highlightedItem &&
        context.highlightedIndex >= 0
      ) {
        event.preventDefault();
        context.selectItem(context.highlightedItem, event);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        const details = context.setOpen(false, 'escape-key', event);
        if (!details?.isPropagationAllowed) {
          event.stopPropagation();
        }
      }
    },
    children:
      children ??
      context.visibleItems.map((item, index) => (
        <ItemWithIndicatorContext
          key={context.itemToStringValue(item)}
          item={item}
          index={index}
        />
      )),
  };
  const state = {
    open: context.open,
    empty: context.visibleItems.length === 0,
    highlightedItem: context.highlightedItem,
  };

  return renderPart(render, listProps, state) ?? <div {...listProps} />;
}

type CollectionProps<Item> = {
  items?: Item[];
  label?: ReactNode;
  children?: ReactNode | ((item: Item, index: number) => ReactNode);
};

function Collection<ItemValue>({
  items,
  label,
  children,
}: CollectionProps<ItemValue>) {
  const context = useComboboxInternal<ItemValue>();
  const collectionItems = items ?? context.visibleItems;

  return (
    <>
      {label ? <div>{label}</div> : null}
      {collectionItems.map((item, index) =>
        typeof children === 'function' ? (
          children(item, index)
        ) : children ? (
          <React.Fragment key={context.itemToStringValue(item)}>
            {children}
          </React.Fragment>
        ) : (
          <ItemWithIndicatorContext
            key={context.itemToStringValue(item)}
            item={item}
            index={index}
          />
        )
      )}
    </>
  );
}

type ItemProps<Item> = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  item: Item;
  index?: number;
  disabled?: boolean;
  children?: ReactNode | ((state: ComboboxItemState<Item>) => ReactNode);
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'>,
    ComboboxItemState<Item>
  >;
};

function ItemPart<Item>({
  item,
  index,
  disabled,
  children,
  render,
  className,
  onClick,
  onMouseEnter,
  ...props
}: ItemProps<Item>) {
  const context = useComboboxInternal<Item>();
  const resolvedIndex = context.visibleItems.findIndex(visibleItem =>
    context.isItemEqualToValue(item, visibleItem)
  );
  const itemIndex = resolvedIndex >= 0 ? resolvedIndex : (index ?? -1);
  const isDisabled =
    disabled ??
    (typeof item === 'object' && item && 'disabled' in item
      ? Boolean(item.disabled)
      : false);
  const selected = context.selectedItems.some(selectedItem =>
    context.isItemEqualToValue(item, selectedItem)
  );
  const highlighted =
    context.highlightedItem != null &&
    context.isItemEqualToValue(item, context.highlightedItem);
  const state: ComboboxItemState<Item> = {
    selected,
    highlighted,
    disabled: isDisabled,
    item,
  };
  const itemProps = {
    ...props,
    id: props.id ?? context.getItemId(item, itemIndex),
    role: props.role ?? 'option',
    'aria-selected': selected,
    'aria-disabled': isDisabled || undefined,
    'data-state': selected ? 'selected' : 'unselected',
    'data-highlighted': highlighted ? '' : undefined,
    'data-selected': selected ? '' : undefined,
    'data-disabled': isDisabled ? '' : undefined,
    'data-combobox-item': '',
    'data-combobox-item-index': itemIndex,
    'data-value': context.itemToStringValue(item),
    tabIndex: props.tabIndex ?? -1,
    className,
    onMouseEnter: (event: React.MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(event);
      if (
        !event.defaultPrevented &&
        !isDisabled &&
        context.highlightItemOnHover
      ) {
        context.highlightItem(item, 'pointer', event);
      }
    },
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented && !isDisabled) {
        context.selectItem(item, event);
      }
    },
    children:
      typeof children === 'function'
        ? children(state)
        : (children ?? context.itemToStringLabel(item)),
  };

  return renderPart(render, itemProps, state) ?? <div {...itemProps} />;
}

type ItemIndicatorProps = ComponentPropsWithoutRef<'span'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'span'>,
    { selected: boolean }
  >;
};

function ItemIndicator({
  render,
  className,
  children,
  ...props
}: ItemIndicatorProps) {
  const parent = useContext(ItemIndicatorContext);
  const selected = parent?.selected ?? false;
  const indicatorProps = {
    ...props,
    'aria-hidden': true,
    'data-selected': selected ? '' : undefined,
    className,
    children,
  };
  return (
    renderPart(render, indicatorProps, { selected }) ?? (
      <span {...indicatorProps} />
    )
  );
}

const ItemIndicatorContext = createContext<{ selected: boolean } | null>(null);
const OriginalItem = ItemPart;

function ItemWithIndicatorContext<Item>(props: ItemProps<Item>) {
  return (
    <OriginalItem
      {...props}
      render={(itemProps, state) => (
        <ItemIndicatorContext.Provider value={{ selected: state.selected }}>
          {props.render
            ? renderPart(props.render, itemProps, state)
            : React.createElement('div', itemProps)}
        </ItemIndicatorContext.Provider>
      )}
    />
  );
}

type EmptyProps = ComponentPropsWithoutRef<'div'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'>,
    { empty: boolean }
  >;
};

function Empty({ children, render, ...props }: EmptyProps) {
  const context = useComboboxInternal<unknown>();
  if (context.visibleItems.length > 0) return null;
  const emptyProps = {
    ...props,
    role: props.role ?? 'status',
    'data-empty': '',
    children,
  };

  return (
    renderPart(render, emptyProps, { empty: true }) ?? <div {...emptyProps} />
  );
}

type StatusProps = ComponentPropsWithoutRef<'div'> & {
  render?: ComboboxRenderProp<
    ComponentPropsWithoutRef<'div'>,
    { count: number }
  >;
};

function Status({ render, children, ...props }: StatusProps) {
  const context = useComboboxInternal<unknown>();
  const statusProps = {
    ...props,
    role: props.role ?? 'status',
    children: children ?? String(context.visibleItems.length),
  };
  return (
    renderPart(render, statusProps, { count: context.visibleItems.length }) ?? (
      <div {...statusProps} />
    )
  );
}

const Combobox = {
  Root,
  Label,
  Trigger,
  Portal,
  Positioner,
  Popup,
  SearchInput,
  List,
  Collection,
  Item: ItemWithIndicatorContext,
  ItemIndicator,
  Empty,
  Status,
} as const;

export { Combobox };
export default Combobox;
