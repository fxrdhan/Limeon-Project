import React from "react";
import Input from "@/components/input";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { useEntityModal } from "../../contexts/EntityModalContext";

interface EntityFormFieldsProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const EntityFormFields: React.FC<EntityFormFieldsProps> = ({ nameInputRef }) => {
  const { form, ui, action, formActions } = useEntityModal();
  const { name, description } = form;
  const { entityName } = ui;
  const { isLoading, isDeleting } = action;
  const { setName, setDescription } = formActions;

  const isReadOnly = isLoading || isDeleting;

  return (
    <div className="p-6 space-y-4">
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
      />
    </div>
  );
};

export default EntityFormFields;