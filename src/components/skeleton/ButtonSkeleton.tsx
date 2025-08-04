import React from 'react';
import Skeleton from './Skeleton';

interface ButtonSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({
  width = '120px',
  height = '40px',
  className = '',
  animate = true,
}) => {
  return (
    <Skeleton 
      className={`rounded-lg ${className}`}
      width={width}
      height={height}
      animate={animate}
    />
  );
};

export default ButtonSkeleton;