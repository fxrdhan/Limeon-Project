import { useCallback, useEffect, useRef, useState } from 'react';

const INPUT_ERROR_VISIBLE_MS = 800;

export const useSearchInputError = () => {
  const [showInputError, setShowInputError] = useState(false);
  const inputErrorTimeoutRef = useRef<number | null>(null);

  const resetInputError = useCallback(() => {
    if (inputErrorTimeoutRef.current !== null) {
      window.clearTimeout(inputErrorTimeoutRef.current);
      inputErrorTimeoutRef.current = null;
    }
    setShowInputError(false);
  }, []);

  const triggerInputError = useCallback(() => {
    if (inputErrorTimeoutRef.current !== null) {
      window.clearTimeout(inputErrorTimeoutRef.current);
    }
    setShowInputError(true);
    inputErrorTimeoutRef.current = window.setTimeout(() => {
      setShowInputError(false);
      inputErrorTimeoutRef.current = null;
    }, INPUT_ERROR_VISIBLE_MS);
  }, []);

  useEffect(() => resetInputError, [resetInputError]);

  return {
    showInputError,
    triggerInputError,
    resetInputError,
  };
};
