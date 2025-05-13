import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper component for animated time segments
const AnimatedTimeSegment = ({ value, widthClass }: { value: string; widthClass: string }) => (
    <div className={`inline-block ${widthClass} h-[1.2em] overflow-hidden align-bottom`}>
        <AnimatePresence initial={false} mode="popLayout">
            <motion.span
                key={value}
                initial={{ y: '100%', opacity: 0.5 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-80%', opacity: 0.5 }}
                transition={{ duration: 0.25, ease: [0.5, 0, 0.5, 1] }}
                className="inline-block"
            >
                {value}
            </motion.span>
        </AnimatePresence>
    </div>
);

const DateTimeDisplay = () => {
    const [datePart, setDatePart] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const optionsDate: Intl.DateTimeFormatOptions = {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            };
            setDatePart(now.toLocaleDateString('id-ID', optionsDate));
            setHours(String(now.getHours()).padStart(2, '0'));
            setMinutes(String(now.getMinutes()).padStart(2, '0'));
            setSeconds(String(now.getSeconds()).padStart(2, '0'));
        };
        updateClock(); // initial call
        const timerId = setInterval(updateClock, 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="text-md font-mono text-blue-700 tracking-tight flex items-baseline tabular-nums">
            {datePart && <span className="mr-1">{datePart} -</span>}
            {hours ? (
                <>
                    <AnimatedTimeSegment value={hours[0]} widthClass="w-[0.9ch]" />
                    <AnimatedTimeSegment value={hours[1]} widthClass="w-[0.9ch]" />
                </>
            ) : <span className="w-[1.8ch]">--</span>}
            <span className="w-[0.5ch] text-center">:</span>
            {minutes ? (
                <>
                    <AnimatedTimeSegment value={minutes[0]} widthClass="w-[0.9ch]" />
                    <AnimatedTimeSegment value={minutes[1]} widthClass="w-[0.9ch]" />
                </>
            ) : <span className="w-[1.8ch]">--</span>}
            <span className="w-[0.5ch] text-center">:</span>
            {seconds ? (
                <>
                    <AnimatedTimeSegment value={seconds[0]} widthClass="w-[0.9ch]" />
                    <AnimatedTimeSegment value={seconds[1]} widthClass="w-[0.9ch]" />
                </>
            ) : <span className="w-[1.8ch]">--</span>}
        </div>
    );
};

export default DateTimeDisplay;
