import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { stepBackPatternValue } from '../utils/groupEditingUtils';

interface UseSearchDeleteStepBackProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearPreservedState: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export const useSearchDeleteStepBack = ({
  value,
  onChange,
  onClearPreservedState,
  inputRef,
}: UseSearchDeleteStepBackProps) => {
  const latestValueRef = useRef(value);
  const deleteConfirmationCarryRef = useRef(false);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const resetDeleteConfirmationCarry = useCallback(() => {
    deleteConfirmationCarryRef.current = false;
  }, []);

  const focusSearchInputAfterDelete = useCallback(() => {
    const input = inputRef.current;
    input?.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      const latestInput = inputRef.current;
      if (latestInput && document.activeElement === document.body) {
        latestInput.focus({ preventScroll: true });
      }
    });
  }, [inputRef]);

  const handleStepBackDelete = useCallback((): boolean => {
    const liveValue = latestValueRef.current;
    const result = stepBackPatternValue(
      liveValue,
      deleteConfirmationCarryRef.current
    );

    if (!result.handled) {
      return false;
    }

    latestValueRef.current = result.nextValue;
    onClearPreservedState();
    onChange({
      target: { value: result.nextValue },
    } as ChangeEvent<HTMLInputElement>);
    deleteConfirmationCarryRef.current = result.nextCarry;
    focusSearchInputAfterDelete();
    return true;
  }, [focusSearchInputAfterDelete, onChange, onClearPreservedState]);

  return {
    deleteConfirmationCarryRef,
    resetDeleteConfirmationCarry,
    handleStepBackDelete,
  };
};
