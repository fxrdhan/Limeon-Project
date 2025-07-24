import { FaHistory, FaUndoAlt, FaTimes } from "react-icons/fa";
import { CardHeader, CardTitle } from "@/components/card";
import Button from "@/components/button";

interface ItemFormHeaderProps {
  isEditMode: boolean;
  formattedUpdateAt?: string;
  isClosing: boolean;
  onReset?: () => void;
  onClose: () => void;
}

export default function ItemFormHeader({
  isEditMode,
  formattedUpdateAt,
  isClosing,
  onReset,
  onClose,
}: ItemFormHeaderProps) {
  return (
    <CardHeader className="flex items-center justify-between sticky z-10 py-5! px-4! border-b-2 border-gray-200 mb-6">
      <div className="flex items-center"></div>

      <div className="absolute left-1/2 transform -translate-x-1/2">
        <CardTitle>
          {isEditMode ? "Edit Data Item" : "Tambah Data Item Baru"}
        </CardTitle>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        {isEditMode && formattedUpdateAt && formattedUpdateAt !== "-" && (
          <span className="text-sm text-gray-500 italic whitespace-nowrap flex items-center">
            <FaHistory className="mr-1" size={12} />
            {formattedUpdateAt}
          </span>
        )}
        {!isEditMode && onReset && (
          <Button
            variant="text"
            size="md"
            onClick={onReset}
            className="text-gray-600 hover:text-orange-600 flex items-center"
            title="Reset Form"
          >
            <FaUndoAlt className="mr-1.5" size={12} /> Reset All
          </Button>
        )}
        <Button
          variant="text"
          size="sm"
          onClick={() => {
            if (!isClosing) {
              onClose();
            }
          }}
          className="p-2"
          title="Tutup"
        >
          <FaTimes size={18} />
        </Button>
      </div>
    </CardHeader>
  );
}