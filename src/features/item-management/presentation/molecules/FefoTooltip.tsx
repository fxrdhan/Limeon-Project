import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TbHelpCircle } from 'react-icons/tb';

interface FefoTooltipProps {
  tooltipText?: string;
}

export default function FefoTooltip({
  tooltipText = 'First Expired First Out: Barang dengan tanggal kadaluarsa terdekat akan dikeluarkan lebih dulu saat penjualan.',
}: FefoTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    setTooltipPosition(null);
  };

  return (
    <>
      <div
        className="relative ml-1 inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={iconRef}
      >
        <TbHelpCircle className="text-gray-400 cursor-help" size={14} />
      </div>
      {showTooltip &&
        tooltipPosition &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 1000,
            }}
            className="w-max max-w-xs p-2 bg-zinc-500 text-white text-xs rounded-md shadow-lg"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={handleMouseLeave}
          >
            {tooltipText}
          </div>,
          document.body
        )}
    </>
  );
}
