import React from 'react';
import type { VersionData } from '../../shared/types/ItemTypes';
import { DiffText } from '../molecules';

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
    isKodeDifferent?: boolean;
    isNameDifferent?: boolean;
    isDescriptionDifferent?: boolean;
  } | null;
  entityName: string;
  originalData?: {
    originalLeftKode: string;
    originalRightKode: string;
    originalLeftName: string;
    originalRightName: string;
    originalLeftDescription: string;
    originalRightDescription: string;
  } | null;
}

const DualModeContent: React.FC<DualModeContentProps> = ({
  isFlipped,
  compData,
  entityName,
  originalData,
}) => {
  if (!compData) return null;

  // Use original data for diff if available, otherwise use current compData
  const leftKode = originalData?.originalLeftKode || compData.leftKode;
  const rightKode = originalData?.originalRightKode || compData.rightKode;
  const leftName = originalData?.originalLeftName || compData.leftName;
  const rightName = originalData?.originalRightName || compData.rightName;
  const leftDescription =
    originalData?.originalLeftDescription || compData.leftDescription;
  const rightDescription =
    originalData?.originalRightDescription || compData.rightDescription;

  return (
    <div className="space-y-4">
      {/* Kode Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">
          Kode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm h-[2.5rem] ${
              compData.isKodeDifferent
                ? isFlipped
                  ? 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                  : 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                : isFlipped
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-blue-300 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {compData.isKodeDifferent ? (
                <DiffText
                  oldText={leftKode}
                  newText={rightKode}
                  isFlipped={isFlipped}
                  className="text-sm"
                />
              ) : compData.leftKode ? (
                compData.leftKode
              ) : (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm h-[2.5rem] ${
              compData.isKodeDifferent
                ? isFlipped
                  ? 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                  : 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                : isFlipped
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-purple-300 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {compData.isKodeDifferent ? (
                <DiffText
                  oldText={leftKode}
                  newText={rightKode}
                  isFlipped={!isFlipped}
                  className="text-sm"
                />
              ) : compData.rightKode ? (
                compData.rightKode
              ) : (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">
          Nama {entityName}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm h-[2.5rem] ${
              compData.isNameDifferent
                ? isFlipped
                  ? 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                  : 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                : isFlipped
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-blue-300 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {compData.isNameDifferent ? (
                <DiffText
                  oldText={leftName}
                  newText={rightName}
                  isFlipped={isFlipped}
                  className="text-sm"
                />
              ) : compData.leftName ? (
                compData.leftName
              ) : (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm h-[2.5rem] ${
              compData.isNameDifferent
                ? isFlipped
                  ? 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                  : 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                : isFlipped
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-purple-300 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {compData.isNameDifferent ? (
                <DiffText
                  oldText={leftName}
                  newText={rightName}
                  isFlipped={!isFlipped}
                  className="text-sm"
                />
              ) : compData.rightName ? (
                compData.rightName
              ) : (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description/Address Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">
          {entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm ${
              compData.isDescriptionDifferent
                ? isFlipped
                  ? 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                  : 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                : isFlipped
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-blue-300 bg-blue-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
            >
              v{compData.leftVersion?.version_number}
            </div>
            <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
              {compData.isDescriptionDifferent ? (
                <DiffText
                  oldText={leftDescription}
                  newText={rightDescription}
                  isFlipped={isFlipped}
                  className="text-sm leading-relaxed"
                />
              ) : compData.leftDescription ? (
                compData.leftDescription
              ) : (
                <span className="text-gray-400 italic">Empty</span>
              )}
            </div>
          </div>
          <div
            className={`p-2.5 border rounded-lg px-3 text-sm ${
              compData.isDescriptionDifferent
                ? isFlipped
                  ? 'border-blue-500 bg-blue-50 ring-3 ring-blue-500/20'
                  : 'border-purple-500 bg-purple-50 ring-3 ring-purple-500/20'
                : isFlipped
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-purple-300 bg-purple-50'
            }`}
          >
            <div
              className={`text-xs mb-1 ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
            >
              v{compData.rightVersion?.version_number}
            </div>
            <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
              {compData.isDescriptionDifferent ? (
                <DiffText
                  oldText={leftDescription}
                  newText={rightDescription}
                  isFlipped={!isFlipped}
                  className="text-sm leading-relaxed"
                />
              ) : compData.rightDescription ? (
                compData.rightDescription
              ) : (
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
