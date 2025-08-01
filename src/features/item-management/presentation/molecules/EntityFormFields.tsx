import React from "react";
import Input from "@/components/input";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { useEntityModal } from "../../shared/contexts/EntityModalContext";

interface EntityFormFieldsProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const EntityFormFields: React.FC<EntityFormFieldsProps> = ({ nameInputRef }) => {
  const { form, ui, action, formActions } = useEntityModal();
  const { kode, name, description } = form;
  const { entityName } = ui;
  const { isLoading, isDeleting } = action;
  const { setKode, setName, setDescription } = formActions;

  const isReadOnly = isLoading || isDeleting;

  return (
    <div className="p-6 space-y-4">
      {setKode && (
        <Input
          label={`Kode ${entityName}`}
          value={kode || ''}
          onChange={(e) => setKode(e.target.value)}
          placeholder={`Masukkan kode ${entityName.toLowerCase()}`}
          required
          readOnly={isReadOnly}
        />
      )}
      
      <Input
        ref={nameInputRef}
        label={`Nama ${entityName}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Masukkan nama ${entityName.toLowerCase()}`}
        required
        readOnly={isReadOnly}
      />

      <DescriptiveTextarea
        label="Deskripsi"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Masukkan deskripsi singkat"
        readOnly={isReadOnly}
        textareaClassName="text-sm min-h-[80px] resize-none"
        rows={3}
        showInitially={!!description}
        expandOnClick={true}
      />
    </div>
  );
};

export default EntityFormFields;