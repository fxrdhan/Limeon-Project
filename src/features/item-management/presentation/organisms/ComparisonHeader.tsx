import React from 'react';
import { FaExchangeAlt } from 'react-icons/fa';
import type { VersionData } from '../../shared/types/ItemTypes';

interface ComparisonHeaderProps {
  isDualMode: boolean;
  isFlipped: boolean;
  compData: {
    leftVersion?: VersionData;
    rightVersion?: VersionData | null;
  } | null;
  onFlipVersions: () => void;
}

const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  isDualMode,
  isFlipped,
  compData,
  onFlipVersions,
}) => {
  if (!compData) return null;

  return (
    <div className="p-2.5 border-b-2 bg-gray-100 border-gray-200 rounded-t-xl">
      {isDualMode ? (
        /* Dual Mode Header */
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2 items-center">
            {/* Left Version */}
            <div
              className={`col-span-2 ${isFlipped ? 'bg-purple-50 rounded-lg p-2' : 'bg-blue-50 rounded-lg p-2'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    isFlipped
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-blue-200 text-blue-800'
                  }`}
                >
                  v{compData.leftVersion?.version_number}
                </span>
              </div>
              <div
                className={`text-xs ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
              >
                {compData.leftVersion &&
                  new Date(compData.leftVersion.changed_at).toLocaleString(
                    'id-ID'
                  )}
              </div>
            </div>

            {/* Center Flip Button */}
            <div className="col-span-1 flex justify-center">
              <button
                onClick={onFlipVersions}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Swap positions"
              >
                <FaExchangeAlt size={14} />
              </button>
            </div>

            {/* Right Version */}
            <div
              className={`col-span-2 ${isFlipped ? 'bg-blue-50 rounded-lg p-2' : 'bg-purple-50 rounded-lg p-2'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    isFlipped
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-purple-200 text-purple-800'
                  }`}
                >
                  v{compData.rightVersion?.version_number}
                </span>
              </div>
              <div
                className={`text-xs ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
              >
                {compData.rightVersion &&
                  new Date(compData.rightVersion.changed_at).toLocaleString(
                    'id-ID'
                  )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single Mode Header */
        <div className="rounded-lg p-2">
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`text-xs px-2 py-1 rounded ${
                compData.leftVersion?.action_type === 'INSERT'
                  ? 'bg-green-100 text-green-700'
                  : compData.leftVersion?.action_type === 'UPDATE'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {compData.leftVersion?.action_type}
            </span>
            <span className="text-xs text-gray-600">
              {compData.leftVersion &&
                new Date(compData.leftVersion.changed_at).toLocaleString(
                  'id-ID'
                )}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded ml-auto">
              v{compData.leftVersion?.version_number}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonHeader;
