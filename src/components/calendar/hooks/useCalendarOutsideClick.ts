import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { CalendarMode, CalendarTrigger } from '../types';

const outsideFocusableSelector = [
  'button',
  '[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseCalendarOutsideClickParams {
  isOpen: boolean;
  mode: CalendarMode;
  trigger: CalendarTrigger;
  portalContentRef: RefObject<HTMLDivElement | null>;
  triggerInputRef: RefObject<HTMLElement | null>;
  closeCalendar: () => void;
  focusTrigger: () => void;
}

export const useCalendarOutsideClick = ({
  isOpen,
  mode,
  trigger,
  portalContentRef,
  triggerInputRef,
  closeCalendar,
  focusTrigger,
}: UseCalendarOutsideClickParams) => {
  useEffect(() => {
    if (mode === 'inline' || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (portalContentRef.current?.contains(target)) return;
      if (triggerInputRef.current?.contains(target)) return;

      if (!(target instanceof Element)) {
        closeCalendar();
        if (trigger !== 'hover') {
          focusTrigger();
        }
        return;
      }

      closeCalendar();
      if (trigger !== 'hover' && !target.closest(outsideFocusableSelector)) {
        focusTrigger();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    closeCalendar,
    focusTrigger,
    isOpen,
    mode,
    portalContentRef,
    trigger,
    triggerInputRef,
  ]);
};
