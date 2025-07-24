import React from "react";
import Button from "@/components/button";
import { FaSpinner } from "react-icons/fa";
import { useDetailModalContext } from "@/contexts/DetailModalContext";

const DetailModalFooter: React.FC = () => {
  const {
    mode,
    isSubmitting,
    localData,
    onDeleteRequest,
    deleteButtonLabel,
    handleSaveAll,
    handleCloseModal,
  } = useDetailModalContext();

  if (mode === "edit") {
    return (
      <div className="p-4 border-t flex justify-between items-center bg-white">
        {onDeleteRequest && (
          <Button
            variant="danger"
            onClick={() => onDeleteRequest(localData)}
          >
            {deleteButtonLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="text"
          onClick={handleCloseModal}
        >
          Tutup
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t flex justify-between items-center bg-white">
      <Button
        type="button"
        variant="text"
        onClick={handleCloseModal}
      >
        Batal
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSaveAll}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <FaSpinner className="animate-spin mr-2" />
            Menyimpan...
          </span>
        ) : (
          "Simpan"
        )}
      </Button>
    </div>
  );
};

export default DetailModalFooter;