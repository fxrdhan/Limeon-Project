import React from "react";
import Button from "@/components/button";
import { useEntityModal } from "@/contexts/EntityModalContext";

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

export default EntityModalFooter;