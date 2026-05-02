import type {
  CSSProperties,
  ForwardedRef,
  HTMLAttributes,
  ReactElement,
} from 'react';
import ComboboxMenu from '../ComboboxMenu';
import { useComboboxContext } from '../../hooks/useComboboxContext';

interface ComboboxPopupProps {
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement> & {
      ref: ForwardedRef<HTMLDivElement>;
    },
    state: {
      open: boolean;
      closed: boolean;
      frozen: boolean;
      side: 'top' | 'bottom';
    }
  ) => ReactElement;
}

const ComboboxPopup = ({ className, style, render }: ComboboxPopupProps) => {
  const {
    popupId,
    popupLabel,
    isPortalFrozen,
    leaveTimeoutRef,
    dropdownMenuRef,
    onSearchKeyDown,
  } = useComboboxContext();

  return (
    <ComboboxMenu
      ref={dropdownMenuRef}
      popupId={popupId}
      popupLabel={popupLabel}
      isFrozen={isPortalFrozen}
      leaveTimeoutRef={leaveTimeoutRef}
      onSearchKeyDown={onSearchKeyDown}
      className={className}
      style={style}
      render={render}
    />
  );
};

export default ComboboxPopup;
