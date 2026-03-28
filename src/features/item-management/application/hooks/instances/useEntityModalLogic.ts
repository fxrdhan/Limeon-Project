import { useEntityModalRealtime } from '@/hooks/realtime/useEntityModalRealtime';
import { formatDateTime } from '@/lib/formatters';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
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
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void> | void;
  initialData?: EntityData | null;
  initialNameFromSearch?: string;
  entityName: string;
  isLoading?: boolean;
  isDeleting?: boolean;
  // Pre-fetched history data for seamless UX
  historyState?: {
    data: Array<{
      id: string;
      version_number: number;
      action_type: 'INSERT' | 'UPDATE' | 'DELETE';
      changed_at: string;
      entity_data: Record<string, unknown>;
      changed_fields?: Record<string, { from: unknown; to: unknown }>;
    }> | null;
    isLoading: boolean;
    error: string | null;
  };
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
  historyState,
}: UseEntityModalLogicProps) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [mode, setMode] = useState<ModalMode>('add');
  const [isClosing, setIsClosing] = useState(false);
  const [historyData, setHistoryData] = useState({
    entityTable: '',
    entityId: '',
    selectedVersion: undefined as VersionData | undefined,
  });

  // Type for comparison data
  type ComparisonData = {
    isOpen: boolean;
    isClosing: boolean;
    selectedVersion: VersionData | undefined;
    isDualMode: boolean;
    versionA: VersionData | undefined;
    versionB: VersionData | undefined;
    isFlipped: boolean;
  };

  // Use getDerivedStateFromProps to reset comparisonData when modal closes
  const [comparisonState, setComparisonState] = useState<{
    modalOpen: boolean;
    data: ComparisonData;
  }>({
    modalOpen: false,
    data: {
      isOpen: false,
      isClosing: false,
      selectedVersion: undefined,
      isDualMode: false,
      versionA: undefined,
      versionB: undefined,
      isFlipped: false,
    },
  });
  if (
    isOpen !== comparisonState.modalOpen &&
    !isOpen &&
    comparisonState.data.isOpen
  ) {
    setComparisonState({
      modalOpen: isOpen,
      data: {
        isOpen: false,
        isClosing: false,
        selectedVersion: undefined,
        isDualMode: false,
        versionA: undefined,
        versionB: undefined,
        isFlipped: false,
      },
    });
  } else if (isOpen !== comparisonState.modalOpen) {
    setComparisonState(prev => ({ ...prev, modalOpen: isOpen }));
  }
  const comparisonData = comparisonState.data;
  const setComparisonData = useCallback(
    (updater: ComparisonData | ((prev: ComparisonData) => ComparisonData)) => {
      setComparisonState(prev => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      }));
    },
    []
  );
  const [previousMode, setPreviousMode] = useState<ModalMode>('add');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track last synchronized state from database (for realtime updates)
  // This represents the "truth" from database, not the stale initialData snapshot
  // Changed from ref to state to avoid ref access during render
  const [lastSyncedState, setLastSyncedState] = useState<{
    code: string;
    name: string;
    description: string;
    address: string;
  }>({
    code: '',
    name: '',
    description: '',
    address: '',
  });

  const isEditMode = Boolean(initialData);
  const formattedUpdateAt = formatDateTime(initialData?.updated_at);

  // Determine table name based on entity name
  const getTableName = useCallback((entity: string) => {
    switch (entity.toLowerCase()) {
      case 'kategori':
        return 'item_categories';
      case 'jenis item':
        return 'item_types';
      case 'kemasan':
        return 'item_packages';
      case 'sediaan':
        return 'item_dosages';
      case 'produsen':
        return 'item_manufacturers';
      default:
        return '';
    }
  }, []);

  const entityTable = getTableName(entityName);
  const entityId = initialData?.id || '';

  // Realtime sync callback - updates form state from realtime changes
  // ANTI-LOOP: This only updates local state, doesn't trigger save
  const handleRealtimeUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      // Update state based on changed fields
      if ('code' in updates && typeof updates.code === 'string') {
        setCode(updates.code);
      }
      if ('name' in updates && typeof updates.name === 'string') {
        setName(updates.name);
      }
      if ('description' in updates && typeof updates.description === 'string') {
        setDescription(updates.description);
      }
      if ('address' in updates && typeof updates.address === 'string') {
        setAddress(updates.address);
      }

      // ✨ Update last synced state (database state changed via realtime)
      // This ensures isDirty compares against latest database state, not stale initialData
      setLastSyncedState(prev => ({
        ...prev,
        ...(updates as {
          code?: string;
          name?: string;
          description?: string;
          address?: string;
        }),
      }));
    },
    [] // Empty deps - setters are stable
  );

  // Setup realtime sync for edit mode only
  const { smartFormSync } = useEntityModalRealtime({
    entityTable,
    entityId,
    enabled: isEditMode && isOpen, // Only in edit mode when modal is open
    onSmartUpdate: handleRealtimeUpdate,
    onEntityDeleted: () => {
      // Close modal if entity deleted from another source
      toast.error('Data telah dihapus dari sumber lain', {
        duration: 3000,
        icon: '⚠️',
      });
      setTimeout(() => {
        onClose();
      }, 1000);
    },
  });

  // Check if form is dirty (compares current form state vs last synced database state)
  // This correctly handles realtime updates - when database changes via realtime,
  // lastSyncedState updates, so isDirty remains FALSE unless USER makes changes
  const isDirty = useMemo(() => {
    if (!isEditMode) return true;

    return (
      code !== lastSyncedState.code ||
      name !== lastSyncedState.name ||
      description !== lastSyncedState.description ||
      address !== lastSyncedState.address
    );
  }, [code, name, description, address, isEditMode, lastSyncedState]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return code.trim().length > 0 && name.trim().length > 0;
  }, [code, name]);

  // Form actions
  const resetForm = useCallback(() => {
    setCode('');
    setName('');
    setDescription('');
    setAddress('');
  }, []);

  // Initialize mode and form data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsClosing(false); // Reset closing state when opening
        const newMode = initialData ? 'edit' : 'add';
        setMode(newMode);
        setPreviousMode(newMode);

        if (initialData) {
          // All tables now use 'code' field consistently
          setCode(initialData.code || '');
          setName(initialData.name);
          setDescription(initialData.description || '');
          setAddress(initialData.address || '');

          // Initialize last synced state from initialData (baseline for isDirty)
          setLastSyncedState({
            code: initialData.code || '',
            name: initialData.name || '',
            description: initialData.description || '',
            address: initialData.address || '',
          });
        } else if (initialNameFromSearch) {
          setCode('');
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
      }, 0);
    }
  }, [isOpen, initialData, initialNameFromSearch, resetForm]);

  // Focus on name input when switching from history back to edit/add mode
  useEffect(() => {
    if (isOpen && (mode === 'edit' || mode === 'add')) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  // Handle closing animation
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 200); // Duration matches the animation duration
      return () => clearTimeout(timer);
    }
  }, [isClosing, onClose]);

  // comparisonData auto-resets when modal closes (getDerivedStateFromProps pattern)

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      toast.error(
        `Kode dan nama ${entityName.toLowerCase()} tidak boleh kosong.`
      );
      return;
    }
    const submitData: {
      id?: string;
      code?: string;
      name: string;
      fda_code?: string;
      description?: string;
      address?: string;
    } = {
      id: initialData?.id,
      // All tables now use 'code' field consistently
      code: code.trim(),
      name: name.trim(),
    };

    // Include description field only for entities that have it (not manufacturers)
    if (entityName !== 'Produsen') {
      submitData.description = description.trim();
    }

    // Only include address field for Produsen (manufacturers)
    if (entityName === 'Produsen') {
      submitData.address = address.trim();
    }

    try {
      await onSubmit(submitData);
      // Only trigger closing animation after successful submit
      setIsClosing(true);
    } catch {
      // If submit fails, don't close the modal - let user retry
      // Error is already handled by the onSubmit handler
    }
  }, [
    code,
    name,
    description,
    address,
    isValid,
    entityName,
    onSubmit,
    initialData,
  ]);

  const handleDelete = useCallback(async () => {
    if (initialData?.id && onDelete) {
      try {
        await onDelete(initialData.id);
        // Only trigger closing animation after successful delete (user confirmed and delete succeeded)
        setIsClosing(true);
      } catch {
        // If delete fails or user cancelled, don't close the modal
        // Error is already handled by the onDelete handler (toast shown)
        // User can retry or close manually
      }
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

  const openComparison = useCallback(
    (version: VersionData) => {
      setComparisonData({
        isOpen: true,
        isClosing: false,
        selectedVersion: version,
        isDualMode: false,
        versionA: undefined,
        versionB: undefined,
        isFlipped: false,
      });
    },
    [setComparisonData]
  );

  const openDualComparison = useCallback(
    (versionA: VersionData, versionB: VersionData) => {
      setComparisonData({
        isOpen: true,
        isClosing: false,
        selectedVersion: undefined,
        isDualMode: true,
        versionA,
        versionB,
        isFlipped: false,
      });
    },
    [setComparisonData]
  );

  const flipVersions = useCallback(() => {
    setComparisonData(prev => ({
      ...prev,
      isFlipped: !prev.isFlipped,
    }));
  }, [setComparisonData]);

  const closeComparison = useCallback(() => {
    // Start closing animation
    setComparisonData(prev => ({
      ...prev,
      isClosing: true,
    }));

    // Actually close after animation completes
    setTimeout(() => {
      setComparisonData({
        isOpen: false,
        isClosing: false,
        selectedVersion: undefined,
        isDualMode: false,
        versionA: undefined,
        versionB: undefined,
        isFlipped: false,
      });
    }, 250); // Match animation duration
  }, [setComparisonData]);

  const goBack = useCallback(() => {
    // Close comparison modal when going back with animation
    setComparisonData(prev => ({
      ...prev,
      isClosing: true,
    }));

    setTimeout(() => {
      setComparisonData({
        isOpen: false,
        isClosing: false,
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
    }, 250); // Match animation duration
  }, [mode, previousMode, setComparisonData]);

  // UI actions
  const handleClose = useCallback(() => {
    // Sequential closing for close button:
    // If comparison modal is open, close it first, then close history modal
    if (comparisonData.isOpen) {
      closeComparison();
      // After comparison closes, schedule closing of history modal
      setTimeout(() => {
        setIsClosing(true);
      }, 300); // Slight delay after comparison modal closes
    } else {
      // No comparison modal open, close normally
      setIsClosing(true);
    }
  }, [comparisonData.isOpen, closeComparison]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isClosing) {
        // Sequential closing for backdrop clicks:
        // If comparison modal is open, close it first, then close history modal
        if (comparisonData.isOpen) {
          closeComparison();
          // After comparison closes, schedule closing of history modal
          setTimeout(() => {
            setIsClosing(true);
          }, 300); // Slight delay after comparison modal closes
        } else {
          // No comparison modal open, close normally
          setIsClosing(true);
        }
      }
    },
    [isClosing, comparisonData.isOpen, closeComparison]
  );

  // Create context value
  const contextValue: EntityModalContextValue = {
    form: {
      code,
      name,
      description,
      address,
      isDirty,
      isValid,
    },
    ui: {
      isOpen,
      isClosing,
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
      // Include pre-fetched history data
      data: historyState?.data || null,
      isLoading: historyState?.isLoading || false,
      error: historyState?.error || null,
    },
    comparison: {
      isOpen: comparisonData.isOpen,
      isClosing: comparisonData.isClosing,
      selectedVersion: comparisonData.selectedVersion,
      isDualMode: comparisonData.isDualMode,
      versionA: comparisonData.versionA,
      versionB: comparisonData.versionB,
      isFlipped: comparisonData.isFlipped,
    },
    // Realtime sync (only in edit mode)
    realtime: isEditMode
      ? {
          smartFormSync,
        }
      : undefined,
    formActions: {
      setCode,
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
      setIsClosing,
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
