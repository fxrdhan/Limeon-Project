import { useId, useLayoutEffect } from 'react';
import type React from 'react';
import { useComboboxContext } from './primitive-context';

type ComboboxLabelProps = React.ComponentPropsWithoutRef<'label'>;

export function ComboboxLabel({ children, id, ...props }: ComboboxLabelProps) {
  const context = useComboboxContext<unknown>();
  const { defaultLabelId, registerLabelId, triggerId } = context;
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
