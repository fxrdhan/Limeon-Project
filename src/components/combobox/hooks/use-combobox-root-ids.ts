import { useCallback, useId, useState } from 'react';

export function useComboboxRootIds() {
  const generatedId = useId();
  const defaultTriggerId = `${generatedId}-trigger`;
  const [triggerId, setTriggerIdState] = useState(defaultTriggerId);

  const getItemId = useCallback(
    (index: number) => `${generatedId}-option-${index}`,
    [generatedId]
  );
  const setTriggerId = useCallback((nextTriggerId: string) => {
    setTriggerIdState(currentTriggerId =>
      currentTriggerId === nextTriggerId ? currentTriggerId : nextTriggerId
    );
  }, []);

  return {
    defaultLabelId: `${generatedId}-label`,
    defaultTriggerId,
    generatedId,
    getItemId,
    inputId: `${generatedId}-input`,
    listboxId: `${generatedId}-listbox`,
    setTriggerId,
    triggerId,
  };
}
