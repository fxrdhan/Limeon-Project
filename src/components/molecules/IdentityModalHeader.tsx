import React from "react";
import { FaHistory } from "react-icons/fa";
import { useIdentityModalContext } from "@/contexts/IdentityModalContext";

const IdentityModalHeader: React.FC = () => {
  const { title, mode, formattedUpdateAt } = useIdentityModalContext();

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

export default IdentityModalHeader;
