import React, { useRef, useEffect } from 'react';
import { FaPen } from 'react-icons/fa';
import Input from '@/components/input';
import FormField from '@/components/form-field';

interface LocalMarginEditorProps {
  isEditing: boolean;
  marginPercentage: string;
  calculatedMargin: number | null;
  tabIndex?: number;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function MarginEditor({
  isEditing,
  marginPercentage,
  calculatedMargin,
  tabIndex = 14,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
}: LocalMarginEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <FormField label="Margin">
      <div className="flex items-center focus:outline-hidden">
        {isEditing ? (
          <div className="flex items-center focus:outline-hidden">
            <Input
              className="max-w-20 focus:outline-hidden"
              ref={inputRef}
              type="number"
              value={marginPercentage}
              onChange={onChange}
              onBlur={onStopEdit}
              onKeyDown={onKeyDown}
              step="0.1"
            />
            <span className="ml-2 text-lg font-medium">%</span>
          </div>
        ) : (
          <div
            tabIndex={tabIndex}
            className={`group w-full py-2 cursor-pointer font-semibold flex items-center ${
              calculatedMargin !== null
                ? calculatedMargin >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
                : 'text-gray-500'
            } focus:outline-hidden`}
            onClick={onStartEdit}
            title="Klik untuk mengubah margin"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onStartEdit();
              }
            }}
          >
            {calculatedMargin !== null
              ? `${calculatedMargin.toFixed(1)} %`
              : '-'}
            <FaPen
              className="ml-4 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
              size={14}
              onClick={e => {
                e.stopPropagation();
                onStartEdit();
              }}
              title="Edit margin"
            />
          </div>
        )}
      </div>
    </FormField>
  );
}
