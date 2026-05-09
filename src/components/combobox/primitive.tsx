import React, {
  createContext,
  createElement,
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
} from 'react';
import { createPortal } from 'react-dom';

type EventReason =
  | 'escape-key'
  | 'input-change'
  | 'item-press'
  | 'keyboard'
  | 'none'
  | 'pointer'
  | 'trigger-press';

export type ComboboxEventDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event?: Event;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
  reason: EventReason;
};

export type ComboboxHighlightEventDetails = ComboboxEventDetails & {
  index: number;
};

export type ComboboxChangeEventDetails = ComboboxEventDetails;

type PreventableReactEvent = React.SyntheticEvent & {
  comboboxHandlerPrevented?: boolean;
  preventComboboxHandler?: () => void;
};

type ItemMeta<Value> = {
  disabled: boolean;
  value: Value;
};

type ComboboxContextValue<Value> = {
  activeIndex: number | null;
  autoHighlight: boolean;
  disabled: boolean;
  filteredItems: Value[];
  form?: string;
  getItemId: (index: number) => string;
  getNextEnabledIndex: (
    direction: 1 | -1,
    fromIndex: number | null
  ) => number | null;
  highlightedIndexRef: React.MutableRefObject<number | null>;
  highlightItemOnHover: boolean;
  inputId: string;
  inputValue: string;
  isItemEqualToValue: (item: Value, value: Value) => boolean;
  itemToStringLabel: (item: Value) => string;
  itemToStringValue: (item: Value) => string;
  labelId: string;
  listboxId: string;
  name?: string;
  open: boolean;
  popupPosition: React.CSSProperties;
  readOnly: boolean;
  registerItem: (index: number, meta: ItemMeta<Value>) => () => void;
  required: boolean;
  selectedValue: Value | null;
  setActiveIndex: (
    index: number | null,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => void;
  setInputValue: (
    value: string,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  setOpen: (
    open: boolean,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  selectItem: (
    item: Value,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  triggerId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
};

type RenderProp<Props, State> =
  | React.ReactElement<Record<string, unknown>>
  | ((props: Props, state: State) => React.ReactElement | null);

type RenderableProps<Props, State> = {
  render?: RenderProp<Props, State>;
};

type TriggerRenderProps = React.ComponentPropsWithoutRef<'button'> & {
  ref: React.Ref<HTMLButtonElement>;
};

type TriggerState = {
  disabled: boolean;
  open: boolean;
  readOnly: boolean;
};

type ItemRenderProps = React.ComponentPropsWithoutRef<'div'> & {
  ref: React.Ref<HTMLDivElement>;
  [key: `data-${string}`]: string | undefined;
};

type ItemState = {
  disabled: boolean;
  highlighted: boolean;
  selected: boolean;
};

type ModeFromMultiple<Multiple extends boolean | undefined> =
  Multiple extends true ? 'multiple' : 'single';
type ComboboxValueType<
  Value,
  Multiple extends boolean | undefined,
> = Multiple extends true ? Value[] : Value;

export type ComboboxRootProps<
  Value,
  Multiple extends boolean | undefined = false,
> = {
  autoComplete?: string;
  autoHighlight?: boolean;
  children?: React.ReactNode;
  defaultInputValue?: string;
  defaultOpen?: boolean;
  defaultValue?: ComboboxValueType<Value, Multiple> | null;
  disabled?: boolean;
  filter?:
    | null
    | ((
        itemValue: Value,
        query: string,
        itemToString?: (itemValue: Value) => string
      ) => boolean);
  filteredItems?: readonly Value[];
  form?: string;
  highlightItemOnHover?: boolean;
  inputValue?: string;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  itemToStringLabel?: (itemValue: Value) => string;
  itemToStringValue?: (itemValue: Value) => string;
  items?: readonly Value[];
  multiple?: Multiple;
  name?: string;
  onInputValueChange?: (
    inputValue: string,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onItemHighlighted?: (
    itemValue: Value | undefined,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onOpenChange?: (
    open: boolean,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onValueChange?: (
    value:
      | ComboboxValueType<Value, Multiple>
      | (Multiple extends true ? never : null),
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: ComboboxValueType<Value, Multiple> | null;
};

export namespace ComboboxRoot {
  export type ChangeEventDetails = ComboboxChangeEventDetails;
  export type HighlightEventDetails = ComboboxHighlightEventDetails;
  export type ChangeEventReason = EventReason;
  export type HighlightEventReason = EventReason;
  export type Props<
    Value,
    Multiple extends boolean | undefined = false,
  > = ComboboxRootProps<Value, Multiple>;
  export type Mode<Multiple extends boolean | undefined = false> =
    ModeFromMultiple<Multiple>;
}

type ComboboxLabelProps = React.ComponentPropsWithoutRef<'label'>;

type ComboboxTriggerProps = Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'children'
> &
  RenderableProps<TriggerRenderProps, TriggerState> & {
    children?: React.ReactNode;
  };

type ComboboxValueProps = React.ComponentPropsWithoutRef<'span'> & {
  placeholder?: string;
};

type ComboboxPortalProps = {
  children?: React.ReactNode;
};

type ComboboxPositionerProps = React.ComponentPropsWithoutRef<'div'> & {
  sideOffset?: number;
};

type ComboboxPopupProps = React.ComponentPropsWithoutRef<'div'> & {
  initialFocus?: boolean;
};

type ComboboxInputProps = React.ComponentPropsWithoutRef<'input'>;

type ComboboxListProps = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children'
> & {
  children?: React.ReactNode | ((item: any, index: number) => React.ReactNode);
};

type ComboboxCollectionProps = {
  children: (item: any, index: number) => React.ReactNode;
};

type ComboboxItemProps<Value> = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children'
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

const ComboboxContext = createContext<ComboboxContextValue<unknown> | null>(
  null
);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const defaultItemToStringLabel = <Value,>(item: Value) => {
  if (isObjectRecord(item) && typeof item.label === 'string') return item.label;
  if (isObjectRecord(item) && typeof item.name === 'string') return item.name;
  return String(item);
};

const defaultItemToStringValue = <Value,>(item: Value) => {
  if (isObjectRecord(item) && typeof item.value === 'string') return item.value;
  if (isObjectRecord(item) && typeof item.id === 'string') return item.id;
  return String(item);
};

const getNativeEvent = (event?: React.SyntheticEvent | Event) => {
  if (!event) return undefined;
  return 'nativeEvent' in event ? event.nativeEvent : event;
};

const createEventDetails = (
  reason: EventReason,
  event?: React.SyntheticEvent | Event
): ComboboxChangeEventDetails => {
  let canceled = false;
  let propagationAllowed = false;

  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: getNativeEvent(event),
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
  };
};

const createHighlightEventDetails = (
  reason: EventReason,
  index: number,
  event?: React.SyntheticEvent | Event
): ComboboxHighlightEventDetails => ({
  ...createEventDetails(reason, event),
  index,
});

const getPreventableEvent = (
  event: React.SyntheticEvent
): PreventableReactEvent => {
  const preventableEvent = event as PreventableReactEvent;
  preventableEvent.preventComboboxHandler = () => {
    preventableEvent.comboboxHandlerPrevented = true;
  };
  return preventableEvent;
};

const isComboboxHandlerPrevented = (event: React.SyntheticEvent) =>
  Boolean((event as PreventableReactEvent).comboboxHandlerPrevented);

const callIfFunction = <EventType extends React.SyntheticEvent>(
  handler: ((event: EventType) => void) | undefined,
  event: EventType
) => {
  handler?.(event);
};

const renderElement = <
  Props extends { children?: React.ReactNode; className?: string },
  State,
>({
  children,
  defaultElement,
  props,
  render,
  state,
}: {
  children?: React.ReactNode;
  defaultElement: keyof React.JSX.IntrinsicElements;
  props: Props;
  render?: RenderProp<Props, State>;
  state: State;
}) => {
  if (typeof render === 'function') return render(props, state);

  if (isValidElement<Record<string, unknown>>(render)) {
    return React.cloneElement(render, {
      ...props,
      className: [render.props.className, props.className]
        .filter(Boolean)
        .join(' '),
    } satisfies Record<string, unknown>);
  }

  return createElement(defaultElement, props, children);
};

const getNextEnabledIndex = <Value,>({
  direction,
  fromIndex,
  itemCount,
  itemMetaRef,
}: {
  direction: 1 | -1;
  fromIndex: number | null;
  itemCount: number;
  itemMetaRef: React.MutableRefObject<Map<number, ItemMeta<Value>>>;
}) => {
  if (itemCount <= 0) return null;

  for (let offset = 1; offset <= itemCount; offset += 1) {
    const baseIndex = fromIndex ?? (direction === 1 ? -1 : itemCount);
    const nextIndex = (baseIndex + direction * offset + itemCount) % itemCount;
    if (!itemMetaRef.current.get(nextIndex)?.disabled) return nextIndex;
  }

  return null;
};

const useComboboxContext = <Value,>() => {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox components must be used inside Combobox.Root');
  }

  return context as ComboboxContextValue<Value>;
};

function ComboboxRootComponent<
  Value,
  Multiple extends boolean | undefined = false,
>({
  autoHighlight = false,
  children,
  defaultInputValue = '',
  defaultOpen = false,
  defaultValue = null,
  disabled = false,
  filter,
  filteredItems: filteredItemsProp,
  form,
  highlightItemOnHover = true,
  inputValue: inputValueProp,
  isItemEqualToValue: isItemEqualToValueProp,
  itemToStringLabel: itemToStringLabelProp,
  itemToStringValue: itemToStringValueProp,
  items = [],
  name,
  onInputValueChange,
  onItemHighlighted,
  onOpenChange,
  onValueChange,
  open: openProp,
  readOnly = false,
  required = false,
  value: valueProp,
}: ComboboxRootProps<Value, Multiple>) {
  const generatedId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const itemMetaRef = useRef(new Map<number, ItemMeta<Value>>());
  const filteredItemsRef = useRef<Value[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const lastHighlightedRef = useRef<{
    index: number;
    value: Value | undefined;
  }>({ index: -1, value: undefined });
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    useState(defaultInputValue);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledValue, setUncontrolledValue] = useState<ComboboxValueType<
    Value,
    Multiple
  > | null>(defaultValue);
  const [activeIndexState, setActiveIndexState] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<React.CSSProperties>({});

  const itemToStringLabel = useCallback(
    (item: Value) =>
      itemToStringLabelProp
        ? itemToStringLabelProp(item)
        : defaultItemToStringLabel(item),
    [itemToStringLabelProp]
  );
  const itemToStringValue = useCallback(
    (item: Value) =>
      itemToStringValueProp
        ? itemToStringValueProp(item)
        : defaultItemToStringValue(item),
    [itemToStringValueProp]
  );
  const isItemEqualToValue = useCallback(
    (item: Value, value: Value) =>
      isItemEqualToValueProp
        ? isItemEqualToValueProp(item, value)
        : Object.is(item, value),
    [isItemEqualToValueProp]
  );

  const inputValue = inputValueProp ?? uncontrolledInputValue;
  const open = openProp ?? uncontrolledOpen;
  const selectedValue = (valueProp ?? uncontrolledValue) as Value | null;

  const filteredItems = useMemo(() => {
    if (filteredItemsProp !== undefined) return Array.from(filteredItemsProp);
    if (filter === null || inputValue.trim() === '') return Array.from(items);

    const query = inputValue.trim();
    return Array.from(items).filter(item =>
      filter
        ? filter(item, query, itemToStringLabel)
        : itemToStringLabel(item)
            .toLocaleLowerCase('id-ID')
            .includes(query.toLocaleLowerCase('id-ID'))
    );
  }, [filter, filteredItemsProp, inputValue, itemToStringLabel, items]);

  filteredItemsRef.current = filteredItems;
  activeIndexRef.current = activeIndexState;

  const setOpen = useCallback(
    (
      nextOpen: boolean,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (open === nextOpen) return true;

      const details = createEventDetails(reason, event);
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return false;
      if (openProp === undefined) setUncontrolledOpen(nextOpen);
      return true;
    },
    [onOpenChange, open, openProp]
  );

  const setInputValue = useCallback(
    (
      nextValue: string,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (inputValue === nextValue) return true;

      const details = createEventDetails(reason, event);
      onInputValueChange?.(nextValue, details);
      if (details.isCanceled) return false;
      if (inputValueProp === undefined) setUncontrolledInputValue(nextValue);
      return true;
    },
    [inputValue, inputValueProp, onInputValueChange]
  );

  const setActiveIndex = useCallback(
    (
      nextIndex: number | null,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      const normalizedIndex =
        nextIndex === null ||
        nextIndex < 0 ||
        nextIndex >= filteredItemsRef.current.length
          ? null
          : nextIndex;
      const nextValue =
        normalizedIndex === null
          ? undefined
          : filteredItemsRef.current[normalizedIndex];
      const previousHighlight = lastHighlightedRef.current;
      const sameIndex = previousHighlight.index === (normalizedIndex ?? -1);
      const sameValue =
        previousHighlight.value === undefined || nextValue === undefined
          ? previousHighlight.value === nextValue
          : isItemEqualToValue(previousHighlight.value, nextValue);

      activeIndexRef.current = normalizedIndex;
      setActiveIndexState(normalizedIndex);

      if (sameIndex && sameValue) return;

      lastHighlightedRef.current = {
        index: normalizedIndex ?? -1,
        value: nextValue,
      };
      onItemHighlighted?.(
        nextValue,
        createHighlightEventDetails(reason, normalizedIndex ?? -1, event)
      );
    },
    [isItemEqualToValue, onItemHighlighted]
  );

  const selectItem = useCallback(
    (
      item: Value,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (disabled || readOnly) return false;

      const details = createEventDetails(reason, event);
      onValueChange?.(
        item as
          | ComboboxValueType<Value, Multiple>
          | (Multiple extends true ? never : null),
        details
      );
      if (details.isCanceled) return false;
      if (valueProp === undefined) {
        setUncontrolledValue(item as ComboboxValueType<Value, Multiple>);
      }
      setOpen(false, reason, event);
      return true;
    },
    [disabled, onValueChange, readOnly, setOpen, valueProp]
  );

  const registerItem = useCallback((index: number, meta: ItemMeta<Value>) => {
    itemMetaRef.current.set(index, meta);
    return () => {
      const currentMeta = itemMetaRef.current.get(index);
      if (currentMeta?.value === meta.value) itemMetaRef.current.delete(index);
    };
  }, []);

  const getItemId = useCallback(
    (index: number) => `${generatedId}-option-${index}`,
    [generatedId]
  );
  const getNextEnabledComboboxIndex = useCallback(
    (direction: 1 | -1, fromIndex: number | null) =>
      getNextEnabledIndex({
        direction,
        fromIndex,
        itemCount: filteredItemsRef.current.length,
        itemMetaRef,
      }),
    []
  );

  const updatePopupPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    setPopupPosition({
      '--anchor-width': `${rect.width}px`,
      left: rect.left,
      position: 'fixed',
      top: rect.bottom,
      width: rect.width,
    } as React.CSSProperties);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updatePopupPosition();
    window.addEventListener('resize', updatePopupPosition);
    window.addEventListener('scroll', updatePopupPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopupPosition);
      window.removeEventListener('scroll', updatePopupPosition, true);
    };
  }, [open, updatePopupPosition]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(null, 'none');
      return;
    }

    if (filteredItems.length === 0) {
      setActiveIndex(null, 'none');
      return;
    }

    if (!autoHighlight) {
      if (
        activeIndexRef.current !== null &&
        activeIndexRef.current >= filteredItems.length
      ) {
        setActiveIndex(null, 'none');
      }
      return;
    }

    if (
      activeIndexRef.current !== null &&
      activeIndexRef.current < filteredItems.length &&
      !itemMetaRef.current.get(activeIndexRef.current)?.disabled
    ) {
      setActiveIndex(activeIndexRef.current, 'none');
      return;
    }

    setActiveIndex(
      getNextEnabledIndex({
        direction: 1,
        fromIndex: null,
        itemCount: filteredItems.length,
        itemMetaRef,
      }),
      'none'
    );
  }, [autoHighlight, filteredItems, open, setActiveIndex]);

  const context = useMemo<ComboboxContextValue<Value>>(
    () => ({
      activeIndex: activeIndexState,
      autoHighlight,
      disabled,
      filteredItems,
      form,
      getItemId,
      getNextEnabledIndex: getNextEnabledComboboxIndex,
      highlightedIndexRef: activeIndexRef,
      highlightItemOnHover,
      inputId: `${generatedId}-input`,
      inputValue,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      labelId: `${generatedId}-label`,
      listboxId: `${generatedId}-listbox`,
      name,
      open,
      popupPosition,
      readOnly,
      registerItem,
      required,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setOpen,
      selectItem,
      triggerId: `${generatedId}-trigger`,
      triggerRef,
    }),
    [
      activeIndexState,
      autoHighlight,
      disabled,
      filteredItems,
      form,
      generatedId,
      getItemId,
      getNextEnabledComboboxIndex,
      highlightItemOnHover,
      inputValue,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      name,
      open,
      popupPosition,
      readOnly,
      registerItem,
      required,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setOpen,
      selectItem,
    ]
  );

  const hiddenValue =
    selectedValue === null || Array.isArray(selectedValue)
      ? ''
      : itemToStringValue(selectedValue);

  return (
    <ComboboxContext.Provider value={context as ComboboxContextValue<unknown>}>
      {children}
      {name ? (
        <input
          type="hidden"
          name={name}
          form={form}
          value={hiddenValue}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
        />
      ) : null}
    </ComboboxContext.Provider>
  );
}

function ComboboxLabel({ children, id, ...props }: ComboboxLabelProps) {
  const context = useComboboxContext<unknown>();

  return (
    <label id={id ?? context.labelId} htmlFor={context.triggerId} {...props}>
      {children}
    </label>
  );
}

function ComboboxTrigger({
  children,
  disabled: disabledProp,
  onClick,
  onKeyDown,
  render,
  ...props
}: ComboboxTriggerProps) {
  const context = useComboboxContext<unknown>();
  const disabled = context.disabled || Boolean(disabledProp);
  const activeDescendant =
    context.activeIndex === null
      ? undefined
      : context.getItemId(context.activeIndex);

  const moveHighlight = useCallback(
    (direction: 1 | -1, event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = context.getNextEnabledIndex(
        direction,
        context.highlightedIndexRef.current
      );

      if (nextIndex !== null) {
        context.setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [context]
  );

  const triggerProps: TriggerRenderProps = {
    ...props,
    'aria-activedescendant': activeDescendant,
    'aria-controls': context.open ? context.listboxId : undefined,
    'aria-disabled': disabled || undefined,
    'aria-expanded': context.open,
    'aria-haspopup': 'listbox',
    'aria-labelledby':
      props['aria-labelledby'] ??
      (props['aria-label'] ? undefined : context.labelId),
    disabled,
    id: props.id ?? context.triggerId,
    onClick: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onClick, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        disabled ||
        context.readOnly
      ) {
        return;
      }

      context.setOpen(!context.open, 'trigger-press', event);
    },
    onKeyDown: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onKeyDown, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        disabled ||
        context.readOnly
      ) {
        return;
      }

      if (event.key === 'Escape' && context.open) {
        event.preventDefault();
        context.setOpen(false, 'escape-key', event);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!context.open) {
          context.setOpen(true, 'keyboard', event);
        }
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (context.open) {
          const highlightedIndex = context.highlightedIndexRef.current;
          const highlightedItem =
            highlightedIndex === null
              ? undefined
              : context.filteredItems[highlightedIndex];

          if (highlightedItem !== undefined) {
            context.selectItem(highlightedItem, 'item-press', event);
          }
          return;
        }

        context.setOpen(true, 'keyboard', event);
      }
    },
    ref: node => {
      context.triggerRef.current = node;
    },
    role: 'combobox',
    type: props.type ?? 'button',
  };

  return renderElement({
    children,
    defaultElement: 'button',
    props: triggerProps,
    render,
    state: {
      disabled,
      open: context.open,
      readOnly: context.readOnly,
    },
  });
}

function ComboboxValue({
  children,
  placeholder,
  ...props
}: ComboboxValueProps) {
  const context = useComboboxContext<unknown>();
  const selectedLabel =
    context.selectedValue === null
      ? ''
      : context.itemToStringLabel(context.selectedValue);
  const isPlaceholder = selectedLabel === '';

  return (
    <span data-placeholder={isPlaceholder ? '' : undefined} {...props}>
      {children ?? (selectedLabel || placeholder)}
    </span>
  );
}

function ComboboxPortal({ children }: ComboboxPortalProps) {
  const context = useComboboxContext<unknown>();
  if (!context.open || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

function ComboboxPositioner({
  children,
  sideOffset = 0,
  style,
  ...props
}: ComboboxPositionerProps) {
  const context = useComboboxContext<unknown>();
  if (!context.open) return null;

  const top =
    typeof context.popupPosition.top === 'number'
      ? context.popupPosition.top + sideOffset
      : context.popupPosition.top;

  return (
    <div
      {...props}
      style={{
        ...context.popupPosition,
        ...style,
        top,
      }}
    >
      {children}
    </div>
  );
}

function ComboboxPopup({
  children,
  initialFocus: _initialFocus,
  ...props
}: ComboboxPopupProps) {
  const context = useComboboxContext<unknown>();
  if (!context.open) return null;

  return (
    <div data-combobox-popup="" {...props}>
      {children}
    </div>
  );
}

const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput({ onChange, onKeyDown, ...props }, ref) {
    const context = useComboboxContext<unknown>();
    const activeDescendant =
      context.activeIndex === null
        ? undefined
        : context.getItemId(context.activeIndex);

    const moveHighlight = useCallback(
      (direction: 1 | -1, event: React.KeyboardEvent<HTMLInputElement>) => {
        const nextIndex = context.getNextEnabledIndex(
          direction,
          context.highlightedIndexRef.current
        );

        if (nextIndex !== null) {
          context.setActiveIndex(nextIndex, 'keyboard', event);
        }
      },
      [context]
    );

    return (
      <input
        {...props}
        ref={ref}
        id={props.id ?? context.inputId}
        role="combobox"
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        aria-controls={context.open ? context.listboxId : undefined}
        aria-expanded={context.open}
        value={context.inputValue}
        disabled={context.disabled || props.disabled}
        readOnly={context.readOnly || props.readOnly}
        onChange={event => {
          const preventableEvent = getPreventableEvent(event);
          callIfFunction(onChange, event);
          if (
            event.defaultPrevented ||
            isComboboxHandlerPrevented(preventableEvent)
          ) {
            return;
          }

          context.setInputValue(
            event.currentTarget.value,
            'input-change',
            event
          );
        }}
        onKeyDown={event => {
          const preventableEvent = getPreventableEvent(event);
          callIfFunction(onKeyDown, event);
          if (
            event.defaultPrevented ||
            isComboboxHandlerPrevented(preventableEvent)
          ) {
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            context.setOpen(false, 'escape-key', event);
            return;
          }

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
            return;
          }

          if (event.key === 'Enter') {
            const highlightedIndex = context.highlightedIndexRef.current;
            const highlightedItem =
              highlightedIndex === null
                ? undefined
                : context.filteredItems[highlightedIndex];

            if (highlightedItem !== undefined) {
              event.preventDefault();
              context.selectItem(highlightedItem, 'item-press', event);
            }
          }
        }}
      />
    );
  }
);

const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(
  function ComboboxList({ children, ...props }, ref) {
    const context = useComboboxContext<unknown>();
    const renderedChildren =
      typeof children === 'function'
        ? context.filteredItems.map((item, index) => children(item, index))
        : children;

    return (
      <div
        {...props}
        ref={ref}
        id={props.id ?? context.listboxId}
        role="listbox"
        aria-labelledby={context.labelId}
      >
        {renderedChildren}
      </div>
    );
  }
);

function ComboboxCollection({ children }: ComboboxCollectionProps) {
  const context = useComboboxContext<unknown>();

  return context.filteredItems.map((item, index) => children(item, index));
}

function ComboboxItem<Value>({
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
  const itemRef = useRef<HTMLDivElement | null>(null);
  const selected =
    context.selectedValue !== null &&
    context.isItemEqualToValue(value, context.selectedValue);
  const highlighted = context.activeIndex === index;
  const itemDisabled = context.disabled || disabled;

  useEffect(
    () =>
      context.registerItem(index, {
        disabled: itemDisabled,
        value,
      }),
    [context, index, itemDisabled, value]
  );

  const itemProps: ItemRenderProps = {
    ...props,
    'aria-disabled': itemDisabled || undefined,
    'aria-selected': selected,
    'data-disabled': itemDisabled ? '' : undefined,
    'data-highlighted': highlighted ? '' : undefined,
    'data-selected': selected ? '' : undefined,
    id: props.id ?? context.getItemId(index),
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

      context.selectItem(value, 'item-press', event);
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
    ref: itemRef,
    role: 'option',
    tabIndex: -1,
  };

  return renderElement({
    children,
    defaultElement: 'div',
    props: itemProps,
    render,
    state: {
      disabled: itemDisabled,
      highlighted,
      selected,
    },
  });
}

function ComboboxItemIndicator({
  children,
  ...props
}: ComboboxItemIndicatorProps) {
  return <span {...props}>{children}</span>;
}

function ComboboxEmpty({ children, ...props }: ComboboxEmptyProps) {
  const context = useComboboxContext<unknown>();
  if (context.filteredItems.length > 0) return null;

  return (
    <div role="status" {...props}>
      {children}
    </div>
  );
}

function ComboboxStatus({ children, ...props }: ComboboxStatusProps) {
  return (
    <div role="status" {...props}>
      {children}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- public compound component namespace
export const Combobox = {
  Collection: ComboboxCollection,
  Empty: ComboboxEmpty,
  Input: ComboboxInput,
  Item: ComboboxItem,
  ItemIndicator: ComboboxItemIndicator,
  Label: ComboboxLabel,
  List: ComboboxList,
  Popup: ComboboxPopup,
  Portal: ComboboxPortal,
  Positioner: ComboboxPositioner,
  Root: ComboboxRootComponent,
  Status: ComboboxStatus,
  Trigger: ComboboxTrigger,
  Value: ComboboxValue,
};

export default Combobox;
