import React from "react";
import Button from "@/components/button";
import { FaHistory } from "react-icons/fa";
import { useEntityModal } from "../../contexts/EntityModalContext";
import EntityFormFields from "../ui/EntityFormFields";
import HistoryButton from "../ui/HistoryButton";

interface EntityData {
  id: string;
  name: string;
  description?: string | null;
  updated_at?: string | null;
}

interface EntityModalContentProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  initialData?: EntityData | null;
}

const EntityModalHeader: React.FC<{ initialData?: EntityData | null }> = ({ initialData }) => {
  const { ui } = useEntityModal();
  const { isEditMode, entityName, formattedUpdateAt } = ui;

  // Map entityName to database table name
  const getEntityTable = (entityName: string): string => {
    const tableMap: Record<string, string> = {
      'Item': 'items',
      'Kategori': 'item_categories', 
      'Tipe': 'item_types',
      'Satuan': 'item_units'
    };
    return tableMap[entityName] || 'items';
  };

  return (
    <div className="flex justify-between items-center p-4 border-b-2 border-gray-200 bg-gray-100 rounded-t-xl">
      <div>
        <h2 className="text-xl font-semibold">
          {isEditMode ? `Edit ${entityName}` : `Tambah ${entityName} Baru`}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {isEditMode && formattedUpdateAt !== "-" && (
          <span className="text-sm text-gray-500 italic flex items-center">
            <FaHistory className="mr-1" size={12} />
            {formattedUpdateAt}
          </span>
        )}
        {isEditMode && initialData?.id && (
          <HistoryButton
            entityTable={getEntityTable(entityName)}
            entityId={initialData.id}
            entityName={entityName}
          />
        )}
      </div>
    </div>
  );
};

const EntityModalFooter: React.FC = () => {
  const { form, ui, action, formActions, uiActions } = useEntityModal();
  const { isDirty, isValid } = form;
  const { isEditMode } = ui;
  const { isLoading, isDeleting } = action;
  const { handleSubmit, handleDelete } = formActions;
  const { handleClose } = uiActions;

  const isDisabled = isLoading || !isValid || (isEditMode && !isDirty);

  return (
    <div className="flex justify-between p-4 border-t-2 border-gray-200 rounded-b-lg">
      <div>
        {isEditMode && handleDelete ? (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isLoading || isDeleting}
          >
            Hapus
          </Button>
        ) : (
          <Button type="button" variant="text" onClick={handleClose}>
            Batal
          </Button>
        )}
      </div>
      <div>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={isDisabled}
        >
          {isEditMode ? "Update" : "Simpan"}
        </Button>
      </div>
    </div>
  );
};

const EntityModalContent: React.FC<EntityModalContentProps> = ({ nameInputRef, initialData }) => {
  return (
    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
      <EntityModalHeader initialData={initialData} />
      <EntityFormFields nameInputRef={nameInputRef} />
      <EntityModalFooter />
    </div>
  );
};

export default EntityModalContent;