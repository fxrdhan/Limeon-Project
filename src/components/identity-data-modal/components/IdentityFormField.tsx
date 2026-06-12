import React from 'react';
import Input from '@/components/input';
import { PharmaComboboxSelect } from '@/components/combobox';
import {
  default as Calendar,
  formatDateOnlyValue,
  parseDateOnlyValue,
  type CalendarDateValue,
} from '@/components/calendar';
import Button from '@/components/button';
import { TbBan, TbDeviceFloppy, TbPencil } from 'react-icons/tb';
import { useIdentityModalContext } from '@/contexts/useIdentityModalContext';
import type { FieldConfig } from '@/types';

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
    useInlineFieldActions,
    toggleEdit,
    handleChange,
    handleSaveField,
    handleCancelEdit,
    setInputRef,
  } = useIdentityModalContext();

  const isFieldEditable = field.editable !== false;
  const isInEditMode =
    isFieldEditable &&
    (mode === 'add' || !useInlineFieldActions || editMode[field.key]);
  const fieldValue = editValues[field.key];
  const displayValue = localData[field.key];
  const birthDateMinDate = React.useMemo(() => new Date(1900, 0, 1), []);
  const birthDateMaxDate = React.useMemo(() => new Date(), []);

  const renderEditModeActions = () => {
    if (!isFieldEditable || mode !== 'edit' || !useInlineFieldActions) {
      return null;
    }

    if (editMode[field.key]) {
      return (
        <div className="flex">
          <Button
            variant="text"
            size="sm"
            onClick={() => handleCancelEdit(field.key)}
            className="text-slate-500 hover:text-red-500 p-1"
            title="Batal"
          >
            <TbBan className="text-red-500 text-sm" />
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => handleSaveField(field.key)}
            className="text-slate-500 hover:text-slate-700 p-1"
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
        className="text-slate-500 hover:text-slate-700 p-1"
        title="Edit"
      >
        <TbPencil className="text-primary text-sm" />
      </Button>
    );
  };

  const renderEditableField = () => {
    if (field.isRadioDropdown && field.options) {
      const optionValues = field.options.map(option => option.id);
      const optionLabelByValue = new Map(
        field.options.map(option => [option.id, option.name])
      );

      return (
        <PharmaComboboxSelect
          items={optionValues}
          value={String(fieldValue ?? '')}
          onValueChange={selectedValue => {
            if (selectedValue !== null) handleChange(field.key, selectedValue);
          }}
          item={{
            toLabel: value => optionLabelByValue.get(value) ?? value,
            toValue: value => value,
            isValueEmpty: value => value === '',
          }}
          field={{
            id: field.key,
            label: field.label,
            name: field.key,
          }}
          display={{
            placeholder: `Pilih ${field.label.toLowerCase()}`,
            indicator: 'radio',
          }}
          search={{ enabled: false }}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <Calendar
          id={field.key}
          name={field.key}
          value={fieldValue ? parseDateOnlyValue(String(fieldValue)) : null}
          onChange={(date: CalendarDateValue) => {
            const formattedDate = date ? formatDateOnlyValue(date) : null;
            handleChange(field.key, formattedDate as string | number | boolean);
          }}
          placeholder={`Pilih ${field.label.toLowerCase()}`}
          inputClassName="w-full p-2.5 border rounded-xl text-sm"
          minDate={field.key === 'birth_date' ? birthDateMinDate : undefined}
          maxDate={field.key === 'birth_date' ? birthDateMaxDate : undefined}
          size="md"
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          aria-label={field.label}
          ref={el => setInputRef(field.key, el as HTMLTextAreaElement)}
          id={field.key}
          className="text-sm w-full p-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-100 transition duration-200 ease-in-out"
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
      return parseDateOnlyValue(String(displayValue)).toLocaleDateString(
        'id-ID',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }
      );
    }

    const value = String(displayValue ?? '');
    return (
      value || <span className="text-slate-400 italic">Tidak ada data</span>
    );
  };

  return (
    <div className="bg-white rounded-xl">
      <div className="flex justify-between items-center mb-1">
        <label
          htmlFor={field.key}
          className="text-sm font-medium text-slate-600"
        >
          {field.label}
        </label>
        {renderEditModeActions()}
      </div>

      {isInEditMode ? (
        renderEditableField()
      ) : (
        <div className="p-2 bg-slate-50 rounded-xl min-h-[40px] text-sm">
          {renderDisplayValue()}
        </div>
      )}
    </div>
  );
};

export default IdentityFormField;
