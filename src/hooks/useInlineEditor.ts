import { useState, useRef, useCallback } from "react";

interface UseInlineEditorProps {
  initialValue: string | number;
  onSave: (value: string | number) => void;
}

export const useInlineEditor = ({
  initialValue,
  onSave,
}: UseInlineEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(initialValue));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setValue(String(initialValue));
    setIsEditing(true);
  }, [initialValue]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      onSave(numericValue);
    }
  }, [value, onSave]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setValue(String(initialValue));
  }, [initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        stopEditing();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [stopEditing, cancelEditing]
  );

  return {
    isEditing,
    value,
    inputRef,
    startEditing,
    stopEditing,
    cancelEditing,
    handleChange,
    handleKeyDown,
    setValue,
  };
};