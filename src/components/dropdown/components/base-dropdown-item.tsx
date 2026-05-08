import React from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { renderHighlightedText } from '@/components/dropdown/utils/render-highlighted-text';
import type { DropdownOption } from '@/types';

const highlightBackgroundTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const BaseDropdownItem = ({
  highlighted,
  highlightLayoutId,
  index,
  onHighlightPreview,
  onMouseEnter,
  onMouseLeave,
  option,
  searchTerm,
  selected,
  style,
  withCheckbox,
  withRadio,
}: {
  highlighted: boolean;
  highlightLayoutId: string;
  index: number;
  onHighlightPreview: (optionId: string) => void;
  onMouseEnter: (option: DropdownOption, element: HTMLElement) => void;
  onMouseLeave: () => void;
  option: DropdownOption;
  searchTerm: string;
  selected: boolean;
  style?: React.CSSProperties;
  withCheckbox: boolean;
  withRadio: boolean;
}) => (
  <Combobox.Item
    value={option.id}
    index={index}
    data-dropdown-option-highlighted={highlighted ? '' : undefined}
    data-dropdown-option-index={index}
    className="relative z-10 flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-sm outline-hidden transition-colors duration-150"
    style={style}
    onMouseEnter={event => {
      onHighlightPreview(option.id);
      onMouseEnter(option, event.currentTarget);
    }}
    onMouseLeave={onMouseLeave}
  >
    {highlighted ? (
      <motion.div
        key={highlightLayoutId}
        layoutId={highlightLayoutId}
        initial={false}
        className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10"
        transition={highlightBackgroundTransition}
      />
    ) : null}
    {withRadio ? (
      <span
        className={cn(
          'relative z-10 mr-2 h-3.5 w-3.5 shrink-0 rounded-full border',
          selected
            ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]'
            : 'border-slate-300'
        )}
      />
    ) : null}
    {withCheckbox ? (
      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 mr-2 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px]',
          selected
            ? 'border-primary bg-primary text-white'
            : 'border-slate-300 bg-white text-transparent'
        )}
      >
        ✓
      </span>
    ) : null}
    <span
      className={cn(
        'relative z-10 min-w-0 flex-1 truncate text-left',
        selected ? 'font-semibold text-primary' : 'text-slate-800'
      )}
      title={option.name}
    >
      {renderHighlightedText(option.name, searchTerm)}
    </span>
  </Combobox.Item>
);

export default BaseDropdownItem;
