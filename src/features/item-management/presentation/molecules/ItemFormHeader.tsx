import React, { useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import {
  TbArrowBackUp,
  TbHistoryToggle,
  TbRotate2,
  TbRotateClockwise,
  TbX,
} from 'react-icons/tb';
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
  onVersionDeselect?: () => void;
  entityId?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const ItemFormHeader: React.FC<LocalItemFormHeaderProps> = React.memo(
  ({
    isEditMode,
    isClosing,
    onReset,
    onClose,
    history,
    isHistoryLoading = false,
    selectedVersion,
    currentVersion,
    onVersionSelect,
    onVersionDeselect,
    entityId,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
  }) => {
    const timestampButtonRef = useRef<HTMLButtonElement>(null);
    const [isPortalOpen, setIsPortalOpen] = useState(false);

    const handleTimestampClick = () => {
      setIsPortalOpen(!isPortalOpen);
    };

    return (
      <LayoutGroup id="item-history-portal">
        <CardHeader className="flex items-center justify-between sticky z-10 py-5! px-4! border-b-2 border-slate-200 mb-6">
          {/* Left section */}
          <div className="flex items-center space-x-1">
            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onUndo}
              disabled={!canUndo}
              className="flex !h-9 !w-9 items-center justify-center !rounded-lg !p-0 !text-black transition-colors hover:bg-slate-100 disabled:!text-slate-300 disabled:hover:bg-transparent"
              aria-label="Undo"
            >
              <TbRotate2 size={18} />
            </Button>
            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onRedo}
              disabled={!canRedo}
              className="flex !h-9 !w-9 items-center justify-center !rounded-lg !p-0 !text-black transition-colors hover:bg-slate-100 disabled:!text-slate-300 disabled:hover:bg-transparent"
              aria-label="Redo"
            >
              <TbRotateClockwise size={18} />
            </Button>
          </div>

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
            {isEditMode && (
              <Button
                ref={timestampButtonRef}
                variant="text"
                size="sm"
                onClick={handleTimestampClick}
                withUnderline={false}
                className="flex !h-9 !w-9 items-center justify-center !rounded-lg !p-0 !text-black transition-colors hover:bg-slate-100 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                aria-label="Buka riwayat perubahan"
                tabIndex={-1}
              >
                {isPortalOpen ? (
                  <span className="inline-flex opacity-0" aria-hidden="true">
                    <TbHistoryToggle size={18} />
                  </span>
                ) : (
                  <motion.span
                    layoutId="item-history-action-icon"
                    className="inline-flex items-center"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 34,
                    }}
                  >
                    <TbHistoryToggle size={18} />
                  </motion.span>
                )}
              </Button>
            )}
            {!isEditMode && onReset && (
              <Button
                variant="text"
                size="md"
                onClick={onReset}
                className="text-slate-600 hover:text-orange-600 flex items-center"
                title="Ctrl+Shift+R"
              >
                <TbArrowBackUp className="mr-1.5" size={12} /> Reset All
              </Button>
            )}
            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={() => {
                if (!isClosing) {
                  onClose();
                }
              }}
              className="flex !h-9 !w-9 items-center justify-center !rounded-lg !p-0 !text-black hover:bg-slate-100"
              aria-label="Tutup"
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
            onVersionDeselect={onVersionDeselect}
            triggerRef={timestampButtonRef as React.RefObject<HTMLElement>}
            entityId={entityId}
          />
        )}
      </LayoutGroup>
    );
  }
);

ItemFormHeader.displayName = 'ItemFormHeader';

export default ItemFormHeader;
