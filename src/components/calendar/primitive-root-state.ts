import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { CALENDAR_CONSTANTS, CALENDAR_SIZE_PRESETS } from './constants';
import {
  useCalendarAnimatedNavigation,
  useCalendarDisplayState,
  useCalendarFocus,
  useCalendarHover,
  useCalendarKeyboard,
  useCalendarNavigation,
  useCalendarOutsideClick,
  useCalendarPosition,
  useCalendarRootContextValues,
  useCalendarSelection,
  useCalendarState,
} from './hooks';
import type { CalendarProviderProps, CalendarRootContextState } from './types';

export type CalendarRootProps = CalendarProviderProps;

export function useCalendarRootState({
  mode = 'datepicker',
  size = 'md',
  trigger = mode === 'inline' ? 'hover' : 'click',
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
}: Omit<CalendarRootProps, 'children'>): CalendarRootContextState {
  const sizeConfig = CALENDAR_SIZE_PRESETS[size];
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const portalId = `${reactId}-portal`;
  const portalTitleId = `${reactId}-portal-title`;
  const triggerInputRef = useRef<HTMLElement | null>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);
  const {
    selectedValue,
    displayDate,
    highlightedDate,
    setDisplayDate,
    setHighlightedDate,
    resetHighlightedDate,
    syncDisplayToInitialDate,
    syncDisplayToSelectedValue,
    syncHighlightToDisplayDate,
  } = useCalendarDisplayState({ value, minDate, maxDate });
  const selectedValueTime = selectedValue?.getTime() ?? null;
  const previousSelectedValueTimeRef = useRef(selectedValueTime);

  const {
    isOpen,
    isClosing,
    isOpening,
    openCalendar,
    closeCalendar,
    setIsOpening,
  } = useCalendarState({
    onOpen: syncDisplayToSelectedValue,
    onClose: resetHighlightedDate,
  });

  const effectiveIsOpen = mode === 'inline' ? true : isOpen;
  const effectiveIsClosing = mode === 'inline' ? false : isClosing;
  const effectiveIsOpening = mode === 'inline' ? false : isOpening;

  const {
    portalStyle,
    isPositionReady,
    dropDirection,
    setPortalContentRef,
    calculatePosition,
  } = useCalendarPosition({
    triggerRef: triggerInputRef,
    portalRef: portalContentRef,
    isOpen,
    portalWidth: portalWidth || sizeConfig.width,
    calendarWidth: sizeConfig.width,
  });
  const { focusPortal, focusTrigger } = useCalendarFocus({
    triggerInputRef,
    portalContentRef,
  });
  const { closeCalendarAndRestoreFocus, handleDateSelect, handleDateClear } =
    useCalendarSelection({
      mode,
      readOnly,
      selectedValue,
      minDate,
      maxDate,
      isOpen,
      onChange,
      closeCalendar,
      focusTrigger,
    });

  const { navigateViewDate: navigateViewDateBase, navigateYear } =
    useCalendarNavigation({
      displayDate,
      setDisplayDate,
      minDate,
      maxDate,
    });
  const {
    navigationDirection,
    yearNavigationDirection,
    navigateViewDate,
    navigateYearWithAnimation,
    triggerMonthAnimation,
    triggerYearAnimation,
  } = useCalendarAnimatedNavigation({
    navigateViewDate: navigateViewDateBase,
    navigateYear,
  });

  const getDayButtonId = useCallback(
    (date: Date) =>
      `${portalId}-day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    [portalId]
  );

  const openIfAllowed = useCallback(() => {
    openCalendar();
  }, [openCalendar]);

  const closeIfAllowed = useCallback(() => {
    closeCalendar();
  }, [closeCalendar]);

  const {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarHover({
    openCalendar: openIfAllowed,
    closeCalendar: closeIfAllowed,
    portalRef: portalContentRef,
  });

  const { handleInputKeyDown, handleCalendarKeyDown } = useCalendarKeyboard({
    isOpen,
    highlightedDate,
    displayDate,
    value: selectedValue,
    minDate,
    maxDate,
    onDateSelect: handleDateSelect,
    onDateClear: handleDateClear,
    openCalendar,
    closeCalendar,
    closeCalendarAndRestoreFocus,
    setHighlightedDate,
    setDisplayDate,
    navigateViewDate,
    navigateYearWithAnimation,
    focusPortal,
    trapFocus: mode !== 'inline',
  });

  useEffect(() => {
    if (isOpen && isPositionReady && isOpening) {
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, CALENDAR_CONSTANTS.OPENING_READY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isPositionReady, isOpening, setIsOpening]);

  useLayoutEffect(() => {
    if (isOpen && mode !== 'inline') return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToInitialDate();
  }, [isOpen, mode, selectedValueTime, syncDisplayToInitialDate]);

  useEffect(() => {
    if (!isOpen || mode === 'inline') return;
    if (previousSelectedValueTimeRef.current === selectedValueTime) return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToSelectedValue();
  }, [isOpen, mode, selectedValueTime, syncDisplayToSelectedValue]);

  useEffect(() => {
    if (mode !== 'inline' && !isOpen) return;

    syncHighlightToDisplayDate();
  }, [isOpen, mode, syncHighlightToDisplayDate]);

  useCalendarOutsideClick({
    isOpen,
    mode,
    trigger,
    portalContentRef,
    triggerInputRef,
    closeCalendar,
    focusTrigger,
  });

  const handleTriggerClick = useCallback(() => {
    if (isOpen && !isClosing) {
      closeCalendar();
      return;
    }

    openCalendar();
    calculatePosition();
    focusPortal();
  }, [
    calculatePosition,
    closeCalendar,
    focusPortal,
    isClosing,
    isOpen,
    openCalendar,
  ]);

  return useCalendarRootContextValues({
    selectedValue,
    displayDate,
    navigationDirection,
    yearNavigationDirection,
    highlightedDate,
    mode,
    size,
    minDate,
    maxDate,
    portalWidth,
    readOnly,
    setDisplayDate,
    setHighlightedDate,
    handleDateSelect,
    navigateViewDate,
    triggerYearAnimation,
    triggerMonthAnimation,
    portalContentRef,
    getDayButtonId,
    calculatePosition,
    trigger,
    triggerInputRef,
    effectiveIsOpen,
    triggerId,
    portalId,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    effectiveIsClosing,
    effectiveIsOpening,
    isPositionReady: mode === 'inline' ? true : isPositionReady,
    dropDirection,
    portalStyle,
    setPortalContentRef,
    portalTitleId,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  });
}
