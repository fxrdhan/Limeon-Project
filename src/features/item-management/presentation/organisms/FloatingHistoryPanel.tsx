import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import HistoryTimelineList from './HistoryTimelineList';
import { useItemHistory } from '../../shared/contexts/useItemFormContext';
import { useHistorySelection } from '../hooks/useHistoryManagement';

// History item type with entity_data (from database)
interface HistoryItemWithData {
  id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
}

interface FloatingHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  itemName: string;
  onVersionSelect: (item: HistoryItemWithData) => void;
  selectedVersion: number | null;
}

const FloatingHistoryPanel: React.FC<FloatingHistoryPanelProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  onVersionSelect,
  selectedVersion: externalSelectedVersion,
}) => {
  // Get history from context
  const historyState = useItemHistory();
  const history = historyState?.data || null;
  const isLoading = historyState?.isLoading || false;

  // Use shared history selection hook (single selection only)
  const { selectedVersion, handleVersionClick } = useHistorySelection({
    history,
    compareMode: false,
    onVersionSelect: item => {
      // Cast to HistoryItemWithData since we know it has entity_data from context
      onVersionSelect(item as unknown as HistoryItemWithData);
    },
    onVersionDeselect: () => {
      // Clear selection
    },
    onCompareSelect: () => {
      // Not used in Item modal
    },
    onSelectionEmpty: () => {
      // Not used in Item modal
    },
  });

  if (!itemId) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Floating Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-gray-200 bg-gray-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">Riwayat Perubahan</h3>
                <span className="text-xs text-gray-500">{itemName}</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Tutup riwayat"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content - Timeline List Only */}
            <div className="flex-1 overflow-hidden">
              <HistoryTimelineList
                history={history}
                isLoading={isLoading}
                onVersionClick={handleVersionClick}
                selectedVersion={externalSelectedVersion || selectedVersion}
                selectedVersions={
                  externalSelectedVersion
                    ? [externalSelectedVersion]
                    : selectedVersion
                      ? [selectedVersion]
                      : []
                }
                showRestoreButton={false}
                emptyMessage="Tidak ada riwayat perubahan"
                loadingMessage="Loading history..."
                allowMultiSelect={false}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FloatingHistoryPanel;
