import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';
import toast from 'react-hot-toast';
import HistoryTimelineList from './HistoryTimelineList';
import HistoryRestoreDialog from '../molecules/HistoryRestoreDialog';
import type { RestoreMode } from '../molecules/HistoryRestoreDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useHistorySelection } from '../hooks/useHistoryManagement';
import { itemHistoryService } from '../../infrastructure/itemHistory.service';
import type { HistoryRollbackAction } from './HistoryListContent.types';

interface HistoryListContentProps {
  compareMode?: boolean;
  onRollbackActionChange?: (action: HistoryRollbackAction | null) => void;
}

const HistoryListContent: React.FC<HistoryListContentProps> = ({
  compareMode = false,
  onRollbackActionChange,
}) => {
  const { history: historyState, uiActions, comparison } = useEntityModal();
  const { openComparison, closeComparison, openDualComparison, closeHistory } =
    uiActions;
  const { entityTable, entityId, data: history, isLoading } = historyState;
  const queryClient = useQueryClient();
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<
    number | null
  >(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('soft');
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Use shared history selection hook
  const {
    selectedVersion,
    handleVersionClick,
    handleCompareSelected,
    handleSelectionEmpty,
  } = useHistorySelection({
    history,
    compareMode,
    onVersionSelect: item => {
      const versionData = history?.find(h => h.id === item.id);
      if (versionData) {
        openComparison(versionData);
      }
    },
    onVersionDeselect: () => {
      if (comparison.isOpen) {
        closeComparison();
      }
    },
    onCompareSelect: ([itemA, itemB]) => {
      const versionA = history?.find(h => h.id === itemA.id);
      const versionB = history?.find(h => h.id === itemB.id);
      if (versionA && versionB) {
        openDualComparison(versionA, versionB);
      }
    },
    onSelectionEmpty: () => {
      closeComparison();
    },
  });

  // Sync selection state with comparison modal state (for external changes)
  useEffect(() => {
    if (comparison.isOpen && comparison.selectedVersion) {
      // External state sync handled by comparison modal
      // selectedVersion is managed by the hook
    }
  }, [comparison.isOpen, comparison.selectedVersion]);

  useEffect(() => {
    return () => {
      if (restoreResetTimeoutRef.current) {
        clearTimeout(restoreResetTimeoutRef.current);
        restoreResetTimeoutRef.current = null;
      }
    };
  }, []);

  const handleRestore = useCallback(
    async (version: number) => {
      // Close comparison modal to avoid z-index conflicts and improve focus
      if (comparison.isOpen) {
        closeComparison();
      }

      // Open custom dialog instead of native confirm
      setRestoreTargetVersion(version);
      setRestoreMode('soft'); // Default to soft restore
      setShowRestoreDialog(true);
    },
    [closeComparison, comparison.isOpen]
  );

  const latestVersion = history?.length
    ? Math.max(...history.map(item => item.version_number))
    : 0;
  const canRollbackSelected =
    !compareMode && selectedVersion !== null && selectedVersion < latestVersion;

  useEffect(() => {
    if (!onRollbackActionChange) return;

    if (!canRollbackSelected || selectedVersion === null) {
      onRollbackActionChange(null);
      return;
    }

    onRollbackActionChange({
      version: selectedVersion,
      onRollback: () => {
        void handleRestore(selectedVersion);
      },
    });

    return () => {
      onRollbackActionChange(null);
    };
  }, [
    canRollbackSelected,
    handleRestore,
    onRollbackActionChange,
    selectedVersion,
  ]);

  const closeRestoreDialog = () => {
    setShowRestoreDialog(false);
    if (restoreResetTimeoutRef.current) {
      clearTimeout(restoreResetTimeoutRef.current);
      restoreResetTimeoutRef.current = null;
    }
    // Delay resetting state until exit animation completes (200ms + buffer)
    restoreResetTimeoutRef.current = setTimeout(() => {
      setRestoreTargetVersion(null);
      setRestoreMode('soft');
      restoreResetTimeoutRef.current = null;
    }, 250);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTargetVersion) return;

    setIsRestoring(true);
    try {
      // Find target version from pre-fetched history data
      const targetVersion = history?.find(
        h => h.version_number === restoreTargetVersion
      );
      if (!targetVersion) {
        throw new Error(`Version ${restoreTargetVersion} not found`);
      }

      if (restoreMode === 'hard') {
        // Hard rollback: Only delete history versions, do NOT update entity
        // (updating entity would trigger a new version creation)
        const { data: rpcData, error: rpcError } =
          await itemHistoryService.hardRollbackEntity({
            entityTable,
            entityId,
            targetVersion: restoreTargetVersion,
          });

        if (rpcError) {
          throw new Error(`Hard rollback failed: ${rpcError.message}`);
        }

        toast.success(
          `Berhasil menghapus ${rpcData?.deleted_count ?? 0} versi setelah v${restoreTargetVersion}`
        );
      } else {
        // Soft restore: Update entity to create a new version with old data
        const restoreData = { ...targetVersion.entity_data };

        // Remove metadata fields that shouldn't be restored
        delete restoreData.id;
        delete restoreData.created_at;
        delete restoreData.updated_at;

        // Update the current entity with restored data
        const { error: updateError } =
          await itemHistoryService.softRestoreEntity({
            entityTable,
            entityId,
            restoreData,
          });

        if (updateError) {
          throw new Error(updateError.message);
        }

        toast.success(`Berhasil restore ke versi ${restoreTargetVersion}`);
      }

      // Invalidate caches and close history without full reload
      try {
        await queryClient.invalidateQueries();
      } catch (e) {
        // Non-fatal: failing to invalidate queries should not break the flow
        console.error('Failed to invalidate queries after restore', e);
      }

      closeRestoreDialog();
      closeHistory();
    } catch (error) {
      console.error('Restore error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      toast.error(
        `Gagal ${restoreMode === 'hard' ? 'rollback' : 'restore'}: ${errorMessage}`
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreCancel = () => {
    closeRestoreDialog();
  };

  return (
    <>
      <HistoryTimelineList
        history={history}
        isLoading={isLoading}
        onVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
        selectedVersions={selectedVersion ? [selectedVersion] : []}
        emptyMessage="Tidak ada riwayat perubahan"
        loadingMessage="Loading history..."
        allowMultiSelect={compareMode}
        onCompareSelected={handleCompareSelected}
        maxSelections={2}
        onSelectionEmpty={handleSelectionEmpty}
        isFlipped={comparison.isFlipped && comparison.isDualMode}
        autoScrollToSelected={true}
        disableHoverDetails={true}
      />

      <HistoryRestoreDialog
        isOpen={showRestoreDialog}
        targetVersion={restoreTargetVersion}
        restoreMode={restoreMode}
        isRestoring={isRestoring}
        onRestoreModeChange={setRestoreMode}
        onCancel={handleRestoreCancel}
        onConfirm={handleRestoreConfirm}
      />
    </>
  );
};

export default HistoryListContent;
