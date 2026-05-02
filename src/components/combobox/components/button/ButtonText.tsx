import React from 'react';

interface ButtonTextProps {
  valueTextId?: string;
  displayText: string;
  titleText?: string;
  metaLabel?: string;
  isPlaceholder: boolean;
  isExpanded: boolean;
}

const ButtonText: React.FC<ButtonTextProps> = ({
  valueTextId,
  displayText,
  titleText,
  metaLabel,
  isPlaceholder,
  isExpanded,
}) => {
  return (
    <span className="flex flex-1 min-w-0 items-center gap-2">
      <span
        id={valueTextId}
        className={`${
          isExpanded
            ? 'whitespace-normal break-words leading-relaxed'
            : 'truncate'
        } ${
          isPlaceholder ? 'text-slate-400' : 'text-slate-800'
        } transition-all duration-200 text-left flex-1 min-w-0`}
        title={titleText}
      >
        {displayText}
      </span>
      {metaLabel ? (
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {metaLabel}
        </span>
      ) : null}
    </span>
  );
};

export default ButtonText;
