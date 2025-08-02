import React from 'react';
import classNames from 'classnames';
import type { CheckboxLabelProps } from '../types';

export const CheckboxLabel: React.FC<CheckboxLabelProps> = ({
  label,
  className = '',
}) => {
  if (!label) return null;

  return (
    <span className={classNames('text-sm text-gray-700 select-none', className)}>
      {label}
    </span>
  );
};