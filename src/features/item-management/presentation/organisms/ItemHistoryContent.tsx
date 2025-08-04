import React, { useState } from 'react';
import Button from '@/components/button';
import { FaEye } from 'react-icons/fa';
import { useEntityHistory } from '../../application/hooks/instances/useEntityHistory';
import { formatDateTime } from '@/lib/formatters';
import { HISTORY_DEBUG } from '../../config/debug';
import { useItemManagement } from '../../shared/contexts/useItemFormContext';
import HistoryTimelineList, { HistoryItem } from './HistoryTimelineList';
import DiffText from '../molecules/DiffText';

interface ItemHistoryContentProps {
  itemId: string;
  itemName: string;
}

const ItemHistoryContent: React.FC<ItemHistoryContentProps> = ({
  itemId,
  itemName,
}) => {
  if (HISTORY_DEBUG)
    console.log('🪟 ItemHistoryContent props:', { itemId, itemName });

  const { uiActions } = useItemManagement();
  const { form } = useItemManagement();
  const { history, isLoading, restoreVersion } = useEntityHistory(
    'items',
    itemId
  );
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  if (HISTORY_DEBUG)
    console.log('📋 ItemHistoryContent state:', {
      historyCount: history?.length || 0,
      isLoading,
      hasHistory: !!history?.length,
    });

  const handleVersionClick = (item: HistoryItem) => {
    if (selectedVersions.includes(item.version_number)) {
      setSelectedVersions(
        selectedVersions.filter(v => v !== item.version_number)
      );
      setSelectedVersion(null);
    } else if (selectedVersions.length < 2) {
      const newSelected = [...selectedVersions, item.version_number];
      setSelectedVersions(newSelected);
      setSelectedVersion(item.version_number);
    } else {
      setSelectedVersions([selectedVersions[1], item.version_number]);
      setSelectedVersion(item.version_number);
    }
  };

  const handleRestore = async (version: number) => {
    if (confirm(`Yakin ingin mengembalikan ${itemName} ke versi ${version}?`)) {
      try {
        await restoreVersion(version);
        uiActions.goBackToForm();
        window.location.reload(); // Refresh to show restored data
      } catch (error) {
        alert('Gagal mengembalikan versi: ' + error);
      }
    }
  };

  const canCompare = selectedVersions.length === 2;
  const selectedVersionData = history?.find(
    h => h.version_number === selectedVersion
  );

  // Define text fields that should use diff analysis
  const textFields = new Set([
    'name',
    'description',
    'code',
    'rack',
    'base_unit',
    'barcode',
    'manufacturer',
  ]);

  // Helper function to check if field should use diff
  const shouldUseDiff = (field: string) => {
    return textFields.has(field);
  };

  // Helper function to resolve foreign keys to readable values
  const resolveValue = (field: string, value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    switch (field) {
      case 'category_id': {
        const category = form.categories.find(c => c.id === value);
        return category ? category.name : `ID: ${value}`;
      }

      case 'type_id': {
        const type = form.types.find(t => t.id === value);
        return type ? type.name : `ID: ${value}`;
      }

      case 'unit_id': {
        const unit = form.units.find(u => u.id === value);
        return unit ? unit.name : `ID: ${value}`;
      }

      case 'is_active':
        return value ? 'Aktif' : 'Tidak Aktif';

      default:
        return typeof value === 'object'
          ? JSON.stringify(value, null, 2)
          : String(value);
    }
  };

  return (
    <div className="w-full min-w-full">
      {/* Content - 2 Column Layout */}
      <div className="flex h-[60vh] w-full">
        {/* Left Column - History Timeline (1/4 width) */}
        <div className="w-1/4 border-r">
          <div className="flex justify-between items-center p-4 pb-2">
            <h3 className="font-medium">Timeline Versi</h3>
            {canCompare && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => console.log('Compare clicked')}
                className="flex items-center gap-1"
              >
                <FaEye size={12} />
                Compare
              </Button>
            )}
          </div>

          <div className="p-0">
            <HistoryTimelineList
              history={history}
              isLoading={isLoading}
              onVersionClick={handleVersionClick}
              selectedVersions={selectedVersions}
              selectedVersion={selectedVersion}
              showRestoreButton={true}
              onRestore={handleRestore}
              emptyMessage="Tidak ada riwayat perubahan"
              loadingMessage="Loading history..."
            />
          </div>
        </div>

        {/* Right Column - Version Detail/Comparison (3/4 width) */}
        <div className="w-3/4 overflow-y-auto">
          {selectedVersionData ? (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    v{selectedVersionData.version_number}
                  </span>
                  <span className="text-gray-500">Detail Versi</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDateTime(selectedVersionData.changed_at)}
                </p>
              </div>

              {/* Version Data Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Data Item</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedVersionData.entity_data)
                    .filter(
                      ([key]) =>
                        !['id', 'created_at', 'updated_at'].includes(key)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="border-b border-gray-200 pb-2">
                        <div className="text-xs font-medium text-gray-600 capitalize mb-1">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-800">
                          {resolveValue(key, value)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Changed Fields (if available) */}
              {selectedVersionData.changed_fields &&
                Object.keys(selectedVersionData.changed_fields).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Field yang Berubah</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedVersionData.changed_fields).map(
                        ([field, changes]) => (
                          <div
                            key={field}
                            className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                          >
                            <div className="font-medium text-sm mb-2 capitalize">
                              {field.replace(/_/g, ' ')}
                            </div>

                            {shouldUseDiff(field) ? (
                              /* Text fields - Use DiffText component */
                              <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-500 mb-2">
                                  Perubahan:
                                </div>
                                <DiffText
                                  oldText={String(changes.from || '')}
                                  newText={String(changes.to || '')}
                                  mode="smart"
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              /* Non-text fields - Use side-by-side comparison */
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Dari:
                                  </div>
                                  <div className="text-sm bg-red-50 border border-red-200 rounded p-2">
                                    {resolveValue(field, changes.from)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Ke:
                                  </div>
                                  <div className="text-sm bg-green-50 border border-green-200 rounded p-2">
                                    {resolveValue(field, changes.to)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <FaEye size={48} className="mx-auto mb-4 opacity-30" />
              <p>Pilih versi untuk melihat detail perubahan</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer info - will be handled by ItemModalTemplate footer */}
      {selectedVersions.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          <span>Dipilih: v{selectedVersions.join(', v')}</span>
        </div>
      )}
    </div>
  );
};

export default ItemHistoryContent;
