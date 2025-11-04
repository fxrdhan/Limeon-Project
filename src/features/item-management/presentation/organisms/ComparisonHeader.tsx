import React from 'react';
import type { VersionData } from '../../shared/types/ItemTypes';

interface ComparisonHeaderProps {
  isDualMode: boolean;
  compData: {
    leftVersion?: VersionData;
    rightVersion?: VersionData | null;
  } | null;
}

const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  isDualMode,
  compData,
}) => {
  if (!compData) return null;

  return (
    <div className="p-2.5 border-b-2 bg-gray-100 border-gray-200 rounded-t-xl">
      {isDualMode ? (
        /* Dual Mode Header */
        <div className="rounded-lg p-2">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                v{compData.leftVersion?.version_number}
              </span>
              <span className="text-xs text-gray-600">
                {compData.leftVersion &&
                  new Date(compData.leftVersion.changed_at).toLocaleString(
                    'id-ID',
                    { dateStyle: 'short', timeStyle: 'short' }
                  )}
              </span>
            </div>
            <span className="text-gray-400">vs</span>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                v{compData.rightVersion?.version_number}
              </span>
              <span className="text-xs text-gray-600">
                {compData.rightVersion &&
                  new Date(compData.rightVersion.changed_at).toLocaleString(
                    'id-ID',
                    { dateStyle: 'short', timeStyle: 'short' }
                  )}
              </span>
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
