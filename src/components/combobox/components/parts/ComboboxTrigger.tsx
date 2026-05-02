import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ForwardedRef,
  ReactElement,
} from 'react';
import ComboboxButton from '../ComboboxButton';
import { useComboboxContext } from '../../hooks/useComboboxContext';

interface ComboboxTriggerProps {
  className?: string;
  style?: CSSProperties;
  render?: (
    props: ButtonHTMLAttributes<HTMLButtonElement> & {
      ref: ForwardedRef<HTMLButtonElement>;
    },
    state: {
      open: boolean;
      disabled: boolean;
      invalid: boolean;
      placeholder: boolean;
    }
  ) => ReactElement;
}

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
