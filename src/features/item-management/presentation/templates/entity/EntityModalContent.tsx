import React, { useState } from "react";
import Button from "@/components/button";
import { FaHistory, FaArrowLeft } from "react-icons/fa";
import { useEntityModal } from "../../../shared/contexts/EntityModalContext";
import { EntityFormFields } from "../../molecules";
import { HistoryListContent } from "../../organisms";
import type { EntityData } from "../../../shared/types";

interface EntityModalContentProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  initialData?: EntityData | null;
}

const EntityModalHeader: React.FC<{ initialData?: EntityData | null }> = ({
  initialData,
}) => {
  const { ui, uiActions } = useEntityModal();
  const { isEditMode, entityName, formattedUpdateAt, mode } = ui;
  const { goBack } = uiActions;

  // Map entityName to database table name
  const getEntityTable = (entityName: string): string => {
    const tableMap: Record<string, string> = {
      Item: "items",
      Kategori: "item_categories",
      "Jenis Item": "item_types",
      Satuan: "item_units",
      Sediaan: "item_dosages",
    };
    return tableMap[entityName] || "items";
  };

  const getTitle = () => {
    switch (mode) {
      case "history":
        return `Riwayat Perubahan`;
      case "edit":
        return `Edit ${entityName}`;
      case "add":
      default:
        return `Tambah ${entityName} Baru`;
    }
  };

  const showBackButton = mode === "history";
  const showHistoryButton =
    (mode === "add" || mode === "edit") && isEditMode && initialData?.id;

  return (
    <div className="flex justify-between items-center p-4 border-b-2 border-gray-200 bg-gray-100 rounded-t-xl">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button
            variant="text"
            onClick={goBack}
            className="text-gray-600 hover:text-gray-800 p-1 flex items-center"
          >
            <FaArrowLeft size={16} />
          </Button>
        )}
        <h2 className="text-xl font-semibold">{getTitle()}</h2>
      </div>
      <div className="flex items-center gap-2">
        {showHistoryButton && (
          <Button
            variant="text"
            onClick={() =>
              uiActions.openHistory(getEntityTable(entityName), initialData.id)
            }
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

const EntityModalFooter: React.FC<{
  compareMode?: boolean;
  onModeToggle?: () => void;
}> = ({ compareMode = false, onModeToggle }) => {
  const { form, ui, action, formActions, uiActions } = useEntityModal();
  const { isDirty, isValid } = form;
  const { isEditMode, mode } = ui;
  const { isLoading, isDeleting } = action;
  const { handleSubmit, handleDelete } = formActions;
  const { handleClose } = uiActions;

  const isDisabled = isLoading || !isValid || (isEditMode && !isDirty);

  // Special footer for history mode with toggle button
  if (mode === "history") {
    return (
      <div className="flex justify-between items-center p-4 border-t-2 border-gray-200 rounded-b-lg">
        <div>
          <Button type="button" variant="text" onClick={onModeToggle}>
            {compareMode ? "Single View" : "Compare Mode"}
          </Button>
        </div>
        <Button type="button" variant="text" onClick={handleClose}>
          Tutup
        </Button>
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

const EntityModalContent: React.FC<EntityModalContentProps> = ({
  nameInputRef,
  initialData,
}) => {
  const { ui, uiActions } = useEntityModal();
  const { mode } = ui;
  const [compareMode, setCompareMode] = useState(false);

  const handleModeToggle = () => {
    // Close comparison modal when switching modes
    uiActions.closeComparison();
    setCompareMode(!compareMode);
  };

  const renderContent = () => {
    switch (mode) {
      case "history":
        return <HistoryListContent compareMode={compareMode} />;
      case "add":
      case "edit":
      default:
        return (
          <EntityFormFields
            nameInputRef={nameInputRef}
          />
        );
    }
  };

  // Consistent width for all entity modals
  const modalWidth = "w-96";

  return (
    <div
      className={`relative bg-white rounded-xl shadow-xl ${modalWidth} mx-4`}
    >
      <EntityModalHeader initialData={initialData} />
      {renderContent()}
      <EntityModalFooter
        compareMode={compareMode}
        onModeToggle={handleModeToggle}
      />
    </div>
  );
};

export default EntityModalContent;
