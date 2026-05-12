import { useCallback, useId, useRef } from 'react';

export const useCalendarRootElements = () => {
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const portalId = `${reactId}-portal`;
  const portalTitleId = `${reactId}-portal-title`;
  const triggerInputRef = useRef<HTMLElement | null>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);

  const getDayButtonId = useCallback(
    (date: Date) =>
      `${portalId}-day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    [portalId]
  );

  return {
    getDayButtonId,
    portalContentRef,
    portalId,
    portalTitleId,
    triggerId,
    triggerInputRef,
  };
};
