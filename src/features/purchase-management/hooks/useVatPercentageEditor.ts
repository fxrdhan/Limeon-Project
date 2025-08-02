import { useState, useRef } from 'react';

interface UseVatPercentageEditorProps {
  initialValue: number;
  onChange: (value: number) => void;
}

export const useVatPercentageEditor = ({
  initialValue,
  onChange,
}: UseVatPercentageEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(initialValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setTempValue(initialValue.toString());
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  const stopEditing = () => {
    setIsEditing(false);
    const numericValue = parseFloat(tempValue);
    if (!isNaN(numericValue)) {
      onChange(Math.min(numericValue, 100));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      stopEditing();
    }
  };

  return {
    isEditing,
    tempValue,
    inputRef,
    startEditing,
    stopEditing,
    handleChange,
    handleKeyDown,
  };
};
