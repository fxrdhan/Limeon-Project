import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { TbCalendar, TbMoon, TbSun } from 'react-icons/tb';

const Calendar = lazy(() => import('@/components/calendar'));

const DateTimeDisplay = () => {
  const [datePart, setDatePart] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [ampm, setAmpm] = useState('');
  const [isDayTime, setIsDayTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState(true);
  const [shouldLoadCalendar, setShouldLoadCalendar] = useState(false);

  const loadCalendar = useCallback(() => {
    setShouldLoadCalendar(true);
  }, []);

  const handleTimeFormatToggle = () => {
    setIs24HourFormat(prev => !prev);
  };

  useEffect(() => {
    if (shouldLoadCalendar || typeof window === 'undefined') {
      return;
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        setShouldLoadCalendar(true);
      });

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(() => {
      setShouldLoadCalendar(true);
    }, 1_500);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [shouldLoadCalendar]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const updateClock = () => {
      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      setDatePart(now.toLocaleDateString('id-ID', optionsDate));

      const currentHour = now.getHours();

      if (is24HourFormat) {
        setHours(String(currentHour).padStart(2, '0'));
        setAmpm('');
      } else {
        const hour12 =
          currentHour === 0
            ? 12
            : currentHour > 12
              ? currentHour - 12
              : currentHour;
        setHours(String(hour12).padStart(2, '0'));
        setAmpm(currentHour >= 12 ? 'PM' : 'AM');
      }

      setMinutes(String(now.getMinutes()).padStart(2, '0'));
      setSeconds(String(now.getSeconds()).padStart(2, '0'));

      // Determine if it's day time (6 AM - 6 PM)
      setIsDayTime(currentHour >= 6 && currentHour < 18);
    };

    const scheduleNextUpdate = () => {
      const now = new Date();
      const msUntilNextSecond = 1000 - now.getMilliseconds();
      timerId = setTimeout(() => {
        updateClock();
        scheduleNextUpdate();
      }, msUntilNextSecond);
    };

    updateClock(); // initial call
    scheduleNextUpdate(); // schedule first update

    return () => clearTimeout(timerId);
  }, [is24HourFormat]);

  const dateTrigger = (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center space-x-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-50"
      onMouseEnter={loadCalendar}
      onFocus={loadCalendar}
      onClick={loadCalendar}
    >
      <span className="text-sm text-slate-600 tracking-tight font-medium">
        {datePart}
      </span>
      <TbCalendar aria-hidden="true" className="h-5 w-5 text-slate-600" />
    </button>
  );

  return (
    <div className="flex items-center relative select-none">
      <div className="flex items-center">
        {/* Date with Calendar */}
        {shouldLoadCalendar ? (
          <Suspense fallback={dateTrigger}>
            <Calendar
              mode="datepicker"
              trigger="hover"
              size="md"
              value={selectedDate}
              onChange={setSelectedDate}
            >
              {dateTrigger}
            </Calendar>
          </Suspense>
        ) : (
          dateTrigger
        )}

        <div className="h-5 w-px bg-slate-300 mx-3"></div>

        {/* Time */}
        <div
          className="text-sm text-slate-600 tracking-tight flex items-center tabular-nums font-medium cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-xl transition-colors group"
          onClick={handleTimeFormatToggle}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleTimeFormatToggle();
            }
          }}
          role="button"
          tabIndex={0}
          title={`Click to switch to ${is24HourFormat ? '12' : '24'}-hour format`}
        >
          <span>{hours || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{minutes || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{seconds || '--'}</span>

          <span
            className={`overflow-hidden text-sm font-medium transition-all duration-200 ease-in-out ${
              !is24HourFormat && ampm
                ? 'ml-2 max-w-12 opacity-100'
                : 'ml-0 max-w-0 opacity-0'
            }`}
          >
            {ampm}
          </span>

          {/* Format indicator badge */}
          <span className="ml-2 text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
            {is24HourFormat ? '24h' : '12h'}
          </span>
        </div>
      </div>

      {/* Sun/Moon Icon - Outside animated group */}
      <div className="flex items-center ml-2">
        {isDayTime ? (
          <TbSun aria-hidden="true" className="h-4 w-4 text-yellow-500" />
        ) : (
          <TbMoon aria-hidden="true" className="h-4 w-4 text-slate-500" />
        )}
      </div>
    </div>
  );
};

export default DateTimeDisplay;
