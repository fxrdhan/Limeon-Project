import { useEntityModalRealtime } from './useEntityModalRealtime';
import { formatDateTime } from '@/lib/formatters';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import toast from 'react-hot-toast';
import type {
  EntityModalContextValue,
  ModalMode,
} from '../../../shared/contexts/EntityModalContext';
import type { EntityData } from '../../../shared/types';
import { buildEntitySubmitData } from './entity-modal-logic/entitySubmitData';
import { getEntityTableName } from './entity-modal-logic/entityTable';
import { useEntityComparisonState } from './entity-modal-logic/useEntityComparisonState';
import { useEntityHistoryState } from './entity-modal-logic/useEntityHistoryState';

type TimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    historyData,
    syncPreviousMode,
    openHistory,
    selectVersion,
    closeHistory,
  } = useEntityHistoryState({
    mode,
    setMode,
  });
  const {
    comparisonData,
    setComparisonData,
    resetComparisonData,
    openComparison: openComparisonBase,
    closeComparison: closeComparisonBase,
    openDualComparison: openDualComparisonBase,
    flipVersions,
  } = useEntityComparisonState(isOpen);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const initializationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const nameFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAfterComparisonTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const deletedEntityCloseTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const modalSessionRef = useRef(0);
  const submitAttemptRef = useRef(0);
  const deleteAttemptRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);

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

  const entityTable = getEntityTableName(entityName);
  const entityId = initialData?.id || '';

  const clearTimerRef = useCallback((timerRef: TimerRef) => {
    if (timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    modalSessionRef.current += 1;
    submitAttemptRef.current += 1;
    deleteAttemptRef.current += 1;
    submitInFlightRef.current = false;
    deleteInFlightRef.current = false;
  }, [entityName, initialData?.id, isOpen]);

  const clearComparisonDeferredTimers = useCallback(() => {
    clearTimerRef(goBackTimerRef);
    clearTimerRef(closeAfterComparisonTimerRef);
  }, [clearTimerRef]);

  const scheduleNameFocus = useCallback(() => {
    clearTimerRef(nameFocusTimerRef);
    nameFocusTimerRef.current = setTimeout(() => {
      nameFocusTimerRef.current = null;
      nameInputRef.current?.focus();
    }, 100);
  }, [clearTimerRef]);

  const scheduleDeletedEntityClose = useCallback(() => {
    clearTimerRef(deletedEntityCloseTimerRef);
    deletedEntityCloseTimerRef.current = setTimeout(() => {
      deletedEntityCloseTimerRef.current = null;
      onClose();
    }, 1000);
  }, [clearTimerRef, onClose]);

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
      scheduleDeletedEntityClose();
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
    clearTimerRef(initializationTimerRef);
    clearTimerRef(nameFocusTimerRef);
    clearComparisonDeferredTimers();

    if (!isOpen) {
      clearTimerRef(deletedEntityCloseTimerRef);
      return;
    }

    clearTimerRef(deletedEntityCloseTimerRef);
    // Use setTimeout to avoid synchronous setState in effect
    initializationTimerRef.current = setTimeout(() => {
      initializationTimerRef.current = null;
      setIsClosing(false); // Reset closing state when opening
      setIsSubmitting(false);
      const newMode = initialData ? 'edit' : 'add';
      setMode(newMode);
      syncPreviousMode(newMode);

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
      scheduleNameFocus();
    }, 0);

    return () => {
      clearTimerRef(initializationTimerRef);
      clearTimerRef(nameFocusTimerRef);
    };
  }, [
    clearTimerRef,
    clearComparisonDeferredTimers,
    isOpen,
    initialData,
    initialNameFromSearch,
    resetForm,
    scheduleNameFocus,
    syncPreviousMode,
  ]);

  // Focus on name input when switching from history back to edit/add mode
  useEffect(() => {
    if (isOpen && (mode === 'edit' || mode === 'add')) {
      scheduleNameFocus();
    }
  }, [isOpen, mode, scheduleNameFocus]);

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
    if (submitInFlightRef.current) {
      return;
    }

    if (!isValid) {
      toast.error(
        `Kode dan nama ${entityName.toLowerCase()} tidak boleh kosong.`
      );
      return;
    }

    submitInFlightRef.current = true;
    const submitSession = modalSessionRef.current;
    const submitAttempt = submitAttemptRef.current + 1;
    submitAttemptRef.current = submitAttempt;
    setIsSubmitting(true);

    const submitData = buildEntitySubmitData({
      id: initialData?.id,
      code,
      name,
      description,
      address,
      entityName,
    });

    try {
      await onSubmit(submitData);
      if (
        modalSessionRef.current !== submitSession ||
        submitAttemptRef.current !== submitAttempt
      ) {
        return;
      }
      // Only trigger closing animation after successful submit
      setIsClosing(true);
    } catch {
      if (
        modalSessionRef.current === submitSession &&
        submitAttemptRef.current === submitAttempt
      ) {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
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
    if (!initialData?.id || !onDelete || deleteInFlightRef.current) {
      return;
    }

    deleteInFlightRef.current = true;
    const deleteSession = modalSessionRef.current;
    const deleteAttempt = deleteAttemptRef.current + 1;
    deleteAttemptRef.current = deleteAttempt;

    try {
      await onDelete(initialData.id);
      if (
        modalSessionRef.current !== deleteSession ||
        deleteAttemptRef.current !== deleteAttempt
      ) {
        return;
      }
      // Only trigger closing animation after successful delete (user confirmed and delete succeeded)
      setIsClosing(true);
    } catch {
      if (
        modalSessionRef.current === deleteSession &&
        deleteAttemptRef.current === deleteAttempt
      ) {
        deleteInFlightRef.current = false;
      }
      // If delete fails or user cancelled, don't close the modal
      // Error is already handled by the onDelete handler (toast shown)
      // User can retry or close manually
    }
  }, [initialData, onDelete]);

  const openComparison = useCallback(
    (version: Parameters<typeof openComparisonBase>[0]) => {
      clearComparisonDeferredTimers();
      openComparisonBase(version);
    },
    [clearComparisonDeferredTimers, openComparisonBase]
  );

  const openDualComparison = useCallback(
    (
      versionA: Parameters<typeof openDualComparisonBase>[0],
      versionB: Parameters<typeof openDualComparisonBase>[1]
    ) => {
      clearComparisonDeferredTimers();
      openDualComparisonBase(versionA, versionB);
    },
    [clearComparisonDeferredTimers, openDualComparisonBase]
  );

  const closeComparison = useCallback(() => {
    clearComparisonDeferredTimers();
    closeComparisonBase();
  }, [clearComparisonDeferredTimers, closeComparisonBase]);

  const scheduleCloseAfterComparison = useCallback(() => {
    clearTimerRef(closeAfterComparisonTimerRef);
    closeAfterComparisonTimerRef.current = setTimeout(() => {
      closeAfterComparisonTimerRef.current = null;
      setIsClosing(true);
    }, 300);
  }, [clearTimerRef]);

  const goBack = useCallback(() => {
    clearComparisonDeferredTimers();
    // Close comparison modal when going back with animation
    setComparisonData(prev => ({
      ...prev,
      isClosing: true,
    }));

    goBackTimerRef.current = setTimeout(() => {
      goBackTimerRef.current = null;
      resetComparisonData();

      if (mode === 'history') {
        closeHistory();
      }
    }, 250); // Match animation duration
  }, [
    clearComparisonDeferredTimers,
    closeHistory,
    mode,
    resetComparisonData,
    setComparisonData,
  ]);

  // UI actions
  const handleClose = useCallback(() => {
    // Sequential closing for close button:
    // If comparison modal is open, close it first, then close history modal
    if (comparisonData.isOpen) {
      closeComparison();
      // After comparison closes, schedule closing of history modal
      scheduleCloseAfterComparison(); // Slight delay after comparison modal closes
    } else {
      // No comparison modal open, close normally
      setIsClosing(true);
    }
  }, [comparisonData.isOpen, closeComparison, scheduleCloseAfterComparison]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isClosing) {
        // Sequential closing for backdrop clicks:
        // If comparison modal is open, close it first, then close history modal
        if (comparisonData.isOpen) {
          closeComparison();
          // After comparison closes, schedule closing of history modal
          scheduleCloseAfterComparison(); // Slight delay after comparison modal closes
        } else {
          // No comparison modal open, close normally
          setIsClosing(true);
        }
      }
    },
    [
      isClosing,
      comparisonData.isOpen,
      closeComparison,
      scheduleCloseAfterComparison,
    ]
  );

  useEffect(
    () => () => {
      clearTimerRef(initializationTimerRef);
      clearTimerRef(nameFocusTimerRef);
      clearTimerRef(goBackTimerRef);
      clearTimerRef(closeAfterComparisonTimerRef);
      clearTimerRef(deletedEntityCloseTimerRef);
    },
    [clearTimerRef]
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
      isLoading: isLoading || isSubmitting,
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
