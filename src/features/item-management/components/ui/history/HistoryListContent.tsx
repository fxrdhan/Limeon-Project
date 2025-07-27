import React from "react";
import { useEntityModal } from "../../../contexts/EntityModalContext";
import { useEntityHistory } from "../../../hooks/useEntityHistory";
import { HistoryTimelineList, HistoryItem } from "../shared";

const HistoryListContent: React.FC = () => {
  const { history: historyState, uiActions } = useEntityModal();
  const { entityTable, entityId } = historyState;
  const { history, isLoading, restoreVersion } = useEntityHistory(entityTable, entityId);

  const handleVersionClick = (item: HistoryItem) => {
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

  return (
    <HistoryTimelineList
      history={history}
      isLoading={isLoading}
      onVersionClick={handleVersionClick}
      showRestoreButton={true}
      onRestore={handleRestore}
      emptyMessage="Tidak ada riwayat perubahan"
      loadingMessage="Loading history..."
    />
  );
};

export default HistoryListContent;