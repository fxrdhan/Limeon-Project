import React from "react";
import Button from "@/components/button";
import { FaTimes, FaHistory } from "react-icons/fa";
import { useEntityModal } from "../../contexts/EntityModalContext";

const EntityModalHeader: React.FC = () => {
  const { ui, uiActions } = useEntityModal();
  const { isEditMode, entityName, formattedUpdateAt } = ui;

  return (
    <div className="flex justify-between items-center p-4 border-b-2 border-gray-200 bg-gray-100 rounded-t-xl">
      <div className="flex flex-col">
        <h2 className="text-xl font-semibold">
          {isEditMode ? `Edit ${entityName}` : `Tambah ${entityName} Baru`}
        </h2>
        {isEditMode && formattedUpdateAt !== "-" && (
          <span className="text-sm text-gray-500 italic flex items-center mt-1">
            <FaHistory className="mr-1" size={12} />
            {formattedUpdateAt}
          </span>
        )}
      </div>
      <Button variant="text" onClick={uiActions.handleClose}>
        <FaTimes size={20} />
      </Button>
    </div>
  );
};

export default EntityModalHeader;