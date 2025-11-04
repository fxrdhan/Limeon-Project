import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/button';
import { FaHistory, FaArrowLeft } from 'react-icons/fa';
import { useEntityModal } from '../../../shared/contexts/EntityModalContext';
import { EntityFormFields } from '../../molecules';
import { HistoryListContent } from '../../organisms';
import type { EntityData } from '../../../shared/types';

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
      Item: 'items',
      Kategori: 'item_categories',
      'Jenis Item': 'item_types',
      Kemasan: 'item_packages',
      Sediaan: 'item_dosages',
      Produsen: 'item_manufacturers',
      Satuan: 'item_units',
    };
    return tableMap[entityName] || 'items';
  };

  const getTitle = () => {
    switch (mode) {
      case 'history':
        return `Riwayat Perubahan`;
      case 'edit':
        return `Edit ${entityName}`;
      case 'add':
      default:
        return `Tambah ${entityName} Baru`;
    }
  };

  const showBackButton = mode === 'history';
  const showHistoryButton =
    (mode === 'add' || mode === 'edit') && isEditMode && initialData?.id;

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
            className="text-gray-500 hover:text-primary flex items-center transition-colors p-2"
            title={`Lihat riwayat perubahan ${entityName} (Terakhir diubah: ${formattedUpdateAt})`}
          >
            <FaHistory size={16} />
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
  if (mode === 'history') {
    return (
      <div className="flex justify-between items-center p-4 border-t-2 border-gray-200 rounded-b-lg">
        <div>
          <Button type="button" variant="text" onClick={onModeToggle}>
            {compareMode ? 'Single View' : 'Compare Mode'}
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
          {isEditMode ? 'Update' : 'Simpan'}
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
  const prevModeRef = useRef<string | null>(null);
  const hasModeChangedRef = useRef(false);

  // Track direction based on mode transition
  useEffect(() => {
    if (prevModeRef.current === null) {
      // First render - initialize without marking as changed
      prevModeRef.current = mode;
      return;
    }

    // Mode has actually changed
    if (prevModeRef.current !== mode) {
      hasModeChangedRef.current = true;
    }

    prevModeRef.current = mode;
  }, [mode]);

  // Determine animation variants based on current mode
  // History: always slide from/to right
  // Form (add/edit): always slide from/to left
  const getContentVariants = (currentMode: string) => {
    if (currentMode === 'history') {
      return {
        hidden: { opacity: 0, x: 20 }, // History enters from right
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 }, // History exits to right
      };
    } else {
      return {
        hidden: { opacity: 0, x: -20 }, // Form enters from left
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }, // Form exits to left
      };
    }
  };

  const selectedVariants = getContentVariants(mode);

  const handleModeToggle = () => {
    // Close comparison modal when switching modes
    uiActions.closeComparison();
    setCompareMode(!compareMode);
  };

  const renderContent = () => {
    switch (mode) {
      case 'history':
        return <HistoryListContent compareMode={compareMode} />;
      case 'add':
      case 'edit':
      default:
        return <EntityFormFields nameInputRef={nameInputRef} />;
    }
  };

  // Consistent width for all entity modals
  const modalWidth = 'w-[340px]';

  const hasAnimated = hasModeChangedRef.current;

  return (
    <motion.div
      className={`relative bg-white rounded-xl shadow-xl ${modalWidth} mx-4`}
      layout={hasAnimated}
      layoutDependency={mode}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
    >
      <EntityModalHeader initialData={initialData} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          variants={selectedVariants}
          initial={hasAnimated ? 'hidden' : false}
          animate="visible"
          exit={hasAnimated ? 'exit' : undefined}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      <EntityModalFooter
        compareMode={compareMode}
        onModeToggle={handleModeToggle}
      />
    </motion.div>
  );
};

export default EntityModalContent;
