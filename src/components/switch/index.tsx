import React from 'react';

type SwitchSize = 'small' | 'default';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  id?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'default',
  id,
  className = '',
}) => {
  const sizeClasses =
    size === 'small'
      ? {
          track: 'w-8 h-4',
          thumb: 'h-3 w-3',
          translate: 'translate-x-4',
        }
      : {
          track: 'w-10 h-5',
          thumb: 'h-4 w-4',
          translate: 'translate-x-5',
        };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-200 ${
        checked ? 'bg-primary' : 'bg-slate-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
        sizeClasses.track
      } ${className}`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ${
          sizeClasses.thumb
        } ${checked ? sizeClasses.translate : 'translate-x-0'}`}
      />
    </button>
  );
};

export default Switch;
