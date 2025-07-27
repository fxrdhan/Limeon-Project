import React, { useState } from "react";
import Button from "@/components/button";
import { FaTimes, FaHistory, FaUndo, FaEye } from "react-icons/fa";
import { useEntityHistory } from "../../../hooks/useEntityHistory";
import VersionDiff from "./VersionDiff";
import { formatDateTime } from "@/lib/formatters";
import { HISTORY_DEBUG } from "../../../config/debug";
import type { HistoryModalProps } from "../../../types";

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  entityTable,
  entityId,
  entityName,
}) => {
  if (HISTORY_DEBUG) console.log('🪟 HistoryModal props:', { isOpen, entityTable, entityId, entityName });
  
  const { history, isLoading, restoreVersion } = useEntityHistory(entityTable, entityId);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  if (HISTORY_DEBUG) console.log('📋 HistoryModal state:', { 
    historyCount: history?.length || 0, 
    isLoading, 
    hasHistory: !!history?.length 
  });

  if (!isOpen) return null;

  const handleVersionSelect = (version: number) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter(v => v !== version));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version]);
    } else {
      setSelectedVersions([selectedVersions[1], version]);
    }
  };

  const handleRestore = async (version: number) => {
    if (confirm(`Yakin ingin mengembalikan ${entityName} ke versi ${version}?`)) {
      try {
        await restoreVersion(version);
        onClose();
        window.location.reload(); // Refresh to show restored data
      } catch (error) {
        alert("Gagal mengembalikan versi: " + error);
      }
    }
  };

  const canCompare = selectedVersions.length === 2;
  const fromVersion = history?.find(h => h.version_number === selectedVersions[0]);
  const toVersion = history?.find(h => h.version_number === selectedVersions[1]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FaHistory className="text-gray-600" />
            <h2 className="text-lg font-semibold">Riwayat Perubahan {entityName}</h2>
          </div>
          <Button variant="text" onClick={onClose}>
            <FaTimes size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[70vh]">
          {/* Timeline */}
          <div className="w-1/2 border-r overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Timeline Versi</h3>
              {canCompare && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDiff(true)}
                  className="flex items-center gap-1"
                >
                  <FaEye size={12} />
                  Compare
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-3">
                {history?.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedVersions.includes(item.version_number)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleVersionSelect(item.version_number)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            v{item.version_number}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.action_type === 'INSERT' ? 'bg-green-100 text-green-700' :
                            item.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.action_type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {formatDateTime(item.changed_at)}
                        </div>
                        {item.changed_fields && (
                          <div className="text-xs text-gray-600">
                            Changed: {Object.keys(item.changed_fields).join(", ")}
                          </div>
                        )}
                      </div>
                      {item.version_number > 1 && (
                        <Button
                          variant="text"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(item.version_number);
                          }}
                          className="text-orange-600 hover:text-orange-700"
                          title="Restore ke versi ini"
                        >
                          <FaUndo size={12} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diff Viewer */}
          <div className="w-1/2 overflow-y-auto">
            {showDiff && canCompare && fromVersion && toVersion ? (
              <VersionDiff
                fromVersion={fromVersion}
                toVersion={toVersion}
                entityName={entityName}
              />
            ) : (
              <div className="p-4 text-center text-gray-500">
                <FaEye size={48} className="mx-auto mb-4 opacity-30" />
                <p>Pilih 2 versi untuk membandingkan perubahan</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-500">
            {selectedVersions.length > 0 && (
              <span>
                Dipilih: v{selectedVersions.join(", v")}
              </span>
            )}
          </div>
          <Button variant="text" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;