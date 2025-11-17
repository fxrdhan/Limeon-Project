import React from 'react';
import { LuX } from 'react-icons/lu';
import { BadgeConfig, BADGE_COLORS } from '../types/badge';

interface BadgeProps {
  config: BadgeConfig;
}

const Badge: React.FC<BadgeProps> = ({ config }) => {
  const colors = BADGE_COLORS[config.type];

  return (
    <div
      className={`group flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0`}
    >
      <span>{config.label}</span>
      {config.canClear && (
        <button
          onClick={config.onClear}
          className={`max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0`}
          type="button"
          style={{
            transition:
              'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
          }}
        >
          <LuX className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      )}
    </div>
  );
};

export default Badge;
