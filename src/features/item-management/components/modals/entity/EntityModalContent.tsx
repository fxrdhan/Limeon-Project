import React from "react";
import Button from "@/components/button";
import { FaHistory, FaArrowLeft } from "react-icons/fa";
import { useEntityModal } from "../../../contexts/EntityModalContext";
import { EntityFormFields } from "../../ui";
import { HistoryListContent, VersionDetailContent } from "../../ui";
import type { EntityData } from "../../../types";

interface EntityModalContentProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  initialData?: EntityData | null;
}

const EntityModalHeader: React.FC<{ initialData?: EntityData | null }> = ({ initialData }) => {
  const { ui, uiActions } = useEntityModal();
  const { isEditMode, entityName, formattedUpdateAt, mode } = ui;
  const { goBack } = uiActions;

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

  const getTitle = () => {
    switch (mode) {
      case 'history':
        return `Riwayat Perubahan ${entityName}`;
      case 'version-detail':
        return `Detail Versi ${entityName}`;
      case 'edit':
        return `Edit ${entityName}`;
      case 'add':
      default:
        return `Tambah ${entityName} Baru`;
    }
  };

  const showBackButton = mode === 'history' || mode === 'version-detail';
  const showHistoryButton = (mode === 'add' || mode === 'edit') && isEditMode && initialData?.id;

  return (
    <div className="flex justify-between items-center p-4 border-b-2 border-gray-200 bg-gray-100 rounded-t-xl">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button variant="text" onClick={goBack} className="text-gray-600 hover:text-gray-800 p-1 flex items-center">
            <FaArrowLeft size={16} />
          </Button>
        )}
        <h2 className="text-xl font-semibold">
          {getTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {showHistoryButton && (
          <Button
            variant="text"
            onClick={() => uiActions.openHistory(getEntityTable(entityName), initialData.id)}
            className="text-sm text-gray-500 hover:text-primary italic flex items-center transition-colors"
            title={`Lihat riwayat perubahan ${entityName}`}
          >
            <FaHistory className="mr-1" size={12} />
            {formattedUpdateAt}
          </Button>
        )}
      </div>
    </div>
  );
};

const EntityModalFooter: React.FC = () => {
  const { form, ui, action, formActions, uiActions } = useEntityModal();
  const { isDirty, isValid } = form;
  const { isEditMode, mode } = ui;
  const { isLoading, isDeleting } = action;
  const { handleSubmit, handleDelete } = formActions;
  const { handleClose, goBack } = uiActions;

  const isDisabled = isLoading || !isValid || (isEditMode && !isDirty);

  // Don't show footer for history mode
  if (mode === 'history') {
    return (
      <div className="flex justify-end p-4 border-t-2 border-gray-200 rounded-b-lg">
        <Button type="button" variant="text" onClick={handleClose}>
          Tutup
        </Button>
      </div>
    );
  }

  // Special footer for version-detail mode
  if (mode === 'version-detail') {
    return (
      <div className="flex justify-between items-center p-4 border-t-2 border-gray-200 rounded-b-lg">
        <div>
          <Button type="button" variant="text" onClick={goBack}>
            Batal
          </Button>
        </div>
        <div>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isDisabled}
          >
            Update
          </Button>
        </div>
      </div>
    );
  }

  // Default footer for add/edit modes
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
  const { ui } = useEntityModal();
  const { mode } = ui;

  const renderContent = () => {
    switch (mode) {
      case 'history':
        return <HistoryListContent />;
      case 'version-detail':
        return <VersionDetailContent />;
      case 'add':
      case 'edit':
      default:
        return <EntityFormFields nameInputRef={nameInputRef} />;
    }
  };

  return (
    <div className="relative bg-white rounded-xl shadow-xl w-96 mx-4">
      <EntityModalHeader initialData={initialData} />
      {renderContent()}
      <EntityModalFooter />
    </div>
  );
};

export default EntityModalContent;