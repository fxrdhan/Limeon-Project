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
} from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom';
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
  autoComplete?: string;
  autoHighlight: boolean;
  defaultLabelId: string;
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
  labelId?: string;
  listboxId: string;
  name?: string;
  open: boolean;
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
  setLabelId: (id: string | undefined) => void;
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
  setTriggerId: (id: string) => void;
  triggerId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
};

type RenderProp<Props, State> =
  | React.ReactElement<Record<string, unknown>>
  | ((props: Props, state: State) => React.ReactElement | null);

type RenderableProps<Props, State> = {
  render?: RenderProp<Props, State>;
};

type TriggerElementProps = React.ComponentPropsWithoutRef<'button'>;

type TriggerRenderProps = TriggerElementProps & {
  ref: React.Ref<HTMLButtonElement>;
};

type TriggerState = {
  disabled: boolean;
  open: boolean;
  readOnly: boolean;
};

type ItemElementProps = React.ComponentPropsWithoutRef<'div'> & {
  [key: `data-${string}`]: string | undefined;
};

type ItemRenderProps = ItemElementProps & {
  ref: React.Ref<HTMLDivElement>;
};

type ItemState = {
  disabled: boolean;
  highlighted: boolean;
  selected: boolean;
};

export type ComboboxRootProps<Value> = {
  autoComplete?: string;
  autoHighlight?: boolean;
  children?: React.ReactNode;
  defaultInputValue?: string;
  defaultOpen?: boolean;
  defaultValue?: Value | null;
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
  labelId?: string;
  items?: readonly Value[];
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
    value: Value | null,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: Value | null;
};

export namespace ComboboxRoot {
  export type ChangeEventDetails = ComboboxChangeEventDetails;
  export type HighlightEventDetails = ComboboxHighlightEventDetails;
  export type ChangeEventReason = EventReason;
  export type HighlightEventReason = EventReason;
  export type Props<Value> = ComboboxRootProps<Value>;
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

type ComboboxListProps<Value = React.ReactNode> = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children'
> & {
  children?:
    | React.ReactNode
    | ((item: Value, index: number) => React.ReactNode);
};

type ComboboxCollectionProps<Value = React.ReactNode> = {
  children: (item: Value, index: number) => React.ReactNode;
};

export type ComboboxHighlightControllerApi = {
  getHighlightedIndex: () => number | null;
  setHighlightedIndex: (
    index: number | null,
    reason?: EventReason,
    event?: React.SyntheticEvent | Event
  ) => void;
};

type ComboboxHighlightControllerProps = {
  onControllerChange: (
    controller: ComboboxHighlightControllerApi | null
  ) => void;
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
): ComboboxHighlightEventDetails =>
  Object.assign(createEventDetails(reason, event), { index });

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

const popupViewportPadding = 8;
const popupMinimumAvailableHeight = 96;
const popupFocusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const floatingSizeVariables = {
  '--anchor-width': '0px',
  '--available-height': `${popupMinimumAvailableHeight}px`,
} as React.CSSProperties;

const callIfFunction = <EventType extends React.SyntheticEvent>(
  handler: ((event: EventType) => void) | undefined,
  event: EventType
) => {
  handler?.(event);
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

function ComboboxRootComponent<Value>({
  autoComplete,
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
  labelId: labelIdProp,
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
}: ComboboxRootProps<Value>) {
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
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | null>(
    defaultValue
  );
  const [activeIndexState, setActiveIndexState] = useState<number | null>(null);
  const [registeredLabelId, setRegisteredLabelIdState] = useState<
    string | undefined
  >(undefined);
  const [triggerId, setTriggerIdState] = useState(`${generatedId}-trigger`);

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

  const inputValue =
    inputValueProp !== undefined ? inputValueProp : uncontrolledInputValue;
  const open = openProp !== undefined ? openProp : uncontrolledOpen;
  const selectedValue = (
    valueProp !== undefined ? valueProp : uncontrolledValue
  ) as Value | null;

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

      if (sameIndex && sameValue) return;

      const details = createHighlightEventDetails(
        reason,
        normalizedIndex ?? -1,
        event
      );
      onItemHighlighted?.(nextValue, details);
      if (details.isCanceled) return;

      activeIndexRef.current = normalizedIndex;
      setActiveIndexState(normalizedIndex);
      lastHighlightedRef.current = {
        index: normalizedIndex ?? -1,
        value: nextValue,
      };
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
      onValueChange?.(item, details);
      if (details.isCanceled) return false;
      if (valueProp === undefined) {
        setUncontrolledValue(item);
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
  const setTriggerId = useCallback((nextTriggerId: string) => {
    setTriggerIdState(currentTriggerId =>
      currentTriggerId === nextTriggerId ? currentTriggerId : nextTriggerId
    );
  }, []);
  const setLabelId = useCallback((nextLabelId: string | undefined) => {
    setRegisteredLabelIdState(currentLabelId =>
      currentLabelId === nextLabelId ? currentLabelId : nextLabelId
    );
  }, []);

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
      autoComplete,
      autoHighlight,
      defaultLabelId: `${generatedId}-label`,
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
      labelId: labelIdProp ?? registeredLabelId,
      listboxId: `${generatedId}-listbox`,
      name,
      open,
      readOnly,
      registerItem,
      required,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setLabelId,
      setOpen,
      setTriggerId,
      selectItem,
      triggerId,
      triggerRef,
    }),
    [
      activeIndexState,
      autoComplete,
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
      labelIdProp,
      name,
      open,
      readOnly,
      registeredLabelId,
      registerItem,
      required,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setLabelId,
      setOpen,
      setTriggerId,
      selectItem,
      triggerId,
    ]
  );

  const hiddenValue =
    selectedValue === null ? '' : itemToStringValue(selectedValue);

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
          readOnly={readOnly}
        />
      ) : null}
    </ComboboxContext.Provider>
  );
}

function ComboboxLabel({ children, id, ...props }: ComboboxLabelProps) {
  const context = useComboboxContext<unknown>();
  const { defaultLabelId, setLabelId, triggerId } = context;
  const effectiveId = id ?? defaultLabelId;

  useLayoutEffect(() => {
    setLabelId(effectiveId);
    return () => {
      setLabelId(undefined);
    };
  }, [effectiveId, setLabelId]);

  return (
    <label id={effectiveId} htmlFor={triggerId} {...props}>
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
  const effectiveId = props.id ?? context.triggerId;
  const { setTriggerId, triggerRef } = context;
  const activeDescendant =
    context.activeIndex === null
      ? undefined
      : context.getItemId(context.activeIndex);

  useEffect(() => {
    setTriggerId(effectiveId);
  }, [effectiveId, setTriggerId]);

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

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
    },
    [triggerRef]
  );

  const triggerState: TriggerState = {
    disabled,
    open: context.open,
    readOnly: context.readOnly,
  };

  const triggerElementProps: TriggerElementProps = {
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
    id: effectiveId,
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
    role: 'combobox',
    type: props.type ?? 'button',
  };

  const triggerRenderProps: TriggerRenderProps = {
    ...triggerElementProps,
    ref: setTriggerRef,
  };

  if (typeof render === 'function') {
    return render(triggerRenderProps, triggerState);
  }

  if (isValidElement<Record<string, unknown>>(render)) {
    return React.cloneElement(render, {
      ...triggerRenderProps,
      className: [render.props.className, triggerElementProps.className]
        .filter(Boolean)
        .join(' '),
    } satisfies Record<string, unknown>);
  }

  return (
    <button {...triggerElementProps} ref={setTriggerRef}>
      {children}
    </button>
  );
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
  const floatingMiddleware = useMemo(
    () => [
      offset(sideOffset),
      flip({ padding: popupViewportPadding }),
      shift({ padding: popupViewportPadding }),
      size({
        padding: popupViewportPadding,
        apply({ availableHeight, availableWidth, elements, rects }) {
          const width = Math.min(
            rects.reference.width,
            Math.max(0, availableWidth)
          );
          const availablePopupHeight = Math.max(
            popupMinimumAvailableHeight,
            availableHeight
          );

          elements.floating.style.setProperty('--anchor-width', `${width}px`);
          elements.floating.style.setProperty(
            '--available-height',
            `${availablePopupHeight}px`
          );
        },
      }),
    ],
    [sideOffset]
  );
  const {
    floatingStyles,
    refs: { setFloating, setReference },
  } = useFloating<HTMLElement>({
    middleware: floatingMiddleware,
    open: context.open,
    placement: 'bottom-start',
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    setReference(context.triggerRef.current);
  }, [context.triggerRef, setReference]);

  if (!context.open) return null;

  return (
    <div
      {...props}
      ref={setFloating}
      style={{
        ...floatingSizeVariables,
        ...floatingStyles,
        maxHeight: 'var(--available-height)',
        overflow: 'visible',
        width: 'var(--anchor-width)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ComboboxPopup({
  children,
  initialFocus = false,
  ...props
}: ComboboxPopupProps) {
  const context = useComboboxContext<unknown>();
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!context.open || !initialFocus) return;

    const focusTarget =
      popupRef.current?.querySelector<HTMLElement>(popupFocusableSelector) ??
      null;
    focusTarget?.focus({ preventScroll: true });
  }, [context.open, initialFocus]);

  if (!context.open) return null;

  return (
    <div data-combobox-popup="" {...props} ref={popupRef}>
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
        autoComplete={props.autoComplete ?? context.autoComplete}
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

type ComboboxListComponent = <Value = React.ReactNode>(
  props: ComboboxListProps<Value> & React.RefAttributes<HTMLDivElement>
) => React.ReactElement | null;

const ComboboxList = forwardRef(function ComboboxList<Value = React.ReactNode>(
  { children, ...props }: ComboboxListProps<Value>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const context = useComboboxContext<unknown>();
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
      id={props.id ?? context.listboxId}
      role="listbox"
      aria-labelledby={context.labelId}
    >
      {renderedChildren}
    </div>
  );
}) as ComboboxListComponent;

function ComboboxCollection<Value = React.ReactNode>({
  children,
}: ComboboxCollectionProps<Value>) {
  const context = useComboboxContext<unknown>();

  return context.filteredItems.map((item, index) =>
    children(item as Value, index)
  );
}

function ComboboxHighlightController({
  onControllerChange,
}: ComboboxHighlightControllerProps) {
  const context = useComboboxContext<unknown>();
  const { highlightedIndexRef, setActiveIndex } = context;
  const controller = useMemo<ComboboxHighlightControllerApi>(
    () => ({
      getHighlightedIndex: () => highlightedIndexRef.current,
      setHighlightedIndex: (
        index: number | null,
        reason: EventReason = 'none',
        event?: React.SyntheticEvent | Event
      ) => {
        setActiveIndex(index, reason, event);
      },
    }),
    [highlightedIndexRef, setActiveIndex]
  );

  useLayoutEffect(() => {
    onControllerChange(controller);
    return () => {
      onControllerChange(null);
    };
  }, [controller, onControllerChange]);

  return null;
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
  const { registerItem } = context;
  const selected =
    context.selectedValue !== null &&
    context.isItemEqualToValue(value, context.selectedValue);
  const highlighted = context.activeIndex === index;
  const itemDisabled = context.disabled || disabled;

  useEffect(
    () =>
      registerItem(index, {
        disabled: itemDisabled,
        value,
      }),
    [index, itemDisabled, registerItem, value]
  );

  const setItemRef = useCallback((node: HTMLDivElement | null) => {
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
    return React.cloneElement(render, {
      ...itemRenderProps,
      className: [render.props.className, itemElementProps.className]
        .filter(Boolean)
        .join(' '),
    } satisfies Record<string, unknown>);
  }

  return (
    <div {...itemElementProps} ref={setItemRef}>
      {children}
    </div>
  );
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
  HighlightController: ComboboxHighlightController,
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
