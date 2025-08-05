import { useState, useEffect } from 'react';

const DateTimeDisplay = () => {
  const [datePart, setDatePart] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

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
    <div className="text-md text-emerald-700 tracking-tight flex items-baseline tabular-nums" style={{ fontFamily: '"Google Sans Code", monospace' }}>
      {datePart && <span className="mr-1">{datePart} -</span>}
      <span>{hours || '--'}</span>
      <span className="mx-1">:</span>
      <span>{minutes || '--'}</span>
      <span className="mx-1">:</span>
      <span>{seconds || '--'}</span>
    </div>
  );
};

export default DateTimeDisplay;
