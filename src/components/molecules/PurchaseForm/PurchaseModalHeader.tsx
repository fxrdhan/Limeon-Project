import React from 'react';
import { TbX } from 'react-icons/tb';
import Button from '@/components/button';
import { CardHeader, CardTitle } from '@/components/card';

interface PurchaseModalHeaderProps {
  title: string;
  onClose: () => void;
  isClosing: boolean;
  setIsClosing: React.Dispatch<React.SetStateAction<boolean>>;
}

const PurchaseModalHeader: React.FC<PurchaseModalHeaderProps> = ({
  title,
  onClose,
  isClosing,
  setIsClosing,
}) => {
  const handleClose = () => {
    if (!isClosing) {
      setIsClosing(true);
      onClose();
    }
  };

  return (
    <CardHeader className="flex items-center justify-between sticky z-10 py-6! px-4! border-b-2 border-gray-200 mb-6">
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <CardTitle>{title}</CardTitle>
      </div>
      <div className="flex items-center space-x-1 shrink-0 ml-auto">
        <Button
          variant="text"
          size="sm"
          onClick={handleClose}
          className="p-2"
          title="Tutup"
        >
          <TbX size={18} />
        </Button>
      </div>
    </CardHeader>
  );
};

export default PurchaseModalHeader;
