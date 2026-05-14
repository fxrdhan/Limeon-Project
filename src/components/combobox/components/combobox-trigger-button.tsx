import type { KeyboardEvent, MouseEvent } from 'react';
import { TbChevronDown } from 'react-icons/tb';
import { cn } from '@/lib/utils';
import { Combobox } from '../internal/primitive';
import { setRef } from '../utils/primitive-render';

export interface ComboboxTriggerButtonProps {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
  onMouseEnter?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: () => void;
  onNavigationKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  placeholder: string;
  selectedLabel: string;
  setTriggerButtonRef: (node: HTMLButtonElement | null) => void;
  tabIndex?: number;
  valueId: string;
}

export function ComboboxTriggerButton({
  ariaDescribedBy,
  ariaInvalid,
  ariaLabel,
  ariaLabelledBy,
  id,
  onMouseEnter,
  onMouseLeave,
  onNavigationKeyDown,
  placeholder,
  selectedLabel,
  setTriggerButtonRef,
  tabIndex,
  valueId,
}: ComboboxTriggerButtonProps) {
  return (
    <Combobox.Trigger
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid || undefined}
      tabIndex={tabIndex}
      render={(props, state) => {
        const { ref, onKeyDown, ...triggerProps } = props;

        return (
          <button
            {...triggerProps}
            type="button"
            ref={node => {
              setRef(ref, node);
              setTriggerButtonRef(node);
            }}
            onKeyDown={event => {
              onNavigationKeyDown(event);
              if (event.defaultPrevented) return;

              onKeyDown?.(event);
            }}
            onMouseEnter={event => {
              onMouseEnter?.(event);
            }}
            onMouseLeave={onMouseLeave}
            className={cn(
              'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm transition focus:border-primary focus:outline-hidden focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100',
              ariaInvalid
                ? 'border-red-400'
                : state.open
                  ? 'border-primary'
                  : 'border-slate-300'
            )}
          >
            <span
              id={valueId}
              className={selectedLabel ? 'truncate' : 'truncate text-slate-400'}
            >
              {selectedLabel || placeholder}
            </span>
            <TbChevronDown
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 text-slate-500 transition-transform',
                state.open && 'rotate-180'
              )}
            />
          </button>
        );
      }}
    />
  );
}
