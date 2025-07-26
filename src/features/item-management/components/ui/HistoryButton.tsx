import React, { useState } from "react";
import Button from "@/components/button";
import { FaHistory } from "react-icons/fa";
import HistoryModal from "./HistoryModal";

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
  className = "",
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <>
      <Button
        variant="text"
        onClick={() => setIsHistoryOpen(true)}
        className={`text-gray-500 hover:text-gray-700 p-1 ${className}`}
        title={`Lihat riwayat perubahan ${entityName}`}
      >
        <FaHistory size={16} />
      </Button>
      
      {isHistoryOpen && (
        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          entityTable={entityTable}
          entityId={entityId}
          entityName={entityName}
        />
      )}
    </>
  );
};

export default HistoryButton;