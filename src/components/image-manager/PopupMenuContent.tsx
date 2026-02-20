import type { ReactNode } from 'react';
import Button from '@/components/button';

export interface PopupMenuAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

interface PopupMenuContentProps {
  actions: PopupMenuAction[];
  minWidthClassName?: string;
}

const PopupMenuContent = ({
  actions,
  minWidthClassName = 'min-w-[90px]',
}: PopupMenuContentProps) => {
  return (
    <div
      className={`px-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg ${minWidthClassName}`}
    >
      {actions.map(action => (
        <Button
          key={action.label}
          variant={action.tone === 'danger' ? 'text-danger' : 'text'}
          size="sm"
          withUnderline={false}
          onClick={event => {
            event.stopPropagation();
            action.onClick();
          }}
          disabled={action.disabled}
          className={`w-full px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 cursor-pointer justify-start ${
            action.tone === 'danger'
              ? ''
              : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
          }`}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default PopupMenuContent;
