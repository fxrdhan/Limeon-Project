import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
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
  onClick: (event?: ReactMouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

interface PopupMenuContentProps {
  actions: PopupMenuAction[];
  header?: ReactNode;
  minWidthClassName?: string;
  enableArrowNavigation?: boolean;
  autoFocusFirstItem?: boolean;
  useMenuItemRole?: boolean;
  initialPreselectedIndex?: number;
  onPreselectedIndexChange?: (index: number) => void;
  iconClassName?: string;
  dangerIconClassName?: string;
}

const resolveInitialActionIndex = ({
  actions,
  enableArrowNavigation,
  autoFocusFirstItem,
  initialPreselectedIndex,
}: Pick<
  PopupMenuContentProps,
  | 'actions'
  | 'enableArrowNavigation'
  | 'autoFocusFirstItem'
  | 'initialPreselectedIndex'
>) => {
  if (!enableArrowNavigation) return null;

  const hasValidInitialPreselectedIndex =
    Number.isInteger(initialPreselectedIndex) &&
    initialPreselectedIndex !== undefined &&
    initialPreselectedIndex >= 0 &&
    initialPreselectedIndex < actions.length &&
    !actions[initialPreselectedIndex]?.disabled;

  if (hasValidInitialPreselectedIndex) {
    return initialPreselectedIndex;
  }

  if (!autoFocusFirstItem) return null;

  const firstEnabledIndex = actions.findIndex(action => !action.disabled);
  return firstEnabledIndex === -1 ? null : firstEnabledIndex;
};

const PopupMenuContent = ({
  actions,
  header,
  minWidthClassName = 'min-w-[90px]',
  enableArrowNavigation = false,
  autoFocusFirstItem = false,
  useMenuItemRole = true,
  initialPreselectedIndex,
  onPreselectedIndexChange,
  iconClassName,
  dangerIconClassName,
}: PopupMenuContentProps) => {
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedActionIndex, setFocusedActionIndex] = useState<number | null>(
    () =>
      resolveInitialActionIndex({
        actions,
        enableArrowNavigation,
        autoFocusFirstItem,
        initialPreselectedIndex,
      })
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

  useLayoutEffect(() => {
    const nextFocusedIndex = resolveInitialActionIndex({
      actions,
      enableArrowNavigation,
      autoFocusFirstItem,
      initialPreselectedIndex,
    });
    if (nextFocusedIndex === null) return;

    setFocusedActionIndex(currentIndex =>
      currentIndex === nextFocusedIndex ? currentIndex : nextFocusedIndex
    );

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
      {header}
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
              ? `${POPUP_ACTIVE_BG_CLASS} !text-black data-[preselected=true]:!text-black hover:!text-black`
              : `!text-black ${POPUP_HOVER_BG_CLASS} hover:!text-black`;
        const iconToneClassName =
          action.tone === 'danger'
            ? (dangerIconClassName ?? '')
            : (iconClassName ??
              '[&>svg]:text-slate-500 hover:[&>svg]:text-slate-500 data-[preselected=true]:[&>svg]:text-slate-500');

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
              action.onClick(event);
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
