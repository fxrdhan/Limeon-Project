import { forwardRef, useCallback } from 'react';
import type React from 'react';
import {
  useComboboxActionsContext,
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';
import { getPagedEnabledIndex } from './utils/primitive-keyboard';
import {
  callIfFunction,
  getPreventableEvent,
  isComboboxHandlerPrevented,
} from './utils/primitive-render';

type ComboboxInputProps = Omit<
  React.ComponentPropsWithoutRef<'input'>,
  'defaultValue' | 'value'
>;

export const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput({ onChange, onKeyDown, ...props }, ref) {
    const { getItemId, highlightedIndexRef, inputId, listboxId } =
      useComboboxStaticContext();
    const {
      activeIndex,
      autoComplete,
      disabled: rootDisabled,
      inputValue,
      labelId,
      open,
      readOnly: rootReadOnly,
      required,
    } = useComboboxStateContext<unknown>();
    const {
      getNextEnabledIndex,
      selectActiveItem,
      setActiveIndex,
      setInputValue,
      setOpen,
    } = useComboboxActionsContext<unknown>();
    const inputRole = props.role ?? 'searchbox';
    const disabled = rootDisabled || Boolean(props.disabled);
    const readOnly = rootReadOnly || Boolean(props.readOnly);
    const activeDescendant =
      !open || activeIndex === null ? undefined : getItemId(activeIndex);

    const moveHighlight = useCallback(
      (direction: 1 | -1, event: React.KeyboardEvent<HTMLInputElement>) => {
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
    const moveHighlightByPage = useCallback(
      (direction: 1 | -1, event: React.KeyboardEvent<HTMLInputElement>) => {
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

    return (
      <input
        {...props}
        ref={ref}
        id={props.id ?? inputId}
        role={inputRole}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-labelledby={
          props['aria-labelledby'] ??
          (props['aria-label'] ? undefined : labelId)
        }
        aria-readonly={props['aria-readonly'] ?? (readOnly ? true : undefined)}
        aria-required={props['aria-required'] ?? (required ? true : undefined)}
        autoComplete={props.autoComplete ?? autoComplete}
        value={inputValue}
        disabled={disabled}
        readOnly={readOnly}
        onChange={event => {
          const preventableEvent = getPreventableEvent(event);
          callIfFunction(onChange, event);
          if (
            event.defaultPrevented ||
            isComboboxHandlerPrevented(preventableEvent) ||
            disabled ||
            readOnly
          ) {
            return;
          }

          setInputValue(event.currentTarget.value, 'input-change', event);
        }}
        onKeyDown={event => {
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

          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false, 'escape-key', event);
            return;
          }

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(event.key === 'ArrowDown' ? 1 : -1, event);
            return;
          }

          if (event.key === 'PageDown' || event.key === 'PageUp') {
            event.preventDefault();
            moveHighlightByPage(event.key === 'PageDown' ? 1 : -1, event);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            selectActiveItem('item-press', event);
          }
        }}
      />
    );
  }
);
