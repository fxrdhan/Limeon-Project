import ComboboxMenu from '../ComboboxMenu';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxPopupProps } from '../../types';

const ComboboxPopup = ({
  children,
  className,
  style,
  render,
}: ComboboxPopupProps) => {
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
    >
      {children}
    </ComboboxMenu>
  );
};

export default ComboboxPopup;
