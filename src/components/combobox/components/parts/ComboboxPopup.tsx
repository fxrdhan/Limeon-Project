import ComboboxMenu from '../ComboboxMenu';
import { useComboboxContext } from '../../hooks/useComboboxContext';

const ComboboxPopup = () => {
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
    />
  );
};

export default ComboboxPopup;
