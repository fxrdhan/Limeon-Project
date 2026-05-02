import ComboboxButton from '../ComboboxButton';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxTriggerProps } from '../../types';

const ComboboxTrigger = ({
  className,
  style,
  render,
}: ComboboxTriggerProps) => {
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
    popupHasSearch,
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
      popupHasSearch={popupHasSearch}
      activeDescendantId={activeDescendantId}
      tabIndex={tabIndex}
      required={required}
      disabled={disabled}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      className={className}
      style={style}
      render={render}
      onClick={onTriggerClick}
      onKeyDown={onTriggerKeyDown}
      onBlur={onTriggerBlur}
    />
  );
};

export default ComboboxTrigger;
