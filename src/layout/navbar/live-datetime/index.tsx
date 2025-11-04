import { useState, useEffect, useRef } from 'react';
import {
  TbSunFilled,
  TbMoonFilled,
  TbCalendarMonthFilled,
} from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from '@/components/calendar';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';

const DateTimeDisplay = () => {
  const [datePart, setDatePart] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [ampm, setAmpm] = useState('');
  const [isDayTime, setIsDayTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState(true);
  const [isHoveringClock, setIsHoveringClock] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Time format options for SlidingSelector
  const timeFormatOptions: SlidingSelectorOption<boolean>[] = [
    {
      key: '12',
      value: false,
      defaultLabel: '12',
      activeLabel: '12 Hour',
    },
    {
      key: '24',
      value: true,
      defaultLabel: '24',
      activeLabel: '24 Hour',
    },
  ];

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringClock(true);
      hoverTimeoutRef.current = null;
    }, 200);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringClock(false);
      hoverTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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

  return (
    <div className="flex items-center relative">
      {/* Date with Calendar */}
      <Calendar
        mode="datepicker"
        trigger="hover"
        size="md"
        value={selectedDate}
        onChange={setSelectedDate}
      >
        <div className="inline-flex items-center space-x-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors">
          <span className="text-sm text-gray-600 tracking-tight font-medium">
            {datePart}
          </span>
          <TbCalendarMonthFilled className="w-5 h-5 text-gray-600" />
        </div>
      </Calendar>

      <div className="h-5 w-px bg-gray-300 mx-3"></div>

      {/* Time */}
      <div className="inline-flex items-center space-x-2 relative">
        <div
          className="text-sm text-gray-600 tracking-tight flex items-center tabular-nums font-medium cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span>{hours || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{minutes || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{seconds || '--'}</span>
          {!is24HourFormat && ampm && (
            <span className="ml-2 text-sm font-medium">{ampm}</span>
          )}
        </div>

        {/* Format Toggle Portal */}
        <AnimatePresence>
          {isHoveringClock && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              transition={{
                duration: 0.1,
                ease: 'easeOut',
              }}
              className="absolute top-full left-0 mt-1 z-50"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <SlidingSelector
                options={timeFormatOptions}
                activeKey={is24HourFormat ? '24' : '12'}
                onSelectionChange={(_key, value) => setIs24HourFormat(value)}
                variant="selector"
                size="md"
                shape="rounded"
                collapsible={false}
                animationPreset="smooth"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sun/Moon Icon */}
        <div className="flex items-center">
          {isDayTime ? (
            <TbSunFilled className="w-4 h-4 text-yellow-500" />
          ) : (
            <TbMoonFilled className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>
    </div>
  );
};

export default DateTimeDisplay;
