import React from 'react';

interface RadioIndicatorProps {
  isSelected: boolean;
  isExpanded: boolean;
}

const RadioIndicator: React.FC<RadioIndicatorProps> = ({
  isSelected,
  isExpanded,
}) => {
  return (
    <div
      className={`mr-2 flex ${isExpanded ? 'items-start pt-0.5' : 'items-center'} shrink-0`}
    >
      <div
        className={`w-4 h-4 rounded-full border ${
          isSelected ? 'border-primary' : 'border-slate-300'
        } flex items-center justify-center`}
      >
        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
      </div>
    </div>
  );
};

export default RadioIndicator;
