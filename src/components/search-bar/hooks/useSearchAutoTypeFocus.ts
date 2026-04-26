import { useEffect } from 'react';
import type React from 'react';

const AUTO_TYPE_ATTRIBUTE = 'data-search-auto-type-input';

const isHTMLElement = (
  target: EventTarget | Element | null
): target is HTMLElement => target instanceof HTMLElement;

const isEditableElement = (target: EventTarget | Element | null): boolean => {
  if (!isHTMLElement(target)) return false;

  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
};

const isPrintableKey = (event: KeyboardEvent): boolean =>
  event.key.length === 1 &&
  event.key.trim() !== '' &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.isComposing;

const canUseInputForAutoType = (input: HTMLInputElement): boolean => {
  if (!input.isConnected || input.disabled || input.readOnly) return false;
  if (input.closest('[aria-hidden="true"], [inert]')) return false;

  const visibilityCheck = (
    input as HTMLInputElement & {
      checkVisibility?: (options?: {
        checkOpacity?: boolean;
        checkVisibilityCSS?: boolean;
      }) => boolean;
    }
  ).checkVisibility;

  return visibilityCheck
    ? visibilityCheck.call(input, {
        checkOpacity: false,
        checkVisibilityCSS: true,
      })
    : true;
};

const getPreferredAutoTypeInput = (): HTMLInputElement | null => {
  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[${AUTO_TYPE_ATTRIBUTE}]`)
  ).filter(canUseInputForAutoType);

  if (candidates.length === 0) return null;

  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
  ).filter(dialog => !dialog.closest('[aria-hidden="true"], [inert]'));
  const activeDialog = dialogs[dialogs.length - 1] ?? null;

  if (activeDialog) {
    return candidates.find(input => activeDialog.contains(input)) ?? null;
  }

  return candidates[candidates.length - 1] ?? null;
};

const writeCharacterToInput = (input: HTMLInputElement, character: string) => {
  const nextValue = `${input.value}${character}`;
  const valueDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  );

  if (valueDescriptor?.set) {
    valueDescriptor.set.call(input, nextValue);
  } else {
    input.value = nextValue;
  }

  const event =
    typeof InputEvent === 'function'
      ? new InputEvent('input', {
          bubbles: true,
          data: character,
          inputType: 'insertText',
        })
      : new Event('input', { bubbles: true });

  input.dispatchEvent(event);
  input.setSelectionRange(nextValue.length, nextValue.length);
};

export const useSearchAutoTypeFocus = (
  inputRef: React.RefObject<HTMLInputElement | null>,
  enabled = true
) => {
  useEffect(() => {
    const input = inputRef.current;
    if (!input || !enabled) return;

    input.setAttribute(AUTO_TYPE_ATTRIBUTE, 'true');

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isPrintableKey(event)) return;

      const activeElement = document.activeElement;
      if (
        isEditableElement(event.target) ||
        (activeElement !== input && isEditableElement(activeElement))
      ) {
        return;
      }

      if (document.activeElement === input) return;
      if (getPreferredAutoTypeInput() !== input) return;

      event.preventDefault();
      input.focus({ preventScroll: true });
      writeCharacterToInput(input, event.key);
    };

    document.addEventListener('keydown', handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
      input.removeAttribute(AUTO_TYPE_ATTRIBUTE);
    };
  }, [enabled, inputRef]);
};
