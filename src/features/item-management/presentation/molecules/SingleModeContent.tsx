import React from 'react';
import DiffText from './DiffText';
import { diffChars, convertChangesToSegments } from '@/utils/jsdiff';

interface SingleModeContentProps {
  compData: {
    leftKode: string;
    leftName: string;
    leftDescription: string;
    rightKode: string;
    rightName: string;
    rightDescription: string;
    isKodeDifferent?: boolean;
    isNameDifferent?: boolean;
    isDescriptionDifferent?: boolean;
  } | null;
  entityName: string;
}

const SingleModeContent: React.FC<SingleModeContentProps> = ({
  compData,
  entityName,
}) => {
  if (!compData) return null;

  // Helper function to determine border/ring color based on diff type
  const getDiffBorderClass = (oldText: string, newText: string): string => {
    const changes = diffChars(oldText, newText);
    const segments = convertChangesToSegments(changes);

    const hasRemoved = segments.some(seg => seg.type === 'removed');
    const hasAdded = segments.some(seg => seg.type === 'added');

    // If has removals, use red (danger) - priority for deletions
    if (hasRemoved) {
      return 'border-red-500 ring-3 ring-red-500/20';
    }
    // If only additions, use green (success)
    if (hasAdded) {
      return 'border-green-500 ring-3 ring-green-500/20';
    }
    // Default (no difference)
    return 'border-gray-300';
  };

  return (
    <div className="space-y-4">
      {/* Kode Field */}
      <div>
        <label className="block text-gray-700 mb-2">
          Kode
        </label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 h-[2.5rem] flex items-center text-ellipsis overflow-hidden whitespace-nowrap ${
            compData.isKodeDifferent
              ? getDiffBorderClass(compData.leftKode, compData.rightKode)
              : 'border-gray-300'
          }`}
        >
          {compData.isKodeDifferent ? (
            <DiffText
              oldText={compData.leftKode}
              newText={compData.rightKode}
              className="w-full"
            />
          ) : (
            <span className="text-gray-800">
              {compData.leftKode}
            </span>
          )}
        </div>
      </div>

      {/* Name Field */}
      <div>
        <label className="block text-gray-700 mb-2">
          Nama {entityName}
        </label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 h-[2.5rem] flex items-center text-ellipsis overflow-hidden whitespace-nowrap ${
            compData.isNameDifferent
              ? getDiffBorderClass(compData.leftName, compData.rightName)
              : 'border-gray-300'
          }`}
        >
          {compData.isNameDifferent ? (
            <DiffText
              oldText={compData.leftName}
              newText={compData.rightName}
              className="w-full"
            />
          ) : (
            <span className="text-gray-800">{compData.leftName}</span>
          )}
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-gray-700 mb-2">
          {entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        </label>
        <div
          className={`p-2.5 border rounded-lg px-3 text-sm bg-gray-50 min-h-[80px] max-h-[120px] overflow-y-auto ${
            compData.isDescriptionDifferent
              ? getDiffBorderClass(compData.leftDescription, compData.rightDescription)
              : 'border-gray-300'
          }`}
        >
          {compData.isDescriptionDifferent ? (
            <DiffText
              oldText={compData.leftDescription}
              newText={compData.rightDescription}
              className="w-full leading-relaxed"
            />
          ) : (
            <span className="text-gray-800 whitespace-pre-wrap">
              {compData.leftDescription}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SingleModeContent;
