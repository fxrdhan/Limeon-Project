import React from 'react';
import Button from '@/components/button';
import { FaHistory } from 'react-icons/fa';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';

interface HistoryButtonProps {
  entityTable: string;
  entityId: string;
  entityName: string;
  className?: string;
}

const HistoryButton: React.FC<HistoryButtonProps> = ({
  entityTable,
  entityId,
  entityName,
  className = '',
}) => {
  const { uiActions } = useEntityModal();

  const handleHistoryClick = () => {
    uiActions.openHistory(entityTable, entityId);
  };

  return (
    <Button
      variant="text"
      onClick={handleHistoryClick}
      className={`text-gray-500 hover:text-gray-700 p-1 ${className}`}
      title={`Lihat riwayat perubahan ${entityName}`}
    >
      <FaHistory size={16} />
    </Button>
  );
};

export default HistoryButton;
