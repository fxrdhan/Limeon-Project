import React, {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  useComboboxActionsContext,
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';
import {
  comboboxTypeaheadResetDelay,
  getPagedEnabledIndex,
  getTypeaheadIndex,
  getTypeaheadSearchText,
  normalizeTypeaheadText,
} from './utils/primitive-keyboard';
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

type TriggerElementProps = React.ComponentPropsWithoutRef<'button'>;

type TriggerRenderProps = TriggerElementProps & {
  ref: React.Ref<HTMLButtonElement>;
};

type TriggerState = {
  disabled: boolean;
  open: boolean;
  readOnly: boolean;
};

type ComboboxTriggerProps = Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'children'
> &
  RenderableProps<TriggerRenderProps, TriggerState> & {
    children?: React.ReactNode;
  };

export function ComboboxTrigger({
  children,
  disabled: disabledProp,
  onClick,
  onKeyDown,
  render,
  ...props
}: ComboboxTriggerProps) {
  const {
    defaultTriggerId,
    getItemId,
    highlightedIndexRef,
    listboxId,
    triggerRef,
  } = useComboboxStaticContext();
  const {
    activeIndex,
    disabled: rootDisabled,
    filteredItems,
    labelId,
    open,
    readOnly,
    required,
  } = useComboboxStateContext<unknown>();
  const {
    getNextEnabledIndex,
    isItemIndexDisabled,
    itemToStringLabel,
    selectActiveItem,
    setActiveIndex,
    setOpen,
    setTriggerId,
  } = useComboboxActionsContext<unknown>();
  const disabled = rootDisabled || Boolean(disabledProp);
  const effectiveId = props.id ?? defaultTriggerId;
  const typeaheadBufferRef = useRef('');
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const activeDescendant =
    !open || activeIndex === null ? undefined : getItemId(activeIndex);

  useLayoutEffect(() => {
    setTriggerId(effectiveId);
  }, [effectiveId, setTriggerId]);

  const moveHighlight = useCallback(
    (direction: 1 | -1, event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = getNextEnabledIndex(
        direction,
        highlightedIndexRef.current
      );

      if (nextIndex !== null) {
        setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [getNextEnabledIndex, highlightedIndexRef, setActiveIndex]
  );
  const moveHighlightToEdge = useCallback(
    (edge: 'first' | 'last', event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = getNextEnabledIndex(
        edge === 'first' ? 1 : -1,
        edge === 'first' ? null : filteredItems.length
      );

      if (nextIndex !== null) {
        setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [filteredItems.length, getNextEnabledIndex, setActiveIndex]
  );
  const moveHighlightByPage = useCallback(
    (direction: 1 | -1, event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = getPagedEnabledIndex({
        direction,
        fromIndex: highlightedIndexRef.current,
        getNextIndex: getNextEnabledIndex,
      });

      if (nextIndex !== null) {
        setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [getNextEnabledIndex, highlightedIndexRef, setActiveIndex]
  );
  const moveHighlightByTypeahead = useCallback(
    (key: string, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (typeaheadTimeoutRef.current !== null) {
        clearTimeout(typeaheadTimeoutRef.current);
      }

      typeaheadBufferRef.current = normalizeTypeaheadText(
        `${typeaheadBufferRef.current}${key}`
      );
      typeaheadTimeoutRef.current = setTimeout(() => {
        typeaheadBufferRef.current = '';
        typeaheadTimeoutRef.current = null;
      }, comboboxTypeaheadResetDelay);

      const nextIndex = getTypeaheadIndex({
        fromIndex: highlightedIndexRef.current,
        isIndexDisabled: isItemIndexDisabled,
        itemToStringLabel,
        items: filteredItems,
        search: getTypeaheadSearchText(typeaheadBufferRef.current),
      });

      if (nextIndex !== null) {
        setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [
      filteredItems,
      highlightedIndexRef,
      isItemIndexDisabled,
      itemToStringLabel,
      setActiveIndex,
    ]
  );

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
    },
    [triggerRef]
  );

  useEffect(
    () => () => {
      if (typeaheadTimeoutRef.current !== null) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
    },
    []
  );

  const triggerState: TriggerState = {
    disabled,
    open,
    readOnly,
  };

  const triggerElementProps: TriggerElementProps = {
    ...props,
    'aria-activedescendant': activeDescendant,
    'aria-controls': open ? listboxId : undefined,
    'aria-disabled': disabled || undefined,
    'aria-expanded': open,
    'aria-haspopup': 'listbox',
    'aria-labelledby':
      props['aria-labelledby'] ?? (props['aria-label'] ? undefined : labelId),
    'aria-readonly': props['aria-readonly'] ?? (readOnly ? true : undefined),
    'aria-required': props['aria-required'] ?? (required ? true : undefined),
    ...(children === undefined ? {} : { children }),
    disabled,
    id: effectiveId,
    onClick: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onClick, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        disabled ||
        readOnly
      ) {
        return;
      }

      setOpen(!open, 'trigger-press', event);
    },
    onKeyDown: event => {
      const preventableEvent = getPreventableEvent(event);
      callIfFunction(onKeyDown, event);
      if (
        event.defaultPrevented ||
        isComboboxHandlerPrevented(preventableEvent) ||
        disabled ||
        readOnly
      ) {
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false, 'escape-key', event);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          const opened = setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!open) {
          const opened = setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlightToEdge(event.key === 'Home' ? 'first' : 'last', event);
        return;
      }

      if (event.key === 'PageDown' || event.key === 'PageUp') {
        event.preventDefault();
        if (!open) {
          const opened = setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlightByPage(event.key === 'PageDown' ? 1 : -1, event);
        return;
      }

      if (
        open &&
        event.key.length === 1 &&
        event.key !== ' ' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        moveHighlightByTypeahead(event.key, event);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (open) {
          selectActiveItem('item-press', event);
          return;
        }

        setOpen(true, 'keyboard', event);
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
    const renderRef = render.props.ref as
      | React.Ref<HTMLButtonElement>
      | undefined;

    return React.cloneElement(render, {
      ...mergeRenderElementProps(render.props, triggerRenderProps),
      ref: (node: HTMLButtonElement | null) => {
        setRef(renderRef, node);
        setTriggerRef(node);
      },
    } satisfies Record<string, unknown>);
  }

  return (
    <button {...triggerElementProps} ref={setTriggerRef}>
      {children}
    </button>
  );
}
