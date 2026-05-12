import { useCallback, useId, useRef } from 'react';
import { CALENDAR_SIZE_PRESETS } from './constants';
import {
  useCalendarAnimatedNavigation,
  useCalendarDisplayState,
  useCalendarFocus,
  useCalendarNavigation,
  useCalendarPosition,
  useCalendarRootContextValues,
  useCalendarRootInteractions,
  useCalendarRootLifecycle,
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
  disabled,
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
      disabled,
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

  const {
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarRootInteractions({
    disabled,
    mode,
    trigger,
    portalContentRef,
    triggerInputRef,
    isOpen,
    isClosing,
    highlightedDate,
    displayDate,
    selectedValue,
    minDate,
    maxDate,
    handleDateSelect,
    handleDateClear,
    openCalendar,
    closeCalendar,
    closeCalendarAndRestoreFocus,
    setHighlightedDate,
    setDisplayDate,
    navigateViewDate,
    navigateYearWithAnimation,
    focusPortal,
    focusTrigger,
    calculatePosition,
  });

  useCalendarRootLifecycle({
    isOpen,
    isOpening,
    isPositionReady,
    mode,
    selectedValueTime,
    setIsOpening,
    syncDisplayToInitialDate,
    syncDisplayToSelectedValue,
    syncHighlightToDisplayDate,
  });

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
    disabled,
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
