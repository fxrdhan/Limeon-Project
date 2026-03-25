import React from 'react';
import { TbRefresh } from 'react-icons/tb';

interface MetricRailItemProps {
  title: string;
  value: string | number;
  meta: string;
  icon: React.ReactNode;
  accentClass: string;
  iconClass: string;
  isLoading?: boolean;
}

export const MetricRailItem: React.FC<MetricRailItemProps> = ({
  title,
  value,
  meta,
  icon,
  accentClass,
  iconClass,
  isLoading,
}) => (
  <div className={`grid gap-4 border-l-2 pl-5 ${accentClass}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>

        {isLoading ? (
          <div className="mt-4 h-9 w-28 animate-pulse rounded-2xl bg-slate-200" />
        ) : (
          <p className="mt-4 break-words text-[1.8rem] font-semibold leading-tight tracking-tight text-slate-950">
            {value}
          </p>
        )}
      </div>

      <div className={`shrink-0 text-2xl ${iconClass}`}>{icon}</div>
    </div>

    <p className="text-sm leading-6 text-slate-500">{meta}</p>
  </div>
);

type InfoChipTone = 'emerald' | 'sky' | 'amber';

interface InfoChipProps {
  label: string;
  value: string;
  tone: InfoChipTone;
  isLoading?: boolean;
}

const chipToneClassMap: Record<InfoChipTone, string> = {
  emerald: 'border-emerald-300 text-emerald-700',
  sky: 'border-sky-300 text-sky-700',
  amber: 'border-amber-300 text-amber-700',
};

export const InfoChip: React.FC<InfoChipProps> = ({
  label,
  value,
  tone,
  isLoading,
}) => (
  <div className={`border-l-2 pl-4 ${chipToneClassMap[tone]}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
      {label}
    </p>

    {isLoading ? (
      <div className="mt-3 h-5 w-24 animate-pulse rounded-full bg-slate-200" />
    ) : (
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    )}
  </div>
);

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {action}
  </div>
);

export const InlineRefreshButton = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="inline-flex items-center gap-2 border-b border-slate-300 pb-1 text-sm font-medium text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900"
  >
    <TbRefresh className="h-4 w-4" />
    Refresh
  </button>
);

export const PanelMessage = ({
  message,
  tone = 'default',
}: {
  message: string;
  tone?: 'default' | 'error';
}) => (
  <div
    className={`flex min-h-[220px] items-center justify-center border-y px-6 py-12 text-center text-sm ${
      tone === 'error'
        ? 'border-rose-200 text-rose-600'
        : 'border-slate-200 text-slate-500'
    }`}
  >
    {message}
  </div>
);
