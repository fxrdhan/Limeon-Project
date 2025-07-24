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
  const [editValue, setEditValue] = useState(String(initialValue));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(String(initialValue));
    setIsEditing(true);
  }, [initialValue]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    const numericValue = parseFloat(editValue);
    if (!isNaN(numericValue)) {
      onSave(numericValue);
    }
  }, [editValue, onSave]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(String(initialValue));
  }, [initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
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
    editValue,
    inputRef,
    startEditing,
    stopEditing,
    cancelEditing,
    handleChange,
    handleKeyDown,
  };
};