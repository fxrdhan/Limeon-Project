import React, { useState, useEffect, Fragment } from 'react';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';
import toast from 'react-hot-toast';
import HistoryTimelineList, { HistoryItem } from './HistoryTimelineList';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Transition, TransitionChild } from '@headlessui/react';
import { createPortal } from 'react-dom';
import Button from '@/components/button';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';

interface HistoryListContentProps {
  compareMode?: boolean;
}

type RestoreMode = 'soft' | 'hard';

const HistoryListContent: React.FC<HistoryListContentProps> = ({
  compareMode = false,
}) => {
  const { history: historyState, uiActions, comparison } = useEntityModal();
  const { entityTable, entityId, data: history, isLoading } = historyState;
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<
    number | null
  >(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('soft');
  const [isRestoring, setIsRestoring] = useState(false);

  // Sync selection state with comparison modal state
  useEffect(() => {
    if (comparison.isOpen && comparison.selectedVersion) {
      setSelectedVersion(comparison.selectedVersion.version_number);
    }
  }, [comparison.isOpen, comparison.selectedVersion]);

  // Clear selection when modal is closed
  useEffect(() => {
    if (!comparison.isOpen) {
      setSelectedVersion(null);
    }
  }, [comparison.isOpen]);

  const handleVersionClick = (item: HistoryItem) => {
    // If clicking the same version that's already selected and comparison modal is open, close it
    if (selectedVersion === item.version_number && comparison.isOpen) {
      setSelectedVersion(null);
      uiActions.closeComparison();
      return;
    }

    // Update local selection state first
    setSelectedVersion(item.version_number);

    // Find the full VersionData from history using the item
    const versionData = history?.find(h => h.id === item.id);
    if (versionData) {
      uiActions.openComparison(versionData);
    }
  };

  const handleRestore = async (version: number) => {
    // Close comparison modal to avoid z-index conflicts and improve focus
    if (comparison.isOpen) {
      uiActions.closeComparison();
    }

    // Open custom dialog instead of native confirm
    setRestoreTargetVersion(version);
    setRestoreMode('soft'); // Default to soft restore
    setShowRestoreDialog(true);
  };

  const closeRestoreDialog = () => {
    setShowRestoreDialog(false);
    // Delay resetting state until exit animation completes (200ms + buffer)
    setTimeout(() => {
      setRestoreTargetVersion(null);
      setRestoreMode('soft');
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

      // For hard rollback, delete versions first
      if (restoreMode === 'hard') {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'hard_rollback_entity',
          {
            p_entity_table: entityTable,
            p_entity_id: entityId,
            p_target_version: restoreTargetVersion,
          }
        );

        if (rpcError) {
          throw new Error(`Hard rollback failed: ${rpcError.message}`);
        }

        toast.success(
          `Berhasil menghapus ${rpcData.deleted_count} versi setelah v${restoreTargetVersion}`
        );
      }

      // Get the entity data from the target version
      const restoreData = { ...targetVersion.entity_data };

      // Remove metadata fields that shouldn't be restored
      delete restoreData.id;
      delete restoreData.created_at;
      delete restoreData.updated_at;

      // Update the current entity with restored data
      const { error: updateError } = await supabase
        .from(entityTable)
        .update({
          ...restoreData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Invalidate caches and close history without full reload
      try {
        await queryClient.invalidateQueries();
      } catch (e) {
        // Non-fatal: failing to invalidate queries should not break the flow
        console.error('Failed to invalidate queries after restore', e);
      }

      toast.success(
        `Berhasil ${restoreMode === 'hard' ? 'rollback' : 'restore'} ke versi ${restoreTargetVersion}`
      );
      closeRestoreDialog();
      uiActions.closeHistory();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(
        `Gagal ${restoreMode === 'hard' ? 'rollback' : 'restore'}: ${error}`
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreCancel = () => {
    closeRestoreDialog();
  };

  const handleCompareSelected = (selectedVersions: HistoryItem[]) => {
    if (selectedVersions.length === 2) {
      // Find the full VersionData objects
      const versionA = history?.find(h => h.id === selectedVersions[0].id);
      const versionB = history?.find(h => h.id === selectedVersions[1].id);

      if (versionA && versionB) {
        // Open dual comparison modal
        uiActions.openDualComparison(versionA, versionB);
      }
    } else if (selectedVersions.length === 1) {
      // Close comparison modal if only 1 version is selected in compare mode
      uiActions.closeComparison();
    }
  };

  const handleSelectionEmpty = () => {
    // Close comparison modal when no versions are selected
    uiActions.closeComparison();
  };

  return (
    <>
      <HistoryTimelineList
        history={history}
        isLoading={isLoading}
        onVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
        selectedVersions={selectedVersion ? [selectedVersion] : []}
        showRestoreButton={true}
        onRestore={handleRestore}
        emptyMessage="Tidak ada riwayat perubahan"
        loadingMessage="Loading history..."
        allowMultiSelect={compareMode}
        onCompareSelected={handleCompareSelected}
        maxSelections={2}
        onSelectionEmpty={handleSelectionEmpty}
        isFlipped={comparison.isFlipped && comparison.isDualMode}
      />

      {/* Custom Restore Dialog */}
      {createPortal(
        <Transition show={showRestoreDialog} as={Fragment}>
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <TransitionChild
              as={Fragment}
              enter="transition-opacity duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleRestoreCancel}
                aria-hidden="true"
              />
            </TransitionChild>

            <TransitionChild
              as={Fragment}
              enter="transition-all duration-300 ease-out"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition-all duration-200 ease-in"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 z-10">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowUturnLeftIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold">
                    Restore ke Versi {restoreTargetVersion}
                  </h3>
                </div>

                <p className="text-gray-600 mb-6">
                  Pilih metode restore yang sesuai dengan kebutuhan Anda:
                </p>

                {/* Restore Mode Options */}
                <div className="space-y-3 mb-6">
                  {/* Soft Restore Option */}
                  <label
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      restoreMode === 'soft'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="soft"
                      checked={restoreMode === 'soft'}
                      onChange={e =>
                        setRestoreMode(e.target.value as RestoreMode)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ClockIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">
                          Soft Restore (Recommended)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Membuat versi baru dengan data dari v
                        {restoreTargetVersion}. History lengkap tetap tersimpan
                        untuk audit trail. Anda dapat undo jika perlu.
                      </p>
                    </div>
                  </label>

                  {/* Hard Rollback Option */}
                  <label
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      restoreMode === 'hard'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="hard"
                      checked={restoreMode === 'hard'}
                      onChange={e =>
                        setRestoreMode(e.target.value as RestoreMode)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-gray-900">
                          Hard Rollback (Destructive)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Menghapus SEMUA versi setelah v{restoreTargetVersion}{' '}
                        secara permanen. Data yang dihapus tidak dapat
                        dikembalikan.
                      </p>
                      <div className="flex items-start gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Peringatan:</strong> Aksi ini tidak dapat
                          dibatalkan! Gunakan hanya jika yakin.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="text"
                    onClick={handleRestoreCancel}
                    disabled={isRestoring}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant={restoreMode === 'hard' ? 'danger' : 'primary'}
                    onClick={handleRestoreConfirm}
                    disabled={isRestoring}
                  >
                    {isRestoring
                      ? 'Processing...'
                      : restoreMode === 'hard'
                        ? 'Hard Rollback'
                        : 'Soft Restore'}
                  </Button>
                </div>
              </div>
            </TransitionChild>
          </div>
        </Transition>,
        document.body
      )}
    </>
  );
};

export default HistoryListContent;
