import { useCallback, useState } from 'react';
import type {
  ModalMode,
  VersionData,
} from '../../../../shared/contexts/EntityModalContext';

interface UseEntityHistoryStateProps {
  mode: ModalMode;
  setMode: (mode: ModalMode) => void;
}

export const useEntityHistoryState = ({
  mode,
  setMode,
}: UseEntityHistoryStateProps) => {
  const [previousMode, setPreviousMode] = useState<ModalMode>('add');
  const [historyData, setHistoryData] = useState({
    entityTable: '',
    entityId: '',
    selectedVersion: undefined as VersionData | undefined,
  });

  const syncPreviousMode = useCallback((nextMode: ModalMode) => {
    setPreviousMode(nextMode);
  }, []);

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
    [mode, setMode]
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
  }, [previousMode, setMode]);

  return {
    historyData,
    syncPreviousMode,
    openHistory,
    selectVersion,
    closeHistory,
  };
};
