import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { formatDateTime } from "@/lib/formatters";
import type { EntityModalContextValue, ModalMode, VersionData } from "../contexts/EntityModalContext";

interface EntityData {
  id?: string;
  name: string;
  description?: string;
  updated_at?: string | null;
}

interface UseEntityModalLogicProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id?: string; name: string; description: string }) => Promise<void>;
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<ModalMode>('add');
  const [historyData, setHistoryData] = useState({
    entityTable: '',
    entityId: '',
    selectedVersion: undefined as VersionData | undefined,
  });
  const [comparisonData, setComparisonData] = useState({
    isOpen: false,
    selectedVersion: undefined as VersionData | undefined,
  });
  const [previousMode, setPreviousMode] = useState<ModalMode>('add');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const isEditMode = Boolean(initialData);
  const formattedUpdateAt = formatDateTime(initialData?.updated_at);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!isEditMode) return true;
    return (
      name !== (initialData?.name || "") ||
      description !== (initialData?.description || "")
    );
  }, [name, description, isEditMode, initialData]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return name.trim().length > 0;
  }, [name]);

  // Form actions
  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
  }, []);

  // Initialize mode when modal opens
  useEffect(() => {
    if (isOpen) {
      const newMode = initialData ? 'edit' : 'add';
      setMode(newMode);
      setPreviousMode(newMode);
    }
  }, [isOpen, initialData]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || "");
      } else if (initialNameFromSearch) {
        setName(initialNameFromSearch);
        setDescription("");
      } else {
        resetForm();
      }
      // Focus on name input after modal opens (only for form modes)
      if (mode === 'add' || mode === 'edit') {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, initialData, initialNameFromSearch, resetForm, mode]);

  // Reset comparison data when modal closes
  useEffect(() => {
    if (!isOpen && comparisonData.isOpen) {
      setComparisonData({
        isOpen: false,
        selectedVersion: undefined,
      });
    }
  }, [isOpen, comparisonData.isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      alert(`Nama ${entityName.toLowerCase()} tidak boleh kosong.`);
      return;
    }
    await onSubmit({ 
      id: initialData?.id, 
      name: name.trim(), 
      description: description.trim() 
    });
  }, [name, description, isValid, entityName, onSubmit, initialData]);

  const handleDelete = useCallback(() => {
    if (initialData?.id && onDelete) {
      onDelete(initialData.id);
    }
  }, [initialData, onDelete]);

  // History actions
  const openHistory = useCallback((entityTable: string, entityId: string) => {
    setPreviousMode(mode);
    setMode('history');
    setHistoryData({
      entityTable,
      entityId,
      selectedVersion: undefined,
    });
  }, [mode]);

  const openVersionDetail = useCallback((version: VersionData) => {
    setMode('version-detail');
    setHistoryData(prev => ({
      ...prev,
      selectedVersion: version,
    }));
  }, []);

  const openComparison = useCallback((version: VersionData) => {
    setComparisonData({
      isOpen: true,
      selectedVersion: version,
    });
  }, []);

  const closeComparison = useCallback(() => {
    setComparisonData({
      isOpen: false,
      selectedVersion: undefined,
    });
  }, []);

  const goBack = useCallback(() => {
    // Close comparison modal when going back
    setComparisonData({
      isOpen: false,
      selectedVersion: undefined,
    });
    
    if (mode === 'version-detail') {
      setMode('history');
      setHistoryData(prev => ({
        ...prev,
        selectedVersion: undefined,
      }));
    } else if (mode === 'history') {
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

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Create context value
  const contextValue: EntityModalContextValue = {
    form: {
      name,
      description,
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
    },
    formActions: {
      setName,
      setDescription,
      handleSubmit,
      handleDelete,
      resetForm,
    },
    uiActions: {
      handleClose,
      handleBackdropClick,
      setMode,
      openHistory,
      openVersionDetail,
      openComparison,
      closeComparison,
      goBack,
    },
  };

  return {
    contextValue,
    nameInputRef,
  };
};