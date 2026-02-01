import React from 'react';

export interface CheckboxInputProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tabIndex?: number;
}

export interface CheckboxIconProps {
  checked: boolean;
  disabled?: boolean;
  className?: string;
}

export interface CheckboxLabelProps {
  label?: string;
  className?: string;
}

export interface CheckboxContainerProps {
  id?: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  tabIndex?: number;
  children?: React.ReactNode;
}

export interface UseKeyboardHandlerProps {
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  checked: boolean;
}
