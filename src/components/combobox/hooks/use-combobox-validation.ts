import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InvalidEvent,
} from 'react';

export const comboboxRequiredValidationMessage = 'Field ini wajib diisi';

export function useComboboxValidation<Item>({
  effectiveRequired,
  isFocusWithinCombobox,
  selectedValue,
  validation,
}: {
  effectiveRequired: boolean;
  isFocusWithinCombobox: (target: EventTarget | null) => boolean;
  selectedValue: Item | null;
  validation?: {
    enabled?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };
}) {
  const validationMessageId = useId();
  const blurValidationFrameRef = useRef<number | null>(null);
  const [blurred, setBlurred] = useState(false);
  const validationEnabled = validation?.enabled ?? effectiveRequired;
  const showValidation =
    validationEnabled && effectiveRequired && blurred && selectedValue == null;

  const handleComboboxBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (blurValidationFrameRef.current !== null) {
        window.cancelAnimationFrame(blurValidationFrameRef.current);
        blurValidationFrameRef.current = null;
      }

      const nextFocusedTarget = event.relatedTarget;
      if (isFocusWithinCombobox(nextFocusedTarget)) return;

      if (nextFocusedTarget || typeof window === 'undefined') {
        setBlurred(true);
        return;
      }

      blurValidationFrameRef.current = window.requestAnimationFrame(() => {
        blurValidationFrameRef.current = null;
        if (
          typeof document !== 'undefined' &&
          isFocusWithinCombobox(document.activeElement)
        ) {
          return;
        }

        setBlurred(true);
      });
    },
    [isFocusWithinCombobox]
  );
  const handleComboboxInvalid = useCallback(
    (event: InvalidEvent<HTMLInputElement>) => {
      if (!validationEnabled || !effectiveRequired) return;

      event.preventDefault();
      setBlurred(true);
    },
    [effectiveRequired, validationEnabled]
  );

  useEffect(
    () => () => {
      if (blurValidationFrameRef.current !== null) {
        window.cancelAnimationFrame(blurValidationFrameRef.current);
      }
    },
    []
  );

  return {
    handleComboboxBlur,
    handleComboboxInvalid,
    showValidation,
    validationEnabled,
    validationMessageId,
  };
}
