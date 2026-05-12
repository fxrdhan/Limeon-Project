import { CALENDAR_SIZE_PRESETS } from './constants';
import {
  useCalendarBounds,
  useCalendarDisplayState,
  useCalendarFocus,
  useCalendarModeBehavior,
  useCalendarPosition,
  useCalendarRootActions,
  useCalendarRootContextValues,
  useCalendarRootElements,
  useCalendarRootLifecycle,
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
  const bounds = useCalendarBounds({ minDate, maxDate });
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
  } = useCalendarDisplayState({
    value,
    minDate: bounds.minDate,
    maxDate: bounds.maxDate,
  });
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
  const {
    navigationDirection,
    yearNavigationDirection,
    handleDateSelect,
    handleDateHighlight,
    handleMonthChange,
    handleNavigateNext,
    handleNavigatePrev,
    handleYearChange,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarRootActions({
    modeBehavior,
    readOnly,
    disabled,
    selectedValue,
    highlightedDate,
    displayDate,
    minDate: bounds.minDate,
    maxDate: bounds.maxDate,
    isOpen,
    isClosing,
    onChange,
    openCalendar,
    closeCalendar,
    setHighlightedDate,
    setDisplayDate,
    portalContentRef,
    triggerInputRef,
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
    minDate: bounds.minDate,
    maxDate: bounds.maxDate,
    portalWidth,
    readOnly,
    disabled,
    gridTabIndex: modeBehavior.gridTabIndex,
    handleDateSelect,
    handleDateHighlight,
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
