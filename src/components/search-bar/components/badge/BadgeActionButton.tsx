import type { MouseEvent, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

interface BadgeActionButtonProps {
  ariaHidden: boolean;
  ariaLabel: string;
  children: ReactNode;
  hoverBgClassName: string;
  iconVisible: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  showButtonSpace: boolean;
  tabIndex: number;
  tooltipLabel: string;
  withLeadingMargin?: boolean;
}

export const BadgeActionButton = ({
  ariaHidden,
  ariaLabel,
  children,
  hoverBgClassName,
  iconVisible,
  onClick,
  onMouseDown,
  showButtonSpace,
  tabIndex,
  tooltipLabel,
  withLeadingMargin = false,
}: BadgeActionButtonProps) => (
  <div
    className={`flex h-6 flex-shrink-0 items-center justify-center overflow-hidden transition-[width,opacity,margin] duration-150 ease-out ${
      showButtonSpace ? 'w-6 opacity-100' : 'w-0 opacity-0'
    } ${withLeadingMargin ? (showButtonSpace ? 'ml-1' : 'ml-0') : ''}`}
  >
    <Tooltip side="bottom">
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          onMouseDown={onMouseDown}
          className={`inline-flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-md leading-none ${hoverBgClassName} transition-[opacity,transform] duration-150 ease-out ${
            iconVisible
              ? 'opacity-100 translate-x-0'
              : 'pointer-events-none opacity-0 -translate-x-1'
          }`}
          type="button"
          aria-label={ariaLabel}
          aria-hidden={ariaHidden}
          tabIndex={tabIndex}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  </div>
);
