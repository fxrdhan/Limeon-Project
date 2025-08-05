import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatDateTime } from '@/lib/formatters';
import type {
  EntityModalContextValue,
  ModalMode,
  VersionData,
} from '../../../shared/contexts/EntityModalContext';
import type { EntityData } from '../../../shared/types';

interface UseEntityModalLogicProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    kode?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => void;
  initialData?: EntityData | null;
  initialNameFromSearch?: string;
  entityName: string;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export const useEntityModalLogic = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  initialNameFromSearch,
  entityName,
  isLoading = false,
  isDeleting = false,
}: UseEntityModalLogicProps) => {
  const [kode, setKode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [mode, setMode] = useState<ModalMode>('add');
  const [historyData, setHistoryData] = useState({
    entityTable: '',
    entityId: '',
    selectedVersion: undefined as VersionData | undefined,
  });
  const [comparisonData, setComparisonData] = useState({
    isOpen: false,
    selectedVersion: undefined as VersionData | undefined,
    isDualMode: false,
    versionA: undefined as VersionData | undefined,
    versionB: undefined as VersionData | undefined,
    isFlipped: false,
  });
  const [previousMode, setPreviousMode] = useState<ModalMode>('add');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(initialData);
  const formattedUpdateAt = formatDateTime(initialData?.updated_at);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!isEditMode) return true;
    
    // Handle field name mapping: database uses 'code' but form uses 'kode'
    const initialKode = initialData?.kode || (initialData as EntityData & { code?: string })?.code || '';
    
    return (
      kode !== initialKode ||
      name !== (initialData?.name || '') ||
      description !== (initialData?.description || '') ||
      address !== (initialData?.address || '')
    );
  }, [kode, name, description, address, isEditMode, initialData]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return kode.trim().length > 0 && name.trim().length > 0;
  }, [kode, name]);

  // Form actions
  const resetForm = useCallback(() => {
    setKode('');
    setName('');
    setDescription('');
    setAddress('');
  }, []);

  // Initialize mode and form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const newMode = initialData ? 'edit' : 'add';
      setMode(newMode);
      setPreviousMode(newMode);

      if (initialData) {
        // Handle field name mapping: database uses 'code' but form uses 'kode'
        setKode(initialData.kode || (initialData as EntityData & { code?: string }).code || '');
        setName(initialData.name);
        setDescription(initialData.description || '');
        setAddress(initialData.address || '');
      } else if (initialNameFromSearch) {
        setKode('');
        setName(initialNameFromSearch);
        setDescription('');
        setAddress('');
      } else {
        resetForm();
      }

      // Focus on name input after modal opens (only for form modes)
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialData, initialNameFromSearch, resetForm]);

  // Reset comparison data when modal closes
  useEffect(() => {
    if (!isOpen && comparisonData.isOpen) {
      setComparisonData({
        isOpen: false,
        selectedVersion: undefined,
        isDualMode: false,
        versionA: undefined,
        versionB: undefined,
        isFlipped: false,
      });
    }
  }, [isOpen, comparisonData.isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      alert(`Kode dan nama ${entityName.toLowerCase()} tidak boleh kosong.`);
      return;
    }
    const submitData: {
      id?: string;
      kode?: string;
      code?: string;
      name: string;
      fda_code?: string;
      description?: string;
      address?: string;
    } = {
      id: initialData?.id,
      // Include both kode and code for backward compatibility
      kode: kode.trim(),
      code: kode.trim(),
      name: name.trim(),
    };

    if (description.trim()) {
      submitData.description = description.trim();
    }

    if (address.trim()) {
      submitData.address = address.trim();
    }

    await onSubmit(submitData);
  }, [
    kode,
    name,
    description,
    address,
    isValid,
    entityName,
    onSubmit,
    initialData,
  ]);

  const handleDelete = useCallback(() => {
    if (initialData?.id && onDelete) {
      onDelete(initialData.id);
    }
  }, [initialData, onDelete]);

  // History actions
  const openHistory = useCallback(
    (entityTable: string, entityId: string) => {
      setPreviousMode(mode);
      setMode('history');
      setHistoryData({
        entityTable,
        entityId,
        selectedVersion: undefined,
      });
    },
    [mode]
  );

  const selectVersion = useCallback((version: VersionData) => {
    setHistoryData(prev => ({
      ...prev,
      selectedVersion: version,
    }));
  }, []);

  const closeHistory = useCallback(() => {
    setMode(previousMode);
    setHistoryData({
      entityTable: '',
      entityId: '',
      selectedVersion: undefined,
    });
  }, [previousMode]);

  const openComparison = useCallback((version: VersionData) => {
    setComparisonData({
      isOpen: true,
      selectedVersion: version,
      isDualMode: false,
      versionA: undefined,
      versionB: undefined,
      isFlipped: false,
    });
  }, []);

  const openDualComparison = useCallback(
    (versionA: VersionData, versionB: VersionData) => {
      setComparisonData({
        isOpen: true,
        selectedVersion: undefined,
        isDualMode: true,
        versionA,
        versionB,
        isFlipped: false,
      });
    },
    []
  );

  const flipVersions = useCallback(() => {
    setComparisonData(prev => ({
      ...prev,
      isFlipped: !prev.isFlipped,
    }));
  }, []);

  const closeComparison = useCallback(() => {
    setComparisonData({
      isOpen: false,
      selectedVersion: undefined,
      isDualMode: false,
      versionA: undefined,
      versionB: undefined,
      isFlipped: false,
    });
  }, []);

  const goBack = useCallback(() => {
    // Close comparison modal when going back
    setComparisonData({
      isOpen: false,
      selectedVersion: undefined,
      isDualMode: false,
      versionA: undefined,
      versionB: undefined,
      isFlipped: false,
    });

    if (mode === 'history') {
      setMode(previousMode);
      setHistoryData({
        entityTable: '',
        entityId: '',
        selectedVersion: undefined,
      });
    }
  }, [mode, previousMode]);

  // UI actions
  const handleClose = useCallback(() => {
    // Close comparison modal first if it's open
    if (comparisonData.isOpen) {
      closeComparison();
    }
    onClose();
  }, [onClose, comparisonData.isOpen, closeComparison]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Create context value
  const contextValue: EntityModalContextValue = {
    form: {
      kode,
      name,
      description,
      address,
      isDirty,
      isValid,
    },
    ui: {
      isOpen,
      isEditMode,
      entityName,
      formattedUpdateAt,
      mode,
    },
    action: {
      isLoading,
      isDeleting,
    },
    history: {
      entityTable: historyData.entityTable,
      entityId: historyData.entityId,
      selectedVersion: historyData.selectedVersion,
    },
    comparison: {
      isOpen: comparisonData.isOpen,
      selectedVersion: comparisonData.selectedVersion,
      isDualMode: comparisonData.isDualMode,
      versionA: comparisonData.versionA,
      versionB: comparisonData.versionB,
      isFlipped: comparisonData.isFlipped,
    },
    formActions: {
      setKode,
      setName,
      setDescription,
      setAddress,
      handleSubmit,
      handleDelete,
      resetForm,
    },
    uiActions: {
      handleClose,
      handleBackdropClick,
      setMode,
      openHistory,
      closeHistory,
      selectVersion,
      openComparison,
      closeComparison,
      openDualComparison,
      flipVersions,
      goBack,
    },
  };

  return {
    contextValue,
    nameInputRef,
  };
};
