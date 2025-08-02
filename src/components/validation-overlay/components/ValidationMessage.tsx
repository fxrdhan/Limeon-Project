import React from 'react';
import { ValidationMessageProps } from '../types';
import { STYLES } from '../constants';

const ValidationMessage: React.FC<ValidationMessageProps> = ({ message }) => {
  return <span className={STYLES.message}>{message}</span>;
};

export default ValidationMessage;
