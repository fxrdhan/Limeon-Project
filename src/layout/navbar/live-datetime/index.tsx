import { useState, useEffect } from 'react';
import {
  TbSunFilled,
  TbMoonFilled,
  TbCalendarMonthFilled,
} from 'react-icons/tb';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from '@/components/calendar';

const DateTimeDisplay = () => {
  const [datePart, setDatePart] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [ampm, setAmpm] = useState('');
  const [isDayTime, setIsDayTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState(true);

  const handleTimeFormatToggle = () => {
    setIs24HourFormat(prev => !prev);
  };

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
    <div className="flex items-center relative select-none">
      {/* Animated Group: Date + Separator + Clock */}
      <motion.div
        className="flex items-center"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* Date with Calendar */}
        <Calendar
          mode="datepicker"
          trigger="hover"
          size="md"
          value={selectedDate}
          onChange={setSelectedDate}
        >
          <div className="inline-flex items-center space-x-3 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors">
            <span className="text-sm text-slate-600 tracking-tight font-medium">
              {datePart}
            </span>
            <TbCalendarMonthFilled className="w-5 h-5 text-slate-600" />
          </div>
        </Calendar>

        <div className="h-5 w-px bg-slate-300 mx-3"></div>

        {/* Time */}
        <div
          className="text-sm text-slate-600 tracking-tight flex items-center tabular-nums font-medium cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-colors group"
          onClick={handleTimeFormatToggle}
          title={`Click to switch to ${is24HourFormat ? '12' : '24'}-hour format`}
        >
          <span>{hours || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{minutes || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{seconds || '--'}</span>

          {/* AM/PM with smooth animation */}
          <AnimatePresence mode="wait">
            {!is24HourFormat && ampm && (
              <motion.span
                key="ampm"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: '0.5rem' }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="text-sm font-medium overflow-hidden"
              >
                {ampm}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Format indicator badge */}
          <span className="ml-2 text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
            {is24HourFormat ? '24h' : '12h'}
          </span>
        </div>
      </motion.div>

      {/* Sun/Moon Icon - Outside animated group */}
      <div className="flex items-center ml-2">
        {isDayTime ? (
          <TbSunFilled className="w-4 h-4 text-yellow-500" />
        ) : (
          <TbMoonFilled className="w-4 h-4 text-slate-500" />
        )}
      </div>
    </div>
  );
};

export default DateTimeDisplay;
