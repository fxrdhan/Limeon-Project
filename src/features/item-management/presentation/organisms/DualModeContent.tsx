import React from 'react';
import type { VersionData } from '../../shared/types/ItemTypes';

interface DualModeContentProps {
  isFlipped: boolean;
  compData: {
    leftVersion?: VersionData;
    rightVersion?: VersionData | null;
    leftKode: string;
    rightKode: string;
    leftName: string;
    rightName: string;
    leftDescription: string;
    rightDescription: string;
  } | null;
  entityName: string;
}

const DualModeContent: React.FC<DualModeContentProps> = ({
  isFlipped,
  compData,
  entityName,
}) => {
  if (!compData) return null;

  return (
    <div className="space-y-4">
      {/* Kode Comparison */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-purple-200 bg-purple-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm font-mono">
              {compData.leftKode || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-blue-200 bg-blue-50'
                : 'border-purple-200 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm font-mono">
              {compData.rightKode || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name Comparison */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama {entityName}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-purple-200 bg-purple-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm font-medium">
              {compData.leftName || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-blue-200 bg-blue-50'
                : 'border-purple-200 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm font-medium">
              {compData.rightName || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description/Address Comparison */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-purple-200 bg-purple-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
              {compData.leftDescription || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`border rounded-lg p-3 ${
              isFlipped
                ? 'border-blue-200 bg-blue-50'
                : 'border-purple-200 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
              {compData.rightDescription || (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualModeContent;
