import React from 'react';
import { FaEye } from 'react-icons/fa';
import { formatDateTime } from '@/lib/formatters';
import { useItemForm } from '../../shared/contexts/useItemFormContext';

// History item type with entity_data
interface HistoryItemWithData {
  id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
}

interface ItemHistoryDiffViewerProps {
  selectedVersion: HistoryItemWithData | null;
}

const ItemHistoryDiffViewer: React.FC<ItemHistoryDiffViewerProps> = ({
  selectedVersion,
}) => {
  const form = useItemForm();

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

  if (!selectedVersion) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FaEye size={48} className="mx-auto mb-4 opacity-30" />
        <p>Pilih versi dari timeline untuk melihat detail data</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
            v{selectedVersion.version_number}
          </span>
          <span className="text-gray-500">Data Versi</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateTime(selectedVersion.changed_at)}
        </p>
      </div>

      {/* Version Data */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Data Item pada Versi Ini</h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(selectedVersion.entity_data)
            .filter(
              ([key]) => !['id', 'created_at', 'updated_at'].includes(key)
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
    </div>
  );
};

export default ItemHistoryDiffViewer;
