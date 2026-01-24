import React from 'react';
import { TbAlertTriangle } from 'react-icons/tb';
import { ValidationIconProps } from '../types';
import { ICON_SIZE, STYLES } from '../constants';

const ValidationIcon: React.FC<ValidationIconProps> = ({
  className = STYLES.icon,
  size = ICON_SIZE,
}) => {
  return <TbAlertTriangle className={className} size={size} />;
};

export default ValidationIcon;
