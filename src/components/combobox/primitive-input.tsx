import { forwardRef, useCallback } from 'react';
import type React from 'react';
import { useComboboxContext } from './primitive-context';
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
    const context = useComboboxContext<unknown>();
    const inputRole = props.role ?? 'searchbox';
    const disabled = context.disabled || props.disabled;
    const readOnly = context.readOnly || props.readOnly;
    const activeDescendant =
      !context.open || context.activeIndex === null
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
    const moveHighlightByPage = useCallback(
      (direction: 1 | -1, event: React.KeyboardEvent<HTMLInputElement>) => {
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

    return (
      <input
        {...props}
        ref={ref}
        id={props.id ?? context.inputId}
        role={inputRole}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        aria-controls={context.open ? context.listboxId : undefined}
        aria-expanded={context.open}
        aria-labelledby={
          props['aria-labelledby'] ??
          (props['aria-label'] ? undefined : context.labelId)
        }
        aria-readonly={
          props['aria-readonly'] ?? (context.readOnly ? true : undefined)
        }
        aria-required={
          props['aria-required'] ?? (context.required ? true : undefined)
        }
        autoComplete={props.autoComplete ?? context.autoComplete}
        value={context.inputValue}
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
            isComboboxHandlerPrevented(preventableEvent) ||
            disabled ||
            readOnly
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

          if (event.key === 'PageDown' || event.key === 'PageUp') {
            event.preventDefault();
            moveHighlightByPage(event.key === 'PageDown' ? 1 : -1, event);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            context.selectActiveItem('item-press', event);
          }
        }}
      />
    );
  }
);
