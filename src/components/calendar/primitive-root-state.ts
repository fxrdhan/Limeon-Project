import { CALENDAR_SIZE_PRESETS } from './constants';
import {
  useCalendarAnimatedNavigation,
  useCalendarDisplayState,
  useCalendarFocus,
  useCalendarHeaderControls,
  useCalendarModeBehavior,
  useCalendarNavigation,
  useCalendarPosition,
  useCalendarRootContextValues,
  useCalendarRootElements,
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
  trigger,
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
  disabled,
}: Omit<CalendarRootProps, 'children'>): CalendarRootContextState {
  const sizeConfig = CALENDAR_SIZE_PRESETS[size];
  const {
    getDayButtonId,
    portalContentRef,
    portalId,
    portalTitleId,
    triggerId,
    triggerInputRef,
  } = useCalendarRootElements();
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
  const modeBehavior = useCalendarModeBehavior({
    mode,
    trigger,
    disabled,
    isOpen,
    isClosing,
    isOpening,
    isPositionReady,
  });
  const { focusPortal, focusTrigger } = useCalendarFocus({
    triggerInputRef,
    portalContentRef,
  });
  const { closeCalendarAndRestoreFocus, handleDateSelect, handleDateClear } =
    useCalendarSelection({
      closeOnSelect: modeBehavior.closeOnSelect,
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

  const {
    handleMonthChange,
    handleNavigateNext,
    handleNavigatePrev,
    handleYearChange,
  } = useCalendarHeaderControls({
    displayDate,
    minDate,
    maxDate,
    setDisplayDate,
    navigateViewDate,
    triggerMonthAnimation,
    triggerYearAnimation,
    calculatePosition,
  });

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
    outsideClickEnabled: modeBehavior.outsideClickEnabled,
    trapFocus: modeBehavior.trapFocus,
    trigger: modeBehavior.trigger,
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
    isPositionReady: modeBehavior.isPositionReady,
    isInline: modeBehavior.isInline,
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
    isInline: modeBehavior.isInline,
    size,
    minDate,
    maxDate,
    portalWidth,
    readOnly,
    disabled,
    gridTabIndex: modeBehavior.gridTabIndex,
    handleDateSelect,
    handleDateHighlight: setHighlightedDate,
    handleNavigatePrev,
    handleNavigateNext,
    handleMonthChange,
    handleYearChange,
    portalContentRef,
    getDayButtonId,
    trigger: modeBehavior.trigger,
    triggerInputRef,
    isOpen: modeBehavior.isOpen,
    triggerId,
    portalId,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    isClosing: modeBehavior.isClosing,
    isOpening: modeBehavior.isOpening,
    isPositionReady: modeBehavior.isPositionReady,
    dropDirection,
    portalStyle,
    setPortalContentRef,
    portalTitleId,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  });
}
