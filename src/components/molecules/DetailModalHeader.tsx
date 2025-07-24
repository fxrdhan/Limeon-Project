import React from "react";
import { FaHistory } from "react-icons/fa";
import { useDetailModalContext } from "@/contexts/DetailModalContext";

const DetailModalHeader: React.FC = () => {
  const { title, mode, formattedUpdateAt } = useDetailModalContext();

  return (
    <div className="flex justify-between items-center p-4 border-b">
      <div className="flex flex-col">
        <h2 className="text-xl font-semibold">{title}</h2>
        {mode === "edit" && formattedUpdateAt !== "-" && (
          <span className="text-sm text-gray-500 italic flex items-center mt-1">
            <FaHistory className="mr-1" size={12} />
            {formattedUpdateAt}
          </span>
        )}
      </div>
    </div>
  );
};

export default DetailModalHeader;