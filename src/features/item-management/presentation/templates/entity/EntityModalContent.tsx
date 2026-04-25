import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Button from '@/components/button';
import { TbArrowLeft, TbHistory } from 'react-icons/tb';
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
      'Satuan Ukur': 'item_units',
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
    <div className="flex justify-between items-center p-4 border-b-2 border-slate-200 bg-slate-100 rounded-t-xl">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button
            variant="text"
            onClick={goBack}
            className="text-slate-600 hover:text-slate-800 p-1 flex items-center"
          >
            <TbArrowLeft size={16} />
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
            className="text-slate-500 hover:text-primary flex items-center transition-colors p-2"
            title={`Lihat riwayat perubahan ${entityName} (Terakhir diubah: ${formattedUpdateAt})`}
          >
            <TbHistory size={16} />
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
  const submitLabel = 'Simpan';

  // Special footer for history mode with toggle button
  if (mode === 'history') {
    return (
      <div className="flex justify-between items-center p-4 border-t-2 border-slate-200 rounded-b-lg">
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
    <div className="flex justify-between p-4 border-t-2 border-slate-200 rounded-b-lg">
      <div>
        {isEditMode && handleDelete ? (
          <Button
            type="button"
            variant="text-danger"
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
          {submitLabel}
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
  const { mode, isOpen } = ui;
  const [compareMode, setCompareMode] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousModeRef = useRef(mode);
  const latestModeRef = useRef(mode);
  const canAnimateModeResizeRef = useRef(false);
  const previousHeightRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openSettledTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isResizing, setIsResizing] = useState(false);
  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);

  latestModeRef.current = mode;

  useEffect(() => {
    previousModeRef.current = latestModeRef.current;
    canAnimateModeResizeRef.current = false;
    previousHeightRef.current = null;
    setAnimatedHeight(null);
    setIsResizing(false);

    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
    if (openSettledTimeoutRef.current) {
      clearTimeout(openSettledTimeoutRef.current);
      openSettledTimeoutRef.current = null;
    }

    if (!isOpen) return;

    openSettledTimeoutRef.current = setTimeout(() => {
      previousModeRef.current = latestModeRef.current;
      previousHeightRef.current =
        modalRef.current?.getBoundingClientRect().height ?? null;
      canAnimateModeResizeRef.current = true;
      openSettledTimeoutRef.current = null;
    }, 260);
  }, [isOpen]);

  useLayoutEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const currentHeight = modalElement.getBoundingClientRect().height;
    const previousHeight = previousHeightRef.current;
    const didModeChange = previousModeRef.current !== mode;

    previousModeRef.current = mode;
    previousHeightRef.current = currentHeight;

    if (
      !didModeChange ||
      !isOpen ||
      !canAnimateModeResizeRef.current ||
      previousHeight === null ||
      Math.abs(previousHeight - currentHeight) < 1
    ) {
      return;
    }

    setIsResizing(true);
    setAnimatedHeight(previousHeight);

    requestAnimationFrame(() => {
      setAnimatedHeight(currentHeight);

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        setIsResizing(false);
        setAnimatedHeight(null);
        previousHeightRef.current =
          modalRef.current?.getBoundingClientRect().height ?? currentHeight;
        resizeTimeoutRef.current = null;
      }, 240);
    });
  }, [mode, isOpen]);

  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (openSettledTimeoutRef.current) {
        clearTimeout(openSettledTimeoutRef.current);
      }
    };
  }, []);

  // Use getDerivedStateFromProps to track mode changes
  const [modeTracker, setModeTracker] = useState<{
    mode: string;
    prevMode: string | null;
    hasChanged: boolean;
  }>({
    mode,
    prevMode: null,
    hasChanged: false,
  });
  if (mode !== modeTracker.mode) {
    const hasChanged = modeTracker.prevMode !== null;
    setModeTracker({ mode, prevMode: modeTracker.mode, hasChanged });
  }
  const hasModeChanged = modeTracker.hasChanged;

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

  const hasAnimated = hasModeChanged;

  return (
    <motion.div
      ref={modalRef}
      className={`relative bg-white rounded-xl shadow-xl ${modalWidth} mx-4 ${
        isResizing
          ? 'overflow-hidden transition-[height] duration-[220ms] ease-in-out'
          : ''
      }`}
      style={{
        height: animatedHeight === null ? undefined : animatedHeight,
      }}
    >
      <div>
        <EntityModalHeader initialData={initialData} />
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={mode}
          variants={selectedVariants}
          initial={hasAnimated ? 'hidden' : false}
          animate="visible"
          exit={hasAnimated ? 'exit' : undefined}
          transition={{ duration: 0.2 }}
          className={`transition-opacity duration-150 ease-out ${
            isResizing ? 'opacity-80' : 'opacity-100'
          }`}
          style={{ position: 'relative' }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      <div>
        <EntityModalFooter
          compareMode={compareMode}
          onModeToggle={handleModeToggle}
        />
      </div>
    </motion.div>
  );
};

export default EntityModalContent;
