import React, { useState, useRef, useEffect } from 'react';

interface VatPercentageEditorProps {
  vatPercentage: number;
  onVatPercentageChange: (value: number) => void;
}

const VatPercentageEditor: React.FC<VatPercentageEditorProps> = ({
  vatPercentage,
  onVatPercentageChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(vatPercentage.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setTempValue(vatPercentage.toString());
    setIsEditing(true);
  };

  const stopEditing = () => {
    setIsEditing(false);
    const numericValue = parseFloat(tempValue);
    if (!isNaN(numericValue)) {
      onVatPercentageChange(Math.min(numericValue, 100));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      stopEditing();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="flex items-center">
      <label className="mr-2">PPN:</label>
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="number"
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              onBlur={stopEditing}
              onKeyDown={handleKeyDown}
              className="w-16 p-1 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent"
              min="0"
              max="100"
            />
            <span className="ml-1">%</span>
          </div>
        ) : (
          <span
            className="w-10 p-1 rounded-md cursor-pointer flex items-center justify-end hover:bg-slate-100 transition-colors text-orange-500"
            onClick={startEditing}
            title="Klik untuk mengubah persentase PPN"
          >
            {vatPercentage}%
          </span>
        )}
      </div>
    </div>
  );
};

export default VatPercentageEditor;
