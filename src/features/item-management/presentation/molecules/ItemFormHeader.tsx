import React from 'react';
import { FaUndoAlt, FaTimes, FaHistory } from 'react-icons/fa';
import { CardHeader, CardTitle } from '@/components/card';
import Button from '@/components/button';

interface LocalItemFormHeaderProps {
  isEditMode: boolean;
  formattedUpdateAt?: string;
  isClosing: boolean;
  onReset?: () => void;
  onClose: () => void;
  onHistoryClick?: () => void;
  isHistoryPanelOpen?: boolean;
}

const ItemFormHeader: React.FC<LocalItemFormHeaderProps> = React.memo(
  ({
    isEditMode,
    formattedUpdateAt,
    isClosing,
    onReset,
    onClose,
    onHistoryClick,
    isHistoryPanelOpen = false,
  }) => {
    return (
      <CardHeader className="flex items-center justify-between sticky z-10 py-5! px-4! border-b-2 border-gray-200 mb-6">
        {/* Left section - empty for symmetry */}
        <div className="flex items-center" />

        {/* Center title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <CardTitle>
            <span>
              {isEditMode ? 'Edit Data Item' : 'Tambah Data Item Baru'}
            </span>
          </CardTitle>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-1 shrink-0">
          {isEditMode && onHistoryClick && (
            <Button
              variant="text"
              size="sm"
              onClick={onHistoryClick}
              className={`p-2 transition-colors ${
                isHistoryPanelOpen
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
              title={
                isHistoryPanelOpen
                  ? 'Tutup riwayat perubahan'
                  : `Lihat riwayat perubahan${formattedUpdateAt && formattedUpdateAt !== '-' ? ` (${formattedUpdateAt})` : ''}`
              }
            >
              <FaHistory size={18} />
            </Button>
          )}
          {!isEditMode && onReset && (
            <Button
              variant="text"
              size="md"
              onClick={onReset}
              className="text-gray-600 hover:text-orange-600 flex items-center"
              title="Ctrl+Shift+R"
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
