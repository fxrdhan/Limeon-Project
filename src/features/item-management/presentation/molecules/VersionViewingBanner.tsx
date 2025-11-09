import React from 'react';
import { FaHistory, FaUndo } from 'react-icons/fa';
import Button from '@/components/button';
import { formatDateTime } from '@/lib/formatters';

interface VersionViewingBannerProps {
  versionNumber: number;
  versionDate: string;
  onBackToCurrent: () => void;
  onRestore?: () => void;
}

const VersionViewingBanner: React.FC<VersionViewingBannerProps> = ({
  versionNumber,
  versionDate,
  onBackToCurrent,
  onRestore,
}) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 px-6 py-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaHistory className="text-blue-600 text-lg" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">Viewing Version</span>
              <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-sm font-medium">
                v{versionNumber}
              </span>
            </div>
            <div className="text-sm text-blue-700 mt-0.5">
              {formatDateTime(versionDate)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRestore && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRestore}
              className="text-blue-600 border-blue-600 hover:bg-blue-100"
            >
              <FaUndo className="mr-1.5" size={12} />
              Restore This Version
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onBackToCurrent}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Back to Current
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-blue-600">
        This is a historical snapshot. Data shown reflects the state at this
        version.
      </div>
    </div>
  );
};

export default VersionViewingBanner;
