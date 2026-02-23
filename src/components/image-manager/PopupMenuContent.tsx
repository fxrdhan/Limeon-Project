import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Button from '@/components/button';
import {
  POPUP_ACTIVE_BG_CLASS,
  POPUP_DANGER_ACTIVE_BG_CLASS,
  POPUP_HOVER_BG_CLASS,
  POPUP_SURFACE_CLASS,
} from '@/components/shared/popup-styles';

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
  useMenuItemRole?: boolean;
  initialPreselectedIndex?: number;
  onPreselectedIndexChange?: (index: number) => void;
}

const PopupMenuContent = ({
  actions,
  minWidthClassName = 'min-w-[90px]',
  enableArrowNavigation = false,
  autoFocusFirstItem = false,
  useMenuItemRole = true,
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
      className={`px-1 py-1 rounded-xl shadow-lg ${POPUP_SURFACE_CLASS} ${minWidthClassName}`}
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
              ? POPUP_DANGER_ACTIVE_BG_CLASS
              : ''
            : isPreselected
              ? `${POPUP_ACTIVE_BG_CLASS} !text-slate-700 data-[preselected=true]:!text-slate-700 hover:!text-slate-700`
              : `!text-slate-700 ${POPUP_HOVER_BG_CLASS} hover:!text-slate-700`;
        const iconToneClassName =
          action.tone === 'danger'
            ? ''
            : '[&>svg]:text-slate-500 hover:[&>svg]:text-slate-500 data-[preselected=true]:[&>svg]:text-slate-500';

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
            role={
              enableArrowNavigation && useMenuItemRole ? 'menuitem' : undefined
            }
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
            className={`w-full !opacity-100 px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 hover:!opacity-100 data-[preselected=true]:!opacity-100 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 cursor-pointer justify-start outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ${toneClassName} ${iconToneClassName}`}
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
