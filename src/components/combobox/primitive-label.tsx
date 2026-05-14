import { useId, useLayoutEffect } from 'react';
import type React from 'react';
import {
  useComboboxActionsContext,
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';

type ComboboxLabelProps = React.ComponentPropsWithoutRef<'label'>;

export function ComboboxLabel({ children, id, ...props }: ComboboxLabelProps) {
  const { defaultLabelId } = useComboboxStaticContext();
  const { triggerId } = useComboboxStateContext<unknown>();
  const { registerLabelId } = useComboboxActionsContext<unknown>();
  const generatedLabelId = useId();
  const effectiveId = id ?? `${defaultLabelId}-${generatedLabelId}`;

  useLayoutEffect(
    () => registerLabelId(effectiveId),
    [effectiveId, registerLabelId]
  );

  return (
    <label {...props} id={effectiveId} htmlFor={triggerId}>
      {children}
    </label>
  );
}
