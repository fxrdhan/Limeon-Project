import React from 'react';
import Button from '@/components/button';
import toast from 'react-hot-toast';
import type { VersionData } from '../../shared/types/ItemTypes';

interface ComparisonFooterProps {
  shouldShowRestore: boolean;
  selectedVersion?: VersionData;
  onRestore?: (version: number) => Promise<void>;
  onClose: () => void;
}

const ComparisonFooter: React.FC<ComparisonFooterProps> = ({
  shouldShowRestore,
  selectedVersion,
  onRestore,
  onClose,
}) => {
  const handleRestore = async () => {
    if (!selectedVersion || !onRestore) return;

    if (
      confirm(
        `Yakin ingin mengembalikan data ke versi ${selectedVersion.version_number}?`
      )
    ) {
      try {
        await onRestore(selectedVersion.version_number);
        onClose(); // Close modal after successful restore
      } catch (error) {
        toast.error('Gagal mengembalikan versi: ' + error);
      }
    }
  };

  return (
    <div className="flex justify-between items-center p-4 border-t-2 border-slate-200 rounded-b-lg">
      {shouldShowRestore ? (
        <Button
          type="button"
          variant="text"
          onClick={handleRestore}
          className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          title={`Restore ke versi ${selectedVersion?.version_number}`}
        >
          Restore v{selectedVersion?.version_number}
        </Button>
      ) : (
        <div></div>
      )}
      <Button type="button" variant="text" onClick={onClose}>
        Tutup
      </Button>
    </div>
  );
};

export default ComparisonFooter;
