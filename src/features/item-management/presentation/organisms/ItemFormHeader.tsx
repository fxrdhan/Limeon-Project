import React from 'react';
import { FaUndoAlt, FaTimes, FaArrowLeft, FaHistory } from 'react-icons/fa';
import { CardHeader, CardTitle } from '@/components/card';
import Button from '@/components/button';

interface LocalItemFormHeaderProps {
  isEditMode: boolean;
  formattedUpdateAt?: string;
  isClosing: boolean;
  onReset?: () => void;
  onClose: () => void;
  onHistoryClick?: () => void;
  isHistoryMode?: boolean;
  onBackToForm?: () => void;
  itemName?: string;
}

const ItemFormHeader: React.FC<LocalItemFormHeaderProps> = React.memo(
  ({
    isEditMode,
    formattedUpdateAt,
    isClosing,
    onReset,
    onClose,
    onHistoryClick,
    isHistoryMode = false,
    onBackToForm,
    itemName,
  }) => {
    return (
      <CardHeader className="flex items-center justify-between sticky z-10 py-5! px-4! border-b-2 border-gray-200 mb-6">
        {/* Left section */}
        <div className="flex items-center">
          {isHistoryMode && onBackToForm && (
            <Button
              variant="text"
              onClick={onBackToForm}
              className="text-gray-600 hover:text-gray-800 p-1 flex items-center mr-2"
              title="Kembali ke form"
            >
              <FaArrowLeft size={16} />
            </Button>
          )}
        </div>

        {/* Center title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <CardTitle>
            {isHistoryMode ? (
              <div className="flex items-center gap-2">
                <FaHistory className="text-gray-600" />
                <span>Riwayat Perubahan {itemName || 'Item'}</span>
              </div>
            ) : (
              <span>
                {isEditMode ? 'Edit Data Item' : 'Tambah Data Item Baru'}
              </span>
            )}
          </CardTitle>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-1 shrink-0">
          {!isHistoryMode &&
            isEditMode &&
            formattedUpdateAt &&
            formattedUpdateAt !== '-' && (
              <Button
                variant="text"
                size="sm"
                onClick={onHistoryClick}
                className="text-sm text-gray-500 hover:text-blue-600 italic whitespace-nowrap flex items-center transition-colors"
                title="Lihat riwayat perubahan"
              >
                {formattedUpdateAt}
              </Button>
            )}
          {!isHistoryMode && !isEditMode && onReset && (
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
);

ItemFormHeader.displayName = 'ItemFormHeader';

export default ItemFormHeader;
