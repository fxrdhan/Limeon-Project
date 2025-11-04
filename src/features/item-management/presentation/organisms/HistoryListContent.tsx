import React, { useState, useEffect } from 'react';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';
import toast from 'react-hot-toast';
import HistoryTimelineList, { HistoryItem } from './HistoryTimelineList';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface HistoryListContentProps {
  compareMode?: boolean;
}

const HistoryListContent: React.FC<HistoryListContentProps> = ({
  compareMode = false,
}) => {
  const { history: historyState, uiActions, comparison } = useEntityModal();
  const { entityTable, entityId, data: history, isLoading } = historyState;
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

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
    if (confirm(`Yakin ingin mengembalikan data ke versi ${version}?`)) {
      try {
        // Find target version from pre-fetched history data
        const targetVersion = history?.find(h => h.version_number === version);
        if (!targetVersion) {
          throw new Error(`Version ${version} not found`);
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
          // Log for debugging purposes
          console.error('Failed to invalidate queries after restore', e);
        }
        uiActions.closeHistory();
      } catch (error) {
        toast.error('Gagal mengembalikan versi: ' + error);
      }
    }
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
  );
};

export default HistoryListContent;
