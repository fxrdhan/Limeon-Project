import React, {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { useComboboxContext } from './primitive-context';
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
  const context = useComboboxContext<unknown>();
  const disabled = context.disabled || Boolean(disabledProp);
  const effectiveId = props.id ?? context.defaultTriggerId;
  const { setTriggerId, triggerRef } = context;
  const typeaheadBufferRef = useRef('');
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const activeDescendant =
    !context.open || context.activeIndex === null
      ? undefined
      : context.getItemId(context.activeIndex);

  useLayoutEffect(() => {
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
  const moveHighlightToEdge = useCallback(
    (edge: 'first' | 'last', event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = context.getNextEnabledIndex(
        edge === 'first' ? 1 : -1,
        edge === 'first' ? null : context.filteredItems.length
      );

      if (nextIndex !== null) {
        context.setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [context]
  );
  const moveHighlightByPage = useCallback(
    (direction: 1 | -1, event: React.KeyboardEvent<HTMLButtonElement>) => {
      const nextIndex = getPagedEnabledIndex({
        direction,
        fromIndex: context.highlightedIndexRef.current,
        getNextIndex: context.getNextEnabledIndex,
      });

      if (nextIndex !== null) {
        context.setActiveIndex(nextIndex, 'keyboard', event);
      }
    },
    [context]
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
        fromIndex: context.highlightedIndexRef.current,
        isIndexDisabled: context.isItemIndexDisabled,
        itemToStringLabel: context.itemToStringLabel,
        items: context.filteredItems,
        search: getTypeaheadSearchText(typeaheadBufferRef.current),
      });

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
    'aria-readonly':
      props['aria-readonly'] ?? (context.readOnly ? true : undefined),
    'aria-required':
      props['aria-required'] ?? (context.required ? true : undefined),
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
          const opened = context.setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!context.open) {
          const opened = context.setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlightToEdge(event.key === 'Home' ? 'first' : 'last', event);
        return;
      }

      if (event.key === 'PageDown' || event.key === 'PageUp') {
        event.preventDefault();
        if (!context.open) {
          const opened = context.setOpen(true, 'keyboard', event);
          if (!opened) return;
        }
        moveHighlightByPage(event.key === 'PageDown' ? 1 : -1, event);
        return;
      }

      if (
        context.open &&
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
        if (context.open) {
          context.selectActiveItem('item-press', event);
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
