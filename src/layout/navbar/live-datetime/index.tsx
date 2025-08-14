import { useState, useEffect } from 'react';
import {
  TbSunFilled,
  TbMoonFilled,
  TbCalendarMonthFilled,
} from 'react-icons/tb';
import Calendar from '@/components/calendar';

const DateTimeDisplay = () => {
  const [datePart, setDatePart] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [isDayTime, setIsDayTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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
      setHours(String(now.getHours()).padStart(2, '0'));
      setMinutes(String(now.getMinutes()).padStart(2, '0'));
      setSeconds(String(now.getSeconds()).padStart(2, '0'));

      // Determine if it's day time (6 AM - 6 PM)
      const currentHour = now.getHours();
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
  }, []);

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
          <span
            className="text-sm text-gray-600 tracking-tight font-medium"
            style={{ fontFamily: '"Google Sans Code", monospace' }}
          >
            {datePart}
          </span>
          <TbCalendarMonthFilled className="w-5 h-5 text-gray-600" />
        </div>
      </Calendar>

      <div className="h-5 w-px bg-gray-300 mx-3"></div>

      {/* Time */}
      <div className="inline-flex items-center space-x-2">
        <div
          className="text-sm text-gray-600 tracking-tight flex items-center tabular-nums font-medium"
          style={{ fontFamily: '"Google Sans Code", monospace' }}
        >
          <span>{hours || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{minutes || '--'}</span>
          <span className="mx-0.5">:</span>
          <span>{seconds || '--'}</span>
        </div>

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
