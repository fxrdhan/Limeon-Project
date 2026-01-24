import React, { useRef, useState } from 'react';
import { TbArrowBackUp, TbX } from 'react-icons/tb';
import { CardHeader, CardTitle } from '@/components/card';
import Button from '@/components/button';
import ItemHistoryPortal from './ItemHistoryPortal';

interface HistoryItem {
  id: string;
  version_number: number;
  changed_at: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_data: Record<string, unknown>;
  user_name?: string | null;
}

interface LocalItemFormHeaderProps {
  isEditMode: boolean;
  formattedUpdateAt?: string;
  isClosing: boolean;
  onReset?: () => void;
  onClose: () => void;
  itemName?: string;
  // History portal props
  history?: HistoryItem[] | null;
  isHistoryLoading?: boolean;
  selectedVersion?: number | null;
  currentVersion?: number;
  onVersionSelect?: (
    version: number,
    entityData: Record<string, unknown>
  ) => void;
  entityId?: string;
}

const ItemFormHeader: React.FC<LocalItemFormHeaderProps> = React.memo(
  ({
    isEditMode,
    formattedUpdateAt,
    isClosing,
    onReset,
    onClose,
    history,
    isHistoryLoading = false,
    selectedVersion,
    currentVersion,
    onVersionSelect,
    entityId,
  }) => {
    const timestampButtonRef = useRef<HTMLButtonElement>(null);
    const [isPortalOpen, setIsPortalOpen] = useState(false);

    const handleTimestampClick = () => {
      setIsPortalOpen(!isPortalOpen);
    };

    return (
      <>
        <CardHeader className="flex items-center justify-between sticky z-10 py-5! px-4! border-b-2 border-gray-200 mb-6">
          {/* Left section - empty placeholder for symmetry */}
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
            {isEditMode && formattedUpdateAt && formattedUpdateAt !== '-' && (
              <Button
                ref={timestampButtonRef}
                variant="text"
                size="sm"
                onClick={handleTimestampClick}
                className="text-sm text-gray-500 hover:text-blue-600 italic whitespace-nowrap flex items-center transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                title="Lihat riwayat perubahan"
                tabIndex={-1}
              >
                {formattedUpdateAt}
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
                <TbArrowBackUp className="mr-1.5" size={12} /> Reset All
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
              <TbX size={18} />
            </Button>
          </div>
        </CardHeader>

        {/* History Portal */}
        {isEditMode && onVersionSelect && (
          <ItemHistoryPortal
            isOpen={isPortalOpen}
            onClose={() => setIsPortalOpen(false)}
            history={history || null}
            isLoading={isHistoryLoading}
            selectedVersion={selectedVersion || null}
            currentVersion={currentVersion}
            onVersionSelect={onVersionSelect}
            triggerRef={timestampButtonRef as React.RefObject<HTMLElement>}
            entityId={entityId}
          />
        )}
      </>
    );
  }
);

ItemFormHeader.displayName = 'ItemFormHeader';

export default ItemFormHeader;
