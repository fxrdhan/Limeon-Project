import React, { useRef, useEffect } from "react";
import { FaPen } from "react-icons/fa";
import Input from "@/components/input";
import FormField from "@/components/form-field";

interface MinStockEditorProps {
  isEditing: boolean;
  minStockValue: string;
  currentMinStock: number;
  tabIndex?: number;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function MinStockEditor({
  isEditing,
  minStockValue,
  currentMinStock,
  tabIndex = 11,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
}: MinStockEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <FormField label="Stok Minimal:" className="flex items-center">
      <div className="ml-2 grow flex items-center">
        {isEditing ? (
          <Input
            className="max-w-20"
            ref={inputRef}
            type="number"
            value={minStockValue}
            onChange={onChange}
            onBlur={onStopEdit}
            onKeyDown={onKeyDown}
            min="0"
          />
        ) : (
          <div
            tabIndex={tabIndex}
            className="group w-full pb-1 cursor-pointer flex items-center focus:outline-hidden"
            onClick={onStartEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onStartEdit();
              }
            }}
            title="Klik untuk mengubah stok minimal"
          >
            <span>{currentMinStock}</span>
            <FaPen
              className="ml-2 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
              size={14}
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              title="Edit stok minimal"
            />
          </div>
        )}
      </div>
    </FormField>
  );
}