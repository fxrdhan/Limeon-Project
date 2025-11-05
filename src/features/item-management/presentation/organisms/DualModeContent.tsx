import React from 'react';
import type { VersionData } from '../../shared/types/ItemTypes';
import { DiffText } from '../molecules';

interface DualModeContentProps {
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
  isFlipped?: boolean;
}

const DualModeContent: React.FC<DualModeContentProps> = ({
  compData,
  entityName,
  originalData,
  isFlipped = false,
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

  // When flipped, swap old/new for diff
  // Normal: left (older/first selected) -> right (newer/second selected)
  // Flipped: right (now treated as older) -> left (now treated as newer)
  const getOldText = (left: string, right: string) =>
    isFlipped ? right : left;
  const getNewText = (left: string, right: string) =>
    isFlipped ? left : right;

  return (
    <div className="space-y-4">
      {/* Kode Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">Kode</label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 h-[2.5rem] flex items-center text-ellipsis overflow-hidden whitespace-nowrap ${
            compData.isKodeDifferent
              ? 'border-purple-500 ring-3 ring-purple-500/20'
              : 'border-gray-300'
          }`}
        >
          {compData.isKodeDifferent ? (
            <DiffText
              oldText={getOldText(leftKode, rightKode)}
              newText={getNewText(leftKode, rightKode)}
              className="w-full"
            />
          ) : (
            <span className="text-gray-800">{leftKode}</span>
          )}
        </div>
      </div>

      {/* Name Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">Nama {entityName}</label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 h-[2.5rem] flex items-center text-ellipsis overflow-hidden whitespace-nowrap ${
            compData.isNameDifferent
              ? 'border-purple-500 ring-3 ring-purple-500/20'
              : 'border-gray-300'
          }`}
        >
          {compData.isNameDifferent ? (
            <DiffText
              oldText={getOldText(leftName, rightName)}
              newText={getNewText(leftName, rightName)}
              className="w-full"
            />
          ) : (
            <span className="text-gray-800">{leftName}</span>
          )}
        </div>
      </div>

      {/* Description/Address Comparison */}
      <div>
        <label className="block text-gray-700 mb-2">
          {entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        </label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 min-h-[80px] max-h-[120px] overflow-y-auto ${
            compData.isDescriptionDifferent
              ? 'border-purple-500 ring-3 ring-purple-500/20'
              : 'border-gray-300'
          }`}
        >
          {compData.isDescriptionDifferent ? (
            <DiffText
              oldText={getOldText(leftDescription, rightDescription)}
              newText={getNewText(leftDescription, rightDescription)}
              className="w-full leading-relaxed"
            />
          ) : (
            <span className="text-gray-800 whitespace-pre-wrap">
              {leftDescription}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualModeContent;
