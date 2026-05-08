import {
  TbCheck,
  TbCircle,
  TbCircleCheck,
  TbSquare,
  TbSquareCheck,
} from 'react-icons/tb';

export type ComboboxIndicatorKind = 'check' | 'radio' | 'checkbox' | 'none';

export function ComboboxSelectionIndicator({
  kind,
  selected,
}: {
  kind: ComboboxIndicatorKind;
  selected: boolean;
}) {
  if (kind === 'none') return null;

  if (kind === 'radio') {
    return selected ? (
      <TbCircleCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbCircle className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }

  if (kind === 'checkbox') {
    return selected ? (
      <TbSquareCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbSquare className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }

  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {selected ? <TbCheck className="h-4 w-4 text-primary" /> : null}
    </span>
  );
}
