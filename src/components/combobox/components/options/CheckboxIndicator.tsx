import React from 'react';
import { TbCheck } from 'react-icons/tb';

interface CheckboxIndicatorProps {
  isSelected: boolean;
  isExpanded: boolean;
}

const CheckboxIndicator: React.FC<CheckboxIndicatorProps> = ({
  isSelected,
  isExpanded,
}) => {
  return (
    <div
      className={`mr-2 flex ${isExpanded ? 'items-start pt-0.5' : 'items-center'} shrink-0`}
    >
      <div
        className={`w-4 h-4 rounded border-2 ${
          isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
        } flex items-center justify-center transition-colors duration-150 ease-out`}
      >
        {isSelected && (
          <TbCheck className="text-white text-[10px]" strokeWidth={2} />
        )}
      </div>
    </div>
  );
};

export default CheckboxIndicator;
