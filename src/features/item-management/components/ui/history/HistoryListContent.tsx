import React, { useState, useEffect } from "react";
import { useEntityModal } from "../../../contexts/EntityModalContext";
import { useEntityHistory } from "../../../hooks/useEntityHistory";
import { HistoryTimelineList, HistoryItem } from "../shared";

const HistoryListContent: React.FC = () => {
  const { history: historyState, uiActions, comparison } = useEntityModal();
  const { entityTable, entityId } = historyState;
  const { history, isLoading, restoreVersion } = useEntityHistory(entityTable, entityId);
  const [compareMode, setCompareMode] = useState(false);
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
        await restoreVersion(version);
        // Close history and refresh data
        uiActions.closeHistory();
        window.location.reload(); // Refresh to show restored data
      } catch (error) {
        alert("Gagal mengembalikan versi: " + error);
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
    }
  };

  return (
    <div>
      {/* Toggle button for compare mode */}
      <div className="px-6 pt-4 pb-2 border-b bg-gray-50">
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`text-sm px-3 py-1 rounded transition-colors ${
            compareMode 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
          }`}
        >
          {compareMode ? '📊 Compare Mode' : '📋 Single View'}
        </button>
        {compareMode && (
          <p className="text-xs text-gray-500 mt-1">
            Select two versions to compare their differences
          </p>
        )}
      </div>
      
      <HistoryTimelineList
        history={history}
        isLoading={isLoading}
        onVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
        selectedVersions={selectedVersion ? [selectedVersion] : []}
        showRestoreButton={!compareMode}
        onRestore={handleRestore}
        emptyMessage="Tidak ada riwayat perubahan"
        loadingMessage="Loading history..."
        allowMultiSelect={compareMode}
        onCompareSelected={handleCompareSelected}
        maxSelections={2}
      />
    </div>
  );
};

export default HistoryListContent;