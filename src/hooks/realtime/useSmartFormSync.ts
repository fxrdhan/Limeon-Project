import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseSmartFormSyncProps {
  onDataUpdate: (updates: Record<string, unknown>) => void;
  showConflictNotification?: boolean;
}

/**
 * Smart form synchronization that respects user input
 * Only updates fields that user is not currently interacting with
 */
export const useSmartFormSync = ({
  onDataUpdate,
  showConflictNotification = true,
}: UseSmartFormSyncProps) => {
  // Track which fields are currently being interacted with
  const activeFieldsRef = useRef<Set<string>>(new Set());
  const lastFocusedFieldRef = useRef<string | null>(null);
  const pendingUpdatesRef = useRef<Record<string, unknown>>({});

  // Register field as being actively edited
  const registerActiveField = useCallback((fieldName: string) => {
    activeFieldsRef.current.add(fieldName);
    lastFocusedFieldRef.current = fieldName;
  }, []);

  // Unregister field when user stops editing
  const unregisterActiveField = useCallback(
    (fieldName: string) => {
      activeFieldsRef.current.delete(fieldName);

      // If there are pending updates for this field, apply them now
      if (pendingUpdatesRef.current[fieldName] !== undefined) {
        const pendingValue = pendingUpdatesRef.current[fieldName];
        delete pendingUpdatesRef.current[fieldName];

        // Apply the pending update
        onDataUpdate({ [fieldName]: pendingValue });

        if (showConflictNotification) {
          toast.info(`Field "${fieldName}" diperbarui dengan data terbaru`, {
            duration: 3000,
            icon: '🔄',
          });
        }
      }
    },
    [onDataUpdate, showConflictNotification]
  );

  // Handle realtime updates with smart conflict resolution
  const handleRealtimeUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      const safeUpdates: Record<string, unknown> = {};
      const conflictedFields: string[] = [];
      let hasConflicts = false;

      // Process each update
      Object.entries(updates).forEach(([fieldName, newValue]) => {
        const isFieldActive = activeFieldsRef.current.has(fieldName);

        if (isFieldActive) {
          // Field is being edited - store as pending update
          pendingUpdatesRef.current[fieldName] = newValue;
          conflictedFields.push(fieldName);
          hasConflicts = true;
        } else {
          // Field is not being edited - safe to update
          safeUpdates[fieldName] = newValue;
        }
      });

      // Apply safe updates immediately
      if (Object.keys(safeUpdates).length > 0) {
        onDataUpdate(safeUpdates);
      }

      // Notify about conflicts if any
      if (hasConflicts && showConflictNotification) {
        const fieldNames = conflictedFields.join(', ');
        toast.success(
          `Perubahan tersimpan untuk field: ${fieldNames}. Akan diaplikasikan setelah Anda selesai mengedit.`,
          {
            duration: 5000,
            icon: '⏳',
          }
        );
      }

      return {
        appliedImmediately: safeUpdates,
        pendingConflicts: conflictedFields,
      };
    },
    [onDataUpdate, showConflictNotification]
  );

  // Get input event handlers for form fields
  const getFieldHandlers = useCallback(
    (fieldName: string) => ({
      onFocus: () => registerActiveField(fieldName),
      onBlur: () => unregisterActiveField(fieldName),
      onChange: () => {
        // Keep field registered while typing
        registerActiveField(fieldName);
      },
    }),
    [registerActiveField, unregisterActiveField]
  );

  // Check if field has pending updates
  const hasPendingUpdate = useCallback((fieldName: string) => {
    return pendingUpdatesRef.current[fieldName] !== undefined;
  }, []);

  // Force apply all pending updates (useful for save/submit)
  const applyAllPendingUpdates = useCallback(() => {
    const allPending = { ...pendingUpdatesRef.current };
    pendingUpdatesRef.current = {};

    if (Object.keys(allPending).length > 0) {
      onDataUpdate(allPending);

      if (showConflictNotification) {
        toast.success('Semua perubahan terbaru telah diaplikasikan', {
          duration: 3000,
          icon: '✅',
        });
      }
    }

    return allPending;
  }, [onDataUpdate, showConflictNotification]);

  return {
    handleRealtimeUpdate,
    getFieldHandlers,
    hasPendingUpdate,
    applyAllPendingUpdates,
    registerActiveField,
    unregisterActiveField,
  };
};
