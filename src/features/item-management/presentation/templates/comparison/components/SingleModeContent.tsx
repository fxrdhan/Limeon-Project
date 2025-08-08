import React from 'react';
import Input from '@/components/input';
import DescriptiveTextarea from '@/components/descriptive-textarea';

interface SingleModeContentProps {
  compData: {
    leftKode: string;
    leftName: string;
    leftDescription: string;
  } | null;
  entityName: string;
}

const SingleModeContent: React.FC<SingleModeContentProps> = ({
  compData,
  entityName,
}) => {
  if (!compData) return null;

  return (
    <div className="space-y-4">
      <Input
        label="Kode"
        value={compData.leftKode}
        placeholder="Kode"
        readOnly
        tabIndex={-1}
        className="pointer-events-none select-none font-mono"
      />

      <Input
        label={`Nama ${entityName}`}
        value={compData.leftName}
        placeholder={`Nama ${entityName.toLowerCase()}`}
        required
        readOnly
        tabIndex={-1}
        className="pointer-events-none select-none"
      />

      <DescriptiveTextarea
        label={entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        name={entityName === 'Produsen' ? 'address' : 'description'}
        value={compData.leftDescription}
        onChange={() => {}} // No-op since readOnly
        placeholder={entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
        readOnly
        autoFocus={false}
        tabIndex={-1}
        textareaClassName="text-sm min-h-[80px] max-h-[120px] resize-none cursor-default"
        rows={3}
        showInitially={!!compData.leftDescription}
        expandOnClick={true}
      />
    </div>
  );
};

export default SingleModeContent;
