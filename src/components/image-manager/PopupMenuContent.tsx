import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
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
  enableArrowNavigation?: boolean;
  autoFocusFirstItem?: boolean;
  initialPreselectedIndex?: number;
  onPreselectedIndexChange?: (index: number) => void;
}

const PopupMenuContent = ({
  actions,
  minWidthClassName = 'min-w-[90px]',
  enableArrowNavigation = false,
  autoFocusFirstItem = false,
  initialPreselectedIndex,
  onPreselectedIndexChange,
}: PopupMenuContentProps) => {
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedActionIndex, setFocusedActionIndex] = useState<number | null>(
    null
  );
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(
    null
  );
  const activeActionIndex = hoveredActionIndex ?? focusedActionIndex;
  const setFocusedActionIndexWithSync = useCallback(
    (nextIndex: number) => {
      setFocusedActionIndex(nextIndex);
      onPreselectedIndexChange?.(nextIndex);
    },
    [onPreselectedIndexChange]
  );

  const focusNextEnabledAction = (currentIndex: number, direction: 1 | -1) => {
    if (actions.length === 0) return;

    for (let step = 1; step <= actions.length; step += 1) {
      const nextIndex =
        (currentIndex + direction * step + actions.length) % actions.length;
      if (!actions[nextIndex]?.disabled) {
        setFocusedActionIndexWithSync(nextIndex);
        actionButtonRefs.current[nextIndex]?.focus();
        return;
      }
    }
  };

  const handleActionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    actionIndex: number
  ) => {
    if (!enableArrowNavigation) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();
    event.stopPropagation();
    focusNextEnabledAction(actionIndex, event.key === 'ArrowDown' ? 1 : -1);
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;

    const hasValidInitialPreselectedIndex =
      Number.isInteger(initialPreselectedIndex) &&
      initialPreselectedIndex !== undefined &&
      initialPreselectedIndex >= 0 &&
      initialPreselectedIndex < actions.length &&
      !actions[initialPreselectedIndex]?.disabled;

    const firstEnabledIndex = actions.findIndex(action => !action.disabled);
    const nextFocusedIndex = hasValidInitialPreselectedIndex
      ? initialPreselectedIndex
      : autoFocusFirstItem && firstEnabledIndex !== -1
        ? firstEnabledIndex
        : null;
    if (nextFocusedIndex === null) return;

    const rafId = window.requestAnimationFrame(() => {
      setFocusedActionIndexWithSync(nextFocusedIndex);
      actionButtonRefs.current[nextFocusedIndex]?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    actions,
    autoFocusFirstItem,
    enableArrowNavigation,
    initialPreselectedIndex,
    setFocusedActionIndexWithSync,
  ]);

  return (
    <div
      className={`px-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg ${minWidthClassName}`}
      role={enableArrowNavigation ? 'menu' : undefined}
      onMouseLeave={() => {
        setHoveredActionIndex(null);
      }}
    >
      {actions.map((action, actionIndex) => {
        const isPreselected =
          enableArrowNavigation &&
          !action.disabled &&
          activeActionIndex === actionIndex;
        const toneClassName =
          action.tone === 'danger'
            ? isPreselected
              ? 'bg-red-200'
              : ''
            : isPreselected
              ? 'bg-slate-200'
              : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900';

        return (
          <Button
            key={action.label}
            ref={element => {
              actionButtonRefs.current[actionIndex] = element;
            }}
            variant={action.tone === 'danger' ? 'text-danger' : 'text'}
            size="sm"
            withUnderline={false}
            onClick={event => {
              event.stopPropagation();
              action.onClick();
            }}
            disabled={action.disabled}
            role={enableArrowNavigation ? 'menuitem' : undefined}
            data-preselected={isPreselected ? 'true' : undefined}
            onFocus={() => {
              if (!action.disabled) {
                setFocusedActionIndexWithSync(actionIndex);
              }
            }}
            onMouseEnter={() => {
              if (!action.disabled) {
                setHoveredActionIndex(actionIndex);
              }
            }}
            onMouseLeave={() => {
              setHoveredActionIndex(null);
            }}
            onKeyDown={event => {
              handleActionKeyDown(event, actionIndex);
            }}
            className={`w-full px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 cursor-pointer justify-start outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ${toneClassName}`}
          >
            {action.icon}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};

export default PopupMenuContent;
