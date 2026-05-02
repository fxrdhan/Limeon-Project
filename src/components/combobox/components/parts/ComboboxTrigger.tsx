import ComboboxButton from '../ComboboxButton';
import { useComboboxContext } from '../../hooks/useComboboxContext';

const ComboboxTrigger = () => {
  const {
    buttonId,
    mode,
    selectedOption,
    placeholder,
    isOpen,
    isClosing,
    hasError,
    name,
    popupId,
    listboxId,
    searchList,
    activeDescendantId,
    tabIndex,
    required,
    disabled,
    ariaLabel,
    ariaLabelledBy,
    buttonRef,
    onTriggerClick,
    onTriggerKeyDown,
    onTriggerBlur,
  } = useComboboxContext();

  return (
    <ComboboxButton
      ref={buttonRef}
      id={buttonId}
      mode={mode}
      selectedOption={selectedOption ?? undefined}
      placeholder={placeholder}
      isOpen={isOpen}
      isClosing={isClosing}
      hasError={hasError}
      name={name}
      popupId={popupId}
      listboxId={listboxId}
      searchList={searchList}
      activeDescendantId={activeDescendantId}
      tabIndex={tabIndex}
      required={required}
      disabled={disabled}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      onClick={onTriggerClick}
      onKeyDown={onTriggerKeyDown}
      onBlur={onTriggerBlur}
    />
  );
};

export default ComboboxTrigger;
