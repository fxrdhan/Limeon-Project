import React from 'react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import Calendar from '@/components/calendar';
import Button from '@/components/button';
import { TbBan, TbDeviceFloppy, TbPencil } from 'react-icons/tb';
import { useIdentityModalContext } from '@/contexts/IdentityModalContext';
import type { FieldConfig } from '@/types';
import type { CustomDateValueType } from '@/components/calendar/types';

interface IdentityFormFieldProps {
  field: FieldConfig;
}

const IdentityFormField: React.FC<IdentityFormFieldProps> = ({ field }) => {
  const {
    editMode,
    editValues,
    loadingField,
    localData,
    mode,
    toggleEdit,
    handleChange,
    handleSaveField,
    handleCancelEdit,
    setInputRef,
  } = useIdentityModalContext();

  const isInEditMode = editMode[field.key] || mode === 'add';
  const fieldValue = editValues[field.key];
  const displayValue = localData[field.key];

  const renderEditModeActions = () => {
    if (field.editable === false || mode !== 'edit') {
      return null;
    }

    if (editMode[field.key]) {
      return (
        <div className="flex">
          <Button
            variant="text"
            size="sm"
            onClick={() => handleCancelEdit(field.key)}
            className="text-gray-500 hover:text-red-500 p-1"
            title="Batal"
          >
            <TbBan className="text-red-500 text-sm" />
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => handleSaveField(field.key)}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={loadingField[field.key]}
            title="Simpan"
          >
            {loadingField[field.key] ? (
              <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
            ) : (
              <TbDeviceFloppy className="text-green-500 text-sm" />
            )}
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="text"
        size="sm"
        onClick={() => toggleEdit(field.key)}
        className="text-gray-500 hover:text-gray-700 p-1"
        title="Edit"
      >
        <TbPencil className="text-primary text-sm" />
      </Button>
    );
  };

  const renderEditableField = () => {
    if (field.isRadioDropdown && field.options) {
      return (
        <Dropdown
          name={field.key}
          options={field.options}
          value={String(fieldValue ?? '')}
          onChange={selectedValue => handleChange(field.key, selectedValue)}
          placeholder={`Pilih ${field.label.toLowerCase()}`}
          withRadio={true}
          searchList={false}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <Calendar
          value={fieldValue ? new Date(String(fieldValue)) : null}
          onChange={(date: CustomDateValueType) => {
            const formattedDate = date
              ? date.toISOString().split('T')[0]
              : null;
            handleChange(field.key, formattedDate as string | number | boolean);
          }}
          placeholder={`Pilih ${field.label.toLowerCase()}`}
          inputClassName="w-full p-2.5 border rounded-lg text-sm"
          size="md"
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          ref={el => setInputRef(field.key, el as HTMLTextAreaElement)}
          id={field.key}
          className="text-sm w-full p-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-100 transition duration-200 ease-in-out"
          value={String(fieldValue ?? '')}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange(field.key, e.target.value)
          }
          rows={3}
        />
      );
    }

    return (
      <Input
        ref={el => setInputRef(field.key, el as HTMLInputElement)}
        id={field.key}
        type={field.type || 'text'}
        value={String(fieldValue ?? '')}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange(field.key, e.target.value)
        }
        fullWidth
      />
    );
  };

  const renderDisplayValue = () => {
    if (field.type === 'date' && displayValue) {
      return new Date(String(displayValue)).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }

    const value = String(displayValue ?? '');
    return (
      value || <span className="text-gray-400 italic">Tidak ada data</span>
    );
  };

  return (
    <div className="bg-white rounded-md">
      <div className="flex justify-between items-center mb-1">
        <label
          htmlFor={field.key}
          className="text-sm font-medium text-gray-600"
        >
          {field.label}
        </label>
        {renderEditModeActions()}
      </div>

      {isInEditMode ? (
        renderEditableField()
      ) : (
        <div className="p-2 bg-gray-50 rounded-md min-h-[40px] text-sm">
          {renderDisplayValue()}
        </div>
      )}
    </div>
  );
};

export default IdentityFormField;
