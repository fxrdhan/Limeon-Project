import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { focusFirstSectionField } from './sectionFocus';

export const useDeferredSectionFocus = <T extends ParentNode>(
  sectionRef: RefObject<T | null>
) => {
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelDeferredSectionFocus = useCallback(() => {
    if (!focusTimerRef.current) {
      return;
    }

    clearTimeout(focusTimerRef.current);
    focusTimerRef.current = null;
  }, []);

  const scheduleFocusFirstSectionField = useCallback(() => {
    cancelDeferredSectionFocus();
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      focusFirstSectionField(sectionRef.current);
    }, 0);
  }, [cancelDeferredSectionFocus, sectionRef]);

  useEffect(
    () => () => {
      cancelDeferredSectionFocus();
    },
    [cancelDeferredSectionFocus]
  );

  return {
    cancelDeferredSectionFocus,
    scheduleFocusFirstSectionField,
  };
};
