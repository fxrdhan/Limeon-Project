import { useCallback, useMemo, useState } from 'react';

export function useComboboxRootLabelRegistry({
  labelId,
}: {
  labelId?: string;
}) {
  const [registeredLabelIds, setRegisteredLabelIds] = useState<string[]>([]);
  const registeredLabelId = useMemo(() => {
    if (registeredLabelIds.length === 0) return undefined;

    return Array.from(new Set(registeredLabelIds)).join(' ');
  }, [registeredLabelIds]);
  const registerLabelId = useCallback((nextLabelId: string) => {
    setRegisteredLabelIds(currentLabelIds => [...currentLabelIds, nextLabelId]);
    return () => {
      setRegisteredLabelIds(currentLabelIds => {
        const labelIndex = currentLabelIds.indexOf(nextLabelId);
        if (labelIndex < 0) return currentLabelIds;

        return [
          ...currentLabelIds.slice(0, labelIndex),
          ...currentLabelIds.slice(labelIndex + 1),
        ];
      });
    };
  }, []);

  return {
    labelId: labelId ?? registeredLabelId,
    registerLabelId,
  };
}
