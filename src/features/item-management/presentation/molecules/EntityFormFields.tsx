import React from 'react';
import Input from '@/components/input';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';

interface EntityFormFieldsProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const EntityFormFields: React.FC<EntityFormFieldsProps> = ({
  nameInputRef,
}) => {
  const { form, ui, action, formActions, realtime } = useEntityModal();
  const { code, name, description, address } = form;
  const { entityName } = ui;
  const { isLoading, isDeleting } = action;
  const { setCode, setName, setDescription, setAddress } = formActions;

  const isReadOnly = isLoading || isDeleting;

  // Get realtime field handlers (with safety check)
  const getRealtimeHandlers = (fieldName: string) => {
    if (!realtime?.smartFormSync) {
      // No realtime sync available (add mode or not initialized)
      return { onFocus: undefined, onBlur: undefined };
    }
    return realtime.smartFormSync.getFieldHandlers(fieldName);
  };

  // Wrapper for textarea that merges internal behavior with realtime handlers
  const getTextareaHandlers = (fieldName: string) => {
    const handlers = getRealtimeHandlers(fieldName);
    return {
      // Note: DescriptiveTextarea has internal onFocus for show/hide behavior
      // We pass handlers via props spread which will be merged in the textarea element
      onFocus: handlers.onFocus,
      onBlur: handlers.onBlur,
    };
  };

  return (
    <div className="p-6 space-y-4">
      {setCode && (
        <Input
          label={`Code ${entityName}`}
          value={code || ''}
          onChange={e => setCode(e.target.value)}
          onFocus={getRealtimeHandlers('code').onFocus}
          onBlur={getRealtimeHandlers('code').onBlur}
          placeholder={`Masukkan code ${entityName.toLowerCase()}`}
          required
          readOnly={isReadOnly}
        />
      )}

      <Input
        ref={nameInputRef}
        label={`Nama ${entityName}`}
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={getRealtimeHandlers('name').onFocus}
        onBlur={getRealtimeHandlers('name').onBlur}
        placeholder={`Masukkan nama ${entityName.toLowerCase()}`}
        required
        readOnly={isReadOnly}
      />

      {entityName === 'Produsen' ? (
        <DescriptiveTextarea
          label="Alamat"
          name="address"
          value={address || ''}
          onChange={e => setAddress && setAddress(e.target.value)}
          placeholder="Masukkan alamat produsen"
          readOnly={isReadOnly}
          textareaClassName="text-sm min-h-[80px] resize-none"
          rows={3}
          showInitially={!!address}
          expandOnClick={true}
          {...getTextareaHandlers('address')}
        />
      ) : (
        <DescriptiveTextarea
          label="Deskripsi"
          name="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Masukkan deskripsi singkat"
          readOnly={isReadOnly}
          textareaClassName="text-sm min-h-[80px] resize-none"
          rows={3}
          showInitially={!!description}
          expandOnClick={true}
          {...getTextareaHandlers('description')}
        />
      )}
    </div>
  );
};

export default EntityFormFields;
