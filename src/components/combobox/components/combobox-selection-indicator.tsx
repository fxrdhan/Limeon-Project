import {
  TbCheck,
  TbCircle,
  TbCircleCheck,
  TbSquare,
  TbSquareCheck,
} from 'react-icons/tb';
import { cn } from '@/lib/utils';

export type ComboboxIndicatorKind = 'check' | 'radio' | 'checkbox' | 'none';

type ComboboxSelectionIndicatorClassNames = {
  indicator?: string;
  indicatorSelected?: string;
  indicatorUnselected?: string;
};

export function ComboboxSelectionIndicator({
  classNames,
  kind,
  selected,
}: {
  classNames?: ComboboxSelectionIndicatorClassNames;
  kind: ComboboxIndicatorKind;
  selected: boolean;
}) {
  if (kind === 'none') return null;

  if (kind === 'radio') {
    return selected ? (
      <TbCircleCheck
        aria-hidden="true"
        className={cn(
          'h-4 w-4 shrink-0 text-primary',
          classNames?.indicator,
          classNames?.indicatorSelected
        )}
      />
    ) : (
      <TbCircle
        aria-hidden="true"
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300',
          classNames?.indicator,
          classNames?.indicatorUnselected
        )}
      />
    );
  }

  if (kind === 'checkbox') {
    return selected ? (
      <TbSquareCheck
        aria-hidden="true"
        className={cn(
          'h-4 w-4 shrink-0 text-primary',
          classNames?.indicator,
          classNames?.indicatorSelected
        )}
      />
    ) : (
      <TbSquare
        aria-hidden="true"
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300',
          classNames?.indicator,
          classNames?.indicatorUnselected
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center',
        classNames?.indicator
      )}
    >
      {selected ? (
        <TbCheck
          aria-hidden="true"
          className={cn('h-4 w-4 text-primary', classNames?.indicatorSelected)}
        />
      ) : null}
    </span>
  );
}
