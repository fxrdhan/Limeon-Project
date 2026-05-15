import React from 'react';
import { ValidationMessageProps } from '../types';
import { STYLES } from '../constants';

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  className = STYLES.message,
  message,
}) => {
  return <span className={className}>{message}</span>;
};

export default ValidationMessage;
